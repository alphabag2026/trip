CREATE TABLE `place_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`placeId` varchar(255) NOT NULL,
	`name` varchar(500) NOT NULL,
	`address` text,
	`lat` decimal(10,7) NOT NULL,
	`lng` decimal(10,7) NOT NULL,
	`category` varchar(100),
	`rating` decimal(2,1),
	`photoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `place_favorites_id` PRIMARY KEY(`id`)
);
