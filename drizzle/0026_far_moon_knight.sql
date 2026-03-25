CREATE TABLE `company_info` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`companyLogoUrl` varchar(1000),
	`businessRegistration` varchar(50),
	`businessType` varchar(100),
	`address` varchar(500),
	`contactPerson` varchar(255),
	`contactPhone` varchar(50),
	`contactEmail` varchar(320),
	`website` varchar(500),
	`description` text,
	`industryCategory` varchar(100),
	`employeeCount` int,
	`foundedYear` int,
	`emailVerified` boolean NOT NULL DEFAULT false,
	`emailVerificationToken` varchar(255),
	`emailVerificationExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_info_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_info_organizationId_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `invitation_statistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int NOT NULL,
	`totalSent` int DEFAULT 0,
	`totalOpened` int DEFAULT 0,
	`totalAccepted` int DEFAULT 0,
	`totalRejected` int DEFAULT 0,
	`acceptanceRate` decimal(5,2) DEFAULT 0,
	`openRate` decimal(5,2) DEFAULT 0,
	`lastUpdatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitation_statistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitation_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`templateType` enum('email','sms') NOT NULL,
	`subject` varchar(255),
	`body` text NOT NULL,
	`variables` json,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invitation_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meetup_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int NOT NULL,
	`invitationType` enum('email','sms','link','csv') NOT NULL,
	`recipientEmail` varchar(320),
	`recipientPhone` varchar(50),
	`recipientName` varchar(255),
	`invitationToken` varchar(255),
	`status` enum('sent','opened','accepted','rejected','expired') NOT NULL DEFAULT 'sent',
	`templateId` int,
	`region` varchar(100),
	`customMessage` text,
	`sentAt` timestamp,
	`respondedAt` timestamp,
	`expiresAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meetup_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `meetup_invitations_invitationToken_unique` UNIQUE(`invitationToken`)
);
--> statement-breakpoint
CREATE TABLE `organizer_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','manager','staff') NOT NULL DEFAULT 'staff',
	`permissions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizer_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participant_transportation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` int NOT NULL,
	`transportationOptionId` int NOT NULL,
	`bookingStatus` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
	`bookingReference` varchar(255),
	`seatNumber` varchar(50),
	`specialRequests` text,
	`cost` decimal(10,2),
	`paidAt` timestamp,
	`confirmationUrl` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participant_transportation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transportation_apis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`apiProvider` varchar(100) NOT NULL,
	`apiKey` varchar(500) NOT NULL,
	`apiSecret` varchar(500),
	`isActive` boolean NOT NULL DEFAULT true,
	`rateLimitPerMinute` int DEFAULT 100,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transportation_apis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transportation_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int NOT NULL,
	`transportationType` enum('flight','train','bus','car','ship') NOT NULL,
	`departureCity` varchar(100) NOT NULL,
	`departureCountry` varchar(100) NOT NULL,
	`arrivalCity` varchar(100) NOT NULL,
	`arrivalCountry` varchar(100) NOT NULL,
	`departureDate` timestamp,
	`arrivalDate` timestamp,
	`carrier` varchar(255),
	`flightNumber` varchar(50),
	`trainNumber` varchar(50),
	`busNumber` varchar(50),
	`departureTime` varchar(50),
	`arrivalTime` varchar(50),
	`duration` varchar(50),
	`price` decimal(10,2),
	`currency` varchar(10) DEFAULT 'USD',
	`bookingUrl` varchar(1000),
	`apiProvider` varchar(100),
	`externalId` varchar(255),
	`seats` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transportation_options_id` PRIMARY KEY(`id`)
);
