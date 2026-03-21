ALTER TABLE `chat_messages` MODIFY COLUMN `messageType` enum('text','image','file','system','announcement','video','location','voice') NOT NULL DEFAULT 'text';--> statement-breakpoint
ALTER TABLE `chat_rooms` MODIFY COLUMN `roomType` enum('general','announcement','support','social','direct','group') NOT NULL DEFAULT 'general';--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `locationName` varchar(500);--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `originalLang` varchar(10);--> statement-breakpoint
ALTER TABLE `chat_room_members` ADD `preferredLang` varchar(10) DEFAULT 'ko';--> statement-breakpoint
ALTER TABLE `chat_rooms` ADD `autoTranslate` boolean DEFAULT true;