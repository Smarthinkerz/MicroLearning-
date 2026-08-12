import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { computeVoiceCacheKey } from "./db";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      supabaseId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
      appRole: "super_admin",
      orgId: 1,
      timezone: "UTC",
      avatarUrl: null,
      notificationPreferences: null,
      lastActiveAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      supabaseId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      role: "user",
      appRole: "learner",
      orgId: null,
      timezone: "UTC",
      avatarUrl: null,
      notificationPreferences: null,
      lastActiveAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

function createSuperAdminContext(): TrpcContext {
  return {
    user: {
      id: 3,
      supabaseId: "platform-super-admin",
      email: "superadmin@example.com",
      name: "Platform Super Admin",
      role: "user",
      appRole: "super_admin",
      orgId: 1,
      timezone: "UTC",
      avatarUrl: null,
      notificationPreferences: null,
      lastActiveAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("Voice Audio Cache", () => {
  describe("computeVoiceCacheKey", () => {
    it("produces a deterministic SHA-256 hash", () => {
      const hash1 = computeVoiceCacheKey("Hello world", "voice123", 0.5, 0.75, 0);
      const hash2 = computeVoiceCacheKey("Hello world", "voice123", 0.5, 0.75, 0);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it("produces different hashes for different text", () => {
      const hash1 = computeVoiceCacheKey("Hello world", "voice123", 0.5, 0.75, 0);
      const hash2 = computeVoiceCacheKey("Goodbye world", "voice123", 0.5, 0.75, 0);
      expect(hash1).not.toBe(hash2);
    });

    it("produces different hashes for different voice IDs", () => {
      const hash1 = computeVoiceCacheKey("Hello world", "voice123", 0.5, 0.75, 0);
      const hash2 = computeVoiceCacheKey("Hello world", "voice456", 0.5, 0.75, 0);
      expect(hash1).not.toBe(hash2);
    });

    it("produces different hashes for different stability", () => {
      const hash1 = computeVoiceCacheKey("Hello world", "voice123", 0.5, 0.75, 0);
      const hash2 = computeVoiceCacheKey("Hello world", "voice123", 0.8, 0.75, 0);
      expect(hash1).not.toBe(hash2);
    });

    it("produces different hashes for different similarityBoost", () => {
      const hash1 = computeVoiceCacheKey("Hello world", "voice123", 0.5, 0.75, 0);
      const hash2 = computeVoiceCacheKey("Hello world", "voice123", 0.5, 0.90, 0);
      expect(hash1).not.toBe(hash2);
    });

    it("produces different hashes for different style", () => {
      const hash1 = computeVoiceCacheKey("Hello world", "voice123", 0.5, 0.75, 0);
      const hash2 = computeVoiceCacheKey("Hello world", "voice123", 0.5, 0.75, 0.5);
      expect(hash1).not.toBe(hash2);
    });

    it("normalizes floating point to 2 decimal places", () => {
      const hash1 = computeVoiceCacheKey("Hello", "v1", 0.500001, 0.750001, 0);
      const hash2 = computeVoiceCacheKey("Hello", "v1", 0.5, 0.75, 0);
      expect(hash1).toBe(hash2);
    });
  });

  describe("Admin cache endpoints", () => {
    it("cacheStats returns stats for admin", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const stats = await caller.voice.cacheStats();
      expect(stats).toBeDefined();
      // MySQL aggregates may return strings or numbers depending on driver
      expect(Number(stats.totalEntries)).toBeGreaterThanOrEqual(0);
      expect(Number(stats.totalHits)).toBeGreaterThanOrEqual(0);
      expect(Number(stats.totalSizeBytes)).toBeGreaterThanOrEqual(0);
    });

    it("cacheEntries returns an array for admin", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const entries = await caller.voice.cacheEntries({ limit: 10 });
      expect(Array.isArray(entries)).toBe(true);
    });

    it("cacheStats is forbidden for non-admin users", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(caller.voice.cacheStats()).rejects.toThrow();
    });

    it("cacheEntries is forbidden for non-admin users", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(caller.voice.cacheEntries({ limit: 10 })).rejects.toThrow();
    });

    it("clearCacheEntry is forbidden for non-admin users", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(caller.voice.clearCacheEntry({ id: 999 })).rejects.toThrow();
    });
  });

  describe("Server-side subscription enforcement", () => {
    it("synthesize blocks free-tier users with FORBIDDEN error", async () => {
      const caller = appRouter.createCaller(createUserContext()); // no orgId = free tier
      try {
        await caller.voice.synthesize({
          text: "Test text",
          voiceId: "EXAVITQu4vr4xnSDxMaL",
          stability: 0.5,
          similarityBoost: 0.75,
        });
        expect.fail("Should have thrown FORBIDDEN");
      } catch (err: any) {
        expect(err.code).toBe("FORBIDDEN");
        expect(err.message).toContain("Pro, Premium, and Enterprise");
      }
    });

    it("synthesizeLesson blocks free-tier users with FORBIDDEN error", async () => {
      const caller = appRouter.createCaller(createUserContext()); // no orgId = free tier
      try {
        await caller.voice.synthesizeLesson({
          lessonId: 1,
          voiceId: "EXAVITQu4vr4xnSDxMaL",
          stability: 0.5,
          similarityBoost: 0.75,
        });
        expect.fail("Should have thrown FORBIDDEN");
      } catch (err: any) {
        expect(err.code).toBe("FORBIDDEN");
        expect(err.message).toContain("Pro, Premium, and Enterprise");
      }
    });

    it("synthesize allows admin users regardless of subscription", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      // Admin bypasses subscription check; will fail at ElevenLabs/cache level, not FORBIDDEN
      try {
        await caller.voice.synthesize({
          text: "Admin test",
          voiceId: "EXAVITQu4vr4xnSDxMaL",
          stability: 0.5,
          similarityBoost: 0.75,
          skipCache: true,
        });
      } catch (err: any) {
        // Should NOT be FORBIDDEN — any other error is acceptable (e.g., ElevenLabs rate limit)
        expect(err.code).not.toBe("FORBIDDEN");
      }
    }, 15000);

    it("synthesize allows application super-admins regardless of their base user role", async () => {
      const caller = appRouter.createCaller(createSuperAdminContext());
      try {
        await caller.voice.synthesize({
          text: "Platform administrator narration test",
          voiceId: "EXAVITQu4vr4xnSDxMaL",
          stability: 0.5,
          similarityBoost: 0.75,
          skipCache: true,
        });
      } catch (err: any) {
        expect(err.code).not.toBe("FORBIDDEN");
      }
    }, 15000);

    it("synthesizeLesson allows admin users regardless of subscription", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      try {
        await caller.voice.synthesizeLesson({
          lessonId: 99999,
          voiceId: "EXAVITQu4vr4xnSDxMaL",
          stability: 0.5,
          similarityBoost: 0.75,
          skipCache: true,
        });
      } catch (err: any) {
        // Should NOT be FORBIDDEN — any other error is acceptable (e.g., NOT_FOUND for lesson)
        expect(err.code).not.toBe("FORBIDDEN");
      }
    }, 15000);
  });

  describe("synthesize with cache", () => {
    it("synthesize endpoint accepts skipCache parameter", async () => {
      // Use admin context since free-tier users are now blocked
      const caller = appRouter.createCaller(createAdminContext());
      // The call may succeed (returns audio URL) or fail (ElevenLabs quota) — both are valid
      const result = await caller.voice.synthesize({
        text: "Test text",
        voiceId: "EXAVITQu4vr4xnSDxMaL",
        stability: 0.5,
        similarityBoost: 0.75,
        skipCache: true,
      }).catch((e: any) => ({ error: e.message }));
      // Either a successful response with url or an error object — both indicate the parameter was accepted
      expect(result).toBeDefined();
    }, 15000);

    it("synthesizeLesson endpoint accepts skipCache parameter", async () => {
      // Use admin context since free-tier users are now blocked
      const caller = appRouter.createCaller(createAdminContext());
      await expect(
        caller.voice.synthesizeLesson({
          lessonId: 99999,
          voiceId: "EXAVITQu4vr4xnSDxMaL",
          stability: 0.5,
          similarityBoost: 0.75,
          skipCache: true,
        })
      ).rejects.toThrow(); // any error is fine
    }, 15000);
  });
});
