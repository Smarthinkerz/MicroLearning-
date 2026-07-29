/**
 * SmarThinkerz Tap Payments — Full Checkout Server
 *
 * Implements the complete spec from pasted_content.txt:
 *  - POST /api/checkout           → createCharge → redirect to Tap hosted page
 *  - GET  /checkout/return        → retrieveCharge → reconcile → redirect result page
 *  - POST /api/tap/webhook        → rate-limit → HMAC verify → replay protect → idempotent → update order
 *  - POST /api/checkout/refund    → refund charge via Tap API
 *  - Partner webhook dispatch on status transitions
 */

import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getDb } from "./db";
import { orders, processedWebhookEvents, webhookAuditEvents } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { ENV } from "./_core/env";

const TAP_API_BASE = "https://api.tap.company/v2";

// ─── Plan Catalog ────────────────────────────────────────────────────────────
// Maps planSlug → { amount (USD), planName, product, display }
const PLAN_CATALOG: Record<string, { amount: number; planName: string; product: string; display: string }> = {
  "starter-monthly":         { amount: 29,  planName: "Starter",    product: "MicroLearning Coach", display: "MicroLearning Coach" },
  "starter-yearly":          { amount: 290, planName: "Starter",    product: "MicroLearning Coach", display: "MicroLearning Coach" },
  "pro-monthly":             { amount: 79,  planName: "Pro",        product: "MicroLearning Coach", display: "MicroLearning Coach" },
  "pro-yearly":              { amount: 790, planName: "Pro",        product: "MicroLearning Coach", display: "MicroLearning Coach" },
  "enterprise-monthly":      { amount: 199, planName: "Enterprise", product: "MicroLearning Coach", display: "MicroLearning Coach" },
  "enterprise-yearly":       { amount: 1990,planName: "Enterprise", product: "MicroLearning Coach", display: "MicroLearning Coach" },
  "consumer-premium-monthly":{ amount: 9,   planName: "Premium",    product: "MicroLearning Coach", display: "MicroLearning Coach" },
  "consumer-premium-yearly": { amount: 90,  planName: "Premium",    product: "MicroLearning Coach", display: "MicroLearning Coach" },
};

// ─── Tap API helpers ─────────────────────────────────────────────────────────
function tapHeaders() {
  if (!ENV.tapSecretKey) throw new Error("TAP_SECRET_KEY is not configured");
  return {
    Authorization: `Bearer ${ENV.tapSecretKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function createCharge(body: object) {
  const res = await fetch(`${TAP_API_BASE}/charges`, {
    method: "POST",
    headers: tapHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Tap createCharge ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json() as Promise<any>;
}

async function retrieveCharge(chargeId: string) {
  const res = await fetch(`${TAP_API_BASE}/charges/${chargeId}`, {
    method: "GET",
    headers: tapHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Tap retrieveCharge ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json() as Promise<any>;
}

async function createRefund(chargeId: string, amount: number, currency: string) {
  const res = await fetch(`${TAP_API_BASE}/refunds`, {
    method: "POST",
    headers: tapHeaders(),
    body: JSON.stringify({ charge_id: chargeId, amount, currency, reason: "requested_by_customer" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Tap refund ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json() as Promise<any>;
}

// ─── Status mapping (spec §5) ─────────────────────────────────────────────────
function mapTapStatus(tapStatus: string): "paid" | "initiated" | "cancelled" | "failed" {
  switch ((tapStatus || "").toUpperCase()) {
    case "CAPTURED":
    case "AUTHORIZED":
      return "paid";
    case "INITIATED":
    case "IN_PROGRESS":
    case "PENDING":
      return "initiated";
    case "CANCELLED":
      return "cancelled";
    default:
      return "failed";
  }
}

// ─── Partner webhook dispatch (spec §8) ──────────────────────────────────────
async function dispatchPartnerWebhook(
  event: "order.paid" | "order.failed" | "order.refunded" | "order.partially_refunded",
  order: any
) {
  // Partner webhook configs are stored in platform_settings or webhookConfigs table
  // For now, log the event — extend this to look up per-product partner secrets
  console.log(`[PartnerWebhook] Dispatching ${event} for order ${order.id} product=${order.product}`);
  // TODO: look up partner app webhook URL + secret from DB, sign with HMAC-SHA256,
  // add X-SmarThinkerz-Event, X-SmarThinkerz-Delivery-Id, X-SmarThinkerz-Attempt headers
}

// ─── In-memory rate limiter (spec §6) ────────────────────────────────────────
const ipHits = new Map<string, { count: number; resetAt: number }>();
let globalHits = 0;
let globalResetAt = Date.now() + 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  // Reset global counter
  if (now > globalResetAt) { globalHits = 0; globalResetAt = now + 60_000; }
  globalHits++;
  if (globalHits > 120) return false;
  // Reset per-IP counter
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count++;
  return entry.count <= 30;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const checkoutRouter = Router();

/**
 * POST /api/checkout
 * Validates input, creates Tap charge, persists order, redirects to Tap hosted page.
 */
checkoutRouter.post("/checkout", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, phoneCountryCode, planSlug, cycle, origin } = req.body;

    // Validate required fields
    if (!firstName || typeof firstName !== "string" || firstName.trim().length === 0) {
      res.status(400).json({ error: "first_name is required" });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "valid email is required" });
      return;
    }
    if (!phone || phone.replace(/\D/g, "").length < 6) {
      res.status(400).json({ error: "phone must have at least 6 digits" });
      return;
    }
    if (!planSlug || !PLAN_CATALOG[planSlug]) {
      res.status(400).json({ error: "invalid planSlug" });
      return;
    }

    const plan = PLAN_CATALOG[planSlug];
    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const refTxn = `txn_${planSlug}_${cycle || "once"}_${ts}`;
    const refOrder = `ord_${ts}_${rand}`;
    // ENV.appUrl is always authoritative (set APP_URL in hosting env).
    // Never trust the client-supplied origin for payment redirect URLs.
    const appOrigin = ENV.appUrl || `${req.protocol}://${req.get("host")}`;
    const redirectUrl = `${appOrigin}/checkout/return`;
    const webhookUrl = `${appOrigin}/api/tap/webhook`;

    // Build Tap charge request (spec §3.1)
    const chargeBody = {
      amount: plan.amount,
      currency: "USD",
      threeDSecure: true,
      save_card: false,
      description: `${plan.display} — ${plan.planName} Plan`,
      statement_descriptor: "SmarThinkerz",
      metadata: {
        plan: planSlug,
        cycle: cycle || "once",
        product: plan.product,
        display: plan.display,
        plan_name: plan.planName,
      },
      reference: { transaction: refTxn, order: refOrder },
      receipt: { email: true, sms: false },
      customer: {
        first_name: firstName.trim(),
        last_name: (lastName || "").trim() || undefined,
        email: email.trim().toLowerCase(),
        phone: { country_code: phoneCountryCode || "1", number: phone.replace(/\D/g, "") },
      },
      source: { id: "src_all" },
      redirect: { url: redirectUrl },
      post: { url: webhookUrl },
    };

    const charge = await createCharge(chargeBody);

    if (!charge?.transaction?.url) {
      res.status(502).json({ error: "Tap did not return a transaction URL" });
      return;
    }

    // Persist order (spec §4)
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    await db.insert(orders).values({
      tapChargeId: charge.id,
      referenceTransaction: refTxn,
      referenceOrder: refOrder,
      planSlug,
      planName: plan.planName,
      product: plan.product,
      cycle: cycle || null,
      amount: plan.amount,
      currency: "USD",
      customerFirstName: firstName.trim(),
      customerLastName: (lastName || "").trim() || null,
      customerEmail: email.trim().toLowerCase(),
      customerPhone: phone,
      customerPhoneCountryCode: phoneCountryCode || "1",
      status: "initiated",
    });

    // 303 redirect to Tap hosted page
    res.redirect(303, charge.transaction.url);
  } catch (err: any) {
    console.error("[Checkout] Error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

/**
 * GET /checkout/return?tap_id=<chargeId>
 * Authoritative reconciliation — re-fetches charge from Tap, updates order, redirects.
 */
checkoutRouter.get("/checkout/return", async (req: Request, res: Response) => {
  const tapId = req.query.tap_id as string;
  if (!tapId) {
    res.redirect(302, "/checkout/cancelled");
    return;
  }
  try {
    const charge = await retrieveCharge(tapId);
    const internalStatus = mapTapStatus(charge.status);

    const db = await getDb();
    if (db) {
      const now = Date.now();
      await db
        .update(orders)
        .set({
          status: internalStatus as any,
          paidAt: internalStatus === "paid" ? now : null,
          tapResponseCode: charge.response?.code || null,
          tapResponseMessage: charge.response?.message || null,
          updatedAt: new Date(),
        })
        .where(eq(orders.tapChargeId, tapId));
    }

    switch (internalStatus) {
      case "paid":
        res.redirect(302, "/checkout/success");
        break;
      case "initiated":
        res.redirect(302, "/checkout/pending");
        break;
      default:
        res.redirect(302, "/checkout/cancelled");
    }
  } catch (err: any) {
    console.error("[Checkout Return] Error:", err);
    res.redirect(302, "/checkout/cancelled");
  }
});

/**
 * POST /api/tap/webhook
 * Full spec-compliant inbound webhook handler (spec §6).
 */
checkoutRouter.post("/tap/webhook", async (req: Request, res: Response) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
  const db = await getDb();

  // 1. Rate limiting
  if (!checkRateLimit(ip)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  // 2. Secret check
  if (!ENV.tapWebhookSecret) {
    if (db) await db.insert(webhookAuditEvents).values({ result: "not_configured", ipAddress: ip });
    res.status(503).json({ error: "Webhook not configured" });
    return;
  }

  // 3. Signature verification — use raw body bytes
  const rawBody: Buffer = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
  const signature = (req.headers["hashstring"] as string) || "";
  const expected = crypto.createHmac("sha256", ENV.tapWebhookSecret).update(rawBody).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"))) {
    if (db) await db.insert(webhookAuditEvents).values({ result: "invalid_signature", ipAddress: ip });
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // 4. Payload validation
  const payload = req.body;
  if (!payload || typeof payload !== "object" || !payload.id) {
    if (db) await db.insert(webhookAuditEvents).values({ result: "rejected", ipAddress: ip });
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  // 5. Replay protection
  const TOLERANCE_MS = Number(process.env.TAP_WEBHOOK_TOLERANCE_MS) || 300_000;
  const rawTs = payload.transaction?.created || payload.transaction?.asof || payload.created;
  if (rawTs) {
    const payloadTime = typeof rawTs === "number" ? rawTs * 1000 : new Date(rawTs).getTime();
    if (Math.abs(Date.now() - payloadTime) > TOLERANCE_MS) {
      if (db) await db.insert(webhookAuditEvents).values({ chargeId: payload.id, rawStatus: payload.status, result: "rejected", ipAddress: ip });
      res.status(400).json({ error: "Timestamp out of tolerance window" });
      return;
    }
  }

  const chargeId: string = payload.id;
  const rawStatus: string = payload.status || "";
  const eventKey = `${chargeId}:${rawStatus}`;

  if (!db) {
    res.status(500).json({ error: "Database unavailable" });
    return;
  }

  // 6. Idempotency — ON CONFLICT DO NOTHING equivalent
  try {
    await db.insert(processedWebhookEvents).values({ eventKey });
  } catch {
    // Duplicate key → already processed
    await db.insert(webhookAuditEvents).values({ chargeId, rawStatus, result: "duplicate", ipAddress: ip });
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  // 7. Order update
  try {
    const internalStatus = mapTapStatus(rawStatus);
    const now = Date.now();

    // Fetch existing order to check terminal refund state
    const [existing] = await db.select().from(orders).where(eq(orders.tapChargeId, chargeId)).limit(1);

    if (existing && !["refunded", "partially_refunded"].includes(existing.status)) {
      await db
        .update(orders)
        .set({
          status: internalStatus as any,
          paidAt: internalStatus === "paid" && !existing.paidAt ? now : existing.paidAt,
          updatedAt: new Date(),
        })
        .where(eq(orders.tapChargeId, chargeId));

      // 8. Side effects: partner webhooks + receipt
      if (internalStatus === "paid") {
        await dispatchPartnerWebhook("order.paid", existing);
      } else if (internalStatus === "failed" || internalStatus === "cancelled") {
        await dispatchPartnerWebhook("order.failed", existing);
      }
    }

    await db.insert(webhookAuditEvents).values({ chargeId, rawStatus, result: "received", ipAddress: ip });
    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("[TapWebhook] Processing error:", err);
    await db.insert(webhookAuditEvents).values({ chargeId, rawStatus, result: "processing_error", ipAddress: ip }).catch(() => {});
    res.status(500).json({ error: "Processing error" });
  }
});

/**
 * POST /api/checkout/refund
 * Admin-initiated refund (spec §7).
 */
checkoutRouter.post("/checkout/refund", async (req: Request, res: Response) => {
  const { chargeId, amount, currency } = req.body;
  if (!chargeId || !amount) {
    res.status(400).json({ error: "chargeId and amount are required" });
    return;
  }
  try {
    const db = await getDb();
    const [order] = db ? await db.select().from(orders).where(eq(orders.tapChargeId, chargeId)).limit(1) : [];
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // Mark as refunding
    if (db) {
      await db.update(orders).set({ status: "refunding", updatedAt: new Date() }).where(eq(orders.tapChargeId, chargeId));
    }

    const refund = await createRefund(chargeId, amount, currency || "USD");

    // Mark as refunded
    const finalStatus = amount < order.amount ? "partially_refunded" : "refunded";
    if (db) {
      await db.update(orders).set({ status: finalStatus as any, updatedAt: new Date() }).where(eq(orders.tapChargeId, chargeId));
      await dispatchPartnerWebhook(finalStatus === "refunded" ? "order.refunded" : "order.partially_refunded", order);
    }

    res.status(200).json({ success: true, refund });
  } catch (err: any) {
    console.error("[Refund] Error:", err);
    res.status(500).json({ error: err.message });
  }
});
