CREATE TABLE `geofence_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`geofenceId` int NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('enter','exit') NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`notified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `geofence_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geofences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`radius` int NOT NULL,
	`type` enum('poi','hotel','airport','restaurant','venue','custom') NOT NULL DEFAULT 'custom',
	`notifyOnEnter` boolean NOT NULL DEFAULT true,
	`notifyOnExit` boolean NOT NULL DEFAULT true,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geofences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `location_history` (
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `location_history_id` PRIMARY KEY(`id`)
);
