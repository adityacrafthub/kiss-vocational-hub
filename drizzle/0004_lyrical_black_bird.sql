CREATE TABLE `admin_mfa` (
	`account` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`last_step` integer DEFAULT -1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mfa_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`expires` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mfa_recovery` (
	`code` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `security_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `sessions` ADD `mfa` integer DEFAULT 0 NOT NULL;