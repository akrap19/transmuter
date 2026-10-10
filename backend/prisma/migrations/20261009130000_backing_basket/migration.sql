-- AlterTable: treasury backing basket per launch ([{ assetKind, weightBps }], weights sum to 10_000).
ALTER TABLE `launches` ADD COLUMN `backing_basket` JSON NULL;
