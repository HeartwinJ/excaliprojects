import { Router } from "express";
import { pingDb } from "../db/pool.js";

export const healthRouter = Router();

healthRouter.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

healthRouter.get("/readyz", async (_req, res) => {
  const dbOk = await pingDb();
  if (dbOk) {
    res.status(200).json({ status: "ok", db: "ok" });
  } else {
    res.status(503).json({ status: "unavailable", db: "down" });
  }
});
