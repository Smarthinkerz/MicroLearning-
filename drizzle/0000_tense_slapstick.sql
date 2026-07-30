CREATE TYPE "public"."ab_test_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."ab_test_type" AS ENUM('pricing', 'feature', 'ui', 'messaging');--> statement-breakpoint
CREATE TYPE "public"."achievement_category" AS ENUM('learning', 'performance', 'consistency', 'social', 'mastery');--> statement-breakpoint
CREATE TYPE "public"."app_role" AS ENUM('learner', 'employer_admin', 'content_author', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'disapproved', 'blocked', 'removed');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('pending', 'available', 'in_progress', 'completed', 'expired', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."attempt_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."breach_event_type" AS ENUM('brute_force', 'bulk_data_access', 'unauthorized_admin_access', 'data_exfiltration', 'anomalous_pattern', 'manual_report');--> statement-breakpoint
CREATE TYPE "public"."breach_status" AS ENUM('detected', 'investigating', 'contained', 'resolved', 'false_positive');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('terms_of_service', 'privacy_policy', 'marketing_emails', 'analytics_tracking', 'data_processing', 'third_party_sharing');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('video', 'quiz', 'scenario', 'assessment', 'mixed', 'article');--> statement-breakpoint
CREATE TYPE "public"."detected_by" AS ENUM('automated', 'manual');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."feedback_difficulty" AS ENUM('too_easy', 'just_right', 'too_hard');--> statement-breakpoint
CREATE TYPE "public"."leaderboard_scope" AS ENUM('personal', 'team', 'organization', 'global');--> statement-breakpoint
CREATE TYPE "public"."lesson_status" AS ENUM('draft', 'in_review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('lesson_available', 'lesson_reminder', 'shift_change', 'assignment', 'achievement', 'system');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('initiated', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'refunding');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."rarity" AS ENUM('common', 'uncommon', 'rare', 'epic', 'legendary');--> statement-breakpoint
CREATE TYPE "public"."reminder_frequency" AS ENUM('immediate', 'daily', 'weekly', 'never');--> statement-breakpoint
CREATE TYPE "public"."reminder_type" AS ENUM('due_now', 'due_tomorrow', 'due_this_week', 'custom');--> statement-breakpoint
CREATE TYPE "public"."review_difficulty" AS ENUM('easy', 'medium', 'hard', 'very_hard');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('new', 'learning', 'review', 'mastered');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."shift_source" AS ENUM('manual', 'webhook', 'import');--> statement-breakpoint
CREATE TYPE "public"."shift_type" AS ENUM('morning', 'afternoon', 'night', 'split', 'custom');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trial', 'past_due', 'canceled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('starter', 'pro', 'enterprise', 'consumer_free', 'consumer_premium');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('synced', 'pending', 'conflict');--> statement-breakpoint
CREATE TYPE "public"."uptime_status" AS ENUM('operational', 'degraded', 'down', 'unknown');--> statement-breakpoint
CREATE TABLE "ab_test_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"variant_id" integer NOT NULL,
	"assigned_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ab_test_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" integer NOT NULL,
	"variant_id" integer NOT NULL,
	"metric_name" varchar(255) NOT NULL,
	"value" numeric(10, 2),
	"count" integer DEFAULT 0,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ab_test_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"weight" integer DEFAULT 50,
	"config" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ab_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "ab_test_type" NOT NULL,
	"status" "ab_test_status" DEFAULT 'draft' NOT NULL,
	"start_date" bigint,
	"end_date" bigint,
	"target_audience" varchar(255),
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(255) NOT NULL,
	"category" "achievement_category" NOT NULL,
	"rarity" "rarity" DEFAULT 'common' NOT NULL,
	"points" integer DEFAULT 10 NOT NULL,
	"criteria" json NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_ip_allowlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"label" varchar(255),
	"added_by" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"org_id" integer,
	"action" varchar(128) NOT NULL,
	"resource_type" varchar(64) NOT NULL,
	"resource_id" integer,
	"details" json,
	"ip_address" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "breach_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" "breach_event_type" NOT NULL,
	"severity" "severity" NOT NULL,
	"description" text NOT NULL,
	"affected_user_count" integer DEFAULT 0,
	"affected_resource_type" varchar(128),
	"source_ip" varchar(45),
	"detected_by" "detected_by" DEFAULT 'automated' NOT NULL,
	"status" "breach_status" DEFAULT 'detected' NOT NULL,
	"notified_at" bigint,
	"resolved_at" bigint,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lesson_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"attempt_id" integer,
	"certificate_number" varchar(128) NOT NULL,
	"issued_at" bigint NOT NULL,
	"expires_at" bigint,
	"pdf_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"granted" boolean DEFAULT false NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"version" varchar(32) DEFAULT '1.0',
	"granted_at" bigint,
	"withdrawn_at" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer,
	"scope" "leaderboard_scope" NOT NULL,
	"rank" integer NOT NULL,
	"points" integer NOT NULL,
	"level" integer NOT NULL,
	"lessons_completed" integer DEFAULT 0 NOT NULL,
	"perfect_scores" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"lesson_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"assigned_by" integer,
	"status" "assignment_status" DEFAULT 'pending',
	"priority" "priority" DEFAULT 'normal',
	"scheduled_start_time" bigint,
	"scheduled_end_time" bigint,
	"due_date" bigint,
	"completed_at" bigint,
	"is_schedule_aware" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"lesson_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"started_at" bigint NOT NULL,
	"completed_at" bigint,
	"time_spent_seconds" integer DEFAULT 0,
	"score" integer,
	"max_score" integer,
	"passed" boolean,
	"responses" json,
	"progress" integer DEFAULT 0,
	"current_step" integer DEFAULT 0,
	"status" "attempt_status" DEFAULT 'in_progress',
	"sync_status" "sync_status" DEFAULT 'synced',
	"client_timestamp" bigint,
	"server_timestamp" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lesson_id" integer NOT NULL,
	"attempt_id" integer,
	"rating" integer NOT NULL,
	"comment" text,
	"difficulty" "feedback_difficulty",
	"would_recommend" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_packs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"lesson_ids" json,
	"category" varchar(128),
	"thumbnail_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_packs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lesson_review_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lesson_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"ease_factor" numeric(3, 2) DEFAULT '2.5' NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"next_review_date" bigint NOT NULL,
	"last_review_date" bigint,
	"status" "review_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"content" json,
	"content_type" "content_type" DEFAULT 'mixed',
	"duration_minutes" integer DEFAULT 5,
	"difficulty" "difficulty" DEFAULT 'beginner',
	"category" varchar(128),
	"tags" json,
	"thumbnail_url" text,
	"author_id" integer NOT NULL,
	"status" "lesson_status" DEFAULT 'draft',
	"reviewer_id" integer,
	"review_notes" text,
	"published_at" timestamp,
	"content_schema_version" integer DEFAULT 1,
	"language" varchar(10) DEFAULT 'en',
	"xapi_activity_id" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'system',
	"is_read" boolean DEFAULT false NOT NULL,
	"action_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"tap_charge_id" varchar(255),
	"reference_transaction" varchar(255) NOT NULL,
	"reference_order" varchar(255) NOT NULL,
	"plan_slug" varchar(128) NOT NULL,
	"plan_name" varchar(255) NOT NULL,
	"product" varchar(255) NOT NULL,
	"cycle" varchar(32),
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"customer_first_name" varchar(128) NOT NULL,
	"customer_last_name" varchar(128),
	"customer_email" varchar(255) NOT NULL,
	"customer_phone" varchar(32),
	"customer_phone_country_code" varchar(8),
	"status" "order_status" DEFAULT 'initiated' NOT NULL,
	"failure_message" text,
	"paid_at" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"tap_response_code" varchar(32),
	"tap_response_message" text,
	"receipt_sent" boolean DEFAULT false NOT NULL,
	CONSTRAINT "orders_tap_charge_id_unique" UNIQUE("tap_charge_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"industry" varchar(128),
	"logo_url" text,
	"settings" json,
	"max_users" integer DEFAULT 100,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"subscription_id" integer,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_method" varchar(64),
	"external_charge_id" varchar(255),
	"description" text,
	"metadata" json,
	"paid_at" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" varchar(128) NOT NULL,
	"setting_value" json,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "processed_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_key" varchar(512) NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "processed_webhook_events_event_key_unique" UNIQUE("event_key")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" varchar(255) NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"enable_reminders" boolean DEFAULT true NOT NULL,
	"reminder_frequency" "reminder_frequency" DEFAULT 'daily' NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" varchar(5),
	"quiet_hours_end" varchar(5),
	"enable_push_notifications" boolean DEFAULT true NOT NULL,
	"enable_email_notifications" boolean DEFAULT false NOT NULL,
	"enable_in_app_notifications" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reminder_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "review_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lesson_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"score" integer NOT NULL,
	"difficulty" "review_difficulty" NOT NULL,
	"time_spent_seconds" integer,
	"quality" integer NOT NULL,
	"reviewed_at" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lesson_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"reminder_time" bigint NOT NULL,
	"reminder_type" "reminder_type" DEFAULT 'due_now' NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"sent_at" bigint,
	"clicked" boolean DEFAULT false NOT NULL,
	"clicked_at" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"title" varchar(255),
	"start_time" bigint NOT NULL,
	"end_time" bigint NOT NULL,
	"break_start_time" bigint,
	"break_end_time" bigint,
	"shift_type" "shift_type" DEFAULT 'custom',
	"location" varchar(255),
	"external_id" varchar(255),
	"source" "shift_source" DEFAULT 'manual',
	"is_recurring" boolean DEFAULT false,
	"recurrence_rule" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"tier" "subscription_tier" NOT NULL,
	"price_monthly" integer NOT NULL,
	"price_yearly" integer,
	"currency" varchar(3) DEFAULT 'USD',
	"is_per_user" boolean DEFAULT true NOT NULL,
	"max_users" integer,
	"features" json,
	"add_ons" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"current_period_start" bigint NOT NULL,
	"current_period_end" bigint NOT NULL,
	"canceled_at" bigint,
	"trial_ends_at" bigint,
	"quantity" integer DEFAULT 1,
	"external_payment_id" varchar(255),
	"external_customer_id" varchar(255),
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uptime_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_name" varchar(128) NOT NULL,
	"status" "uptime_status" NOT NULL,
	"latency_ms" integer,
	"message" text,
	"checked_at" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"achievement_id" integer NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_pack_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"pack_id" integer NOT NULL,
	"payment_id" integer,
	"purchased_at" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"current_level_points" integer DEFAULT 0 NOT NULL,
	"next_level_threshold" integer DEFAULT 100 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"supabase_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"role" "role" DEFAULT 'user' NOT NULL,
	"app_role" "app_role" DEFAULT 'learner' NOT NULL,
	"org_id" integer,
	"timezone" varchar(64) DEFAULT 'UTC',
	"avatar_url" text,
	"notification_preferences" json,
	"approval_status" "approval_status" DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp,
	"approved_by" integer,
	"disapproval_reason" text,
	"block_reason" text,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_supabase_id_unique" UNIQUE("supabase_id")
);
--> statement-breakpoint
CREATE TABLE "voice_audio_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"text_hash" varchar(64) NOT NULL,
	"voice_id" varchar(128) NOT NULL,
	"stability" varchar(8) DEFAULT '0.50' NOT NULL,
	"similarity_boost" varchar(8) DEFAULT '0.75' NOT NULL,
	"style" varchar(8) DEFAULT '0.00' NOT NULL,
	"lesson_id" integer,
	"audio_url" text NOT NULL,
	"file_key" varchar(512) NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"char_count" integer DEFAULT 0 NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"charge_id" varchar(255),
	"raw_status" varchar(64),
	"result" varchar(64) NOT NULL,
	"ip_address" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"provider" varchar(128) NOT NULL,
	"webhook_url" text,
	"secret_key" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
