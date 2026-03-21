CREATE TABLE `meetup_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetupId` int NOT NULL,
	`category` enum('flight','hotel','transport','meal','venue','gift','visa','insurance','misc') NOT NULL DEFAULT 'misc',
	`title` varchar(255) NOT NULL,
	`description` text,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'KRW',
	`paidBy` varchar(255),
	`paidFor` varchar(500),
	`receiptUrl` varchar(1000),
	`receiptKey` varchar(500),
	`expenseDate` varchar(20),
	`registeredVia` enum('web','telegram','qr_scan') NOT NULL DEFAULT 'web',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meetup_expenses_id` PRIMARY KEY(`id`)
);
