ALTER TABLE `meetups` ADD `baggageNotice` text DEFAULT ('초과화물은 직접부담할 수 있습니다.');--> statement-breakpoint
ALTER TABLE `registrations` ADD `checkedBagRequest` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `registrations` ADD `checkedBagCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `registrations` ADD `checkedBagWeight` varchar(50);--> statement-breakpoint
ALTER TABLE `registrations` ADD `checkedBagNotes` text;