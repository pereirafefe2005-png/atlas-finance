CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`institution` varchar(120),
	`type` enum('checking','savings','credit_card','investment','cash','other') NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'BRL',
	`openingBalanceCents` int NOT NULL DEFAULT 0,
	`color` varchar(9) NOT NULL DEFAULT '#8B5CF6',
	`icon` varchar(32) NOT NULL DEFAULT 'wallet',
	`isArchived` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`categoryId` int NOT NULL,
	`monthKey` varchar(7) NOT NULL,
	`limitCents` int NOT NULL,
	`alertThreshold` int NOT NULL DEFAULT 80,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `budget_owner_category_month_unique` UNIQUE(`ownerId`,`categoryId`,`monthKey`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`kind` enum('income','expense') NOT NULL,
	`color` varchar(9) NOT NULL DEFAULT '#8B5CF6',
	`icon` varchar(32) NOT NULL DEFAULT 'circle',
	`isArchived` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `category_owner_name_kind_unique` UNIQUE(`ownerId`,`name`,`kind`)
);
--> statement-breakpoint
CREATE TABLE `goalContributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goalId` int NOT NULL,
	`ownerId` int NOT NULL,
	`amountCents` int NOT NULL,
	`note` varchar(280),
	`contributedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `goalContributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`targetCents` int NOT NULL,
	`targetDate` timestamp,
	`color` varchar(9) NOT NULL DEFAULT '#A78BFA',
	`status` enum('active','completed','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `householdMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `householdMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `household_member_unique` UNIQUE(`householdId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`inviteCode` varchar(48) NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `households_id` PRIMARY KEY(`id`),
	CONSTRAINT `households_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(48) NOT NULL,
	`color` varchar(9) NOT NULL DEFAULT '#64748B',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tag_owner_name_unique` UNIQUE(`ownerId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `transactionTags` (
	`transactionId` int NOT NULL,
	`tagId` int NOT NULL,
	CONSTRAINT `transaction_tag_unique` UNIQUE(`transactionId`,`tagId`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`accountId` int NOT NULL,
	`categoryId` int,
	`type` enum('income','expense') NOT NULL,
	`amountCents` int NOT NULL,
	`description` varchar(280) NOT NULL,
	`notes` text,
	`occurredAt` timestamp NOT NULL,
	`attachmentKey` varchar(512),
	`attachmentUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goalContributions` ADD CONSTRAINT `goalContributions_goalId_goals_id_fk` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goalContributions` ADD CONSTRAINT `goalContributions_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `householdMembers` ADD CONSTRAINT `householdMembers_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `householdMembers` ADD CONSTRAINT `householdMembers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `households` ADD CONSTRAINT `households_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `tags_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactionTags` ADD CONSTRAINT `transactionTags_transactionId_transactions_id_fk` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactionTags` ADD CONSTRAINT `transactionTags_tagId_tags_id_fk` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_owner_idx` ON `accounts` (`ownerId`);--> statement-breakpoint
CREATE INDEX `budgets_owner_month_idx` ON `budgets` (`ownerId`,`monthKey`);--> statement-breakpoint
CREATE INDEX `categories_owner_idx` ON `categories` (`ownerId`);--> statement-breakpoint
CREATE INDEX `goal_contributions_goal_idx` ON `goalContributions` (`goalId`);--> statement-breakpoint
CREATE INDEX `goals_owner_status_idx` ON `goals` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `household_members_user_idx` ON `householdMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `households_created_by_idx` ON `households` (`createdByUserId`);--> statement-breakpoint
CREATE INDEX `transactions_owner_date_idx` ON `transactions` (`ownerId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `transactions_account_idx` ON `transactions` (`accountId`);--> statement-breakpoint
CREATE INDEX `transactions_category_idx` ON `transactions` (`categoryId`);