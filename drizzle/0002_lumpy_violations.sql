CREATE TABLE `accommodation_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int,
	`hotelName` varchar(255) NOT NULL,
	`roomNumber` varchar(50),
	`roomType` enum('single','double','twin','suite') NOT NULL DEFAULT 'twin',
	`assignedRegistrationIds` json,
	`checkIn` timestamp,
	`checkOut` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accommodation_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flight_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int,
	`registrationId` int,
	`flightNo` varchar(50) NOT NULL,
	`airline` varchar(255),
	`departureAirport` varchar(100),
	`arrivalAirport` varchar(100),
	`scheduledDeparture` timestamp,
	`scheduledArrival` timestamp,
	`actualDeparture` timestamp,
	`actualArrival` timestamp,
	`delayMinutes` int DEFAULT 0,
	`flightStatus` enum('scheduled','boarding','departed','in_air','landed','delayed','cancelled') NOT NULL DEFAULT 'scheduled',
	`direction` enum('outbound','return') NOT NULL DEFAULT 'outbound',
	`notifiedDelay` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flight_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modification_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` int NOT NULL,
	`itineraryId` int,
	`requestType` enum('flight_change','hotel_change','schedule_change','other') NOT NULL DEFAULT 'other',
	`description` text NOT NULL,
	`currentValue` text,
	`requestedValue` text,
	`status` enum('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`processedBy` int,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modification_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pickup_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int,
	`vehicleName` varchar(255) NOT NULL,
	`vehicleCapacity` int DEFAULT 4,
	`driverName` varchar(255),
	`driverPhone` varchar(50),
	`pickupLocation` varchar(500),
	`pickupTime` timestamp,
	`assignedRegistrationIds` json,
	`pickupPhotoUrl` varchar(1000),
	`status` enum('pending','en_route','waiting','picked_up','completed') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pickup_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pickup_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int,
	`pickupAssignmentId` int,
	`registrationId` int,
	`photoUrl` varchar(1000) NOT NULL,
	`photoType` enum('pickup_location','arrival_person','vehicle','other') NOT NULL DEFAULT 'pickup_location',
	`uploadedBy` varchar(255),
	`caption` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pickup_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int,
	`title` varchar(255) NOT NULL,
	`location` varchar(500),
	`eventTime` timestamp NOT NULL,
	`endTime` timestamp,
	`description` text,
	`notifyBefore` int DEFAULT 10,
	`notified` boolean DEFAULT false,
	`notifiedAt` timestamp,
	`eventOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_events_id` PRIMARY KEY(`id`)
);
