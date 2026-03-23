CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255),
	`action` enum('role_change','org_create','org_update','org_delete','org_toggle_active','member_add','member_remove','member_role_change','ownership_transfer','user_ban','user_unban','settings_change','data_export','data_delete') NOT NULL,
	`targetType` enum('user','organization','member','partner','meetup','system') NOT NULL,
	`targetId` int,
	`targetName` varchar(255),
	`details` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
