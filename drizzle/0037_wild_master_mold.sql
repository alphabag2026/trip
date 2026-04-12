CREATE TABLE `schedule_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`meetupId` int NOT NULL,
	`reminderMinutes` int NOT NULL,
	`reminderType` enum('telegram','chat','both') NOT NULL DEFAULT 'both',
	`status` enum('pending','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
	`scheduledAt` timestamp NOT NULL,
	`sentAt` timestamp,
	`errorMessage` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schedule_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_rsvps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`meetupId` int NOT NULL,
	`registrationId` int NOT NULL,
	`userId` int,
	`response` enum('attending','not_attending','maybe') NOT NULL DEFAULT 'maybe',
	`respondedAt` timestamp NOT NULL DEFAULT (now()),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_rsvps_id` PRIMARY KEY(`id`)
);
