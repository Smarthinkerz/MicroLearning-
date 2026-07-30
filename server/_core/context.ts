import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error: any) {
    // Authentication is optional for public procedures.
    // Log non-trivial errors (not just "missing token" which is expected for public routes)
    const msg = error?.message ?? String(error);
    if (!msg.includes('Missing authentication token') && !msg.includes('Missing session cookie')) {
      console.error('[Auth] authenticateRequest error:', msg, error?.cause ? String(error.cause) : '');
    }
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
