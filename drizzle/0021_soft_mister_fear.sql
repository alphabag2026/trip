CREATE TABLE `immigration_checklist_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryCode` varchar(10) NOT NULL,
	`countryName` varchar(100) NOT NULL,
	`category` enum('required_docs','recommended_items','tips') NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`sortOrder` int DEFAULT 0,
	`isDefault` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `immigration_checklist_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`templateId` int,
	`countryCode` varchar(10) NOT NULL,
	`category` enum('required_docs','recommended_items','tips','custom') NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`isChecked` boolean DEFAULT false,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_checklist_items_id` PRIMARY KEY(`id`)
);
