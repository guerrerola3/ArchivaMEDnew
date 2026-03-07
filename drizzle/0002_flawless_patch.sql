ALTER TABLE `procedures` MODIFY COLUMN `patientName` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `procedures` MODIFY COLUMN `patientRut` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `procedures` MODIFY COLUMN `prestacionNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `procedures` MODIFY COLUMN `diagnosis` text;--> statement-breakpoint
ALTER TABLE `procedures` MODIFY COLUMN `procedureName` text;--> statement-breakpoint
ALTER TABLE `procedures` MODIFY COLUMN `procedureCode` varchar(100);--> statement-breakpoint
ALTER TABLE `procedures` MODIFY COLUMN `clinic` varchar(255) NOT NULL;