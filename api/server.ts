/**
 * Vercel Serverless Function Entry Point
 *
 * This file wraps the Express app for Vercel's serverless runtime.
 * All /api/* routes and /checkout/* routes are handled here.
 *
 * The Vite-built static frontend (dist/public/) is served by Vercel's
 * CDN directly via the outputDirectory setting in vercel.json.
 */
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { generalLimiter, trpcRateLimiter } from "../server/middleware/rateLimiter";
import { tapWebhookRouter } from "../server/webhooks/tapWebhook";
import { checkoutRouter } from "../server/checkout";
import helmet from "helmet";

const app = express();

// Trust proxy for correct IP detection behind Vercel's edge
app.set("trust proxy", 1);

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Rate limiting
app.use("/api", generalLimiter);

// Security headers
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

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Tap payment webhook (needs raw body)
app.use("/api/webhooks", tapWebhookRouter);

// Tap Payments: checkout POST, return GET, webhook POST, refund POST
app.use("/api", checkoutRouter);
app.use("/", checkoutRouter);

// Auth routes
registerOAuthRoutes(app);

// tRPC API
app.use(
  "/api/trpc",
  trpcRateLimiter,
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
