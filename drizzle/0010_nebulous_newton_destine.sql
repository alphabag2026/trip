CREATE TABLE `meetup_partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int NOT NULL,
	`partnerId` int NOT NULL,
	`serviceType` varchar(255),
	`serviceDate` timestamp,
	`serviceNotes` text,
	`cost` varchar(100),
	`status` enum('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meetup_partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`memberRole` enum('owner','manager','staff','viewer') NOT NULL DEFAULT 'staff',
	`isActive` boolean DEFAULT true,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('platform','organizer','agency','partner') NOT NULL DEFAULT 'organizer',
	`region` varchar(255),
	`country` varchar(100),
	`contactName` varchar(255),
	`contactPhone` varchar(50),
	`contactEmail` varchar(320),
	`address` text,
	`description` text,
	`logoUrl` varchar(1000),
	`website` varchar(500),
	`telegramChatId` varchar(100),
	`isActive` boolean DEFAULT true,
	`parentOrgId` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameKo` varchar(100),
	`icon` varchar(50),
	`description` text,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partner_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int,
	`categoryId` int,
	`name` varchar(255) NOT NULL,
	`region` varchar(255),
	`country` varchar(100),
	`address` text,
	`contactName` varchar(255),
	`contactPhone` varchar(50),
	`contactEmail` varchar(320),
	`website` varchar(500),
	`description` text,
	`logoUrl` varchar(1000),
	`capacity` int,
	`priceRange` varchar(100),
	`operatingHours` varchar(255),
	`languages` varchar(500),
	`rating` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`managedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','superadmin','organizer','agency','partner') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;