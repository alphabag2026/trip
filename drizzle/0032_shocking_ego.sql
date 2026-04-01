CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`meetupId` int,
	`title` varchar(500) NOT NULL,
	`content` text,
	`color` varchar(20) DEFAULT 'yellow',
	`isPinned` boolean NOT NULL DEFAULT false,
	`isShared` boolean NOT NULL DEFAULT false,
	`sharedWithMeetup` int,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`location` varchar(500),
	`eventTime` timestamp NOT NULL,
	`endTime` timestamp,
	`createdByUserId` int,
	`memberIds` json,
	`notified` boolean NOT NULL DEFAULT false,
	`status` enum('active','cancelled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `translation_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int,
	`requesterId` int NOT NULL,
	`interpreterId` int,
	`sourceLang` varchar(10) NOT NULL,
	`targetLang` varchar(10) NOT NULL,
	`context` text,
	`location` varchar(500),
	`scheduledTime` timestamp,
	`status` enum('pending','assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `translation_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','superadmin','organizer','agency','partner','driver','interpreter') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `meetups` ADD `projectCode` varchar(50);--> statement-breakpoint
ALTER TABLE `meetups` ADD `shareToken` varchar(100);--> statement-breakpoint
ALTER TABLE `meetups` ADD `invitedCountries` json;