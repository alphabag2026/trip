CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`invitedBy` int NOT NULL,
	`email` varchar(320),
	`inviteToken` varchar(100) NOT NULL,
	`memberRole` enum('owner','manager','staff','viewer') NOT NULL DEFAULT 'staff',
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`message` text,
	`acceptedBy` int,
	`acceptedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_inviteToken_unique` UNIQUE(`inviteToken`)
);
