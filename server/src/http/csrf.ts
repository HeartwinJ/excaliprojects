import type { Request } from "express";
import { doubleCsrf } from "csrf-csrf";
import { config } from "../config.js";

const useSecureCookie = config.publicUrl.protocol === "https:";

export const {
  doubleCsrfProtection,
  generateToken,
  invalidCsrfTokenError,
} = doubleCsrf({
  getSecret: () => config.SESSION_SECRET,
  getSessionIdentifier: (req) => req.sessionID ?? "anonymous",
  cookieName: useSecureCookie ? "__Host-excaliprojects.csrf" : "excaliprojects.csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookie,
    path: "/",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getTokenFromRequest: (req: Request) => {
    const headerToken = req.headers["x-csrf-token"];
    if (typeof headerToken === "string") return headerToken;
    const bodyToken = (req.body as { _csrf?: unknown } | undefined)?._csrf;
    return typeof bodyToken === "string" ? bodyToken : undefined;
  },
});
