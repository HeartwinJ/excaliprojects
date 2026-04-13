import pino from "pino";
import { config } from "./config.js";

export const logger = pino({
  level: config.isProd ? "info" : "debug",
  base: { app: "excaliprojects" },
  redact: {
    paths: ["req.headers.cookie", "req.headers.authorization", "password", "*.password"],
    censor: "[redacted]",
  },
});
