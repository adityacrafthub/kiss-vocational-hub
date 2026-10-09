CREATE TABLE `verification_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`identity` text NOT NULL,
	`role` text NOT NULL,
	`purpose` text NOT NULL,
	`code` text NOT NULL,
	`payload` text NOT NULL,
	`expires` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD `verified` integer DEFAULT 0 NOT NULL;