import { and, desc, eq, gte, lte, sql, like, or, asc, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  InsertUser, users,
  organizations, InsertOrganization,
  shifts, InsertShift,
  lessons, InsertLesson,
  lessonAssignments, InsertLessonAssignment,
  lessonAttempts, InsertLessonAttempt,
  certificates,
  auditLogs,
  notifications,
  webhookConfigs,
  platformSettings,
  subscriptionPlans, InsertSubscriptionPlan,
  subscriptions, InsertSubscription,
  payments, InsertPayment,
  lessonPacks, InsertLessonPack,
  userPackPurchases,
  pushSubscriptions,
  adminIpAllowlist, InsertAdminIpAllowlistEntry,
  consents, InsertConsent,
  breachEvents, InsertBreachEvent,
  lessonFeedback, InsertLessonFeedback,
  uptimeHistory, InsertUptimeHistory,
  voiceAudioCache,
  achievements, InsertAchievement,
  userAchievements, InsertUserAchievement,
  userPoints, InsertUserPoints,
  leaderboardCache, InsertLeaderboardEntry,
  lessonReviewSchedule, InsertLessonReviewSchedule,
  reviewHistory, InsertReviewHistory,
  reviewReminders, InsertReviewReminder,
  reminderPreferences, InsertReminderPreferences,
  abTests, InsertABTest,
  abTestVariants, InsertABTestVariant,
  abTestAssignments, InsertABTestAssignment,
  abTestMetrics, InsertABTestMetric,
} from "../drizzle/schema";
import crypto from "crypto";

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error("[Database] DATABASE_URL is not set in environment. NODE_ENV=", process.env.NODE_ENV);
      return null;
    }
    try {
      _pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined },
        connectionTimeoutMillis: 10000,
      });
      _db = drizzle(_pool);
      // Verify connection works on first use
      await _pool.query("SELECT 1");
      console.log("[Database] Connected successfully to", dbUrl.split("@")[1]?.split("/")[0] ?? "db");
    } catch (error) {
      console.error("[Database] Failed to connect:", String(error));
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.supabaseId) throw new Error("User supabaseId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = {
    supabaseId: user.supabaseId,
    name: user.name ?? null,
    email: user.email ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    role: user.role ?? "user",
    appRole: user.appRole ?? "learner",
  };
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.supabaseId,
    set: { name: values.name, email: values.email, lastSignedIn: values.lastSignedIn },
  });
}

export async function getUserBySupabaseId(supabaseId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.supabaseId, supabaseId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUsersByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.orgId, orgId)).orderBy(asc(users.name));
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
}

// ─── Organizations ───────────────────────────────────────────────────
export async function createOrganization(org: InsertOrganization) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(organizations).values(org).returning({ id: organizations.id });
  return { id: result[0].id, ...org };
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result[0];
}

export async function getOrganizationBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  return result[0];
}

export async function getAllOrganizations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).orderBy(desc(organizations.createdAt));
}

export async function updateOrganization(id: number, data: Partial<InsertOrganization>) {
  const db = await getDb();
  if (!db) return;
  await db.update(organizations).set({ ...data, updatedAt: new Date() }).where(eq(organizations.id, id));
}

// ─── Shifts ──────────────────────────────────────────────────────────
export async function createShift(shift: InsertShift) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(shifts).values(shift).returning({ id: shifts.id });
  return { id: result[0].id, ...shift };
}

export async function getShiftsByUser(userId: number, startRange?: number, endRange?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(shifts.userId, userId)];
  if (startRange) conditions.push(gte(shifts.endTime, startRange));
  if (endRange) conditions.push(lte(shifts.startTime, endRange));
  return db.select().from(shifts).where(and(...conditions)).orderBy(asc(shifts.startTime));
}

export async function getShiftsByOrg(orgId: number, startRange?: number, endRange?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(shifts.orgId, orgId)];
  if (startRange) conditions.push(gte(shifts.endTime, startRange));
  if (endRange) conditions.push(lte(shifts.startTime, endRange));
  return db.select().from(shifts).where(and(...conditions)).orderBy(asc(shifts.startTime));
}

export async function updateShift(id: number, data: Partial<InsertShift>) {
  const db = await getDb();
  if (!db) return;
  await db.update(shifts).set(data).where(eq(shifts.id, id));
}

export async function deleteShift(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(shifts).where(eq(shifts.id, id));
}

export async function bulkCreateShifts(shiftList: InsertShift[]) {
  const db = await getDb();
  if (!db || shiftList.length === 0) return;
  await db.insert(shifts).values(shiftList);
}

// ─── Lessons ─────────────────────────────────────────────────────────
export async function createLesson(lesson: InsertLesson) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lessons).values(lesson).returning({ id: lessons.id });
  return { id: result[0].id, ...lesson };
}

export async function getLessonById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  return result[0];
}

export async function getLessonsByOrg(orgId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(lessons.orgId, orgId)];
  if (status) conditions.push(eq(lessons.status, status as any));
  return db.select().from(lessons).where(and(...conditions)).orderBy(desc(lessons.updatedAt));
}

export async function getLessonsByAuthorOrDefaultOrg(authorId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const orgs = await db.select().from(organizations).limit(1);
  const orgCondition = orgs.length > 0
    ? or(eq(lessons.authorId, authorId), eq(lessons.orgId, orgs[0].id))
    : eq(lessons.authorId, authorId);
  const conditions: any[] = [orgCondition];
  if (status) conditions.push(eq(lessons.status, status as any));
  return db.select().from(lessons).where(and(...conditions)).orderBy(desc(lessons.updatedAt));
}

export async function updateLesson(id: number, data: Partial<InsertLesson>) {
  const db = await getDb();
  if (!db) return;
  await db.update(lessons).set({ ...data, updatedAt: new Date() }).where(eq(lessons.id, id));
}

export async function deleteLesson(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(lessons).where(eq(lessons.id, id));
}

export async function getLessonsInReview(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons).where(
    and(eq(lessons.orgId, orgId), eq(lessons.status, "in_review"))
  ).orderBy(desc(lessons.updatedAt));
}

export async function getAllPublishedLessons(search?: string, difficulty?: string, contentType?: string, category?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(lessons.status, "published" as any)];
  if (difficulty && difficulty !== "all") conditions.push(eq(lessons.difficulty, difficulty as any));
  if (contentType && contentType !== "all") conditions.push(eq(lessons.contentType, contentType as any));
  if (category && category !== "all") conditions.push(eq(lessons.category, category));
  if (search) {
    conditions.push(or(like(lessons.title, `%${search}%`), like(lessons.description, `%${search}%`)));
  }
  return db.select().from(lessons).where(and(...conditions)).orderBy(desc(lessons.updatedAt));
}

export async function getPublishedLessonsCount() {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(lessons).where(eq(lessons.status, "published" as any));
  return Number(result?.count ?? 0);
}

export async function bulkCreateLessons(lessonList: InsertLesson[]) {
  const db = await getDb();
  if (!db || lessonList.length === 0) return;
  await db.insert(lessons).values(lessonList);
}

// ─── Lesson Assignments ──────────────────────────────────────────────
export async function createAssignment(assignment: InsertLessonAssignment) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lessonAssignments).values(assignment).returning({ id: lessonAssignments.id });
  return { id: result[0].id, ...assignment };
}

export async function getAssignmentsByUser(userId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(lessonAssignments.userId, userId)];
  if (status) conditions.push(eq(lessonAssignments.status, status as any));
  return db.select().from(lessonAssignments).where(and(...conditions)).orderBy(desc(lessonAssignments.createdAt));
}

export async function getAssignmentsByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonAssignments).where(eq(lessonAssignments.orgId, orgId)).orderBy(desc(lessonAssignments.createdAt));
}

export async function updateAssignment(id: number, data: Partial<InsertLessonAssignment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(lessonAssignments).set({ ...data, updatedAt: new Date() }).where(eq(lessonAssignments.id, id));
}

export async function getAssignmentWithLesson(assignmentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ assignment: lessonAssignments, lesson: lessons })
    .from(lessonAssignments)
    .leftJoin(lessons, eq(lessonAssignments.lessonId, lessons.id))
    .where(eq(lessonAssignments.id, assignmentId))
    .limit(1);
  return result[0];
}

export async function bulkCreateAssignments(assignmentList: InsertLessonAssignment[]) {
  const db = await getDb();
  if (!db || assignmentList.length === 0) return;
  await db.insert(lessonAssignments).values(assignmentList);
}

// ─── Lesson Attempts ─────────────────────────────────────────────────
export async function createAttempt(attempt: InsertLessonAttempt) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lessonAttempts).values(attempt).returning({ id: lessonAttempts.id });
  return { id: result[0].id, ...attempt };
}

export async function getAttemptById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(lessonAttempts).where(eq(lessonAttempts.id, id)).limit(1);
  return result[0];
}

export async function getAttemptsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonAttempts).where(eq(lessonAttempts.userId, userId)).orderBy(desc(lessonAttempts.createdAt));
}

export async function getAttemptsByAssignment(assignmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonAttempts).where(eq(lessonAttempts.assignmentId, assignmentId)).orderBy(desc(lessonAttempts.createdAt));
}

export async function updateAttempt(id: number, data: Partial<InsertLessonAttempt>) {
  const db = await getDb();
  if (!db) return;
  await db.update(lessonAttempts).set({ ...data, updatedAt: new Date() }).where(eq(lessonAttempts.id, id));
}

export async function getLatestAttemptByAssignment(assignmentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(lessonAttempts)
    .where(eq(lessonAttempts.assignmentId, assignmentId))
    .orderBy(desc(lessonAttempts.createdAt))
    .limit(1);
  return result[0];
}

// ─── Certificates ────────────────────────────────────────────────────
export async function createCertificate(cert: typeof certificates.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(certificates).values(cert).returning({ id: certificates.id });
  return { id: result[0].id, ...cert };
}

export async function getCertificatesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(certificates).where(eq(certificates.userId, userId)).orderBy(desc(certificates.issuedAt));
}

export async function getCertificateByNumber(certNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(certificates).where(eq(certificates.certificateNumber, certNumber)).limit(1);
  return result[0];
}

// ─── Audit Logs ──────────────────────────────────────────────────────
export async function createAuditLog(log: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(log);
}

export async function getAuditLogs(orgId?: number, userId?: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (orgId) conditions.push(eq(auditLogs.orgId, orgId));
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  const base = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  if (conditions.length > 0) return base.where(and(...conditions));
  return base;
}

// ─── Notifications ───────────────────────────────────────────────────
export async function createNotification(notif: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(notifications).values(notif).returning({ id: notifications.id });
  return { id: result[0].id, ...notif };
}

export async function getNotificationsByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(result?.count ?? 0);
}

// ─── Platform Settings ─────────────────────────────────────────────
export async function getPlatformSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(platformSettings).where(eq(platformSettings.settingKey, key)).limit(1);
  return rows.length > 0 ? rows[0] : null;
}

export async function upsertPlatformSetting(key: string, value: Record<string, unknown>, userId?: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(platformSettings)
    .values({ settingKey: key, settingValue: value, updatedBy: userId })
    .onConflictDoUpdate({
      target: platformSettings.settingKey,
      set: { settingValue: value, updatedBy: userId, updatedAt: new Date() },
    });
}

export async function getAllPlatformSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(platformSettings);
}

// ─── Org Stats ───────────────────────────────────────────────────────
export async function getOrgStats(orgId: number) {
  const db = await getDb();
  if (!db) return null;
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.orgId, orgId));
  const [lessonCount] = await db.select({ count: sql<number>`count(*)` }).from(lessons).where(eq(lessons.orgId, orgId));
  const [assignmentStats] = await db.select({
    total: sql<number>`count(*)`,
    completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
    inProgress: sql<number>`sum(case when status = 'in_progress' then 1 else 0 end)`,
  }).from(lessonAssignments).where(eq(lessonAssignments.orgId, orgId));
  const [shiftCount] = await db.select({ count: sql<number>`count(*)` }).from(shifts).where(eq(shifts.orgId, orgId));
  return {
    totalUsers: Number(userCount?.count ?? 0),
    totalLessons: Number(lessonCount?.count ?? 0),
    totalAssignments: Number(assignmentStats?.total ?? 0),
    completedAssignments: Number(assignmentStats?.completed ?? 0),
    inProgressAssignments: Number(assignmentStats?.inProgress ?? 0),
    totalShifts: Number(shiftCount?.count ?? 0),
    completionRate: assignmentStats?.total
      ? Math.round((Number(assignmentStats.completed ?? 0) / Number(assignmentStats.total)) * 100)
      : 0,
  };
}

export async function getLearnerStats(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [assignmentStats] = await db.select({
    total: sql<number>`count(*)`,
    completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
    inProgress: sql<number>`sum(case when status = 'in_progress' then 1 else 0 end)`,
  }).from(lessonAssignments).where(eq(lessonAssignments.userId, userId));
  const [attemptStats] = await db.select({
    totalTime: sql<number>`coalesce(sum(time_spent_seconds), 0)`,
    avgScore: sql<number>`coalesce(avg(score), 0)`,
    totalAttempts: sql<number>`count(*)`,
  }).from(lessonAttempts).where(eq(lessonAttempts.userId, userId));
  const [certCount] = await db.select({ count: sql<number>`count(*)` }).from(certificates).where(eq(certificates.userId, userId));
  return {
    totalAssignments: Number(assignmentStats?.total ?? 0),
    completedAssignments: Number(assignmentStats?.completed ?? 0),
    inProgressAssignments: Number(assignmentStats?.inProgress ?? 0),
    totalTimeSpent: Number(attemptStats?.totalTime ?? 0),
    averageScore: Math.round(Number(attemptStats?.avgScore ?? 0)),
    totalAttempts: Number(attemptStats?.totalAttempts ?? 0),
    totalCertificates: Number(certCount?.count ?? 0),
  };
}

// ─── Admin CRM: User Management ─────────────────────────────────────
export async function getAllUsers(search?: string, role?: string, orgId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (role) conditions.push(eq(users.appRole, role as any));
  if (orgId) conditions.push(eq(users.orgId, orgId));
  if (search) conditions.push(sql`(${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`})`);
  if (conditions.length > 0) return db.select().from(users).where(and(...conditions)).orderBy(desc(users.createdAt));
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserCount() {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(users);
  return Number(result?.count ?? 0);
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, id));
}

export async function getAllLessonsAdmin(search?: string, status?: string, category?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (status) conditions.push(eq(lessons.status, status as any));
  if (category) conditions.push(eq(lessons.category, category));
  if (search) conditions.push(sql`${lessons.title} ILIKE ${`%${search}%`}`);
  if (conditions.length > 0) return db.select().from(lessons).where(and(...conditions)).orderBy(desc(lessons.createdAt));
  return db.select().from(lessons).orderBy(desc(lessons.createdAt));
}

export async function getLessonCount() {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(lessons);
  return Number(result?.count ?? 0);
}

export async function getOrgCount() {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(organizations);
  return Number(result?.count ?? 0);
}

// ─── Subscription Plans ─────────────────────────────────────────────
export async function getAllPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(asc(subscriptionPlans.sortOrder));
}

export async function getPlanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
  return result[0];
}

export async function createPlan(plan: InsertSubscriptionPlan) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(subscriptionPlans).values(plan).returning({ id: subscriptionPlans.id });
  return { id: result[0].id, ...plan };
}

export async function updatePlan(id: number, data: Partial<InsertSubscriptionPlan>) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptionPlans).set({ ...data, updatedAt: new Date() }).where(eq(subscriptionPlans.id, id));
}

export async function getAllSubscriptionsAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
}

export async function getAllPaymentsAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).orderBy(desc(payments.createdAt));
}

export async function getSubscriptionStats() {
  const db = await getDb();
  if (!db) return { active: 0, trial: 0, canceled: 0, totalRevenue: 0 };
  const [activeResult] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "active"));
  const [trialResult] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "trial"));
  const [canceledResult] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "canceled"));
  const [revenueResult] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(payments).where(eq(payments.status, "succeeded"));
  return {
    active: Number(activeResult?.count ?? 0),
    trial: Number(trialResult?.count ?? 0),
    canceled: Number(canceledResult?.count ?? 0),
    totalRevenue: Number(revenueResult?.total ?? 0),
  };
}

export async function updateSubscriptionPlan(subId: number, newPlanId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set({ planId: newPlanId }).where(eq(subscriptions.id, subId));
}

export async function updateSubscriptionQuantity(id: number, quantity: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set({ quantity }).where(eq(subscriptions.id, id));
}

export async function getSubscriptionByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId)).orderBy(desc(subscriptions.createdAt)).limit(1);
  return result[0];
}

export async function createSubscription(sub: InsertSubscription) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(subscriptions).values(sub).returning({ id: subscriptions.id });
  return { id: result[0].id, ...sub };
}

export async function createPayment(payment: InsertPayment) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(payments).values(payment).returning({ id: payments.id });
  return { id: result[0].id, ...payment };
}

export async function updatePayment(id: number, data: Partial<InsertPayment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(payments).set(data).where(eq(payments.id, id));
}

export async function getPaymentsByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.orgId, orgId)).orderBy(desc(payments.createdAt));
}

// ─── Lesson Packs ────────────────────────────────────────────────────
export async function getAllLessonPacks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonPacks).where(eq(lessonPacks.isActive, true)).orderBy(asc(lessonPacks.id));
}

export async function getLessonPackById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(lessonPacks).where(eq(lessonPacks.id, id)).limit(1);
  return result[0];
}

export async function createLessonPack(pack: InsertLessonPack) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lessonPacks).values(pack).returning({ id: lessonPacks.id });
  return { id: result[0].id, ...pack };
}

export async function getUserPurchases(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userPackPurchases).where(eq(userPackPurchases.userId, userId));
}

export async function createUserPackPurchase(purchase: typeof userPackPurchases.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(userPackPurchases).values(purchase).returning({ id: userPackPurchases.id });
  return { id: result[0].id, ...purchase };
}

// ─── Webhook Configs ─────────────────────────────────────────────────
export async function getWebhookConfigByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(webhookConfigs).where(eq(webhookConfigs.orgId, orgId)).limit(1);
  return result[0];
}

export async function upsertWebhookConfig(config: typeof webhookConfigs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(webhookConfigs).values(config).onConflictDoUpdate({
    target: [webhookConfigs.orgId, webhookConfigs.provider],
    set: { webhookUrl: config.webhookUrl, secretKey: config.secretKey, isActive: config.isActive, updatedAt: new Date() },
  });
}

// ─── Push Subscriptions ─────────────────────────────────────────────
export async function createPushSubscription(sub: typeof pushSubscriptions.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(pushSubscriptions).values(sub).returning({ id: pushSubscriptions.id });
  return { id: result[0].id, ...sub };
}

export async function getPushSubscriptionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function deletePushSubscription(endpoint: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

// ─── Admin IP Allowlist ─────────────────────────────────────────────
export async function getAdminIpAllowlist() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminIpAllowlist).where(eq(adminIpAllowlist.isActive, true)).orderBy(desc(adminIpAllowlist.createdAt));
}

export async function addAdminIpToAllowlist(entry: InsertAdminIpAllowlistEntry) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(adminIpAllowlist).values(entry).returning({ id: adminIpAllowlist.id });
  return { id: result[0].id, ...entry };
}

export async function removeAdminIpFromAllowlist(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminIpAllowlist).set({ isActive: false }).where(eq(adminIpAllowlist.id, id));
}

// ─── GDPR Consents ──────────────────────────────────────────────────
export async function getConsentsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consents).where(eq(consents.userId, userId)).orderBy(desc(consents.updatedAt));
}

export async function upsertConsent(consent: InsertConsent) {
  const db = await getDb();
  if (!db) return;
  await db.insert(consents).values(consent).onConflictDoUpdate({
    target: [consents.userId, consents.consentType],
    set: { granted: consent.granted, grantedAt: consent.grantedAt, withdrawnAt: consent.withdrawnAt, updatedAt: new Date() },
  });
}

// ─── Breach Events ─────────────────────────────────────────────────
export async function createBreachEvent(event: InsertBreachEvent) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(breachEvents).values(event).returning({ id: breachEvents.id });
  return { id: result[0].id, ...event };
}

export async function getBreachEvents(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(breachEvents).orderBy(desc(breachEvents.createdAt)).limit(limit);
}

export async function updateBreachEvent(id: number, data: Partial<InsertBreachEvent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(breachEvents).set({ ...data, updatedAt: new Date() }).where(eq(breachEvents.id, id));
}

// ─── Lesson Feedback ────────────────────────────────────────────────
export async function createFeedback(data: InsertLessonFeedback) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lessonFeedback).values(data).returning({ id: lessonFeedback.id });
  return result[0].id;
}

export async function getFeedbackByLesson(lessonId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonFeedback).where(eq(lessonFeedback.lessonId, lessonId)).orderBy(desc(lessonFeedback.createdAt));
}

export async function getFeedbackByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonFeedback).where(eq(lessonFeedback.userId, userId)).orderBy(desc(lessonFeedback.createdAt));
}

export async function getAllFeedbackAdmin(limit = 5000) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonFeedback).orderBy(desc(lessonFeedback.createdAt)).limit(limit);
}

export async function getFeedbackCount() {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(lessonFeedback);
  return Number(row?.count ?? 0);
}

// ─── Uptime History ─────────────────────────────────────────────────
export async function insertUptimeSnapshot(data: InsertUptimeHistory) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(uptimeHistory).values(data).returning({ id: uptimeHistory.id });
  return result[0].id;
}

export async function getUptimeHistoryByService(serviceName: string, sinceTs: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(uptimeHistory)
    .where(and(eq(uptimeHistory.serviceName, serviceName), gte(uptimeHistory.checkedAt, sinceTs)))
    .orderBy(uptimeHistory.checkedAt);
}

export async function getAllUptimeHistory(sinceTs: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(uptimeHistory).where(gte(uptimeHistory.checkedAt, sinceTs)).orderBy(uptimeHistory.checkedAt);
}

export async function pruneOldUptimeHistory(olderThanTs: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(uptimeHistory).where(lte(uptimeHistory.checkedAt, olderThanTs));
}

// ─── Voice Audio Cache ──────────────────────────────────────────────
export function computeVoiceCacheKey(text: string, voiceId: string, stability: number, similarityBoost: number, style: number = 0): string {
  const payload = `${text}|${voiceId}|${stability.toFixed(2)}|${similarityBoost.toFixed(2)}|${style.toFixed(2)}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function getVoiceCacheEntry(textHash: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(voiceAudioCache).where(eq(voiceAudioCache.textHash, textHash)).limit(1);
  if (rows.length === 0) return null;
  const entry = rows[0];
  db.update(voiceAudioCache).set({ hitCount: entry.hitCount + 1, lastAccessedAt: new Date() }).where(eq(voiceAudioCache.id, entry.id)).catch(() => {});
  return entry;
}

export async function getVoiceCacheByLesson(lessonId: number, voiceId: string, stability: number, similarityBoost: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(voiceAudioCache).where(
    and(
      eq(voiceAudioCache.lessonId, lessonId),
      eq(voiceAudioCache.voiceId, voiceId),
      eq(voiceAudioCache.stability, stability.toFixed(2)),
      eq(voiceAudioCache.similarityBoost, similarityBoost.toFixed(2))
    )
  ).limit(1);
  if (rows.length === 0) return null;
  const entry = rows[0];
  db.update(voiceAudioCache).set({ hitCount: entry.hitCount + 1, lastAccessedAt: new Date() }).where(eq(voiceAudioCache.id, entry.id)).catch(() => {});
  return entry;
}

export async function insertVoiceCacheEntry(data: {
  textHash: string; voiceId: string; stability: number; similarityBoost: number;
  style?: number; lessonId?: number; audioUrl: string; fileKey: string; sizeBytes: number; charCount: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(voiceAudioCache).values({
    textHash: data.textHash, voiceId: data.voiceId,
    stability: data.stability.toFixed(2), similarityBoost: data.similarityBoost.toFixed(2),
    style: (data.style ?? 0).toFixed(2), lessonId: data.lessonId ?? null,
    audioUrl: data.audioUrl, fileKey: data.fileKey, sizeBytes: data.sizeBytes, charCount: data.charCount,
  }).returning({ id: voiceAudioCache.id });
  return result[0].id;
}

export async function deleteVoiceCacheEntry(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(voiceAudioCache).where(eq(voiceAudioCache.id, id));
}

export async function getVoiceCacheStats() {
  const db = await getDb();
  if (!db) return { totalEntries: 0, totalSizeBytes: 0, totalHits: 0 };
  const [stats] = await db.select({
    totalEntries: sql<number>`count(*)`,
    totalSizeBytes: sql<number>`coalesce(sum(size_bytes), 0)`,
    totalHits: sql<number>`coalesce(sum(hit_count), 0)`,
  }).from(voiceAudioCache);
  return {
    totalEntries: Number(stats?.totalEntries ?? 0),
    totalSizeBytes: Number(stats?.totalSizeBytes ?? 0),
    totalHits: Number(stats?.totalHits ?? 0),
  };
}

// ─── Achievements ────────────────────────────────────────────────────
export async function getAllAchievements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(achievements).where(eq(achievements.isActive, true)).orderBy(asc(achievements.id));
}

export async function createAchievement(data: InsertAchievement) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(achievements).values(data).returning({ id: achievements.id });
  return { id: result[0].id, ...data };
}

export async function getUserAchievements(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userAchievements).where(eq(userAchievements.userId, userId)).orderBy(desc(userAchievements.unlockedAt));
}

export async function grantAchievement(data: InsertUserAchievement) {
  const db = await getDb();
  if (!db) return;
  await db.insert(userAchievements).values(data).onConflictDoUpdate({
    target: [userAchievements.userId, userAchievements.achievementId],
    set: { unlockedAt: new Date() },
  });
}

// ─── User Points ─────────────────────────────────────────────────────
export async function getUserPoints(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userPoints).where(eq(userPoints.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function upsertUserPoints(data: InsertUserPoints) {
  const db = await getDb();
  if (!db) return;
  await db.insert(userPoints).values(data).onConflictDoUpdate({
    target: userPoints.userId,
    set: { totalPoints: data.totalPoints, level: data.level, currentLevelPoints: data.currentLevelPoints, nextLevelThreshold: data.nextLevelThreshold, updatedAt: new Date() },
  });
}

// ─── Leaderboard ─────────────────────────────────────────────────────
export async function getLeaderboard(scope: string, orgId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(leaderboardCache.scope, scope as any)];
  if (orgId) conditions.push(eq(leaderboardCache.orgId, orgId));
  return db.select().from(leaderboardCache).where(and(...conditions)).orderBy(asc(leaderboardCache.rank)).limit(limit);
}

export async function upsertLeaderboardEntry(data: InsertLeaderboardEntry) {
  const db = await getDb();
  if (!db) return;
  await db.insert(leaderboardCache).values(data).onConflictDoUpdate({
    target: [leaderboardCache.userId, leaderboardCache.scope],
    set: { rank: data.rank, points: data.points, level: data.level, lessonsCompleted: data.lessonsCompleted, perfectScores: data.perfectScores, currentStreak: data.currentStreak, updatedAt: new Date() },
  });
}

// ─── Spaced Repetition ──────────────────────────────────────────────
export async function getReviewScheduleByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonReviewSchedule).where(eq(lessonReviewSchedule.userId, userId)).orderBy(asc(lessonReviewSchedule.nextReviewDate));
}

export async function getDueReviews(userId: number, now: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonReviewSchedule)
    .where(and(eq(lessonReviewSchedule.userId, userId), lte(lessonReviewSchedule.nextReviewDate, now)))
    .orderBy(asc(lessonReviewSchedule.nextReviewDate));
}

export async function upsertReviewSchedule(data: InsertLessonReviewSchedule) {
  const db = await getDb();
  if (!db) return;
  await db.insert(lessonReviewSchedule).values(data).onConflictDoUpdate({
    target: [lessonReviewSchedule.userId, lessonReviewSchedule.lessonId],
    set: { interval: data.interval, easeFactor: data.easeFactor, repetitions: data.repetitions, nextReviewDate: data.nextReviewDate, lastReviewDate: data.lastReviewDate, status: data.status, updatedAt: new Date() },
  });
}

export async function createReviewHistory(data: InsertReviewHistory) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(reviewHistory).values(data).returning({ id: reviewHistory.id });
  return result[0].id;
}

// ─── Review Reminders ───────────────────────────────────────────────
export async function getReminderPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(reminderPreferences).where(eq(reminderPreferences.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function upsertReminderPreferences(data: InsertReminderPreferences) {
  const db = await getDb();
  if (!db) return;
  await db.insert(reminderPreferences).values(data).onConflictDoUpdate({
    target: reminderPreferences.userId,
    set: { enableReminders: data.enableReminders, reminderFrequency: data.reminderFrequency, quietHoursEnabled: data.quietHoursEnabled, quietHoursStart: data.quietHoursStart, quietHoursEnd: data.quietHoursEnd, enablePushNotifications: data.enablePushNotifications, enableEmailNotifications: data.enableEmailNotifications, enableInAppNotifications: data.enableInAppNotifications, updatedAt: new Date() },
  });
}

export async function createReviewReminder(data: InsertReviewReminder) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(reviewReminders).values(data).returning({ id: reviewReminders.id });
  return result[0].id;
}

export async function getPendingReminders(now: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviewReminders).where(and(eq(reviewReminders.sent, false), lte(reviewReminders.reminderTime, now)));
}

export async function markReminderSent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(reviewReminders).set({ sent: true, sentAt: Date.now() }).where(eq(reviewReminders.id, id));
}

// ─── A/B Testing ────────────────────────────────────────────────────
export async function createABTest(data: InsertABTest) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(abTests).values(data).returning({ id: abTests.id });
  return { id: result[0].id, ...data };
}

export async function getActiveABTests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(abTests).where(eq(abTests.status, "active")).orderBy(desc(abTests.createdAt));
}

export async function getABTestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(abTests).where(eq(abTests.id, id)).limit(1);
  return result[0];
}

export async function updateABTest(id: number, data: Partial<InsertABTest>) {
  const db = await getDb();
  if (!db) return;
  await db.update(abTests).set({ ...data, updatedAt: new Date() }).where(eq(abTests.id, id));
}

export async function createABTestVariant(data: InsertABTestVariant) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(abTestVariants).values(data).returning({ id: abTestVariants.id });
  return { id: result[0].id, ...data };
}

export async function getABTestVariants(testId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(abTestVariants).where(eq(abTestVariants.testId, testId));
}

export async function getABTestAssignment(testId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(abTestAssignments)
    .where(and(eq(abTestAssignments.testId, testId), eq(abTestAssignments.userId, userId)))
    .limit(1);
  return result[0];
}

export async function createABTestAssignment(data: InsertABTestAssignment) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(abTestAssignments).values(data).returning({ id: abTestAssignments.id });
  return { id: result[0].id, ...data };
}

export async function recordABTestMetric(data: InsertABTestMetric) {
  const db = await getDb();
  if (!db) return;
  await db.insert(abTestMetrics).values(data);
}

export async function getABTestResults(testId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(abTestMetrics).where(eq(abTestMetrics.testId, testId)).orderBy(desc(abTestMetrics.recordedAt));
}

// ─── Employer Completion Report ───────────────────────────────────────
export async function getOrgCompletionReport(orgId: number) {
  const db = await getDb();
  if (!db) return { members: [], summary: null };
  const members = await getUsersByOrg(orgId);
  const assignments = await db
    .select({
      id: lessonAssignments.id, userId: lessonAssignments.userId, lessonId: lessonAssignments.lessonId,
      status: lessonAssignments.status, priority: lessonAssignments.priority, dueDate: lessonAssignments.dueDate,
      completedAt: lessonAssignments.completedAt, isScheduleAware: lessonAssignments.isScheduleAware, createdAt: lessonAssignments.createdAt,
    })
    .from(lessonAssignments)
    .where(eq(lessonAssignments.orgId, orgId))
    .orderBy(desc(lessonAssignments.createdAt));
  const memberMap = new Map<number, {
    userId: number; name: string | null; email: string | null;
    appRole: string; approvalStatus: string;
    total: number; completed: number; inProgress: number; overdue: number;
    completionRate: number; lastActivity: number | null;
  }>();
  for (const m of members) {
    memberMap.set(m.id, {
      userId: m.id, name: m.name, email: m.email,
      appRole: m.appRole, approvalStatus: m.approvalStatus,
      total: 0, completed: 0, inProgress: 0, overdue: 0, completionRate: 0, lastActivity: null,
    });
  }
  const now = Date.now();
  for (const a of assignments) {
    const entry = memberMap.get(a.userId);
    if (!entry) continue;
    entry.total++;
    if (a.status === "completed") {
      entry.completed++;
      if (a.completedAt && (!entry.lastActivity || a.completedAt > entry.lastActivity)) entry.lastActivity = a.completedAt;
    } else if (a.status === "in_progress") {
      entry.inProgress++;
    } else if (a.dueDate && a.dueDate < now && (a.status as string) !== "completed") {
      entry.overdue++;
    }
  }
  const memberStats = Array.from(memberMap.values()).map((m) => ({
    ...m,
    completionRate: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
    atRisk: m.overdue > 0 || (m.total > 0 && m.completed / m.total < 0.3),
  }));
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter((a) => (a.status as string) === "completed").length;
  const overdueAssignments = assignments.filter((a) => a.dueDate && a.dueDate < now && (a.status as string) !== "completed").length;
  const atRiskCount = memberStats.filter((m) => m.atRisk).length;
  return {
    members: memberStats,
    summary: {
      totalMembers: members.length, totalAssignments, completedAssignments, overdueAssignments, atRiskCount,
      orgCompletionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
    },
  };
}

// ─── Alias for subscription by org ──────────────────────────────────
export async function getOrgSubscription(orgId: number) {
  return getSubscriptionByOrg(orgId);
}

// ─── Aliases & missing helpers ───────────────────────────────────────

/** Alias: get consents by user (used by adminExport) */
export async function getUserConsents(userId: number) {
  return getConsentsByUser(userId);
}

/** Get subscription by user ID (looks up org first) */
export async function getSubscriptionByUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const user = await getUserById(userId);
  if (!user?.orgId) return undefined;
  return getSubscriptionByOrg(user.orgId);
}

/** Get all active subscriptions */
export async function getAllActiveSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).where(eq(subscriptions.status, "active")).orderBy(desc(subscriptions.createdAt));
}

/** Update subscription status */
export async function updateSubscription(id: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set({ ...data, updatedAt: new Date() }).where(eq(subscriptions.id, id));
}

/** Get payment by gateway reference */
export async function getPaymentByReference(reference: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.externalChargeId, reference)).limit(1);
  return result[0];
}

/** Get all webhook configs */
export async function getAllWebhookConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webhookConfigs).where(eq(webhookConfigs.isActive, true));
}

/** Get all push subscriptions for org */
export async function getPushSubscriptionsByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  const orgUsers = await getUsersByOrg(orgId);
  if (orgUsers.length === 0) return [];
  const userIds = orgUsers.map((u) => u.id);
  return db.select().from(pushSubscriptions).where(
    sql`${pushSubscriptions.userId} = ANY(${sql.raw(`ARRAY[${userIds.join(",")}]::int[]`)})`
  );
}

/** Get all push subscriptions (admin) */
export async function getAllPushSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions);
}

/** Get lesson by assignmentId (via join) */
export async function getLessonByAssignmentId(assignmentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ lesson: lessons })
    .from(lessonAssignments)
    .leftJoin(lessons, eq(lessonAssignments.lessonId, lessons.id))
    .where(eq(lessonAssignments.id, assignmentId))
    .limit(1);
  return result[0]?.lesson;
}

/** Get all voice cache entries (for admin cache management) */
export async function getAllVoiceCacheEntries(limit = 500) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(voiceAudioCache).orderBy(desc(voiceAudioCache.lastAccessedAt)).limit(limit);
}

/** Bulk delete voice cache entries */
export async function bulkDeleteVoiceCacheEntries(ids: number[]) {
  const db = await getDb();
  if (!db) return;
  if (ids.length === 0) return;
  await db.delete(voiceAudioCache).where(sql`${voiceAudioCache.id} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`);
}

/** Get all achievements for a user with achievement details */
export async function getUserAchievementsWithDetails(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ userAchievement: userAchievements, achievement: achievements })
    .from(userAchievements)
    .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.unlockedAt));
}

/** Get all leaderboard entries for admin */
export async function getAllLeaderboardEntries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leaderboardCache).orderBy(asc(leaderboardCache.rank));
}

/** Get all review schedules for admin */
export async function getAllReviewSchedules(limit = 1000) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonReviewSchedule).orderBy(asc(lessonReviewSchedule.nextReviewDate)).limit(limit);
}

/** Get all A/B tests (admin) */
export async function getAllABTests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(abTests).orderBy(desc(abTests.createdAt));
}

/** Delete A/B test */
export async function deleteABTest(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(abTests).where(eq(abTests.id, id));
}

/** Get all A/B test assignments for a test */
export async function getABTestAssignments(testId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(abTestAssignments).where(eq(abTestAssignments.testId, testId));
}

/** Count active subscription plans */
export async function getPlansCount() {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  return Number(result?.count ?? 0);
}

// ─── Additional aliases to fix remaining TS errors ───────────────────

/** Alias: getAuditLogsByUser */
export async function getAuditLogsByUser(userId: number, limit = 100) {
  return getAuditLogs(undefined, userId, limit);
}

/** Alias: getWebhookConfigsByOrg (plural) */
export async function getWebhookConfigsByOrg(orgId: number) {
  const result = await getWebhookConfigByOrg(orgId);
  return result ? [result] : [];
}

/** Alias: getPushSubscriptions (used by pushNotification service) */
export async function getPushSubscriptions(userId?: number) {
  if (userId !== undefined) return getPushSubscriptionsByUser(userId);
  return getAllPushSubscriptions();
}

/** Alias: removePushSubscription */
export async function removePushSubscription(endpoint: string) {
  return deletePushSubscription(endpoint);
}

/** Alias: deleteNotification */
export async function deleteNotification(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notifications).where(eq(notifications.id, id));
}

/** Update payment status by id */
export async function updatePaymentStatus(id: number, status: string) {
  return updatePayment(id, { status: status as any });
}

/** Update subscription status */
export async function updateSubscriptionStatus(id: number, status: string) {
  return updateSubscription(id, { status: status as any });
}

/** Update subscription external IDs (Tap chargeId, customerId) */
export async function updateSubscriptionExternalIds(id: number, data: { tapChargeId?: string; tapCustomerId?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set(data as any).where(eq(subscriptions.id, id));
}

/** Get payment by external charge ID (Tap) */
export async function getPaymentByExternalChargeId(chargeId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.externalChargeId, chargeId)).limit(1);
  return result[0];
}

/** Get users with upcoming shifts (for push notification scheduling) */
export async function getUsersWithUpcomingShifts(withinMs: number) {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  const future = now + withinMs;
  return db
    .select({ user: users, shift: shifts })
    .from(shifts)
    .leftJoin(users, eq(shifts.userId, users.id))
    .where(and(gte(shifts.startTime, now), lte(shifts.startTime, future)))
    .orderBy(asc(shifts.startTime));
}

/** Get user notification preferences (stored in reminderPreferences) */
export async function getUserNotificationPrefs(userId: number) {
  return getReminderPreferences(userId);
}

/** Mark breach event as notified */
export async function markBreachNotified(id: number) {
  return updateBreachEvent(id, { notified: true } as any);
}

/** Get unnotified breach events */
export async function getUnnotifiedBreachEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(breachEvents).where(sql`${breachEvents.notifiedAt} IS NULL`).orderBy(desc(breachEvents.createdAt));
}

/** Get org completion patterns for AI recommendations */
export async function getOrgCompletionPatterns(orgId: number, excludeUserId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = excludeUserId
    ? and(eq(users.orgId, orgId), ne(lessonAttempts.userId, excludeUserId))
    : eq(users.orgId, orgId);
  return db
    .select({
      lessonId: lessonAttempts.lessonId,
      avgScore: sql<number>`ROUND(AVG(${lessonAttempts.score}), 2)`,
      attemptCount: sql<number>`COUNT(*)`,
      completedCount: sql<number>`SUM(CASE WHEN ${lessonAttempts.completedAt} THEN 1 ELSE 0 END)`,
    })
    .from(lessonAttempts)
    .leftJoin(users, eq(lessonAttempts.userId, users.id))
    .where(conditions)
    .groupBy(lessonAttempts.lessonId)
    .orderBy(desc(sql`COUNT(*)`));
}

// ─── Final batch of aliases ──────────────────────────────────────────

/** Alias: getAttemptByAssignmentAndUser */
export async function getAttemptByAssignmentAndUser(assignmentId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(lessonAttempts)
    .where(and(eq(lessonAttempts.assignmentId, assignmentId), eq(lessonAttempts.userId, userId)))
    .orderBy(desc(lessonAttempts.startedAt))
    .limit(1);
  return result[0];
}

/** Alias: updateAssignmentStatus */
export async function updateAssignmentStatus(id: number, status: string) {
  return updateAssignment(id, { status: status as any });
}

/** Alias: savePushSubscription → createPushSubscription */
export async function savePushSubscription(data: {
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}) {
  return createPushSubscription(data);
}

// ─── Consent helpers ─────────────────────────────────────────────────

/** Get all consents by type (admin stats) */
export async function getConsentsByType(consentType: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consents).where(eq(consents.consentType, consentType as any));
}

/** Withdraw a consent record */
export async function withdrawConsent(userId: number, consentType: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(consents)
    .set({ granted: false, withdrawnAt: Date.now() })
    .where(and(eq(consents.userId, userId), eq(consents.consentType, consentType as any)));
}

// ─── IP Allowlist helpers ─────────────────────────────────────────────

/** Get all IP allowlist entries */
export async function getAllAllowlistEntries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminIpAllowlist).orderBy(desc(adminIpAllowlist.createdAt));
}

/** Add an IP allowlist entry */
export async function addAllowlistEntry(data: {
  ipAddress: string;
  label: string | null;
  addedBy: number;
  isActive: boolean;
  expiresAt: Date | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminIpAllowlist).values(data as any);
}

/** Soft-remove an IP allowlist entry */
export async function removeAllowlistEntry(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminIpAllowlist).set({ isActive: false } as any).where(eq(adminIpAllowlist.id, id));
}

/** Hard-delete an IP allowlist entry */
export async function deleteAllowlistEntry(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(adminIpAllowlist).where(eq(adminIpAllowlist.id, id));
}

// ─── updateAssignmentStatus with optional completedAt ────────────────

/** Update assignment status with optional completedAt timestamp */
export async function updateAssignmentStatusFull(id: number, status: string, completedAt?: number) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status, updatedAt: new Date() };
  if (completedAt !== undefined) updateData.completedAt = completedAt;
  await db.update(lessonAssignments).set(updateData as any).where(eq(lessonAssignments.id, id));
}

// ─── Breach event helpers ─────────────────────────────────────────────

/** Get a single breach event by ID */
export async function getBreachEventById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(breachEvents).where(eq(breachEvents.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Update breach event status */
export async function updateBreachEventStatus(
  id: number,
  status: string,
  resolvedAt?: number
) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status, updatedAt: new Date() };
  if (resolvedAt !== undefined) updateData.resolvedAt = resolvedAt;
  await db.update(breachEvents).set(updateData as any).where(eq(breachEvents.id, id));
}

// ─── Pack purchase helper ─────────────────────────────────────────────

/** Record a lesson pack purchase (alias for createPayment with pack type) */
export async function recordPackPurchase(data: {
  orgId: number;
  userId: number;
  packId: number;
  amount: number;
  currency: string;
  externalChargeId?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.insert(payments).values({
    orgId: data.orgId,
    userId: data.userId,
    amount: data.amount.toString(),
    currency: data.currency,
    status: "pending",
    type: "pack_purchase",
    externalChargeId: data.externalChargeId ?? null,
    metadata: { packId: data.packId } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any).returning({ id: payments.id });
  return rows[0] ?? null;
}

// ─── Final missing aliases ────────────────────────────────────────────

/** Get plan by slug (alias: search by name field) */
export async function getPlanBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(subscriptionPlans)
    .where(eq(subscriptionPlans.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/** Get all plans for admin (alias for getAllPlans) */
export const getAllPlansAdmin = getAllPlans;

/** Get user purchased packs (alias for getUserPurchases) */
export const getUserPurchasedPacks = getUserPurchases;

/** Get active IP allowlist entries (alias for getAdminIpAllowlist) */
export const getActiveAllowlistEntries = getAdminIpAllowlist;

/** Get user by openId — legacy alias for Manus OAuth, now maps to supabaseId */
export async function getUserByOpenId(openId: string) {
  return getUserBySupabaseId(openId);
}

/** Fix breach notified field — alias using notifiedAt */

