CREATE TABLE `ai_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prompt` text NOT NULL,
	`response` text NOT NULL,
	`recommendations` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`level` enum('INFO','WARN','CRITICAL','SUCCESS') NOT NULL DEFAULT 'INFO',
	`source` varchar(64) NOT NULL,
	`message` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governance_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`creator` varchar(128) NOT NULL,
	`status` enum('ACTIVE','PASSED','REJECTED','EXECUTED') NOT NULL DEFAULT 'ACTIVE',
	`votesFor` int NOT NULL DEFAULT 0,
	`votesAgainst` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `governance_proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`severity` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
	`title` varchar(128) NOT NULL,
	`description` text NOT NULL,
	`resolved` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleKey` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`category` varchar(64) NOT NULL,
	`status` enum('running','stopped','error','optimizing') NOT NULL DEFAULT 'stopped',
	`cpuUsage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`memoryUsage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_modules_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_modules_moduleKey_unique` UNIQUE(`moduleKey`)
);
--> statement-breakpoint
CREATE TABLE `trade_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetPair` varchar(32) NOT NULL,
	`action` enum('BUY','SELL','ARBITRAGE','STAKE') NOT NULL,
	`amount` decimal(18,4) NOT NULL,
	`price` decimal(18,4) NOT NULL,
	`profit` decimal(18,4) NOT NULL DEFAULT '0.0000',
	`status` enum('COMPLETED','PENDING','FAILED') NOT NULL DEFAULT 'COMPLETED',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trade_records_id` PRIMARY KEY(`id`)
);
