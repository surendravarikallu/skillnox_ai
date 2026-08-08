import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Hashed assets (JS, CSS, fonts) get immutable 1-year cache
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  // Other static files (favicon, etc.) get short cache
  app.use(express.static(distPath, {
    maxAge: "1h",
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
