import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { autoSeedLessons, autoSeedPlans } from "../autoSeed";
import { generalLimiter, trpcRateLimiter } from "../middleware/rateLimiter";
import { tapWebhookRouter } from "../webhooks/tapWebhook";
import { checkoutRouter } from "../checkout";
import helmet from "helmet";

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
  // Railway injects PORT env var; respect it if set
  if (await isPortAvailable(startPort)) {
    return startPort;
  }
  throw new Error(`Port ${startPort} is not available. Kill any existing processes and retry.`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Trust proxy for correct IP detection behind load balancers
  app.set("trust proxy", 1);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Global rate limiting on all API routes
  app.use("/api", generalLimiter);

  // Security headers via Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'", "https://api.elevenlabs.io", "https://api.tap.company", "wss:", "ws:"],
        upgradeInsecureRequests: [],
        workerSrc: ["'self'", "blob:"],
        mediaSrc: ["'self'", "https:", "blob:"],
        frameSrc: ["'self'", "https://tap.company", "https://checkout.tap.company"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow cross-origin resources (CDN images, fonts)
    crossOriginResourcePolicy: { policy: "cross-origin" },
    xFrameOptions: false, // Disabled — frame-ancestors in CSP handles this
  }));

  // Health check endpoint (bypasses rate limiting via skip)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Tap payment webhook (before tRPC, needs raw body access)
  app.use("/api/webhooks", tapWebhookRouter);

  // Tap Payments: checkout POST, return GET, webhook POST, refund POST
  app.use("/api", checkoutRouter);
  app.use("/", checkoutRouter);

  // OAuth callback under /api/oauth/callback
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

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
    // Auto-seed the lesson library on startup
    autoSeedLessons().catch(err => console.error("[AutoSeed] Error:", err));
    autoSeedPlans().catch(err => console.error("[AutoSeed Plans] Error:", err));
  });
}

startServer().catch(console.error);
