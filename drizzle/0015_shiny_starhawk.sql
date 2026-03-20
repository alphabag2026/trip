ALTER TABLE `registrations` ADD `transportType` enum('flight','ktx','none','other');--> statement-breakpoint
ALTER TABLE `registrations` ADD `transportNotes` text;