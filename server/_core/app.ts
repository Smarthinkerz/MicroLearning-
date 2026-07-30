/**
 * Express App Factory
 *
 * Exports the configured Express app WITHOUT starting a server.
 * Used by:
 * - api/server.js (Vercel serverless function)
 * - server/_core/index.ts (standalone server for Railway/Render/Docker)
 */
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { generalLimiter, trpcRateLimiter } from "../middleware/rateLimiter";
import { tapWebhookRouter } from "../webhooks/tapWebhook";
import { checkoutRouter } from "../checkout";
import helmet from "helmet";

export function createApp() {
  const app = express();

  // Trust proxy for correct IP detection behind load balancers / Vercel edge
  app.set("trust proxy", 1);

  // Body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Global rate limiting on all API routes
  app.use("/api", generalLimiter);

  // Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://cdn.jsdelivr.net",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net",
          ],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "https://cdn.jsdelivr.net",
          ],
          connectSrc: [
            "'self'",
            "https://api.elevenlabs.io",
            "https://api.tap.company",
            "https://cfrtyfrodcbcciimrdea.supabase.co",
            "wss:",
            "ws:",
          ],
          upgradeInsecureRequests: [],
          workerSrc: ["'self'", "blob:"],
          mediaSrc: ["'self'", "https:", "blob:"],
          frameSrc: [
            "'self'",
            "https://tap.company",
            "https://checkout.tap.company",
          ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      xFrameOptions: false,
    })
  );

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Tap payment webhook (before tRPC, needs raw body access)
  app.use("/api/webhooks", tapWebhookRouter);

  // Tap Payments: checkout POST, return GET, webhook POST, refund POST
  app.use("/api", checkoutRouter);
  app.use("/", checkoutRouter);

  // Auth routes (/api/auth/me, /api/auth/logout)
  registerOAuthRoutes(app);

  // tRPC API with path-based rate limiting
  app.use(
    "/api/trpc",
    trpcRateLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}

export default createApp();
