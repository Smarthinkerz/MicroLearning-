import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  bigint,
  decimal,
  serial,
  unique,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const appRoleEnum = pgEnum("app_role", ["learner", "employer_admin", "content_author", "super_admin"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "disapproved", "blocked", "removed"]);
export const shiftTypeEnum = pgEnum("shift_type", ["morning", "afternoon", "night", "split", "custom"]);
export const shiftSourceEnum = pgEnum("shift_source", ["manual", "webhook", "import"]);
export const contentTypeEnum = pgEnum("content_type", ["video", "quiz", "scenario", "assessment", "mixed", "article"]);
export const difficultyEnum = pgEnum("difficulty", ["beginner", "intermediate", "advanced"]);
export const lessonStatusEnum = pgEnum("lesson_status", ["draft", "in_review", "published", "archived"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["pending", "available", "in_progress", "completed", "expired", "skipped"]);
export const priorityEnum = pgEnum("priority", ["low", "normal", "high", "urgent"]);
export const attemptStatusEnum = pgEnum("attempt_status", ["in_progress", "completed", "abandoned"]);
export const syncStatusEnum = pgEnum("sync_status", ["synced", "pending", "conflict"]);
export const notificationTypeEnum = pgEnum("notification_type", ["lesson_available", "lesson_reminder", "shift_change", "assignment", "achievement", "system"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["starter", "pro", "enterprise", "consumer_free", "consumer_premium"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "trial", "past_due", "canceled", "expired"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "succeeded", "failed", "refunded"]);
export const achievementCategoryEnum = pgEnum("achievement_category", ["learning", "performance", "consistency", "social", "mastery"]);
export const rarityEnum = pgEnum("rarity", ["common", "uncommon", "rare", "epic", "legendary"]);
export const leaderboardScopeEnum = pgEnum("leaderboard_scope", ["personal", "team", "organization", "global"]);
export const uptimeStatusEnum = pgEnum("uptime_status", ["operational", "degraded", "down", "unknown"]);
export const reviewStatusEnum = pgEnum("review_status", ["new", "learning", "review", "mastered"]);
export const reviewDifficultyEnum = pgEnum("review_difficulty", ["easy", "medium", "hard", "very_hard"]);
export const reminderTypeEnum = pgEnum("reminder_type", ["due_now", "due_tomorrow", "due_this_week", "custom"]);
export const reminderFrequencyEnum = pgEnum("reminder_frequency", ["immediate", "daily", "weekly", "never"]);
export const abTestTypeEnum = pgEnum("ab_test_type", ["pricing", "feature", "ui", "messaging"]);
export const abTestStatusEnum = pgEnum("ab_test_status", ["draft", "active", "paused", "completed"]);
export const consentTypeEnum = pgEnum("consent_type", ["terms_of_service", "privacy_policy", "marketing_emails", "analytics_tracking", "data_processing", "third_party_sharing"]);
export const breachEventTypeEnum = pgEnum("breach_event_type", ["brute_force", "bulk_data_access", "unauthorized_admin_access", "data_exfiltration", "anomalous_pattern", "manual_report"]);
export const severityEnum = pgEnum("severity", ["low", "medium", "high", "critical"]);
export const detectedByEnum = pgEnum("detected_by", ["automated", "manual"]);
export const breachStatusEnum = pgEnum("breach_status", ["detected", "investigating", "contained", "resolved", "false_positive"]);
export const feedbackDifficultyEnum = pgEnum("feedback_difficulty", ["too_easy", "just_right", "too_hard"]);

// ─── Organizations (Multi-Tenant) ────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  industry: varchar("industry", { length: 128 }),
  logoUrl: text("logo_url"),
  settings: json("settings").$type<Record<string, unknown>>(),
  maxUsers: integer("max_users").default(100),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Users ───────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // Supabase Auth user ID (UUID from auth.users)
  supabaseId: varchar("supabase_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: roleEnum("role").default("user").notNull(),
  appRole: appRoleEnum("app_role").default("learner").notNull(),
  orgId: integer("org_id"),
  timezone: varchar("timezone", { length: 64 }).default("UTC"),
  avatarUrl: text("avatar_url"),
  notificationPreferences: json("notification_preferences").$type<{
    email: boolean;
    push: boolean;
    inApp: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  }>(),
  approvalStatus: approvalStatusEnum("approval_status").default("pending").notNull(),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by"),
  disapprovalReason: text("disapproval_reason"),
  blockReason: text("block_reason"),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

// ─── Shifts ──────────────────────────────────────────────────────────
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  orgId: integer("org_id").notNull(),
  title: varchar("title", { length: 255 }),
  startTime: bigint("start_time", { mode: "number" }).notNull(),
  endTime: bigint("end_time", { mode: "number" }).notNull(),
  breakStartTime: bigint("break_start_time", { mode: "number" }),
  breakEndTime: bigint("break_end_time", { mode: "number" }),
  shiftType: shiftTypeEnum("shift_type").default("custom"),
  location: varchar("location", { length: 255 }),
  externalId: varchar("external_id", { length: 255 }),
  source: shiftSourceEnum("source").default("manual"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Lessons ─────────────────────────────────────────────────────────
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  content: json("content").$type<LessonContent>(),
  contentType: contentTypeEnum("content_type").default("mixed"),
  durationMinutes: integer("duration_minutes").default(5),
  difficulty: difficultyEnum("difficulty").default("beginner"),
  category: varchar("category", { length: 128 }),
  tags: json("tags").$type<string[]>(),
  thumbnailUrl: text("thumbnail_url"),
  authorId: integer("author_id").notNull(),
  status: lessonStatusEnum("status").default("draft"),
  reviewerId: integer("reviewer_id"),
  reviewNotes: text("review_notes"),
  publishedAt: timestamp("published_at"),
  contentSchemaVersion: integer("content_schema_version").default(1),
  language: varchar("language", { length: 10 }).default("en"),
  xapiActivityId: varchar("xapi_activity_id", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Lesson Assignments ──────────────────────────────────────────────
export const lessonAssignments = pgTable("lesson_assignments", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  userId: integer("user_id").notNull(),
  orgId: integer("org_id").notNull(),
  assignedBy: integer("assigned_by"),
  status: assignmentStatusEnum("status").default("pending"),
  priority: priorityEnum("priority").default("normal"),
  scheduledStartTime: bigint("scheduled_start_time", { mode: "number" }),
  scheduledEndTime: bigint("scheduled_end_time", { mode: "number" }),
  dueDate: bigint("due_date", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  isScheduleAware: boolean("is_schedule_aware").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Lesson Attempts / Progress ──────────────────────────────────────
export const lessonAttempts = pgTable("lesson_attempts", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  orgId: integer("org_id").notNull(),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  completedAt: bigint("completed_at", { mode: "number" }),
  timeSpentSeconds: integer("time_spent_seconds").default(0),
  score: integer("score"),
  maxScore: integer("max_score"),
  passed: boolean("passed"),
  responses: json("responses").$type<AttemptResponse[]>(),
  progress: integer("progress").default(0),
  currentStep: integer("current_step").default(0),
  status: attemptStatusEnum("status").default("in_progress"),
  syncStatus: syncStatusEnum("sync_status").default("synced"),
  clientTimestamp: bigint("client_timestamp", { mode: "number" }),
  serverTimestamp: bigint("server_timestamp", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Certificates ────────────────────────────────────────────────────
export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  orgId: integer("org_id").notNull(),
  attemptId: integer("attempt_id"),
  certificateNumber: varchar("certificate_number", { length: 128 }).notNull().unique(),
  issuedAt: bigint("issued_at", { mode: "number" }).notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Audit Logs ──────────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  orgId: integer("org_id"),
  action: varchar("action", { length: 128 }).notNull(),
  resourceType: varchar("resource_type", { length: 64 }).notNull(),
  resourceId: integer("resource_id"),
  details: json("details").$type<Record<string, unknown>>(),
  ipAddress: varchar("ip_address", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Notifications ───────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  orgId: integer("org_id"),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").default("system"),
  isRead: boolean("is_read").default(false).notNull(),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Platform Settings ─────────────────────────────────────────────
export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("setting_key", { length: 128 }).notNull().unique(),
  settingValue: json("setting_value").$type<Record<string, unknown>>(),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Subscription Plans ─────────────────────────────────────────────
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  tier: subscriptionTierEnum("tier").notNull(),
  priceMonthly: integer("price_monthly").notNull(),
  priceYearly: integer("price_yearly"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  isPerUser: boolean("is_per_user").default(true).notNull(),
  maxUsers: integer("max_users"),
  features: json("features").$type<PlanFeatures>(),
  addOns: json("add_ons").$type<AddOn[]>(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Organization Subscriptions ────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  planId: integer("plan_id").notNull(),
  status: subscriptionStatusEnum("status").default("trial").notNull(),
  currentPeriodStart: bigint("current_period_start", { mode: "number" }).notNull(),
  currentPeriodEnd: bigint("current_period_end", { mode: "number" }).notNull(),
  canceledAt: bigint("canceled_at", { mode: "number" }),
  trialEndsAt: bigint("trial_ends_at", { mode: "number" }),
  quantity: integer("quantity").default(1),
  externalPaymentId: varchar("external_payment_id", { length: 255 }),
  externalCustomerId: varchar("external_customer_id", { length: 255 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Payment History ────────────────────────────────────────────────
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  subscriptionId: integer("subscription_id"),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: paymentStatusEnum("status").default("pending").notNull(),
  paymentMethod: varchar("payment_method", { length: 64 }),
  externalChargeId: varchar("external_charge_id", { length: 255 }),
  description: text("description"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  paidAt: bigint("paid_at", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Consumer Lesson Packs ──────────────────────────────────────────
export const lessonPacks = pgTable("lesson_packs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  price: integer("price").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  lessonIds: json("lesson_ids").$type<number[]>(),
  category: varchar("category", { length: 128 }),
  thumbnailUrl: text("thumbnail_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── User Pack Purchases ────────────────────────────────────────────
export const userPackPurchases = pgTable("user_pack_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  packId: integer("pack_id").notNull(),
  paymentId: integer("payment_id"),
  purchasedAt: bigint("purchased_at", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── WFM Webhook Configs ─────────────────────────────────────────────
export const webhookConfigs = pgTable("webhook_configs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  provider: varchar("provider", { length: 128 }).notNull(),
  webhookUrl: text("webhook_url"),
  secretKey: varchar("secret_key", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Push Subscriptions ─────────────────────────────────────────────
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
});

// ─── Achievements ────────────────────────────────────────────────────
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 255 }).notNull(),
  category: achievementCategoryEnum("category").notNull(),
  rarity: rarityEnum("rarity").default("common").notNull(),
  points: integer("points").default(10).notNull(),
  criteria: json("criteria").$type<{
    type: "lesson_count" | "perfect_score" | "streak_days" | "completion_rate" | "score_threshold" | "custom";
    value: number | string;
  }>().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── User Achievements ──────────────────────────────────────────────
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  achievementId: integer("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── User Points ─────────────────────────────────────────────────────
export const userPoints = pgTable("user_points", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  currentLevelPoints: integer("current_level_points").default(0).notNull(),
  nextLevelThreshold: integer("next_level_threshold").default(100).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Leaderboard Cache ───────────────────────────────────────────────
export const leaderboardCache = pgTable("leaderboard_cache", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  orgId: integer("org_id"),
  scope: leaderboardScopeEnum("scope").notNull(),
  rank: integer("rank").notNull(),
  points: integer("points").notNull(),
  level: integer("level").notNull(),
  lessonsCompleted: integer("lessons_completed").default(0).notNull(),
  perfectScores: integer("perfect_scores").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Voice Audio Cache ──────────────────────────────────────────────
export const voiceAudioCache = pgTable("voice_audio_cache", {
  id: serial("id").primaryKey(),
  textHash: varchar("text_hash", { length: 64 }).notNull(),
  voiceId: varchar("voice_id", { length: 128 }).notNull(),
  stability: varchar("stability", { length: 8 }).notNull().default("0.50"),
  similarityBoost: varchar("similarity_boost", { length: 8 }).notNull().default("0.75"),
  style: varchar("style", { length: 8 }).notNull().default("0.00"),
  lessonId: integer("lesson_id"),
  audioUrl: text("audio_url").notNull(),
  fileKey: varchar("file_key", { length: 512 }).notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  charCount: integer("char_count").notNull().default(0),
  hitCount: integer("hit_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
});

// ─── Admin IP Allowlist ─────────────────────────────────────────────
export const adminIpAllowlist = pgTable("admin_ip_allowlist", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  label: varchar("label", { length: 255 }),
  addedBy: integer("added_by"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

// ─── GDPR Consents ──────────────────────────────────────────────────
export const consents = pgTable("consents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  consentType: consentTypeEnum("consent_type").notNull(),
  granted: boolean("granted").default(false).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  version: varchar("version", { length: 32 }).default("1.0"),
  grantedAt: bigint("granted_at", { mode: "number" }),
  withdrawnAt: bigint("withdrawn_at", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Breach Events ─────────────────────────────────────────────────
export const breachEvents = pgTable("breach_events", {
  id: serial("id").primaryKey(),
  eventType: breachEventTypeEnum("event_type").notNull(),
  severity: severityEnum("severity").notNull(),
  description: text("description").notNull(),
  affectedUserCount: integer("affected_user_count").default(0),
  affectedResourceType: varchar("affected_resource_type", { length: 128 }),
  sourceIp: varchar("source_ip", { length: 45 }),
  detectedBy: detectedByEnum("detected_by").default("automated").notNull(),
  status: breachStatusEnum("status").default("detected").notNull(),
  notifiedAt: bigint("notified_at", { mode: "number" }),
  resolvedAt: bigint("resolved_at", { mode: "number" }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Lesson Feedback ────────────────────────────────────────────────
export const lessonFeedback = pgTable("lesson_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  attemptId: integer("attempt_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  difficulty: feedbackDifficultyEnum("difficulty"),
  wouldRecommend: boolean("would_recommend"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Uptime History ─────────────────────────────────────────────────
export const uptimeHistory = pgTable("uptime_history", {
  id: serial("id").primaryKey(),
  serviceName: varchar("service_name", { length: 128 }).notNull(),
  status: uptimeStatusEnum("status").notNull(),
  latencyMs: integer("latency_ms"),
  message: text("message"),
  checkedAt: bigint("checked_at", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Spaced Repetition ──────────────────────────────────────────────
export const lessonReviewSchedule = pgTable("lesson_review_schedule", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  orgId: integer("org_id").notNull(),
  interval: integer("interval").default(1).notNull(),
  easeFactor: decimal("ease_factor", { precision: 3, scale: 2 }).default("2.5").notNull(),
  repetitions: integer("repetitions").default(0).notNull(),
  nextReviewDate: bigint("next_review_date", { mode: "number" }).notNull(),
  lastReviewDate: bigint("last_review_date", { mode: "number" }),
  status: reviewStatusEnum("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Review History ─────────────────────────────────────────────────
export const reviewHistory = pgTable("review_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  orgId: integer("org_id").notNull(),
  score: integer("score").notNull(),
  difficulty: reviewDifficultyEnum("difficulty").notNull(),
  timeSpentSeconds: integer("time_spent_seconds"),
  quality: integer("quality").notNull(),
  reviewedAt: bigint("reviewed_at", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Review Reminders ───────────────────────────────────────────────
export const reviewReminders = pgTable("review_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  orgId: integer("org_id").notNull(),
  reminderTime: bigint("reminder_time", { mode: "number" }).notNull(),
  reminderType: reminderTypeEnum("reminder_type").default("due_now").notNull(),
  sent: boolean("sent").default(false).notNull(),
  sentAt: bigint("sent_at", { mode: "number" }),
  clicked: boolean("clicked").default(false).notNull(),
  clickedAt: bigint("clicked_at", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Reminder Preferences ───────────────────────────────────────────
export const reminderPreferences = pgTable("reminder_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  orgId: integer("org_id").notNull(),
  enableReminders: boolean("enable_reminders").default(true).notNull(),
  reminderFrequency: reminderFrequencyEnum("reminder_frequency").default("daily").notNull(),
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false).notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),
  enablePushNotifications: boolean("enable_push_notifications").default(true).notNull(),
  enableEmailNotifications: boolean("enable_email_notifications").default(false).notNull(),
  enableInAppNotifications: boolean("enable_in_app_notifications").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── A/B Testing ────────────────────────────────────────────────────
export const abTests = pgTable("ab_tests", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: abTestTypeEnum("type").notNull(),
  status: abTestStatusEnum("status").default("draft").notNull(),
  startDate: bigint("start_date", { mode: "number" }),
  endDate: bigint("end_date", { mode: "number" }),
  targetAudience: varchar("target_audience", { length: 255 }),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const abTestVariants = pgTable("ab_test_variants", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  weight: integer("weight").default(50),
  config: json("config").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const abTestAssignments = pgTable("ab_test_assignments", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull(),
  userId: integer("user_id").notNull(),
  variantId: integer("variant_id").notNull(),
  assignedAt: bigint("assigned_at", { mode: "number" }).notNull(),
});

export const abTestMetrics = pgTable("ab_test_metrics", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull(),
  variantId: integer("variant_id").notNull(),
  metricName: varchar("metric_name", { length: 255 }).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }),
  count: integer("count").default(0),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// ─── Content Types ───────────────────────────────────────────────────
export type LessonContentBlock = {
  id: string;
  type: "text" | "video" | "quiz" | "scenario" | "assessment" | "image";
  data: Record<string, unknown>;
  order: number;
};

export type QuizQuestion = {
  id: string;
  question: string;
  type: "multiple_choice" | "true_false" | "fill_blank" | "matching";
  options?: { id: string; text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
};

export type ScenarioBranch = {
  id: string;
  text: string;
  nextNodeId: string;
  feedback?: string;
  isCorrect?: boolean;
};

export type ScenarioNode = {
  id: string;
  type: "prompt" | "choice" | "outcome";
  content: string;
  branches?: ScenarioBranch[];
  imageUrl?: string;
};

export type LessonContent = {
  blocks: LessonContentBlock[];
  quizQuestions?: QuizQuestion[];
  scenarioNodes?: ScenarioNode[];
  passingScore?: number;
};

export type AttemptResponse = {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  timeSpentSeconds?: number;
};

export type PlanFeatures = {
  maxLessons: number;
  offlineAccess: boolean;
  basicTracking: boolean;
  fullAnalytics: boolean;
  adaptiveRecommendations: boolean;
  contentAuthoring: boolean;
  cohortManagement: boolean;
  scormXapiExport: boolean;
  rbac: boolean;
  sso: boolean;
  hrisIntegration: boolean;
  whiteLabel: boolean;
  customOnboarding: boolean;
  sla: boolean;
  dedicatedManager: boolean;
  gamification: boolean;
  pushNotifications: boolean;
  emailSupport: boolean;
  prioritySupport: boolean;
  voiceNarration: boolean;
  vrXrTraining: boolean;
  skillsIntelligence: boolean;
  workforceCompetencyMapping: boolean;
  complianceAutomation: boolean;
  aiCoachingAssistant: boolean;
  managerInsightsDashboard: boolean;
  learningRoiReporting: boolean;
  enterpriseIntegrations: boolean;
  skillReadinessForecast: boolean;
  teamCapabilityMapping: boolean;
  learningImpactAnalytics: boolean;
  aiWorkforceDevelopmentInsights: boolean;
  predictiveChurnAnalysis: boolean;
  personalizedAiCoach: boolean;
  skillMasteryAnalytics: boolean;
  certificatesAchievements: boolean;
  adaptivePathways: boolean;
  premiumAiMentorConversations: boolean;
  skillsGapAnalysis: boolean;
  learningPathwaysAutomation: boolean;
};

export type AddOn = {
  id: string;
  name: string;
  priceMonthly: number;
  description: string;
};

export type PlatformBranding = {
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  primaryHue: number;
  accentColor: string;
  theme: "dark" | "light";
  sidebarStyle: "default" | "compact" | "minimal";
  fontFamily: string;
  heroTitle: string;
  heroSubtitle: string;
  footerText: string;
  customCss: string;
};

// ─── Type Exports ────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;
export type LessonAssignment = typeof lessonAssignments.$inferSelect;
export type InsertLessonAssignment = typeof lessonAssignments.$inferInsert;
export type LessonAttempt = typeof lessonAttempts.$inferSelect;
export type InsertLessonAttempt = typeof lessonAttempts.$inferInsert;
export type Certificate = typeof certificates.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type PlatformSettingsRow = typeof platformSettings.$inferSelect;
export type PlatformSettings = typeof platformSettings.$inferSelect;
export type InsertPlatformSettings = typeof platformSettings.$inferInsert;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type LessonPack = typeof lessonPacks.$inferSelect;
export type InsertLessonPack = typeof lessonPacks.$inferInsert;
export type UserPackPurchase = typeof userPackPurchases.$inferSelect;
export type VoiceAudioCache = typeof voiceAudioCache.$inferSelect;
export type InsertVoiceAudioCache = typeof voiceAudioCache.$inferInsert;
export type AdminIpAllowlistEntry = typeof adminIpAllowlist.$inferSelect;
export type InsertAdminIpAllowlistEntry = typeof adminIpAllowlist.$inferInsert;
export type Consent = typeof consents.$inferSelect;
export type InsertConsent = typeof consents.$inferInsert;
export type BreachEvent = typeof breachEvents.$inferSelect;
export type InsertBreachEvent = typeof breachEvents.$inferInsert;
export type LessonFeedback = typeof lessonFeedback.$inferSelect;
export type InsertLessonFeedback = typeof lessonFeedback.$inferInsert;
export type UptimeHistory = typeof uptimeHistory.$inferSelect;
export type InsertUptimeHistory = typeof uptimeHistory.$inferInsert;
export type LessonReviewSchedule = typeof lessonReviewSchedule.$inferSelect;
export type InsertLessonReviewSchedule = typeof lessonReviewSchedule.$inferInsert;
export type ReviewHistory = typeof reviewHistory.$inferSelect;
export type InsertReviewHistory = typeof reviewHistory.$inferInsert;
export type ReviewReminder = typeof reviewReminders.$inferSelect;
export type InsertReviewReminder = typeof reviewReminders.$inferInsert;
export type ReminderPreferences = typeof reminderPreferences.$inferSelect;
export type InsertReminderPreferences = typeof reminderPreferences.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof userAchievements.$inferInsert;
export type UserPoints = typeof userPoints.$inferSelect;
export type InsertUserPoints = typeof userPoints.$inferInsert;
export type LeaderboardEntry = typeof leaderboardCache.$inferSelect;
export type InsertLeaderboardEntry = typeof leaderboardCache.$inferInsert;
export type ABTest = typeof abTests.$inferSelect;
export type InsertABTest = typeof abTests.$inferInsert;
export type ABTestVariant = typeof abTestVariants.$inferSelect;
export type InsertABTestVariant = typeof abTestVariants.$inferInsert;
export type ABTestAssignment = typeof abTestAssignments.$inferSelect;
export type InsertABTestAssignment = typeof abTestAssignments.$inferInsert;
export type ABTestMetric = typeof abTestMetrics.$inferSelect;
export type InsertABTestMetric = typeof abTestMetrics.$inferInsert;

// ─── Tap Payments: Orders ────────────────────────────────────────────────────
export const orderStatusEnum = pgEnum("order_status", [
  "initiated",
  "paid",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
  "refunding",
]);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tapChargeId: varchar("tap_charge_id", { length: 255 }).unique(),
  referenceTransaction: varchar("reference_transaction", { length: 255 }).notNull(),
  referenceOrder: varchar("reference_order", { length: 255 }).notNull(),
  planSlug: varchar("plan_slug", { length: 128 }).notNull(),
  planName: varchar("plan_name", { length: 255 }).notNull(),
  product: varchar("product", { length: 255 }).notNull(),
  cycle: varchar("cycle", { length: 32 }),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  customerFirstName: varchar("customer_first_name", { length: 128 }).notNull(),
  customerLastName: varchar("customer_last_name", { length: 128 }),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 32 }),
  customerPhoneCountryCode: varchar("customer_phone_country_code", { length: 8 }),
  status: orderStatusEnum("status").default("initiated").notNull(),
  failureMessage: text("failure_message"),
  paidAt: bigint("paid_at", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  tapResponseCode: varchar("tap_response_code", { length: 32 }),
  tapResponseMessage: text("tap_response_message"),
  receiptSent: boolean("receipt_sent").default(false).notNull(),
});

// ─── Tap Payments: Webhook Idempotency ───────────────────────────────────────
export const processedWebhookEvents = pgTable("processed_webhook_events", {
  id: serial("id").primaryKey(),
  eventKey: varchar("event_key", { length: 512 }).notNull().unique(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

// ─── Tap Payments: Webhook Audit Log ─────────────────────────────────────────
export const webhookAuditEvents = pgTable("webhook_audit_events", {
  id: serial("id").primaryKey(),
  chargeId: varchar("charge_id", { length: 255 }),
  rawStatus: varchar("raw_status", { length: 64 }),
  result: varchar("result", { length: 64 }).notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type ProcessedWebhookEvent = typeof processedWebhookEvents.$inferSelect;
export type WebhookAuditEvent = typeof webhookAuditEvents.$inferSelect;
