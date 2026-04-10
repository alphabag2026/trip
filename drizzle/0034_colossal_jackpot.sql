ALTER TABLE `accommodation_assignments` ADD `accommodationPhotoUrl` varchar(1000);--> statement-breakpoint
ALTER TABLE `accommodation_assignments` ADD `floorNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `pickup_assignments` ADD `vehiclePhotoUrl` varchar(1000);--> statement-breakpoint
ALTER TABLE `pickup_assignments` ADD `vehiclePlateNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `pickup_assignments` ADD `vehicleColor` varchar(50);--> statement-breakpoint
ALTER TABLE `pickup_assignments` ADD `vehicleType` varchar(100);