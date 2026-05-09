CREATE TABLE `booking_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int,
	`category` varchar(50) NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`description` text,
	`totalAmount` decimal(12,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'KRW',
	`usdtAmount` decimal(12,2),
	`headCount` int DEFAULT 1,
	`perPersonAmount` decimal(12,2),
	`perPersonUsdt` decimal(12,2),
	`vendor` varchar(255),
	`invoiceUrl` text,
	`notes` text,
	`sourceType` varchar(20) DEFAULT 'manual',
	`telegramMessageId` varchar(50),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `booking_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `immigration_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryCode` varchar(10) NOT NULL,
	`countryName` varchar(100) NOT NULL,
	`countryNameLocal` varchar(100),
	`cardUrl` text NOT NULL,
	`cardName` varchar(255) NOT NULL,
	`description` text,
	`requiredFields` text,
	`fieldLabels` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `immigration_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shareToken` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`scheduleData` text NOT NULL,
	`meetupId` int,
	`expiresAt` timestamp,
	`viewCount` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schedule_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `schedule_shares_shareToken_unique` UNIQUE(`shareToken`)
);
--> statement-breakpoint
CREATE TABLE `schedule_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`templateData` text NOT NULL,
	`category` varchar(50) DEFAULT 'general',
	`createdBy` int,
	`isPublic` boolean DEFAULT false,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schedule_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shared_accommodations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accommodationId` int NOT NULL,
	`meetupId` int NOT NULL,
	`sharedByUserId` varchar(255) NOT NULL,
	`sharedByName` varchar(255),
	`hotelName` varchar(255) NOT NULL,
	`hotelAddress` text,
	`checkInDate` varchar(50),
	`checkInTime` varchar(20),
	`checkOutDate` varchar(50),
	`checkOutTime` varchar(20),
	`roomType` varchar(100),
	`phone` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shared_accommodations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'info',
	`title` varchar(255) NOT NULL,
	`message` text,
	`sourceUploadId` int,
	`isRead` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegram_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `translation_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_hash` varchar(64) NOT NULL,
	`target_lang` varchar(10) NOT NULL,
	`source_text` text NOT NULL,
	`translated_text` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `translation_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_accommodations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`hotelName` varchar(255) NOT NULL,
	`hotelAddress` text,
	`checkInDate` varchar(20),
	`checkInTime` varchar(10),
	`checkOutDate` varchar(20),
	`checkOutTime` varchar(10),
	`bookingId` varchar(100),
	`roomType` varchar(100),
	`phone` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_accommodations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `accommodation_assignments` MODIFY COLUMN `roomType` enum('single','double','twin','suite','family','dormitory') NOT NULL DEFAULT 'twin';--> statement-breakpoint
ALTER TABLE `accommodation_assignments` ADD `accommodationType` enum('hotel','villa','apartment','resort','pension','other') DEFAULT 'hotel' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `profilePhotoUrl` varchar(1000);--> statement-breakpoint
ALTER TABLE `registrations` ADD `nationality` varchar(100);--> statement-breakpoint
ALTER TABLE `registrations` ADD `region` varchar(100);--> statement-breakpoint
ALTER TABLE `telegram_config` ADD `allowedTelegramIds` text;--> statement-breakpoint
ALTER TABLE `telegram_config` ADD `webhookUrl` varchar(1000);