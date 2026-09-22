import type { PrismaClient } from "@prisma/client";
import { toChartPoint, toIndexedCoin, toListItem } from "./map.ts";
import type { CatalogStore } from "./store.ts";

export function createPrismaCatalog(prisma: PrismaClient): CatalogStore {
  return {
    async list() {
      const rows = await prisma.launch.findMany();
      return rows.map(toListItem);
    },
    async get(mint) {
      const row = await prisma.launch.findUnique({ where: { mint } });
      return row ? toIndexedCoin(row) : null;
    },
    async chart(mint) {
      const rows = await prisma.priceHistory.findMany({
        where: { mint },
        orderBy: { t: "asc" },
      });
      return rows.map(toChartPoint);
    },
  };
}
