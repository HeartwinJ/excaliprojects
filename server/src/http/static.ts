import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import express from "express";

const clientDist = fileURLToPath(new URL("../../../client/dist", import.meta.url));

export function mountClient(app: express.Express): void {
  if (!existsSync(clientDist)) {
    // client hasn't been built yet (e.g. dev mode). Skip mounting.
    return;
  }

  const staticOptions = {
    index: false,
    maxAge: "1h",
    setHeaders: (res: express.Response, filePath: string): void => {
      // long-cache hashed asset files, short-cache everything else.
      if (/\/assets\/[^/]+\.[a-z0-9]+\.(js|css|svg|png|woff2?)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      }
    },
  };

  app.use(express.static(clientDist, staticOptions));

  // SPA fallback for non-API, non-asset routes.
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/healthz") || req.path.startsWith("/readyz")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}
