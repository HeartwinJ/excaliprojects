import express from "express";

const app = express();
const port = Number(process.env.APP_PORT ?? 3000);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`[excaliprojects] server listening on :${port}`);
});
