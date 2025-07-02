CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customId` text NOT NULL,
	`category` text NOT NULL,
	`name` text,
	`description` text,
	`status` text DEFAULT 'wip',
	`comment` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_customId_unique` ON `tasks` (`customId`);