CREATE TABLE `baggage_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` int NOT NULL,
	`meetupId` int,
	`flightScheduleId` int,
	`tagNumber` varchar(100),
	`tagPhotoUrl` varchar(1000),
	`ocrResult` json,
	`baggageStatus` enum('checked_in','loaded','in_transit','arrived','claimed','delayed','lost') NOT NULL DEFAULT 'checked_in',
	`baggageType` varchar(100),
	`weight` varchar(50),
	`description` text,
	`statusUpdatedAt` timestamp,
	`claimedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `baggage_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checkin_info` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` int NOT NULL,
	`meetupId` int,
	`flightScheduleId` int,
	`airline` varchar(255),
	`flightNo` varchar(50),
	`checkinCounter` varchar(100),
	`gateNumber` varchar(50),
	`seatNumber` varchar(20),
	`boardingTime` timestamp,
	`checkinStatus` enum('not_checked_in','online_checkin','counter_checkin','boarding_pass_issued','boarded') NOT NULL DEFAULT 'not_checked_in',
	`boardingPassUrl` varchar(1000),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkin_info_id` PRIMARY KEY(`id`)
);
