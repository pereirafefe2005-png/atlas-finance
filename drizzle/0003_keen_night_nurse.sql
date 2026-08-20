CREATE TABLE `categorizationRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`matcher` varchar(120) NOT NULL,
	`categoryId` int NOT NULL,
	`priority` int NOT NULL DEFAULT 100,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categorizationRules_id` PRIMARY KEY(`id`),
	CONSTRAINT `categorization_rule_owner_matcher_unique` UNIQUE(`ownerId`,`matcher`)
);
--> statement-breakpoint
CREATE TABLE `debts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`balanceCents` int NOT NULL,
	`annualRateBps` int NOT NULL DEFAULT 0,
	`minimumPaymentCents` int NOT NULL DEFAULT 0,
	`dueDay` int,
	`status` enum('active','paid','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `debts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investmentHoldings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`accountId` int NOT NULL,
	`symbol` varchar(24) NOT NULL,
	`name` varchar(120) NOT NULL,
	`assetClass` enum('stock','etf','fund','bond','crypto','cash','other') NOT NULL DEFAULT 'other',
	`quantityMicros` int NOT NULL,
	`averageCostCents` int NOT NULL,
	`currentPriceCents` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investmentHoldings_id` PRIMARY KEY(`id`),
	CONSTRAINT `holding_owner_account_symbol_unique` UNIQUE(`ownerId`,`accountId`,`symbol`)
);
--> statement-breakpoint
CREATE TABLE `recurringRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`accountId` int NOT NULL,
	`categoryId` int,
	`type` enum('income','expense') NOT NULL,
	`description` varchar(280) NOT NULL,
	`amountCents` int NOT NULL,
	`cadence` enum('weekly','monthly','yearly') NOT NULL DEFAULT 'monthly',
	`nextOccurrence` timestamp NOT NULL,
	`endAt` timestamp,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recurringRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactionSplits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` int NOT NULL,
	`categoryId` int,
	`amountCents` int NOT NULL,
	`note` varchar(280),
	CONSTRAINT `transactionSplits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `budgets` ADD `rolloverCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `isReviewed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `transferGroupId` varchar(48);--> statement-breakpoint
ALTER TABLE `transactions` ADD `splitGroupId` varchar(48);--> statement-breakpoint
ALTER TABLE `categorizationRules` ADD CONSTRAINT `categorizationRules_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categorizationRules` ADD CONSTRAINT `categorizationRules_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `debts` ADD CONSTRAINT `debts_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `investmentHoldings` ADD CONSTRAINT `investmentHoldings_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `investmentHoldings` ADD CONSTRAINT `investmentHoldings_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recurringRules` ADD CONSTRAINT `recurringRules_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recurringRules` ADD CONSTRAINT `recurringRules_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recurringRules` ADD CONSTRAINT `recurringRules_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactionSplits` ADD CONSTRAINT `transactionSplits_transactionId_transactions_id_fk` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactionSplits` ADD CONSTRAINT `transactionSplits_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `debts_owner_status_idx` ON `debts` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `recurring_rules_owner_next_idx` ON `recurringRules` (`ownerId`,`nextOccurrence`);--> statement-breakpoint
CREATE INDEX `transaction_splits_transaction_idx` ON `transactionSplits` (`transactionId`);--> statement-breakpoint
CREATE INDEX `transactions_transfer_group_idx` ON `transactions` (`transferGroupId`);