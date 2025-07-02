DROP INDEX `tasks_customId_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_customId_category_unique` ON `tasks` (`customId`,`category`);