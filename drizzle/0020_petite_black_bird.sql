ALTER TABLE `chat_messages` ADD `isPinned` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `pinnedAt` timestamp;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `pinnedBy` int;