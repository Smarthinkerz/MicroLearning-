import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb, insertUptimeSnapshot, getAllUptimeHistory, pruneOldUptimeHistory } from "../db";
import { sql } from "drizzle-orm";

// ─── Service Health Check Types ─────────────────────────────────────
interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down" | "unknown";
  latencyMs: number | null;
  lastChecked: number;
  message?: string;
}

interface SystemMetrics {
  uptime: number;
  totalRequests24h: number;
  errorRate24h: number;
  avgResponseTime: number;
}

// ─── Constants ──────────────────────────────────────────────────────
const SERVICE_NAMES = [
  "Application Server",
  "Database (PostgreSQL)",
  "Email Service (Resend)",
  "Payment Gateway (Tap)",
  "AI/LLM Service",
  "Voice Service (ElevenLabs)",
];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Health Check Functions ─────────────────────────────────────────

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    await db.execute(sql`SELECT 1`);
    const latency = Date.now() - start;
    return {
      name: "Database (PostgreSQL)",
      status: latency < 500 ? "operational" : "degraded",
      latencyMs: latency,
      lastChecked: Date.now(),
      message: latency < 500 ? "Connected and responsive" : "High latency detected",
    };
  } catch (err: any) {
    return {
      name: "Database (PostgreSQL)",
      status: "down",
      latencyMs: null,
      lastChecked: Date.now(),
      message: `Connection failed: ${err.message?.substring(0, 100)}`,
    };
  }
}

async function checkResendEmail(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        name: "Email Service (Resend)",
        status: "unknown",
        latencyMs: null,
        lastChecked: Date.now(),
        message: "API key not configured",
      };
    }
    const res = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;
    if (res.ok || res.status === 200) {
      return {
        name: "Email Service (Resend)",
        status: latency < 2000 ? "operational" : "degraded",
        latencyMs: latency,
        lastChecked: Date.now(),
        message: "API reachable",
      };
    }
    return {
      name: "Email Service (Resend)",
      status: res.status === 401 ? "degraded" : "down",
      latencyMs: latency,
      lastChecked: Date.now(),
      message: `HTTP ${res.status}: ${res.statusText}`,
    };
  } catch (err: any) {
    return {
      name: "Email Service (Resend)",
      status: "down",
      latencyMs: null,
      lastChecked: Date.now(),
      message: `Unreachable: ${err.message?.substring(0, 100)}`,
    };
  }
}

async function checkTapPayments(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const secretKey = process.env.TAP_SECRET_KEY;
    if (!secretKey) {
      return {
        name: "Payment Gateway (Tap)",
        status: "unknown",
        latencyMs: null,
        lastChecked: Date.now(),
        message: "API keys not configured — awaiting activation",
      };
    }
    const res = await fetch("https://api.tap.company/v2/charges/list", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ period: { date: { from: Date.now() - 60000, to: Date.now() } }, limit: 1 }),
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;
    if (res.ok || res.status === 200) {
      return {
        name: "Payment Gateway (Tap)",
        status: latency < 3000 ? "operational" : "degraded",
        latencyMs: latency,
        lastChecked: Date.now(),
        message: "API reachable",
      };
    }
    return {
      name: "Payment Gateway (Tap)",
      status: "degraded",
      latencyMs: latency,
      lastChecked: Date.now(),
      message: `HTTP ${res.status}: ${res.statusText}`,
    };
  } catch (err: any) {
    return {
      name: "Payment Gateway (Tap)",
      status: "down",
      latencyMs: null,
      lastChecked: Date.now(),
      message: `Unreachable: ${err.message?.substring(0, 100)}`,
    };
  }
}

async function checkLLMService(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const apiUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiUrl || !apiKey) {
      return {
        name: "AI/LLM Service",
        status: "unknown",
        latencyMs: null,
        lastChecked: Date.now(),
        message: "OPENAI_API_KEY is not configured",
      };
    }
    const modelsUrl = apiUrl.endsWith("/v1") ? `${apiUrl}/models` : `${apiUrl}/v1/models`;
    const res = await fetch(modelsUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;
    return {
      name: "AI/LLM Service",
      status: res.ok ? (latency < 2000 ? "operational" : "degraded") : "down",
      latencyMs: latency,
      lastChecked: Date.now(),
      message: res.ok ? "Models endpoint reachable" : `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      name: "AI/LLM Service",
      status: "down",
      latencyMs: null,
      lastChecked: Date.now(),
      message: `Unreachable: ${err.message?.substring(0, 100)}`,
    };
  }
}

async function checkElevenLabs(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return {
        name: "Voice Service (ElevenLabs)",
        status: "unknown",
        latencyMs: null,
        lastChecked: Date.now(),
        message: "API key not configured",
      };
    }
    // A key limited to Text-to-Speech may not have permission to list voices.
    // An intentionally empty request validates the TTS permission without spending credits.
    const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text: "", model_id: "eleven_multilingual_v2" }),
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;
    const authorized = res.ok || res.status === 400 || res.status === 422;
    return {
      name: "Voice Service (ElevenLabs)",
      status: authorized ? (latency < 2000 ? "operational" : "degraded") : "down",
      latencyMs: latency,
      lastChecked: Date.now(),
      message: authorized ? "Text-to-Speech authorization confirmed" : `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      name: "Voice Service (ElevenLabs)",
      status: "down",
      latencyMs: null,
      lastChecked: Date.now(),
      message: `Unreachable: ${err.message?.substring(0, 100)}`,
    };
  }
}

function getAppService(): ServiceStatus {
  return {
    name: "Application Server",
    status: "operational",
    latencyMs: 0,
    lastChecked: Date.now(),
    message: "Running",
  };
}

// ─── In-Memory Metrics Store ────────────────────────────────────────
const metricsStore = {
  requestCount: 0,
  errorCount: 0,
  totalResponseTime: 0,
  startedAt: Date.now(),
};

export function recordRequest(durationMs: number, isError: boolean) {
  metricsStore.requestCount++;
  metricsStore.totalResponseTime += durationMs;
  if (isError) metricsStore.errorCount++;
}

// ─── Persist Uptime Snapshots ───────────────────────────────────────
// Called after each full status check to store history
async function persistServiceStatuses(services: ServiceStatus[]) {
  const now = Date.now();
  for (const svc of services) {
    try {
      await insertUptimeSnapshot({
        serviceName: svc.name,
        status: svc.status,
        latencyMs: svc.latencyMs ?? undefined,
        message: svc.message ?? undefined,
        checkedAt: now,
      });
    } catch {
      // Silently ignore persistence failures — don't break health checks
    }
  }
  // Prune entries older than 8 days (keep buffer beyond 7-day window)
  try {
    await pruneOldUptimeHistory(now - 8 * 24 * 60 * 60 * 1000);
  } catch { /* ignore */ }
}

// ─── Status Page Router ─────────────────────────────────────────────
export const statusPageRouter = router({
  // Public health check (lightweight, no auth required)
  health: publicProcedure.query(async () => {
    const dbStatus = await checkDatabase();
    const allOperational = dbStatus.status === "operational";
    return {
      status: allOperational ? "healthy" : "degraded",
      timestamp: Date.now(),
      database: dbStatus.status,
    };
  }),

  // Full status check (admin only)
  fullStatus: adminProcedure.query(async () => {
    const [dbStatus, resendStatus, tapStatus, llmStatus, elevenLabsStatus] =
      await Promise.all([
        checkDatabase(),
        checkResendEmail(),
        checkTapPayments(),
        checkLLMService(),
        checkElevenLabs(),
      ]);

    const appStatus = getAppService();

    const services: ServiceStatus[] = [
      appStatus,
      dbStatus,
      resendStatus,
      tapStatus,
      llmStatus,
      elevenLabsStatus,
    ];

    // Calculate overall status
    const statuses = services.map((s) => s.status);
    const hasDown = statuses.includes("down");
    const hasDegraded = statuses.includes("degraded");
    const overallStatus = hasDown
      ? "partial_outage"
      : hasDegraded
        ? "degraded"
        : "all_operational";

    // System metrics
    const uptimeMs = Date.now() - metricsStore.startedAt;
    const metrics: SystemMetrics = {
      uptime: uptimeMs,
      totalRequests24h: metricsStore.requestCount,
      errorRate24h:
        metricsStore.requestCount > 0
          ? Math.round(
              (metricsStore.errorCount / metricsStore.requestCount) * 10000
            ) / 100
          : 0,
      avgResponseTime:
        metricsStore.requestCount > 0
          ? Math.round(
              metricsStore.totalResponseTime / metricsStore.requestCount
            )
          : 0,
    };

    // Persist snapshots asynchronously (don't block response)
    persistServiceStatuses(services).catch(() => {});

    return {
      overallStatus,
      services,
      metrics,
      checkedAt: Date.now(),
    };
  }),

  // Refresh a single service check (admin only)
  checkService: adminProcedure
    .input(z.object({ service: z.string() }))
    .mutation(async ({ input }) => {
      let result: ServiceStatus;
      switch (input.service) {
        case "database":
          result = await checkDatabase();
          break;
        case "resend":
          result = await checkResendEmail();
          break;
        case "tap":
          result = await checkTapPayments();
          break;
        case "llm":
          result = await checkLLMService();
          break;
        case "elevenlabs":
          result = await checkElevenLabs();
          break;
        case "app":
          result = getAppService();
          break;
        default:
          result = {
            name: input.service,
            status: "unknown" as const,
            latencyMs: null,
            lastChecked: Date.now(),
            message: "Unknown service",
          };
      }
      // Persist single service check
      persistServiceStatuses([result]).catch(() => {});
      return result;
    }),

  // Get 7-day uptime history for all services
  getUptimeHistory: adminProcedure.query(async () => {
    const sinceTs = Date.now() - SEVEN_DAYS_MS;
    const history = await getAllUptimeHistory(sinceTs);

    // Group by service name, then bucket into 4-hour intervals
    const BUCKET_SIZE_MS = 4 * 60 * 60 * 1000; // 4 hours = 42 buckets over 7 days
    const bucketStart = Math.floor(sinceTs / BUCKET_SIZE_MS) * BUCKET_SIZE_MS;
    const now = Date.now();

    // Build service → bucket → aggregated status map
    const serviceMap = new Map<string, Map<number, { statuses: string[]; latencies: number[] }>>();

    for (const name of SERVICE_NAMES) {
      serviceMap.set(name, new Map());
    }

    for (const entry of history) {
      const svcBuckets = serviceMap.get(entry.serviceName);
      if (!svcBuckets) continue;
      const bucketKey = Math.floor(entry.checkedAt / BUCKET_SIZE_MS) * BUCKET_SIZE_MS;
      if (!svcBuckets.has(bucketKey)) {
        svcBuckets.set(bucketKey, { statuses: [], latencies: [] });
      }
      const bucket = svcBuckets.get(bucketKey)!;
      bucket.statuses.push(entry.status);
      if (entry.latencyMs !== null) {
        bucket.latencies.push(entry.latencyMs);
      }
    }

    // Generate time labels (bucket timestamps)
    const timeLabels: number[] = [];
    for (let t = bucketStart; t <= now; t += BUCKET_SIZE_MS) {
      timeLabels.push(t);
    }

    // Build per-service timeline
    const services: {
      name: string;
      timeline: {
        timestamp: number;
        status: "operational" | "degraded" | "down" | "unknown" | "no_data";
        avgLatencyMs: number | null;
        checkCount: number;
      }[];
      uptimePercent: number;
    }[] = [];

    for (const name of SERVICE_NAMES) {
      const svcBuckets = serviceMap.get(name)!;
      let totalBuckets = 0;
      let operationalBuckets = 0;

      const timeline = timeLabels.map((ts) => {
        const bucket = svcBuckets.get(ts);
        if (!bucket || bucket.statuses.length === 0) {
          return {
            timestamp: ts,
            status: "no_data" as const,
            avgLatencyMs: null,
            checkCount: 0,
          };
        }

        totalBuckets++;
        // Determine bucket status: worst status wins
        const hasDown = bucket.statuses.includes("down");
        const hasDegraded = bucket.statuses.includes("degraded");
        const bucketStatus = hasDown ? "down" : hasDegraded ? "degraded" : "operational";

        if (bucketStatus === "operational") operationalBuckets++;

        const avgLatency = bucket.latencies.length > 0
          ? Math.round(bucket.latencies.reduce((a, b) => a + b, 0) / bucket.latencies.length)
          : null;

        return {
          timestamp: ts,
          status: bucketStatus as "operational" | "degraded" | "down",
          avgLatencyMs: avgLatency,
          checkCount: bucket.statuses.length,
        };
      });

      const uptimePercent = totalBuckets > 0
        ? Math.round((operationalBuckets / totalBuckets) * 10000) / 100
        : 100; // No data = assume operational

      services.push({ name, timeline, uptimePercent });
    }

    return {
      services,
      timeLabels,
      bucketSizeMs: BUCKET_SIZE_MS,
      sinceTs,
    };
  }),
});
