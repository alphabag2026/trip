CREATE TABLE `sns_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int,
	`userId` int NOT NULL,
	`platform` enum('twitter','instagram','tiktok','facebook','linkedin','telegram') NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`accountId` varchar(255),
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`profileImageUrl` varchar(1000),
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sns_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sns_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int,
	`meetupId` int,
	`createdBy` int NOT NULL,
	`platform` enum('twitter','instagram','tiktok','facebook','linkedin','telegram','all') NOT NULL DEFAULT 'all',
	`contentType` enum('text','image','video','carousel') NOT NULL DEFAULT 'text',
	`title` varchar(500),
	`content` text NOT NULL,
	`imageUrls` json,
	`videoUrl` varchar(1000),
	`hashtags` json,
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`status` enum('draft','scheduled','published','failed','cancelled') NOT NULL DEFAULT 'draft',
	`aiGenerated` boolean DEFAULT false,
	`aiPrompt` text,
	`engagement` json,
	`externalPostId` varchar(255),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sns_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sns_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`platform` enum('twitter','instagram','tiktok','facebook','linkedin','telegram','all') NOT NULL DEFAULT 'all',
	`contentType` enum('text','image','video','carousel') NOT NULL DEFAULT 'text',
	`templateContent` text NOT NULL,
	`imagePrompt` text,
	`hashtags` json,
	`isActive` boolean DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sns_templates_id` PRIMARY KEY(`id`)
);
