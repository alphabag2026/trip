import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { createExternalApiRouter } from "../externalApi";
import { createTelegramWebhookRouter } from "../telegramWebhook";
import { kakaoRouter } from "../kakaoAuth";
import { googleRouter } from "../googleAuth";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  // Trust proxy headers (Cloud Run, nginx, etc.) so req.hostname reflects the public domain
  app.set("trust proxy", true);
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Safety redirect: any attempt to access old Manus OAuth callback → redirect to /login
  app.get("/api/oauth/callback", (_req, res) => {
    res.redirect(302, "/login");
  });
  // Kakao OAuth routes
  app.use(kakaoRouter);
  // Google OAuth routes
  app.use(googleRouter);
  // External REST API (v1)
  app.use("/api/v1", createExternalApiRouter());
  // Telegram Bot Webhook
  app.use("/api/telegram/webhook", createTelegramWebhookRouter());
  // Client Error Reporting (lightweight error monitoring)
  app.post("/api/error-reports", (req, res) => {
    try {
      const { errors } = req.body || {};
      if (Array.isArray(errors) && errors.length > 0) {
        const timestamp = new Date().toISOString();
        for (const err of errors.slice(0, 20)) {
          console.error(`[ClientError] ${timestamp} | ${err.type} | ${err.message} | ${err.url} | ${err.source || ''}:${err.lineno || ''}:${err.colno || ''}`);
        }
      }
      res.status(204).end();
    } catch {
      res.status(204).end();
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
