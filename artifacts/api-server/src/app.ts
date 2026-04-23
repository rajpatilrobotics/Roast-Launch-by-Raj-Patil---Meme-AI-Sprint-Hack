import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In production: serve the built React SPA from artifacts/web/dist/public
if (process.env["NODE_ENV"] === "production") {
  const candidates = [
    path.resolve(process.cwd(), "../web/dist/public"),
    path.resolve(process.cwd(), "artifacts/web/dist/public"),
    path.resolve(process.cwd(), "../../web/dist/public"),
  ];
  const staticDir = candidates.find((p) => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  });
  if (staticDir) {
    logger.info({ staticDir }, "Serving SPA static files");
    app.use(express.static(staticDir, { index: false, maxAge: "1h" }));
    // SPA fallback — anything not /api/* serves index.html
    app.get(/^(?!\/api\/).*/, (_req, res, next) => {
      const indexFile = path.join(staticDir, "index.html");
      res.sendFile(indexFile, (err) => {
        if (err) next(err);
      });
    });
  } else {
    logger.warn({ candidates }, "SPA dist not found; API-only mode");
  }
}

export default app;
