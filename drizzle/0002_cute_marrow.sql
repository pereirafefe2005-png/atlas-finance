CREATE TABLE `financePreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'BRL',
	`onboardingCompleted` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financePreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `finance_preferences_owner_unique` UNIQUE(`ownerId`)
);
--> statement-breakpoint
ALTER TABLE `financePreferences` ADD CONSTRAINT `financePreferences_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;