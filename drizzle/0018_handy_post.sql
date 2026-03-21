CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`userId` int NOT NULL,
	`senderName` varchar(255) NOT NULL,
	`senderRole` varchar(50),
	`content` text,
	`messageType` enum('text','image','file','system','announcement') NOT NULL DEFAULT 'text',
	`fileUrl` varchar(1000),
	`fileName` varchar(255),
	`replyToId` int,
	`isEdited` boolean DEFAULT false,
	`isDeleted` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_room_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`userId` int NOT NULL,
	`nickname` varchar(255),
	`memberRole` enum('admin','moderator','member') NOT NULL DEFAULT 'member',
	`lastReadAt` timestamp,
	`isMuted` boolean DEFAULT false,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_room_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`roomType` enum('general','announcement','support','social') NOT NULL DEFAULT 'general',
	`createdBy` int,
	`isActive` boolean DEFAULT true,
	`maxMembers` int DEFAULT 100,
	`avatarUrl` varchar(1000),
	`pinnedMessageId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int,
	`uploadedBy` varchar(255),
	`telegramMessageId` varchar(100),
	`telegramChatId` varchar(100),
	`rawText` text,
	`rawFileUrl` varchar(1000),
	`rawFileType` enum('text','image','document','photo') DEFAULT 'text',
	`parsedType` enum('flight','hotel','schedule','transfer','general','unknown') DEFAULT 'unknown',
	`parsedData` json,
	`parsedConfidence` int DEFAULT 0,
	`parsedSummary` text,
	`status` enum('pending','parsed','approved','rejected','applied') NOT NULL DEFAULT 'pending',
	`appliedToTable` varchar(100),
	`appliedToId` int,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_uploads_id` PRIMARY KEY(`id`)
);
