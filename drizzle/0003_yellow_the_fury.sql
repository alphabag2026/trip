CREATE TABLE `communication_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int,
	`channelType` enum('pickup_driver','manager','hotel_checkin','transfer','general') NOT NULL DEFAULT 'general',
	`channelName` varchar(255) NOT NULL,
	`description` text,
	`assignedTo` varchar(255),
	`assignedPhone` varchar(50),
	`relatedPickupId` int,
	`relatedAccommodationId` int,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communication_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channelId` int NOT NULL,
	`senderName` varchar(255) NOT NULL,
	`senderRole` enum('admin','manager','driver','participant','hotel_staff') NOT NULL DEFAULT 'participant',
	`senderRegistrationId` int,
	`content` text NOT NULL,
	`messageType` enum('text','photo','location','status_update','alert') NOT NULL DEFAULT 'text',
	`photoUrl` varchar(1000),
	`isRead` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vouchers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` int NOT NULL,
	`meetupId` int,
	`voucherType` enum('flight','hotel','transport','other') NOT NULL DEFAULT 'other',
	`title` varchar(255) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`fileKey` varchar(500),
	`fileName` varchar(255),
	`mimeType` varchar(100),
	`sentToParticipant` boolean DEFAULT false,
	`sentAt` timestamp,
	`sentMethod` enum('web','telegram','email') DEFAULT 'web',
	`notes` text,
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vouchers_id` PRIMARY KEY(`id`)
);
