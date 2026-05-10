ALTER TABLE `accommodation_assignments` ADD `accommodationPhotos` json;--> statement-breakpoint
ALTER TABLE `accommodation_assignments` ADD `amenities` json;--> statement-breakpoint
ALTER TABLE `accommodation_assignments` ADD `address` text;--> statement-breakpoint
ALTER TABLE `meetups` ADD `visibility` enum('public','referral_only') DEFAULT 'referral_only' NOT NULL;