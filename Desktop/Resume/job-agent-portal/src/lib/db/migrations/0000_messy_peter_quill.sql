CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_user` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_accounts_provider` ON `accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE TABLE `chat_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text,
	`title` text,
	`message_type` text DEFAULT 'general',
	`context` text DEFAULT '{}',
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_conversations_user` ON `chat_conversations` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_job` ON `chat_conversations` (`job_id`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`tokens_used` integer,
	`model` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation` ON `chat_messages` (`conversation_id`);--> statement-breakpoint
CREATE TABLE `cover_letters` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filename` text NOT NULL,
	`file_path` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`parsed_text` text,
	`label` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_coverletters_user` ON `cover_letters` (`user_id`);--> statement-breakpoint
CREATE TABLE `job_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text NOT NULL,
	`profile_id` text,
	`status` text DEFAULT 'saved' NOT NULL,
	`applied_at` text,
	`applied_via` text,
	`resume_id` text,
	`cover_letter_id` text,
	`follow_up_date` text,
	`notes` text,
	`interview_dates` text DEFAULT '[]',
	`offer_details` text,
	`rejection_reason` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `search_profiles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cover_letter_id`) REFERENCES `cover_letters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_applications_user` ON `job_applications` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_applications_job` ON `job_applications` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_applications_status` ON `job_applications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_applications_followup` ON `job_applications` (`follow_up_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_applications_user_job` ON `job_applications` (`user_id`,`job_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`external_id` text,
	`platform` text NOT NULL,
	`dedup_hash` text NOT NULL,
	`title` text NOT NULL,
	`company` text NOT NULL,
	`location` text NOT NULL,
	`is_remote` integer DEFAULT false,
	`salary_text` text,
	`salary_min` real,
	`salary_max` real,
	`salary_type` text,
	`employment_type` text,
	`description` text,
	`description_html` text,
	`requirements` text,
	`posted_at` text NOT NULL,
	`posted_at_raw` text,
	`apply_url` text NOT NULL,
	`source_url` text,
	`is_expired` integer DEFAULT false,
	`scraped_at` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_jobs_dedup` ON `jobs` (`dedup_hash`);--> statement-breakpoint
CREATE INDEX `idx_jobs_platform` ON `jobs` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_jobs_posted` ON `jobs` (`posted_at`);--> statement-breakpoint
CREATE INDEX `idx_jobs_company` ON `jobs` (`company`);--> statement-breakpoint
CREATE INDEX `idx_jobs_location` ON `jobs` (`location`);--> statement-breakpoint
CREATE INDEX `idx_jobs_remote` ON `jobs` (`is_remote`);--> statement-breakpoint
CREATE INDEX `idx_jobs_title` ON `jobs` (`title`);--> statement-breakpoint
CREATE TABLE `profile_job_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`job_id` text NOT NULL,
	`match_score` real DEFAULT 0,
	`match_reasons` text DEFAULT '[]',
	`is_dismissed` integer DEFAULT false,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`profile_id`) REFERENCES `search_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_matches_profile` ON `profile_job_matches` (`profile_id`);--> statement-breakpoint
CREATE INDEX `idx_matches_job` ON `profile_job_matches` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_matches_score` ON `profile_job_matches` (`match_score`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_matches_unique` ON `profile_job_matches` (`profile_id`,`job_id`);--> statement-breakpoint
CREATE TABLE `recruiter_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`name` text,
	`email` text,
	`phone` text,
	`linkedin_url` text,
	`company` text,
	`title` text,
	`source` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_recruiter_job` ON `recruiter_contacts` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_recruiter_email` ON `recruiter_contacts` (`email`);--> statement-breakpoint
CREATE INDEX `idx_recruiter_name` ON `recruiter_contacts` (`name`);--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filename` text NOT NULL,
	`file_path` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`parsed_text` text,
	`is_default` integer DEFAULT false,
	`label` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_resumes_user` ON `resumes` (`user_id`);--> statement-breakpoint
CREATE TABLE `scrape_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`scrape_run_id` text NOT NULL,
	`mcp_server` text NOT NULL,
	`tool_name` text NOT NULL,
	`platform` text NOT NULL,
	`url` text,
	`status` text NOT NULL,
	`duration_ms` integer,
	`response_size` integer,
	`jobs_found` integer DEFAULT 0,
	`error_message` text,
	`error_code` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`scrape_run_id`) REFERENCES `scrape_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_scrape_logs_run` ON `scrape_logs` (`scrape_run_id`);--> statement-breakpoint
CREATE INDEX `idx_scrape_logs_platform` ON `scrape_logs` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_scrape_logs_status` ON `scrape_logs` (`status`);--> statement-breakpoint
CREATE TABLE `scrape_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`trigger_type` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`platforms` text DEFAULT '[]',
	`profiles_used` text DEFAULT '[]',
	`total_found` integer DEFAULT 0,
	`new_jobs` integer DEFAULT 0,
	`errors` integer DEFAULT 0,
	`duration_ms` integer,
	`started_at` text DEFAULT (datetime('now')),
	`completed_at` text,
	`error_summary` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_scrape_runs_status` ON `scrape_runs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_scrape_runs_date` ON `scrape_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `search_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true,
	`job_titles` text NOT NULL,
	`skills` text DEFAULT '[]',
	`locations` text DEFAULT '["United States"]',
	`is_remote` integer DEFAULT true,
	`employment_types` text DEFAULT '["contract", "c2c"]',
	`min_salary` integer,
	`max_salary` integer,
	`salary_type` text DEFAULT 'hourly',
	`exclude_keywords` text DEFAULT '[]',
	`include_keywords` text DEFAULT '[]',
	`platforms` text DEFAULT '["indeed","dice","glassdoor","ziprecruiter","linkedin"]',
	`domain` text,
	`notes` text,
	`last_searched` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_profiles_user` ON `search_profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_profiles_active` ON `search_profiles` (`is_active`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_token` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_session_token_unique` ON `sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `idx_sessions_token` ON `sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text,
	`image` text,
	`phone` text,
	`linkedin_url` text,
	`location` text,
	`resume_text` text,
	`preferences` text DEFAULT '{}',
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);