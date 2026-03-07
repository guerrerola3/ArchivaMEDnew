CREATE TABLE `procedures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`patientName` varchar(255) NOT NULL,
	`patientRut` varchar(20) NOT NULL,
	`date` timestamp NOT NULL,
	`prestacionNumber` varchar(100),
	`diagnosis` text,
	`procedureName` text,
	`procedureCode` varchar(100),
	`type` enum('cirugia','procedimiento','interconsulta') NOT NULL DEFAULT 'cirugia',
	`schedule` enum('habil','inhabil') NOT NULL DEFAULT 'habil',
	`clinic` varchar(255) NOT NULL,
	`photoUrl` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `procedures_id` PRIMARY KEY(`id`)
);
