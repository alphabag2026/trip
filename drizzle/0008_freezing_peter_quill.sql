ALTER TABLE `registrations` ADD `mealPreference` varchar(100);--> statement-breakpoint
ALTER TABLE `registrations` ADD `allergies` text;--> statement-breakpoint
ALTER TABLE `registrations` ADD `drinkAlcohol` enum('yes','no','sometimes');--> statement-breakpoint
ALTER TABLE `registrations` ADD `smoking` enum('yes','no');