CREATE TABLE `user_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`meetupId` int,
	`roomId` int,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`accuracy` decimal(8,2),
	`altitude` decimal(10,2),
	`heading` decimal(6,2),
	`speed` decimal(8,2),
	`isSharing` boolean NOT NULL DEFAULT true,
	`shareType` enum('room','meetup','both') NOT NULL DEFAULT 'both',
	`batteryLevel` int,
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_locations_id` PRIMARY KEY(`id`)
);
