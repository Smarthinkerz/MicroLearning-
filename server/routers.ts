import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { SEED_LESSONS } from "./seedLessons";
import { offlineSyncRouter } from "./routers/offlineSync";
import { ENV } from "./_core/env";
import { enforceFeatureAccess } from "./middleware/tierGating";
import { pushRouter } from "./routers/pushNotification";
import { aiRecommendationRouter } from "./routers/aiRecommendation";
import { securityRouter } from "./routers/security";
import { hrisRouter } from "./routers/hris";
import { analyticsInsightsRouter } from "./routers/analyticsInsights";
import { marketplaceRouter } from "./routers/marketplace";
import { ipAllowlistRouter } from "./routers/ipAllowlist";
import { consentRouter } from "./routers/consent";
import { breachRouter } from "./routers/breach";
import { onboardingRouter } from "./routers/onboarding";
import { adminExportRouter } from "./routers/adminExport";
import { statusPageRouter } from "./routers/statusPage";
import { teamManagementRouter } from "./routers/teamManagement";
import { revenueTrackingRouter } from "./routers/revenueTracking";
import { emailConfirmationRouter } from "./routers/emailConfirmation";
import { spacedRepetitionRouter } from "./routers/spacedRepetition";
import { reviewRemindersRouter } from "./routers/reviewReminders";
import { gamificationRouter } from "./routers/gamification";
import { checkAndUnlockAchievements, addPoints } from "./gamification";
import { paymentCallbackRouter } from "./routers/paymentCallback";
import { webhookRouter } from "./routers/webhook";

// ─── Role middleware ─────────────────────────────────────────────────
const employerAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!["employer_admin", "super_admin"].includes(ctx.user.appRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Employer admin access required" });
  }
  return next({ ctx });
});

const contentAuthorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!["content_author", "employer_admin", "super_admin"].includes(ctx.user.appRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Content author access required" });
  }
  return next({ ctx });
});

// ─── Organization Router ─────────────────────────────────────────────
const orgRouter = router({
  list: adminProcedure.query(async () => {
    return db.getAllOrganizations();
  }),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return db.getOrganizationById(input.id);
  }),
  getMine: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.orgId) return null;
    return db.getOrganizationById(ctx.user.orgId);
  }),
  create: adminProcedure.input(z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(128),
    industry: z.string().optional(),
    maxUsers: z.number().optional(),
  })).mutation(async ({ input }) => {
    const existing = await db.getOrganizationBySlug(input.slug);
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "Organization slug already exists" });
    return db.createOrganization(input);
  }),
  update: employerAdminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    industry: z.string().optional(),
    maxUsers: z.number().optional(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ input, ctx }) => {
    const { id, ...data } = input;
    if (ctx.user.appRole !== "super_admin" && ctx.user.orgId !== id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    await db.updateOrganization(id, data);
    return { success: true };
  }),
  getStats: employerAdminProcedure.input(z.object({ orgId: z.number() })).query(async ({ input, ctx }) => {
    if (ctx.user.appRole !== "super_admin" && ctx.user.orgId !== input.orgId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return db.getOrgStats(input.orgId);
  }),
  getMembers: employerAdminProcedure.input(z.object({ orgId: z.number() })).query(async ({ input, ctx }) => {
    if (ctx.user.appRole !== "super_admin" && ctx.user.orgId !== input.orgId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return db.getUsersByOrg(input.orgId);
  }),
});

// ─── User Management Router ─────────────────────────────────────────
const userRouter = router({
  updateProfile: protectedProcedure.input(z.object({
    timezone: z.string().optional(),
    notificationPreferences: z.object({
      email: z.boolean(),
      push: z.boolean(),
      inApp: z.boolean(),
      quietHoursStart: z.string().optional(),
      quietHoursEnd: z.string().optional(),
    }).optional(),
  })).mutation(async ({ input, ctx }) => {
    await db.updateUser(ctx.user.id, input);
    return { success: true };
  }),
  setRole: adminProcedure.input(z.object({
    userId: z.number(),
    appRole: z.enum(["learner", "employer_admin", "content_author", "super_admin"]),
  })).mutation(async ({ input }) => {
    await db.updateUser(input.userId, { appRole: input.appRole });
    return { success: true };
  }),
  setOrg: adminProcedure.input(z.object({
    userId: z.number(),
    orgId: z.number(),
  })).mutation(async ({ input }) => {
    await db.updateUser(input.userId, { orgId: input.orgId });
    return { success: true };
  }),
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    return db.getLearnerStats(ctx.user.id);
  }),
});

// ─── Shift Router ────────────────────────────────────────────────────
const shiftRouter = router({
  create: protectedProcedure.input(z.object({
    userId: z.number(),
    orgId: z.number(),
    title: z.string().optional(),
    startTime: z.number(),
    endTime: z.number(),
    breakStartTime: z.number().optional(),
    breakEndTime: z.number().optional(),
    shiftType: z.enum(["morning", "afternoon", "night", "split", "custom"]).optional(),
    location: z.string().optional(),
    isRecurring: z.boolean().optional(),
    recurrenceRule: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    return db.createShift({ ...input, source: "manual" });
  }),
  getMyShifts: protectedProcedure.input(z.object({
    startRange: z.number().optional(),
    endRange: z.number().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    return db.getShiftsByUser(ctx.user.id, input?.startRange, input?.endRange);
  }),
  getByOrg: employerAdminProcedure.input(z.object({
    orgId: z.number(),
    startRange: z.number().optional(),
    endRange: z.number().optional(),
  })).query(async ({ input, ctx }) => {
    if (ctx.user.appRole !== "super_admin" && ctx.user.orgId !== input.orgId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return db.getShiftsByOrg(input.orgId, input.startRange, input.endRange);
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    startTime: z.number().optional(),
    endTime: z.number().optional(),
    breakStartTime: z.number().optional(),
    breakEndTime: z.number().optional(),
    shiftType: z.enum(["morning", "afternoon", "night", "split", "custom"]).optional(),
    location: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.updateShift(id, data);
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.deleteShift(input.id);
    return { success: true };
  }),
  bulkCreate: employerAdminProcedure.input(z.object({
    shifts: z.array(z.object({
      userId: z.number(),
      orgId: z.number(),
      title: z.string().optional(),
      startTime: z.number(),
      endTime: z.number(),
      breakStartTime: z.number().optional(),
      breakEndTime: z.number().optional(),
      shiftType: z.enum(["morning", "afternoon", "night", "split", "custom"]).optional(),
      location: z.string().optional(),
    })),
  })).mutation(async ({ input }) => {
    await db.bulkCreateShifts(input.shifts.map(s => ({ ...s, source: "manual" as const })));
    return { success: true };
  }),
});

// ─── Lesson Library Router (public catalog) ────────────────────────
const libraryRouter = router({
  browse: publicProcedure.input(z.object({
    search: z.string().optional(),
    difficulty: z.string().optional(),
    contentType: z.string().optional(),
    category: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    return db.getAllPublishedLessons(
      input?.search,
      input?.difficulty,
      input?.contentType,
      input?.category
    );
  }),
  categories: publicProcedure.query(async () => {
    const all = await db.getAllPublishedLessons();
    const cats = new Set(all.map((l: any) => l.category).filter(Boolean));
    return Array.from(cats).sort();
  }),
  seed: adminProcedure.mutation(async ({ ctx }) => {
    const count = await db.getPublishedLessonsCount();
    if (count >= 30) {
      return { seeded: 0, message: "Library already has 30+ lessons" };
    }
    // Create a default org if none exists
    let orgId = ctx.user.orgId;
    if (!orgId) {
      const orgs = await db.getAllOrganizations();
      if (orgs.length > 0) {
        orgId = orgs[0].id;
      } else {
        const newOrg = await db.createOrganization({
          name: "Smarthinkerz LearnShift",
          slug: "platform-default",
          industry: "General",
          maxUsers: 1000,
        });
        orgId = (newOrg as any).id;
      }
    }
    const lessonsToInsert = SEED_LESSONS.map(sl => ({
      orgId: orgId!,
      title: sl.title,
      description: sl.description,
      content: sl.content,
      contentType: sl.contentType as any,
      durationMinutes: sl.durationMinutes,
      difficulty: sl.difficulty as any,
      category: sl.category,
      tags: sl.tags,
      language: sl.language,
      authorId: ctx.user.id,
      status: "published" as const,
      publishedAt: new Date(),
    }));
    await db.bulkCreateLessons(lessonsToInsert);
    return { seeded: lessonsToInsert.length, message: `Seeded ${lessonsToInsert.length} lessons` };
  }),
});

// ─── Lesson Router ───────────────────────────────────────────────────
const lessonRouter = router({
  create: contentAuthorProcedure.input(z.object({
    orgId: z.number().optional(),
    title: z.string().min(1).max(500),
    description: z.string().optional(),
    content: z.any().optional(),
    contentType: z.enum(["video", "quiz", "scenario", "assessment", "mixed", "article"]).optional(),
    durationMinutes: z.number().min(1).max(60).optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    language: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    // Pro+ feature gating: content authoring
    await enforceFeatureAccess(ctx.user, "contentAuthoring");
    let orgId = input.orgId || (ctx.user as any).orgId;
    if (!orgId) {
      const orgs = await db.getAllOrganizations();
      if (orgs.length > 0) orgId = orgs[0].id;
      else {
        const newOrg = await db.createOrganization({ name: "Smarthinkerz LearnShift", slug: "platform-default", industry: "General", maxUsers: 1000 });
        orgId = (newOrg as any).id;
      }
    }
    return db.createLesson({ ...input, orgId, authorId: ctx.user.id, status: "draft" });
  }),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return db.getLessonById(input.id);
  }),
  getByOrg: protectedProcedure.input(z.object({
    orgId: z.number().optional(),
    status: z.string().optional(),
  })).query(async ({ input, ctx }) => {
    // If orgId provided, filter by org; otherwise get lessons authored by current user or from their org
    if (input.orgId) {
      return db.getLessonsByOrg(input.orgId, input.status);
    }
    // Fallback: get lessons authored by the current user + lessons from default org
    return db.getLessonsByAuthorOrDefaultOrg(ctx.user.id, input.status);
  }),
  update: contentAuthorProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    content: z.any().optional(),
    contentType: z.enum(["video", "quiz", "scenario", "assessment", "mixed", "article"]).optional(),
    durationMinutes: z.number().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(["draft", "in_review", "published", "archived"]).optional(),
    reviewNotes: z.string().optional(),
    language: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    if (data.status === "published") {
      (data as any).publishedAt = new Date();
    }
    await db.updateLesson(id, data);
    return { success: true };
  }),
  delete: contentAuthorProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.deleteLesson(input.id);
    return { success: true };
  }),
  submitForReview: contentAuthorProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.updateLesson(input.id, { status: "in_review" });
    return { success: true };
  }),
  getReviewQueue: employerAdminProcedure.input(z.object({ orgId: z.number() })).query(async ({ input }) => {
    return db.getLessonsInReview(input.orgId);
  }),
  approveLesson: employerAdminProcedure.input(z.object({
    id: z.number(),
    reviewNotes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    await db.updateLesson(input.id, {
      status: "published",
      reviewerId: ctx.user.id,
      reviewNotes: input.reviewNotes,
      publishedAt: new Date(),
    });
    return { success: true };
  }),
  rejectLesson: employerAdminProcedure.input(z.object({
    id: z.number(),
    reviewNotes: z.string(),
  })).mutation(async ({ input, ctx }) => {
    await db.updateLesson(input.id, {
      status: "draft",
      reviewerId: ctx.user.id,
      reviewNotes: input.reviewNotes,
    });
    return { success: true };
  }),
});

// ─── Assignment Router ───────────────────────────────────────────────
const assignmentRouter = router({
  create: employerAdminProcedure.input(z.object({
    lessonId: z.number(),
    userId: z.number(),
    orgId: z.number(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    dueDate: z.number().optional(),
    isScheduleAware: z.boolean().optional(),
  })).mutation(async ({ input, ctx }) => {
    let scheduledStartTime: number | undefined;
    let scheduledEndTime: number | undefined;

    if (input.isScheduleAware !== false) {
      const now = Date.now();
      const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
      const userShifts = await db.getShiftsByUser(input.userId, now, weekFromNow);
      const lesson = await db.getLessonById(input.lessonId);
      const durationMs = (lesson?.durationMinutes ?? 5) * 60 * 1000;

      const freeSlot = findFreeSlot(userShifts, now, weekFromNow, durationMs);
      if (freeSlot) {
        scheduledStartTime = freeSlot.start;
        scheduledEndTime = freeSlot.end;
      }
    }

    return db.createAssignment({
      ...input,
      assignedBy: ctx.user.id,
      status: "pending",
      scheduledStartTime,
      scheduledEndTime,
    });
  }),
  bulkCreate: employerAdminProcedure.input(z.object({
    lessonId: z.number(),
    userIds: z.array(z.number()),
    orgId: z.number(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    dueDate: z.number().optional(),
    isScheduleAware: z.boolean().optional(),
  })).mutation(async ({ input, ctx }) => {
    const assignments = input.userIds.map(userId => ({
      lessonId: input.lessonId,
      userId,
      orgId: input.orgId,
      assignedBy: ctx.user.id,
      status: "pending" as const,
      priority: input.priority,
      dueDate: input.dueDate,
      isScheduleAware: input.isScheduleAware,
    }));
    await db.bulkCreateAssignments(assignments);
    return { success: true, count: assignments.length };
  }),
  getMyAssignments: protectedProcedure.input(z.object({
    status: z.string().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    return db.getAssignmentsByUser(ctx.user.id, input?.status);
  }),
  getByOrg: employerAdminProcedure.input(z.object({ orgId: z.number() })).query(async ({ input }) => {
    return db.getAssignmentsByOrg(input.orgId);
  }),
  updateStatus: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["pending", "available", "in_progress", "completed", "expired", "skipped"]),
  })).mutation(async ({ input }) => {
    const data: any = { status: input.status };
    if (input.status === "completed") data.completedAt = Date.now();
    await db.updateAssignment(input.id, data);
    return { success: true };
  }),
  getWithLesson: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return db.getAssignmentWithLesson(input.id);
  }),
  completionReport: employerAdminProcedure.input(z.object({ orgId: z.number() })).query(async ({ input, ctx }) => {
    if (ctx.user.orgId !== input.orgId && ctx.user.appRole !== 'super_admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return db.getOrgCompletionReport(input.orgId);
  }),
});

// ─── Attempt Router ──────────────────────────────────────────────────
const attemptRouter = router({
  start: protectedProcedure.input(z.object({
    assignmentId: z.number(),
    lessonId: z.number(),
  })).mutation(async ({ input, ctx }) => {
    await db.updateAssignment(input.assignmentId, { status: "in_progress" });
    return db.createAttempt({
      assignmentId: input.assignmentId,
      userId: ctx.user.id,
      lessonId: input.lessonId,
      orgId: ctx.user.orgId ?? 0,
      startedAt: Date.now(),
      status: "in_progress",
      syncStatus: "synced",
    });
  }),
  updateProgress: protectedProcedure.input(z.object({
    id: z.number(),
    progress: z.number().min(0).max(100),
    currentStep: z.number().optional(),
    timeSpentSeconds: z.number().optional(),
    responses: z.array(z.object({
      questionId: z.string(),
      answer: z.union([z.string(), z.array(z.string())]),
      isCorrect: z.boolean().optional(),
      timeSpentSeconds: z.number().optional(),
    })).optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.updateAttempt(id, data);
    return { success: true };
  }),
  complete: protectedProcedure.input(z.object({
    id: z.number(),
    assignmentId: z.number(),
    score: z.number().optional(),
    maxScore: z.number().optional(),
    passed: z.boolean().optional(),
    responses: z.array(z.object({
      questionId: z.string(),
      answer: z.union([z.string(), z.array(z.string())]),
      isCorrect: z.boolean().optional(),
      timeSpentSeconds: z.number().optional(),
    })).optional(),
    timeSpentSeconds: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const { id, assignmentId, ...data } = input;
    await db.updateAttempt(id, {
      ...data,
      completedAt: Date.now(),
      progress: 100,
      status: "completed",
    });
    await db.updateAssignment(assignmentId, {
      status: "completed",
      completedAt: Date.now(),
    });

    // Integrate gamification: Award points and check achievements
    let gamificationResult = null;
    try {
      // Award points based on score
      let points = 1; // Base point for completion
      if (data.score && data.maxScore && data.score === data.maxScore) {
        points = 5; // Perfect score bonus
      }
      
      await addPoints(ctx.user.id, points, `Lesson completion: ${points} points`);
      
      // Check and unlock achievements
      const newAchievements = await checkAndUnlockAchievements(ctx.user.id);
      
      gamificationResult = {
        pointsAwarded: points,
        newAchievements: newAchievements,
      };
    } catch (error) {
      console.error("[Gamification] Error in lesson completion:", error);
    }
    
    return { success: true, gamification: gamificationResult };
  }),
  syncOffline: protectedProcedure.input(z.object({
    attempts: z.array(z.object({
      assignmentId: z.number(),
      lessonId: z.number(),
      startedAt: z.number(),
      completedAt: z.number().optional(),
      timeSpentSeconds: z.number().optional(),
      score: z.number().optional(),
      maxScore: z.number().optional(),
      passed: z.boolean().optional(),
      responses: z.any().optional(),
      progress: z.number().optional(),
      currentStep: z.number().optional(),
      clientTimestamp: z.number(),
    })),
  })).mutation(async ({ input, ctx }) => {
    const results = [];
    for (const attempt of input.attempts) {
      const created = await db.createAttempt({
        ...attempt,
        userId: ctx.user.id,
        orgId: ctx.user.orgId ?? 0,
        status: attempt.completedAt ? "completed" : "in_progress",
        syncStatus: "synced",
        serverTimestamp: Date.now(),
      });
      if (attempt.completedAt) {
        await db.updateAssignment(attempt.assignmentId, {
          status: "completed",
          completedAt: attempt.completedAt,
        });
      }
      results.push(created);
    }
    return { success: true, synced: results.length };
  }),
  getByUser: protectedProcedure.query(async ({ ctx }) => {
    return db.getAttemptsByUser(ctx.user.id);
  }),
});

// ─── Notification Router ─────────────────────────────────────────────
const notificationRouter = router({
  getMyNotifications: protectedProcedure.input(z.object({
    unreadOnly: z.boolean().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    return db.getNotificationsByUser(ctx.user.id, input?.unreadOnly ? 20 : 50);
  }),
  markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.markNotificationRead(input.id);
    return { success: true };
  }),
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),
  deleteNotification: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.deleteNotification(input.id);
    return { success: true };
  }),
});

// ─── Certificate Router ──────────────────────────────────────────────
const certificateRouter = router({
  getMyCertificates: protectedProcedure.query(async ({ ctx }) => {
    return db.getCertificatesByUser(ctx.user.id);
  }),
});

// ─── Audit Log Router ────────────────────────────────────────────────
const auditRouter = router({
  getByOrg: employerAdminProcedure.input(z.object({
    orgId: z.number(),
    limit: z.number().optional(),
  })).query(async ({ input, ctx }) => {
    if (ctx.user.appRole !== "super_admin" && ctx.user.orgId !== input.orgId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return db.getAuditLogs(input.orgId, input.limit);
  }),
});

// ─── AI Router ───────────────────────────────────────────────────────
const aiRouter = router({
  generateAndSave: protectedProcedure.input(z.object({
    topic: z.string().min(1),
    industry: z.string().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    durationMinutes: z.number().min(1).max(30).optional(),
    contentType: z.enum(["quiz", "scenario", "article", "mixed"]).optional(),
    language: z.string().optional(),
    autoPublish: z.boolean().optional(),
  })).mutation(async ({ input, ctx }) => {
    const prompt = `Generate a micro-learning lesson for shift workers.
Topic: ${input.topic}
Industry: ${input.industry || "general"}
Difficulty: ${input.difficulty || "beginner"}
Duration: ${input.durationMinutes || 5} minutes
Content Type: ${input.contentType || "mixed"}
Language: ${input.language || "English"}

Create a structured lesson with:
1. A compelling title
2. A brief description (2-3 sentences)
3. Content blocks including text explanations and key takeaways
4. 3-5 quiz questions with multiple choice answers
5. Practical tips relevant to shift workers

Return as JSON with this structure:
{
  "title": "string",
  "description": "string",
  "durationMinutes": number,
  "category": "string",
  "tags": ["string"],
  "blocks": [{ "id": "string", "type": "text", "data": {"text": "string"}, "order": number }],
  "quizQuestions": [{ "id": "string", "question": "string", "type": "multiple_choice", "options": [{ "id": "string", "text": "string", "isCorrect": boolean }], "explanation": "string", "points": number }],
  "passingScore": number
}`;

    const result = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert instructional designer specializing in micro-learning content for shift workers. Always return valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = result.choices[0]?.message?.content;
    try {
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      // Auto-save the generated lesson
      let orgId = (ctx.user as any).orgId;
      if (!orgId) {
        const orgs = await db.getAllOrganizations();
        if (orgs.length > 0) orgId = orgs[0].id;
        else {
          const newOrg = await db.createOrganization({ name: "Smarthinkerz LearnShift", slug: "platform-default", industry: "General", maxUsers: 1000 });
          orgId = (newOrg as any).id;
        }
      }
      const saved = await db.createLesson({
        orgId,
        title: parsed.title || input.topic,
        description: parsed.description || "",
        content: { blocks: parsed.blocks || [], quizQuestions: parsed.quizQuestions || [], passingScore: parsed.passingScore || 70 },
        contentType: (input.contentType || "mixed") as any,
        durationMinutes: parsed.durationMinutes || input.durationMinutes || 5,
        difficulty: (input.difficulty || "beginner") as any,
        category: parsed.category || input.industry || "General",
        tags: parsed.tags || [input.topic.toLowerCase()],
        language: input.language || "en",
        authorId: ctx.user.id,
        status: input.autoPublish ? "published" as const : "draft" as const,
        publishedAt: input.autoPublish ? new Date() : undefined,
      });
      return { ...parsed, saved: true, lessonId: (saved as any)?.id };
    } catch {
      return { error: "Failed to parse AI response", raw: content };
    }
  }),
  generateLesson: contentAuthorProcedure.input(z.object({
    topic: z.string().min(1),
    industry: z.string().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    durationMinutes: z.number().min(1).max(30).optional(),
    contentType: z.enum(["quiz", "scenario", "article", "mixed"]).optional(),
    language: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    // Pro+ feature gating: content authoring
    await enforceFeatureAccess(ctx.user, "contentAuthoring");
    const prompt = `Generate a micro-learning lesson for shift workers.
Topic: ${input.topic}
Industry: ${input.industry || "general"}
Difficulty: ${input.difficulty || "beginner"}
Duration: ${input.durationMinutes || 5} minutes
Content Type: ${input.contentType || "mixed"}
Language: ${input.language || "English"}

Create a structured lesson with:
1. A compelling title
2. A brief description (2-3 sentences)
3. Content blocks including text explanations and key takeaways
4. 3-5 quiz questions with multiple choice answers
5. Practical tips relevant to shift workers

Return as JSON with this structure:
{
  "title": "string",
  "description": "string",
  "durationMinutes": number,
  "blocks": [{ "id": "string", "type": "text|quiz|image", "data": {...}, "order": number }],
  "quizQuestions": [{ "id": "string", "question": "string", "type": "multiple_choice", "options": [{ "id": "string", "text": "string", "isCorrect": boolean }], "explanation": "string", "points": number }],
  "passingScore": number
}`;

    const result = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert instructional designer specializing in micro-learning content for shift workers. Always return valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = result.choices[0]?.message?.content;
    try {
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      return parsed;
    } catch {
      return { error: "Failed to parse AI response", raw: content };
    }
  }),
  translateLesson: contentAuthorProcedure.input(z.object({
    lessonId: z.number(),
    targetLanguage: z.string(),
  })).mutation(async ({ input }) => {
    const lesson = await db.getLessonById(input.lessonId);
    if (!lesson) throw new TRPCError({ code: "NOT_FOUND" });

    const result = await invokeLLM({
      messages: [
        { role: "system", content: `You are a professional translator. Translate the following lesson content to ${input.targetLanguage}. Maintain the exact same JSON structure. Only translate text content, not keys or IDs.` },
        { role: "user", content: JSON.stringify({ title: lesson.title, description: lesson.description, content: lesson.content }) },
      ],
      response_format: { type: "json_object" },
    });

    const content = result.choices[0]?.message?.content;
    try {
      return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    } catch {
      return { error: "Translation failed" };
    }
  }),
  suggestLessons: protectedProcedure.input(z.object({
    orgId: z.number(),
  })).query(async ({ ctx, input }) => {
    const stats = await db.getLearnerStats(ctx.user.id);
    const result = await invokeLLM({
      messages: [
        { role: "system", content: "You are a learning recommendation engine. Based on the learner's stats, suggest 3 lesson topics. Return JSON array of objects with 'topic', 'reason', and 'difficulty'." },
        { role: "user", content: `Learner stats: ${JSON.stringify(stats)}. Suggest personalized micro-learning topics.` },
      ],
      response_format: { type: "json_object" },
    });
    const content = result.choices[0]?.message?.content;
    try {
      return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    } catch {
      return { suggestions: [] };
    }
  }),
});

// ─── SCORM/xAPI Export Router ────────────────────────────────────────
const complianceRouter = router({
  exportXapi: employerAdminProcedure.input(z.object({
    lessonId: z.number(),
    userId: z.number().optional(),
  })).query(async ({ input, ctx }) => {
    // Pro+ feature gating: SCORM/xAPI export
    await enforceFeatureAccess(ctx.user, "scormXapiExport");
    const lesson = await db.getLessonById(input.lessonId);
    if (!lesson) throw new TRPCError({ code: "NOT_FOUND" });

    const xapiStatements = [];
    if (input.userId) {
      const attempts = await db.getAttemptsByUser(input.userId);
      const lessonAttempts = attempts.filter(a => a.lessonId === input.lessonId);
      for (const attempt of lessonAttempts) {
        xapiStatements.push({
          actor: { mbox: `mailto:user${attempt.userId}@learnshift.smarthinkerz.com` },
          verb: { id: attempt.status === "completed" ? "http://adlnet.gov/expapi/verbs/completed" : "http://adlnet.gov/expapi/verbs/attempted" },
          object: {
            id: lesson.xapiActivityId || `https://learnshift.smarthinkerz.com/lessons/${lesson.id}`,
            definition: { name: { en: lesson.title }, type: "http://adlnet.gov/expapi/activities/lesson" },
          },
          result: {
            score: attempt.score ? { raw: attempt.score, max: attempt.maxScore } : undefined,
            success: attempt.passed,
            duration: attempt.timeSpentSeconds ? `PT${attempt.timeSpentSeconds}S` : undefined,
            completion: attempt.status === "completed",
          },
          timestamp: new Date(attempt.startedAt).toISOString(),
        });
      }
    }
    return { lesson: { id: lesson.id, title: lesson.title }, statements: xapiStatements };
  }),
  getAuditReport: employerAdminProcedure.input(z.object({
    orgId: z.number(),
    limit: z.number().optional(),
  })).query(async ({ input }) => {
    return db.getAuditLogs(input.orgId, input.limit ?? 100);
  }),
});

// ─── Schedule-Aware Helper ───────────────────────────────────────────
function findFreeSlot(
  userShifts: Array<{ startTime: number; endTime: number; breakStartTime: number | null; breakEndTime: number | null }>,
  rangeStart: number,
  rangeEnd: number,
  durationMs: number,
): { start: number; end: number } | null {
  const busyPeriods = userShifts.flatMap(s => {
    const periods = [{ start: s.startTime, end: s.endTime }];
    if (s.breakStartTime && s.breakEndTime) {
      periods.push({ start: s.breakStartTime, end: s.breakEndTime });
    }
    return periods;
  }).sort((a, b) => a.start - b.start);

  let cursor = rangeStart;
  for (const busy of busyPeriods) {
    if (cursor + durationMs <= busy.start) {
      return { start: cursor, end: cursor + durationMs };
    }
    cursor = Math.max(cursor, busy.end);
  }
  if (cursor + durationMs <= rangeEnd) {
    return { start: cursor, end: cursor + durationMs };
  }
  return null;
}
// ─── Admin CRM Router ─────────────────────────────────────────────────
const crmRouter = router({
  // Branding & Appearance
  getBranding: publicProcedure.query(async () => {
    const row = await db.getPlatformSetting("branding");
    if (!row?.settingValue) {
      return {
        appName: "Smarthinkerz LearnShift",
        logoUrl: "",
        faviconUrl: "",
        primaryColor: "#14b8a6",
        primaryHue: 175,
        accentColor: "#0d9488",
        theme: "dark",
        sidebarStyle: "default",
        fontFamily: "Inter",
        heroTitle: "Shift-Smart Learning by Smarthinkerz",
        heroSubtitle: "3–10 minute lessons delivered around your work schedule",
        footerText: "© 2026 Smarthinkerz LearnShift. All rights reserved.",
        customCss: "",
      };
    }
    return row.settingValue;
  }),
  updateBranding: adminProcedure.input(z.object({
    appName: z.string().optional(),
    logoUrl: z.string().optional(),
    faviconUrl: z.string().optional(),
    primaryColor: z.string().optional(),
    primaryHue: z.number().optional(),
    accentColor: z.string().optional(),
    theme: z.enum(["dark", "light"]).optional(),
    sidebarStyle: z.enum(["default", "compact", "minimal"]).optional(),
    fontFamily: z.string().optional(),
    heroTitle: z.string().optional(),
    heroSubtitle: z.string().optional(),
    footerText: z.string().optional(),
    customCss: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const existing = await db.getPlatformSetting("branding");
    const current = (existing?.settingValue ?? {}) as Record<string, unknown>;
    const merged = { ...current, ...input };
    await db.upsertPlatformSetting("branding", merged, ctx.user.id);
    return { success: true };
  }),

  // Dashboard stats
  getStats: adminProcedure.query(async () => {
    const userCount = await db.getUserCount();
    const lessonCount = await db.getLessonCount();
    const orgCount = await db.getOrgCount();
    const publishedCount = await db.getPublishedLessonsCount();
    return { userCount, lessonCount, orgCount, publishedCount };
  }),

  // User management
  listUsers: adminProcedure.input(z.object({
    search: z.string().optional(),
    role: z.string().optional(),
    orgId: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return db.getAllUsers(input?.search, input?.role, input?.orgId);
  }),
  updateUser: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().optional(),
    appRole: z.enum(["learner", "employer_admin", "content_author", "super_admin"]).optional(),
    orgId: z.number().nullable().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.updateUser(id, data as any);
    return { success: true };
  }),
  deleteUser: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.deleteUser(input.id);
    return { success: true };
  }),

  // Lesson management
  listLessons: adminProcedure.input(z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    category: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    return db.getAllLessonsAdmin(input?.search, input?.status, input?.category);
  }),
  updateLesson: adminProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    status: z.enum(["draft", "in_review", "published", "archived"]).optional(),
    durationMinutes: z.number().optional(),
    contentType: z.enum(["video", "quiz", "scenario", "assessment", "mixed", "article"]).optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    if (data.status === "published") {
      (data as any).publishedAt = new Date();
    }
    await db.updateLesson(id, data);
    return { success: true };
  }),
  deleteLesson: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.deleteLesson(input.id);
    return { success: true };
  }),

  // Organization management
  listOrgs: adminProcedure.query(async () => {
    return db.getAllOrganizations();
  }),
  createOrg: adminProcedure.input(z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    industry: z.string().optional(),
    maxUsers: z.number().optional(),
  })).mutation(async ({ input }) => {
    return db.createOrganization(input);
  }),
  updateOrg: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    industry: z.string().optional(),
    maxUsers: z.number().optional(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.updateOrganization(id, data);
    return { success: true };
  }),

  // ─── Subscription Management ──────────────────────────────────────
  getSubscriptionStats: adminProcedure.query(async () => {
    return db.getSubscriptionStats();
  }),

  listPlans: adminProcedure.query(async () => {
    return db.getAllPlansAdmin();
  }),

  updatePlan: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    slug: z.string().optional(),
    priceMonthly: z.number().optional(),
    priceYearly: z.number().optional(),
    isPerUser: z.boolean().optional(),
    maxUsers: z.number().nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.updatePlan(id, data as any);
    return { success: true };
  }),

  createPlan: adminProcedure.input(z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    tier: z.enum(["starter", "pro", "enterprise", "consumer_free", "consumer_premium"]),
    priceMonthly: z.number(),
    priceYearly: z.number().optional(),
    isPerUser: z.boolean().default(true),
    sortOrder: z.number().default(0),
  })).mutation(async ({ input }) => {
    const existing = await db.getPlanBySlug(input.slug);
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "Plan slug already exists" });
    await db.createPlan(input as any);
    return { success: true };
  }),

  listSubscriptions: adminProcedure.query(async () => {
    return db.getAllSubscriptionsAdmin();
  }),

  updateSubscription: adminProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["active", "trial", "past_due", "canceled", "expired"]).optional(),
    planId: z.number().optional(),
    quantity: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, status, planId, quantity } = input;
    if (status) await db.updateSubscriptionStatus(id, status);
    if (planId) await db.updateSubscriptionPlan(id, planId);
    if (quantity !== undefined) {
      await db.updateSubscriptionQuantity(id, quantity);
    }
    return { success: true };
  }),

  listPayments: adminProcedure.query(async () => {
    return db.getAllPaymentsAdmin();
  }),

  // ── API Keys Management ──────────────────────────────────────────────
  getApiKeys: adminProcedure.query(async () => {
    const row = await db.getPlatformSetting("api_keys");
    const keys = (row?.settingValue as Record<string, string> | null) ?? {};
    return {
      openaiApiKey: keys.openaiApiKey ? "sk-..." + keys.openaiApiKey.slice(-4) : "",
      elevenLabsApiKey: keys.elevenLabsApiKey ? "..." + keys.elevenLabsApiKey.slice(-4) : "",
      tapSecretKey: keys.tapSecretKey ? "sk-..." + keys.tapSecretKey.slice(-4) : "",
      tapPublicKey: keys.tapPublicKey ? "pk-..." + keys.tapPublicKey.slice(-4) : "",
      smarthinkerzWebhookSecret: keys.smarthinkerzWebhookSecret ? "..." + keys.smarthinkerzWebhookSecret.slice(-4) : "",
      openaiBaseUrl: keys.openaiBaseUrl ?? "",
      hasOpenaiApiKey: !!keys.openaiApiKey,
      hasElevenLabsApiKey: !!keys.elevenLabsApiKey,
      hasTapSecretKey: !!keys.tapSecretKey,
      hasTapPublicKey: !!keys.tapPublicKey,
      hasSmarthinkerzWebhookSecret: !!keys.smarthinkerzWebhookSecret,
    };
  }),

  setApiKeys: adminProcedure
    .input(z.object({
      openaiApiKey: z.string().optional(),
      elevenLabsApiKey: z.string().optional(),
      tapSecretKey: z.string().optional(),
      tapPublicKey: z.string().optional(),
      smarthinkerzWebhookSecret: z.string().optional(),
      openaiBaseUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.getPlatformSetting("api_keys");
      const current = (existing?.settingValue as Record<string, string> | null) ?? {};
      const updated: Record<string, string> = { ...current };
      if (input.openaiApiKey) updated.openaiApiKey = input.openaiApiKey;
      if (input.elevenLabsApiKey) updated.elevenLabsApiKey = input.elevenLabsApiKey;
      if (input.tapSecretKey) updated.tapSecretKey = input.tapSecretKey;
      if (input.tapPublicKey) updated.tapPublicKey = input.tapPublicKey;
      if (input.smarthinkerzWebhookSecret) updated.smarthinkerzWebhookSecret = input.smarthinkerzWebhookSecret;
      if (input.openaiBaseUrl !== undefined) updated.openaiBaseUrl = input.openaiBaseUrl;
      await db.upsertPlatformSetting("api_keys", updated, ctx.user.id);
      return { success: true };
    }),

  clearApiKey: adminProcedure
    .input(z.object({ key: z.enum(["openaiApiKey", "elevenLabsApiKey", "tapSecretKey", "tapPublicKey", "smarthinkerzWebhookSecret", "openaiBaseUrl"]) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.getPlatformSetting("api_keys");
      const current = (existing?.settingValue as Record<string, string> | null) ?? {};
      delete current[input.key];
      await db.upsertPlatformSetting("api_keys", current, ctx.user.id);
      return { success: true };
    }),

  // ── Platform-wide Subscriber Analytics ──────────────────────────────
  getSubscriberAnalytics: adminProcedure.query(async () => {
    const dbConn = await (await import("./db")).getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const { subscriptions: subs, subscriptionPlans: plansTable, payments: pays, users } = await import("../drizzle/schema");
    const { eq, sql } = await import("drizzle-orm");

    const byStatus = await dbConn
      .select({ status: subs.status, total: sql<number>`COUNT(*)` })
      .from(subs)
      .groupBy(subs.status);

    const byPlan = await dbConn
      .select({ planName: plansTable.name, tier: plansTable.tier, priceMonthly: plansTable.priceMonthly, total: sql<number>`COUNT(*)` })
      .from(subs)
      .leftJoin(plansTable, eq(subs.planId, plansTable.id))
      .where(eq(subs.status, "active"))
      .groupBy(plansTable.id, plansTable.name, plansTable.tier, plansTable.priceMonthly);

    const mrrRows = await dbConn
      .select({ priceMonthly: plansTable.priceMonthly, qty: sql<number>`COUNT(*)` })
      .from(subs)
      .leftJoin(plansTable, eq(subs.planId, plansTable.id))
      .where(eq(subs.status, "active"))
      .groupBy(plansTable.priceMonthly);
    const mrrCents = mrrRows.reduce((sum, r) => sum + (r.priceMonthly ?? 0) * Number(r.qty), 0);

    const totalRevRows = await dbConn
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(pays)
      .where(eq(pays.status, "succeeded"));
    const totalRevenueCents = Number(totalRevRows[0]?.total ?? 0);

    const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
    const monthlyRevRows = await dbConn
      .select({
        month: sql<string>`DATE_FORMAT(FROM_UNIXTIME(paidAt / 1000), '%Y-%m')`,
        revenue: sql<number>`COALESCE(SUM(amount), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(pays)
      .where(sql`paidAt >= ${sixMonthsAgo} AND status = 'succeeded'`)
      .groupBy(sql`DATE_FORMAT(FROM_UNIXTIME(paidAt / 1000), '%Y-%m')`);

    const monthlySubRows = await dbConn
      .select({
        month: sql<string>`DATE_FORMAT(createdAt, '%Y-%m')`,
        newSubs: sql<number>`COUNT(*)`
      })
      .from(subs)
      .where(sql`createdAt >= FROM_UNIXTIME(${sixMonthsAgo} / 1000)`)
      .groupBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`);

    const userCountRows = await dbConn.select({ total: sql<number>`COUNT(*)` }).from(users);
    const totalUsers = Number(userCountRows[0]?.total ?? 0);

    const totalActive = byStatus.find(r => r.status === "active")?.total ?? 0;
    const totalTrial = byStatus.find(r => r.status === "trial")?.total ?? 0;
    const totalCanceled = byStatus.find(r => r.status === "canceled")?.total ?? 0;

    return {
      totalUsers,
      totalActive: Number(totalActive),
      totalTrial: Number(totalTrial),
      totalCanceled: Number(totalCanceled),
      mrrCents,
      arrCents: mrrCents * 12,
      totalRevenueCents,
      byStatus: byStatus.map(r => ({ status: r.status, total: Number(r.total) })),
      byPlan: byPlan.map(r => ({ planName: r.planName ?? "Unknown", tier: r.tier ?? "starter", priceMonthly: r.priceMonthly ?? 0, total: Number(r.total) })),
      monthlyRevenue: monthlyRevRows.map(r => ({ month: r.month, revenue: Number(r.revenue), count: Number(r.count) })),
      monthlyNewSubs: monthlySubRows.map(r => ({ month: r.month, newSubs: Number(r.newSubs) })),
    };
  }),
});
// ─── Subscription & Pricing Router ─────────────────────────────────────────
const subscriptionRouter = router({
  getPlans: publicProcedure.query(async ({ ctx }) => {
    const plans = await db.getAllPlans();
    
    // Super admin users get all Pro features unlocked
    if (ctx.user?.appRole === 'super_admin') {
      return plans.map(plan => {
        if (plan.tier === 'starter' || plan.tier === 'pro') {
          return {
            ...plan,
            features: {
              ...plan.features,
              // Unlock all Pro features for super_admin
              scormXapiExport: true,
              rbac: true,
              sso: true,
              hrisIntegration: true,
              whiteLabel: true,
              customOnboarding: true,
              sla: true,
              dedicatedManager: true,
              fullAnalytics: true,
              adaptiveRecommendations: true,
              contentAuthoring: true,
              cohortManagement: true,
              maxLessons: -1,
            }
          };
        }
        return plan;
      });
    }
    
    return plans;
  }),

  getPlan: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return db.getPlanById(input.id);
  }),

  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.orgId) return null;
    return db.getOrgSubscription(ctx.user.orgId);
  }),

  getMyEntitlements: protectedProcedure.query(async ({ ctx }) => {
    const { FREE_TIER_FEATURES } = await import("../shared/featureGating");
    
    // Super admin users get all Pro/Enterprise features
    if (ctx.user.appRole === 'super_admin') {
      return {
        tier: "enterprise",
        planName: "Enterprise (Admin)",
        features: {
          maxLessons: -1,
          offlineAccess: true,
          basicTracking: true,
          fullAnalytics: true,
          adaptiveRecommendations: true,
          contentAuthoring: true,
          cohortManagement: true,
          scormXapiExport: true,
          rbac: true,
          sso: true,
          hrisIntegration: true,
          whiteLabel: true,
          customOnboarding: true,
          sla: true,
          dedicatedManager: true,
          gamification: true,
          pushNotifications: true,
          emailSupport: true,
          prioritySupport: true,
          voiceNarration: true,
        },
        subscriptionStatus: null,
      };
    }
    
    if (!ctx.user.orgId) {
      return { tier: "free", planName: "Free", features: FREE_TIER_FEATURES, subscriptionStatus: null };
    }
    const sub = await db.getOrgSubscription(ctx.user.orgId);
    if (!sub || sub.status === "canceled" || sub.status === "expired") {
      return { tier: "free", planName: "Free", features: FREE_TIER_FEATURES, subscriptionStatus: sub?.status || null };
    }
    const plan = await db.getPlanById(sub.planId);
    if (!plan) {
      return { tier: "free", planName: "Free", features: FREE_TIER_FEATURES, subscriptionStatus: sub.status };
    }
    return {
      tier: plan.tier,
      planName: plan.name,
      features: plan.features || FREE_TIER_FEATURES,
      subscriptionStatus: sub.status,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }),

  subscribe: protectedProcedure.input(z.object({
    planSlug: z.string(),
    quantity: z.number().min(1).default(1),
  })).mutation(async ({ ctx, input }) => {
    const plan = await db.getPlanBySlug(input.planSlug);
    if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
    
    let orgId = ctx.user.orgId;
    if (!orgId) {
      // Auto-create org for the user
      const orgs = await db.getAllOrganizations();
      orgId = orgs[0]?.id || 1;
    }
    
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    
    // Create subscription (trial for now, payment integration will activate)
    await db.createSubscription({
      orgId,
      planId: plan.id,
      status: "trial",
      currentPeriodStart: now,
      currentPeriodEnd: now + thirtyDays,
      trialEndsAt: now + (14 * 24 * 60 * 60 * 1000), // 14-day trial
      quantity: input.quantity,
    });
    
    return { success: true, message: "Subscription created with 14-day trial" };
  }),

  // Tap Payment Gateway: Create a checkout session (direct Tap API)
  createCheckout: protectedProcedure.input(z.object({
    planSlug: z.string(),
    cycle: z.enum(["monthly", "yearly"]).optional(),
    quantity: z.number().min(1).default(1),
    origin: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const { buildSubscriptionCharge, createCharge } = await import("./tapPayment");
    const plan = await db.getPlanBySlug(input.planSlug);
    if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });

    let orgId = ctx.user.orgId;
    if (!orgId) {
      const orgs = await db.getAllOrganizations();
      orgId = orgs[0]?.id || 1;
    }

    const nameParts = (ctx.user.name || "Customer").split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";
    const customerEmail = ctx.user.email || "customer@example.com";
    const cycle = input.cycle || "monthly";
    const amount = cycle === "yearly" ? (plan.priceYearly ?? plan.priceMonthly * 10) : plan.priceMonthly;
    // Use the server-side APP_URL env var as the authoritative base URL for Tap redirects.
    // This prevents the Manus preview domain from leaking into payment callbacks.
    const baseUrl = ENV.appUrl || input.origin;
    const redirectUrl = `${baseUrl}/checkout/return`;
    const webhookUrl = `${baseUrl}/api/tap/webhook`;

    try {
      const chargeRequest = buildSubscriptionCharge({
        planName: plan.name,
        amount,
        currency: plan.currency || "USD",
        customerEmail,
        customerName: [firstName, lastName].filter(Boolean).join(" "),
        orgId,
        planId: plan.id,
        redirectUrl,
        webhookUrl,
      });
      const charge = await createCharge(chargeRequest);
      if (!charge?.transaction?.url) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Tap did not return a checkout URL" });
      }
      // Persist payment record for reconciliation
      await db.createPayment({
        orgId,
        amount: Math.round(amount * 100),
        currency: plan.currency || "USD",
        status: "pending",
        paymentMethod: "tap",
        externalChargeId: charge.id,
        description: `${plan.name} Plan (${cycle})`,
        metadata: { planSlug: input.planSlug, cycle, quantity: input.quantity, tapChargeId: charge.id },
      });
      return { success: true, redirectUrl: charge.transaction.url };
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Checkout failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  }),

  // Verify a Tap charge after redirect
  verifyPayment: protectedProcedure.input(z.object({
    orderId: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const payment = await db.getPaymentByExternalChargeId(input.orderId);
    if (!payment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Payment record not found" });
    }
    
    if (payment.status === "succeeded") {
      const orgId = payment.orgId;
      const sub = await db.getOrgSubscription(orgId);
      if (sub && sub.status !== "active") {
        await db.updateSubscriptionStatus(sub.id, "active");
      }
      return { success: true, status: "captured", message: "Payment successful! Subscription activated." };
    }
    
    if (payment.status === "pending") {
      return { success: false, status: "pending", message: "Payment is being processed. Please wait a moment." };
    }
    
    if (payment.status === "failed") {
      return { success: false, status: "failed", message: "Payment was declined. Please try again." };
    }
    
    return { success: false, status: payment.status, message: `Payment status: ${payment.status}` };
  }),

  // Check if Tap is configured (for frontend to show/hide payment buttons)
  isPaymentConfigured: publicProcedure.query(async () => {
    const { isTapConfigured } = await import("./tapPayment");
    return { configured: isTapConfigured() };
  }),

  cancelSubscription: protectedProcedure.input(z.object({
    subscriptionId: z.number(),
  })).mutation(async ({ input }) => {
    await db.updateSubscriptionStatus(input.subscriptionId, "canceled");
    return { success: true };
  }),

  getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.orgId) return [];
    return db.getPaymentsByOrg(ctx.user.orgId);
  }),

  // Lesson Packs (Consumer)
  getLessonPacks: publicProcedure.query(async () => {
    return db.getAllLessonPacks();
  }),

  getMyPurchases: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserPurchasedPacks(ctx.user.id);
  }),

  purchasePack: protectedProcedure.input(z.object({
    packId: z.number(),
  })).mutation(async ({ ctx, input }) => {
    // Record purchase (payment will be handled by Tap gateway when integrated)
    await db.recordPackPurchase({ userId: ctx.user.id, packId: input.packId, orgId: ctx.user.orgId ?? 0, amount: 0, currency: "USD" });
    return { success: true, message: "Pack purchased successfully" };
  }),

  // Admin: seed default plans
  seedPlans: adminProcedure.mutation(async () => {
    const existingCount = await db.getPlansCount();
    if (existingCount > 0) return { message: "Plans already exist", seeded: false };
    
    const defaultPlans = [
      {
        name: "Starter",
        slug: "starter",
        tier: "starter" as const,
        priceMonthly: 395,
        priceYearly: 3950,
        isPerUser: true,
        sortOrder: 1,
        features: {
          maxLessons: 30, offlineAccess: true, basicTracking: true, fullAnalytics: false,
          adaptiveRecommendations: false, contentAuthoring: false, cohortManagement: false,
          scormXapiExport: false, rbac: false, sso: false, hrisIntegration: false,
          whiteLabel: false, customOnboarding: false, sla: false, dedicatedManager: false,
          gamification: false, pushNotifications: true, emailSupport: true, prioritySupport: false,
          voiceNarration: false, vrXrTraining: false, skillsIntelligence: false, workforceCompetencyMapping: false,
          complianceAutomation: false, aiCoachingAssistant: false, managerInsightsDashboard: false,
          learningRoiReporting: false, enterpriseIntegrations: false, skillReadinessForecast: false,
          teamCapabilityMapping: false, learningImpactAnalytics: false, aiWorkforceDevelopmentInsights: false,
          predictiveChurnAnalysis: false, personalizedAiCoach: false, skillMasteryAnalytics: false,
          certificatesAchievements: false, adaptivePathways: false, premiumAiMentorConversations: false,
          skillsGapAnalysis: false, learningPathwaysAutomation: false,
        },
      },
      {
        name: "Pro",
        slug: "pro",
        tier: "pro" as const,
        priceMonthly: 895,
        priceYearly: 8950,
        isPerUser: true,
        sortOrder: 2,
        features: {
          maxLessons: -1, offlineAccess: true, basicTracking: true, fullAnalytics: true,
          adaptiveRecommendations: true, contentAuthoring: true, cohortManagement: true,
          scormXapiExport: true, rbac: true, sso: false, hrisIntegration: false,
          whiteLabel: false, customOnboarding: false, sla: false, dedicatedManager: false,
          gamification: true, pushNotifications: true, emailSupport: true, prioritySupport: true,
          voiceNarration: true, vrXrTraining: false, skillsIntelligence: true, workforceCompetencyMapping: false,
          complianceAutomation: false, aiCoachingAssistant: true, managerInsightsDashboard: true,
          learningRoiReporting: true, enterpriseIntegrations: false, skillReadinessForecast: false,
          teamCapabilityMapping: false, learningImpactAnalytics: true, aiWorkforceDevelopmentInsights: false,
          predictiveChurnAnalysis: false, personalizedAiCoach: true, skillMasteryAnalytics: true,
          certificatesAchievements: true, adaptivePathways: true, premiumAiMentorConversations: false,
          skillsGapAnalysis: true, learningPathwaysAutomation: true,
        },
      },
      {
        name: "Enterprise",
        slug: "enterprise",
        tier: "enterprise" as const,
        priceMonthly: 1200,
        priceYearly: 12000,
        isPerUser: true,
        sortOrder: 3,
        features: {
          maxLessons: -1, offlineAccess: true, basicTracking: true, fullAnalytics: true,
          adaptiveRecommendations: true, contentAuthoring: true, cohortManagement: true,
          scormXapiExport: true, rbac: true, sso: true, hrisIntegration: true,
          whiteLabel: true, customOnboarding: true, sla: true, dedicatedManager: true,
          gamification: true, pushNotifications: true, emailSupport: true, prioritySupport: true,
          voiceNarration: true, vrXrTraining: true, skillsIntelligence: true, workforceCompetencyMapping: true,
          complianceAutomation: true, aiCoachingAssistant: true, managerInsightsDashboard: true,
          learningRoiReporting: true, enterpriseIntegrations: true, skillReadinessForecast: true,
          teamCapabilityMapping: true, learningImpactAnalytics: true, aiWorkforceDevelopmentInsights: true,
          predictiveChurnAnalysis: true, personalizedAiCoach: true, skillMasteryAnalytics: true,
          certificatesAchievements: true, adaptivePathways: true, premiumAiMentorConversations: true,
          skillsGapAnalysis: true, learningPathwaysAutomation: true,
        },
      },
      {
        name: "Free",
        slug: "consumer-free",
        tier: "consumer_free" as const,
        priceMonthly: 0,
        isPerUser: false,
        sortOrder: 4,
        features: {
          maxLessons: 5, offlineAccess: false, basicTracking: true, fullAnalytics: false,
          adaptiveRecommendations: false, contentAuthoring: false, cohortManagement: false,
          scormXapiExport: false, rbac: false, sso: false, hrisIntegration: false,
          whiteLabel: false, customOnboarding: false, sla: false, dedicatedManager: false,
          gamification: true, pushNotifications: true, emailSupport: false, prioritySupport: false,
          voiceNarration: false, vrXrTraining: false, skillsIntelligence: false, workforceCompetencyMapping: false,
          complianceAutomation: false, aiCoachingAssistant: false, managerInsightsDashboard: false,
          learningRoiReporting: false, enterpriseIntegrations: false, skillReadinessForecast: false,
          teamCapabilityMapping: false, learningImpactAnalytics: false, aiWorkforceDevelopmentInsights: false,
          predictiveChurnAnalysis: false, personalizedAiCoach: false, skillMasteryAnalytics: false,
          certificatesAchievements: false, adaptivePathways: false, premiumAiMentorConversations: false,
          skillsGapAnalysis: false, learningPathwaysAutomation: false,
        },
      },
      {
        name: "Premium",
        slug: "consumer-premium",
        tier: "consumer_premium" as const,
        priceMonthly: 299,
        priceYearly: 2990,
        isPerUser: false,
        sortOrder: 5,
        features: {
          maxLessons: -1, offlineAccess: true, basicTracking: true, fullAnalytics: false,
          adaptiveRecommendations: true, contentAuthoring: false, cohortManagement: false,
          scormXapiExport: false, rbac: false, sso: false, hrisIntegration: false,
          whiteLabel: false, customOnboarding: false, sla: false, dedicatedManager: false,
          gamification: true, pushNotifications: true, emailSupport: true, prioritySupport: false,
          voiceNarration: true, vrXrTraining: false, skillsIntelligence: false, workforceCompetencyMapping: false,
          complianceAutomation: false, aiCoachingAssistant: true, managerInsightsDashboard: false,
          learningRoiReporting: false, enterpriseIntegrations: false, skillReadinessForecast: false,
          teamCapabilityMapping: false, learningImpactAnalytics: false, aiWorkforceDevelopmentInsights: false,
          predictiveChurnAnalysis: false, personalizedAiCoach: true, skillMasteryAnalytics: true,
          certificatesAchievements: true, adaptivePathways: true, premiumAiMentorConversations: true,
          skillsGapAnalysis: false, learningPathwaysAutomation: false,
        },
      },
    ];
    
    for (const plan of defaultPlans) {
      await db.createPlan(plan);
    }
    return { message: `Seeded ${defaultPlans.length} plans`, seeded: true };
  }),
});

// ─── Voice Router ─────────────────────────────────────────────────────────
const voiceRouter = router({
  isConfigured: publicProcedure.query(async () => {
    const { isElevenLabsConfigured } = await import("./elevenLabs");
    return { configured: isElevenLabsConfigured() };
  }),

  getVoices: protectedProcedure.query(async () => {
    const { VOICES } = await import("./elevenLabs");
    // Return curated list of voices (since the API key may not have voices_read permission)
    return Object.entries(VOICES).map(([key, id]) => ({
      id,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      key,
    }));
  }),

  synthesize: protectedProcedure.input(z.object({
    text: z.string().min(1).max(5000),
    voiceId: z.string().optional(),
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
    skipCache: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    const { textToSpeech, isElevenLabsConfigured, VOICES } = await import("./elevenLabs");
    if (!isElevenLabsConfigured()) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Voice service not configured" });
    }

    // Server-side subscription check: voice narration requires Pro/Premium/Enterprise
    const { FREE_TIER_FEATURES, hasFeature } = await import("../shared/featureGating");
    let userFeatures = FREE_TIER_FEATURES;
    if (ctx.user.orgId) {
      const sub = await db.getOrgSubscription(ctx.user.orgId);
      if (sub && sub.status !== "canceled" && sub.status !== "expired") {
        const plan = await db.getPlanById(sub.planId);
        if (plan?.features) userFeatures = plan.features as any;
      }
    }
    // Platform and organization administrators bypass the plan-level feature check.
    const hasAdminNarrationAccess = ["employer_admin", "super_admin"].includes(ctx.user.appRole) || ctx.user.role === "admin";
    if (!hasAdminNarrationAccess && !hasFeature(userFeatures, "voiceNarration")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "AI voice narration is available on Pro, Premium, and Enterprise plans. Please upgrade to access this feature.",
      });
    }

    const voiceId = input.voiceId || VOICES.sarah;
    const stability = input.stability ?? 0.5;
    const similarityBoost = input.similarityBoost ?? 0.75;
    const style = input.style ?? 0;

    // Check cache first (unless skipCache is true for regeneration)
    if (!input.skipCache) {
      const textHash = db.computeVoiceCacheKey(input.text, voiceId, stability, similarityBoost, style);
      const cached = await db.getVoiceCacheEntry(textHash);
      if (cached) {
        return { url: cached.audioUrl, fileKey: cached.fileKey, sizeBytes: cached.sizeBytes, cached: true };
      }
    }

    const audioBuffer = await textToSpeech({
      text: input.text,
      voiceId,
      stability,
      similarityBoost,
      style,
    });

    // Upload to S3
    const { storagePut } = await import("./storage");
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileKey = `voice-audio/${timestamp}-${randomSuffix}.mp3`;
    const { url } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

    // Store in cache
    const textHash = db.computeVoiceCacheKey(input.text, voiceId, stability, similarityBoost, style);
    await db.insertVoiceCacheEntry({
      textHash,
      voiceId,
      stability,
      similarityBoost,
      style,
      audioUrl: url,
      fileKey,
      sizeBytes: audioBuffer.length,
      charCount: input.text.length,
    });

    return { url, fileKey, sizeBytes: audioBuffer.length, cached: false };
  }),

  synthesizeLesson: protectedProcedure.input(z.object({
    lessonId: z.number(),
    voiceId: z.string().optional(),
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    skipCache: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    const { textToSpeech, isElevenLabsConfigured, VOICES } = await import("./elevenLabs");
    if (!isElevenLabsConfigured()) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Voice service not configured" });
    }

    // Server-side subscription check: voice narration requires Pro/Premium/Enterprise
    const { FREE_TIER_FEATURES, hasFeature } = await import("../shared/featureGating");
    let userFeatures = FREE_TIER_FEATURES;
    if (ctx.user.orgId) {
      const sub = await db.getOrgSubscription(ctx.user.orgId);
      if (sub && sub.status !== "canceled" && sub.status !== "expired") {
        const plan = await db.getPlanById(sub.planId);
        if (plan?.features) userFeatures = plan.features as any;
      }
    }
    // Platform and organization administrators bypass the plan-level feature check.
    const hasAdminNarrationAccess = ["employer_admin", "super_admin"].includes(ctx.user.appRole) || ctx.user.role === "admin";
    if (!hasAdminNarrationAccess && !hasFeature(userFeatures, "voiceNarration")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "AI voice narration is available on Pro, Premium, and Enterprise plans. Please upgrade to access this feature.",
      });
    }

    const voiceId = input.voiceId || VOICES.sarah;
    const stability = input.stability ?? 0.5;
    const similarityBoost = input.similarityBoost ?? 0.75;

    // Check lesson-level cache first
    if (!input.skipCache) {
      const cached = await db.getVoiceCacheByLesson(input.lessonId, voiceId, stability, similarityBoost);
      if (cached) {
        return {
          url: cached.audioUrl,
          fileKey: cached.fileKey,
          sizeBytes: cached.sizeBytes,
          charCount: cached.charCount,
          cached: true,
        };
      }
    }

    const lesson = await db.getLessonById(input.lessonId);
    if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });

    // Extract text from lesson content blocks
    const content = lesson.content as any;
    const blocks = content?.blocks || [];
    const textParts: string[] = [];

    // Add title and description
    textParts.push(lesson.title);
    if (lesson.description) textParts.push(lesson.description);

    // Extract text from content blocks
    for (const block of blocks) {
      if (block.type === "text") {
        const text = block.data?.text || block.data?.content || "";
        if (text) textParts.push(text);
      }
    }

    const fullText = textParts.join(". \n\n");
    if (!fullText.trim()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Lesson has no text content to narrate" });
    }

    // Limit to 5000 chars per ElevenLabs request
    const truncatedText = fullText.length > 5000 ? fullText.substring(0, 4997) + "..." : fullText;

    const audioBuffer = await textToSpeech({
      text: truncatedText,
      voiceId,
      stability,
      similarityBoost,
    });

    const { storagePut } = await import("./storage");
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileKey = `voice-audio/lesson-${input.lessonId}-${randomSuffix}.mp3`;
    const { url } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

    // Store in cache
    const textHash = db.computeVoiceCacheKey(truncatedText, voiceId, stability, similarityBoost);
    await db.insertVoiceCacheEntry({
      textHash,
      voiceId,
      stability,
      similarityBoost,
      lessonId: input.lessonId,
      audioUrl: url,
      fileKey,
      sizeBytes: audioBuffer.length,
      charCount: truncatedText.length,
    });

    return { url, fileKey, sizeBytes: audioBuffer.length, charCount: truncatedText.length, cached: false };
  }),

  // Cache stats for admin
  cacheStats: adminProcedure.query(async () => {
    return db.getVoiceCacheStats();
  }),

  // List cached entries for admin
  cacheEntries: adminProcedure.input(z.object({
    limit: z.number().min(1).max(500).optional(),
  }).optional()).query(async ({ input }) => {
    return db.getAllVoiceCacheEntries(input?.limit ?? 100);
  }),

  // Clear a specific cache entry (for regeneration)
  clearCacheEntry: adminProcedure.input(z.object({
    id: z.number(),
  })).mutation(async ({ input }) => {
    await db.deleteVoiceCacheEntry(input.id);
    return { success: true };
  }),
});

// ─── Main Router ─────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    // Supabase Auth: logout is handled client-side via supabase.auth.signOut().
    // This endpoint is kept for API compatibility but is effectively a no-op.
    logout: publicProcedure.mutation(() => {
      return { success: true } as const;
    }),
  }),
  org: orgRouter,
  user: userRouter,
  shift: shiftRouter,
  lesson: lessonRouter,
  library: libraryRouter,
  assignment: assignmentRouter,
  attempt: attemptRouter,
  notification: notificationRouter,
  certificate: certificateRouter,
  audit: auditRouter,
  ai: aiRouter,
  compliance: complianceRouter,
  crm: crmRouter,
  subscription: subscriptionRouter,
  voice: voiceRouter,
  offlineSync: offlineSyncRouter,
  push: pushRouter,
  aiRec: aiRecommendationRouter,
  security: securityRouter,
  hris: hrisRouter,
  analyticsInsights: analyticsInsightsRouter,
  marketplace: marketplaceRouter,
  ipAllowlist: ipAllowlistRouter,
  consent: consentRouter,
  breach: breachRouter,
  onboarding: onboardingRouter,
  adminExport: adminExportRouter,
  statusPage: statusPageRouter,
  teamManagement: teamManagementRouter,
  revenue: revenueTrackingRouter,
  email: emailConfirmationRouter,
  gamification: gamificationRouter,
  spacedRepetition: spacedRepetitionRouter,
  reviewReminders: reviewRemindersRouter,
  paymentCallback: paymentCallbackRouter,
  webhook: webhookRouter,
});

export type AppRouter = typeof appRouter;
