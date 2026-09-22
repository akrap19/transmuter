-- CreateTable
CREATE TABLE `launches` (
    `mint` VARCHAR(64) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `symbol` VARCHAR(16) NOT NULL,
    `creator` VARCHAR(64) NOT NULL,
    `backing` VARCHAR(16) NOT NULL,
    `status` VARCHAR(16) NOT NULL,
    `metadata_uri` VARCHAR(512) NULL,
    `logo_url` VARCHAR(512) NULL,
    `description` TEXT NOT NULL,
    `website` VARCHAR(256) NULL,
    `twitter` VARCHAR(256) NULL,
    `telegram` VARCHAR(256) NULL,
    `discord` VARCHAR(256) NULL,
    `launched_at` INTEGER NOT NULL,
    `price_usd` DECIMAL(20, 8) NULL,
    `market_cap_usd` DECIMAL(20, 2) NULL,
    `backing_ratio_bps` INTEGER NULL,
    `sale_progress_bps` INTEGER NULL,
    `holder_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `launches_creator_idx`(`creator`),
    INDEX `launches_status_idx`(`status`),
    INDEX `launches_backing_idx`(`backing`),
    PRIMARY KEY (`mint`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `token_stats` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `mint` VARCHAR(64) NOT NULL,
    `price_usd` DECIMAL(20, 8) NULL,
    `market_cap_usd` DECIMAL(20, 2) NULL,
    `backing_ratio_bps` INTEGER NULL,
    `sale_progress_bps` INTEGER NULL,
    `holder_count` INTEGER NOT NULL DEFAULT 0,
    `captured_at` INTEGER NOT NULL,

    INDEX `token_stats_mint_captured_at_idx`(`mint`, `captured_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `price_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `mint` VARCHAR(64) NOT NULL,
    `t` INTEGER NOT NULL,
    `price_usd` DECIMAL(20, 8) NOT NULL,
    `volume_usd` DECIMAL(20, 2) NOT NULL,

    INDEX `price_history_mint_t_idx`(`mint`, `t`),
    UNIQUE INDEX `price_history_mint_t_key`(`mint`, `t`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `wallet` VARCHAR(64) NOT NULL,
    `prefs` JSON NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`wallet`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `token_stats` ADD CONSTRAINT `token_stats_mint_fkey` FOREIGN KEY (`mint`) REFERENCES `launches`(`mint`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_history` ADD CONSTRAINT `price_history_mint_fkey` FOREIGN KEY (`mint`) REFERENCES `launches`(`mint`) ON DELETE CASCADE ON UPDATE CASCADE;
