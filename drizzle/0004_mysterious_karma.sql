CREATE TABLE `broadcast_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`targetType` enum('all','meetup','approved_only') NOT NULL DEFAULT 'all',
	`sentViaTelegram` boolean DEFAULT false,
	`sentViaWeb` boolean DEFAULT false,
	`recipientCount` int DEFAULT 0,
	`sentBy` int,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `broadcast_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatbot_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` int,
	`sessionId` varchar(100) NOT NULL,
	`userMessage` text NOT NULL,
	`botResponse` text NOT NULL,
	`context` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatbot_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`registrationId` int,
	`respondentName` varchar(255),
	`respondentPhone` varchar(50),
	`answers` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `survey_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`questions` json NOT NULL,
	`status` enum('draft','active','closed') NOT NULL DEFAULT 'draft',
	`sentViaTelegram` boolean DEFAULT false,
	`sentAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `registrations` ADD `flightConfirmed` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `registrations` ADD `accommodationConfirmed` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `registrations` ADD `pickupConfirmed` boolean DEFAULT false;