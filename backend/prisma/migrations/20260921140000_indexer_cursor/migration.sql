-- AlterTable
ALTER TABLE `launches` MODIFY `backing` VARCHAR(64) NOT NULL,
    ADD COLUMN `eol_config` VARCHAR(64) NULL,
    ADD COLUMN `target_raise_usdc` BIGINT NULL;

-- CreateIndex
CREATE INDEX `launches_eol_config_idx` ON `launches`(`eol_config`);

-- CreateIndex
CREATE UNIQUE INDEX `token_stats_mint_captured_at_key` ON `token_stats`(`mint`, `captured_at`);

-- CreateTable
CREATE TABLE `indexer_cursor` (
    `id` INTEGER NOT NULL,
    `last_slot` BIGINT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
