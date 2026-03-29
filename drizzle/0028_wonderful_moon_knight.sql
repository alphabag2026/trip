CREATE TABLE `ad_banners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`position` enum('hero_top','middle_left','middle_right','bottom','sidebar') NOT NULL,
	`title` varchar(200),
	`description` text,
	`imageUrl` text NOT NULL,
	`linkUrl` text,
	`linkText` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`startDate` timestamp,
	`endDate` timestamp,
	`clickCount` int NOT NULL DEFAULT 0,
	`impressionCount` int NOT NULL DEFAULT 0,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ad_banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizer_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255),
	`userEmail` varchar(255),
	`userRole` enum('organizer','agency','partner') NOT NULL,
	`organizationId` int,
	`organizationName` varchar(255),
	`businessNumber` varchar(50),
	`businessType` varchar(100),
	`experience` varchar(50),
	`teamSize` varchar(50),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewNote` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizer_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_gateway_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gateway` enum('nowpayments','direct_usdt','platform_token','visa_card') NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`displayName` varchar(100) NOT NULL,
	`description` text,
	`feePercent` decimal(5,2) DEFAULT '0',
	`minAmount` decimal(12,2) DEFAULT '1',
	`maxAmount` decimal(12,2) DEFAULT '100000',
	`walletAddressTrc20` varchar(255),
	`walletAddressErc20` varchar(255),
	`walletAddressBep20` varchar(255),
	`configJson` json,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_gateway_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int,
	`userId` int NOT NULL,
	`method` enum('nowpayments','direct_usdt','platform_token','visa_card','mixed') NOT NULL,
	`amountUsdt` decimal(12,2) NOT NULL,
	`amountLocal` decimal(12,2),
	`localCurrency` varchar(10),
	`amountPlatformToken` decimal(12,2) DEFAULT '0',
	`gatewayPaymentId` varchar(255),
	`gatewayInvoiceId` varchar(255),
	`gatewayStatus` varchar(50),
	`gatewayPayUrl` text,
	`gatewayPayAddress` varchar(255),
	`gatewayPayCurrency` varchar(20),
	`gatewayActuallyPaid` decimal(12,6),
	`txHash` varchar(255),
	`txNetwork` enum('trc20','erc20','bep20','polygon','solana'),
	`senderWallet` varchar(255),
	`receiverWallet` varchar(255),
	`status` enum('created','pending','confirming','confirmed','completed','failed','expired','refunded') NOT NULL DEFAULT 'created',
	`gatewayFee` decimal(12,4) DEFAULT '0',
	`networkFee` decimal(12,4) DEFAULT '0',
	`platformFee` decimal(12,4) DEFAULT '0',
	`webhookData` json,
	`description` text,
	`expiresAt` timestamp,
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`balance` decimal(15,2) NOT NULL DEFAULT '0',
	`frozenBalance` decimal(15,2) NOT NULL DEFAULT '0',
	`totalDeposited` decimal(15,2) NOT NULL DEFAULT '0',
	`totalSpent` decimal(15,2) NOT NULL DEFAULT '0',
	`currency` varchar(20) NOT NULL DEFAULT 'USDT',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_wallets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_delegations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromUserId` int NOT NULL,
	`toUserId` int NOT NULL,
	`organizationId` int,
	`delegationType` enum('ownership_transfer','admin_grant','admin_revoke','role_change') NOT NULL,
	`fromRole` varchar(50),
	`toRole` varchar(50),
	`notes` text,
	`delegatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_delegations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `travel_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookingType` enum('hotel','flight') NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed','refunded') NOT NULL DEFAULT 'pending',
	`propertyName` varchar(500),
	`propertyAddress` varchar(500),
	`flightNumber` varchar(50),
	`airline` varchar(200),
	`origin` varchar(255),
	`destination` varchar(255),
	`checkIn` timestamp,
	`checkOut` timestamp,
	`guests` int DEFAULT 1,
	`rooms` int DEFAULT 1,
	`localPrice` decimal(12,2) NOT NULL,
	`localCurrency` varchar(10) NOT NULL,
	`usdPrice` decimal(12,2) NOT NULL,
	`usdtPrice` decimal(12,2) NOT NULL,
	`vatAmount` decimal(12,2) DEFAULT '0',
	`vatRate` decimal(5,2) DEFAULT '0',
	`savingsAmount` decimal(12,2) DEFAULT '0',
	`exchangeFee` decimal(12,2) DEFAULT '0',
	`platformMargin` decimal(12,2) DEFAULT '0',
	`paymentMethod` enum('usdt_trc20','usdt_erc20','usdt_bep20','usd_card','local_card') DEFAULT 'usdt_trc20',
	`paymentTxHash` varchar(255),
	`paymentWallet` varchar(255),
	`paymentStatus` enum('awaiting','received','confirmed','failed') DEFAULT 'awaiting',
	`externalProvider` varchar(100),
	`externalBookingId` varchar(255),
	`externalBookingUrl` text,
	`countryCode` varchar(3),
	`imageUrl` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `travel_bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `travel_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`searchType` enum('hotel','flight') NOT NULL,
	`destination` varchar(255),
	`origin` varchar(255),
	`checkIn` timestamp,
	`checkOut` timestamp,
	`guests` int DEFAULT 1,
	`rooms` int DEFAULT 1,
	`countryCode` varchar(3),
	`resultCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `travel_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vat_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryCode` varchar(3) NOT NULL,
	`countryName` varchar(100) NOT NULL,
	`vatRate` decimal(5,2) NOT NULL,
	`currency` varchar(10) NOT NULL,
	`usdExchangeRate` decimal(15,6),
	`lastRateUpdate` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vat_rates_id` PRIMARY KEY(`id`),
	CONSTRAINT `vat_rates_countryCode_unique` UNIQUE(`countryCode`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`walletId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('deposit','withdraw','payment','refund','bonus','transfer') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`balanceBefore` decimal(15,2) NOT NULL,
	`balanceAfter` decimal(15,2) NOT NULL,
	`referenceType` varchar(50),
	`referenceId` int,
	`txHash` varchar(255),
	`network` varchar(20),
	`fromAddress` varchar(255),
	`status` enum('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `action` enum('role_change','org_create','org_update','org_delete','org_toggle_active','member_add','member_remove','member_role_change','ownership_transfer','user_ban','user_unban','settings_change','data_export','data_delete','account_create','password_reset','banner_create','banner_update','banner_delete') NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `targetType` enum('user','organization','member','partner','meetup','system','ad_banner') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isApproved` boolean DEFAULT false NOT NULL;