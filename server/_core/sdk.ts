/**
 * Supabase Auth SDK — replaces Manus OAuth
 *
 * Authentication flow:
 * 1. Frontend calls supabase.auth.signIn* → receives access_token (JWT)
 * 2. Frontend sends JWT in Authorization: Bearer <token> header (or cookie)
 * 3. Server verifies JWT using SUPABASE_JWT_SECRET
 * 4. Server upserts user into local `users` table keyed by supabase UUID
 */

import { ForbiddenError } from "@shared/_core/errors";
import { jwtVerify, createRemoteJWKSet } from "jose";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

// ─── Types ────────────────────────────────────────────────────────────

export type SupabaseJwtPayload = {
  sub: string;          // Supabase user UUID
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
  app_metadata?: {
    role?: string;
  };
  aud: string;
  exp: number;
  iat: number;
};

// ─── JWKS Setup ───────────────────────────────────────────────────────
// NOTE: Do NOT read process.env at module level — esbuild may inline an
// empty string at build time. Instead, read lazily inside the function.
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let _jwksUrl: string | null = null;

function getJwks() {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  if (!supabaseUrl) return null;
  const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
  // Re-create the JWKS set if the URL has changed (env hot-reload)
  if (!_jwks || _jwksUrl !== jwksUrl) {
    _jwks = createRemoteJWKSet(new URL(jwksUrl));
    _jwksUrl = jwksUrl;
  }
  return _jwks;
}

function getAlgorithmFromToken(token: string): string {
  try {
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    return header.alg ?? 'HS256';
  } catch {
    return 'HS256';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // Fallback: check cookie (for browser-based flows)
  const cookieHeader = req.headers.cookie ?? "";
  const match = cookieHeader.match(/sb-access-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── SDK Class ────────────────────────────────────────────────────────

class SDKServer {
  /**
   * Verify a Supabase JWT and return the payload.
   * Supports both ES256 (new asymmetric keys) and HS256 (legacy secret).
   */
  async verifySupabaseJwt(token: string): Promise<SupabaseJwtPayload | null> {
    const alg = getAlgorithmFromToken(token);

    // Try ES256 via JWKS first (new Supabase default)
    if (alg === 'ES256') {
      const jwks = getJwks();
      if (jwks) {
        try {
          const { payload } = await jwtVerify(token, jwks, {
            algorithms: ["ES256"],
          });
          return payload as unknown as SupabaseJwtPayload;
        } catch (error) {
          console.warn("[Auth] ES256 JWKS verification failed:", String(error));
        }
      }
    }

    // Fallback: try HS256 with Legacy JWT Secret
    const legacySecret = ENV.supabaseJwtSecret ?? ENV.cookieSecret;
    if (legacySecret) {
      try {
        const secretKey = new TextEncoder().encode(legacySecret);
        const { payload } = await jwtVerify(token, secretKey, {
          algorithms: ["HS256"],
        });
        return payload as unknown as SupabaseJwtPayload;
      } catch (error) {
        console.warn("[Auth] HS256 legacy verification failed:", String(error));
      }
    }

    console.warn("[Auth] JWT verification failed for alg:", alg);
    return null;
  }

  /**
   * Authenticate an incoming Express request.
   * Extracts the Supabase JWT from Authorization header or cookie,
   * verifies it, and returns the local User record (creating it if needed).
   */
  async authenticateRequest(req: Request): Promise<User> {
    const token = extractBearerToken(req);
    if (!token) {
      throw ForbiddenError("Missing authentication token");
    }

    const payload = await this.verifySupabaseJwt(token);
    if (!payload?.sub) {
      throw ForbiddenError("Invalid or expired token");
    }

    const supabaseId = payload.sub;
    const signedInAt = new Date();

    // Upsert user into local users table
    await db.upsertUser({
      supabaseId,
      name: payload.user_metadata?.full_name ?? payload.user_metadata?.name ?? null,
      email: payload.email ?? null,
      avatarUrl: payload.user_metadata?.avatar_url ?? null,
      lastSignedIn: signedInAt,
    });

    const user = await db.getUserBySupabaseId(supabaseId);
    if (!user) {
      throw ForbiddenError("User not found after upsert");
    }

    return user;
  }
}

export const sdk = new SDKServer();
