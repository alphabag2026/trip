CREATE TABLE `event_checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` int NOT NULL,
	`meetupId` int NOT NULL,
	`qrToken` varchar(64) NOT NULL,
	`checkedIn` boolean NOT NULL DEFAULT false,
	`checkedInAt` timestamp,
	`checkedInBy` int,
	`checkInMethod` enum('qr_scan','manual','self_scan') NOT NULL DEFAULT 'qr_scan',
	`locationNote` varchar(255),
	`deviceInfo` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_checkins_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_checkins_qrToken_unique` UNIQUE(`qrToken`)
);
