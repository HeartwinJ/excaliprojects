import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import {
  findUserByUsername,
  findUserById,
  verifyPassword,
  updateThemePreference,
} from "../../repos/users.js";
import { doubleCsrfProtection, generateCsrfToken } from "../csrf.js";
import { logger } from "../../logger.js";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(256),
});

const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "too many attempts, try again soon" },
});

authRouter.get("/api/csrf", (req, res) => {
  // touch the session so a stable session id is persisted across requests,
  // which csrf-csrf uses to scope the token.
  if (!req.session.csrfInitialised) {
    req.session.csrfInitialised = true;
  }
  const token = generateCsrfToken(req, res, { overwrite: true, validateOnReuse: false });
  res.json({ csrfToken: token });
});

authRouter.post("/api/login", loginLimiter, doubleCsrfProtection, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid credentials payload" });
    return;
  }
  const { username, password } = parsed.data;
  const user = await findUserByUsername(username);
  if (!user) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }
  const ok = await verifyPassword(user, password);
  if (!ok) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }

  req.session.regenerate((err) => {
    if (err) {
      logger.error({ err }, "session regenerate failed");
      res.status(500).json({ error: "session error" });
      return;
    }
    req.session.userId = user.id;
    req.session.save((saveErr) => {
      if (saveErr) {
        logger.error({ err: saveErr }, "session save failed");
        res.status(500).json({ error: "session error" });
        return;
      }
      res.json({
        id: user.id,
        username: user.username,
        themePreference: user.theme_preference,
      });
    });
  });
});

authRouter.post("/api/logout", doubleCsrfProtection, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, "session destroy failed");
      res.status(500).json({ error: "logout error" });
      return;
    }
    res.clearCookie("excaliprojects.sid");
    res.status(204).end();
  });
});

authRouter.get("/api/me", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  const user = await findUserById(req.session.userId);
  if (!user) {
    req.session.destroy(() => undefined);
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  res.json({
    id: user.id,
    username: user.username,
    themePreference: user.theme_preference,
  });
});

const themeSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
});

authRouter.patch("/api/me/theme", doubleCsrfProtection, async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  const parsed = themeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid theme" });
    return;
  }
  await updateThemePreference(req.session.userId, parsed.data.theme);
  res.status(204).end();
});

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  next();
}
