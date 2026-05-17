import { prisma } from "@/lib/db/prisma";

export type InventorySortField = "obtainedAt" | "value" | "rarity" | "name";
export type SortOrder = "asc" | "desc";

export interface InventoryFilters {
  search?:   string;
  rarity?:   string;
  setCode?:  string;
  hasPrice?: boolean;
}

export interface InventoryPaginationOptions {
  page:  number;
  limit: number;
  sort:  InventorySortField;
  order: SortOrder;
}

export async function getInventoryPage(
  userId: string,
  filters: InventoryFilters,
  pagination: InventoryPaginationOptions
) {
  const limit = Math.min(pagination.limit, 100);
  const skip  = (pagination.page - 1) * limit;

  const cardWhere: any = { isActive: true };
  if (filters.rarity)  cardWhere.rarity  = filters.rarity;
  if (filters.setCode) cardWhere.setCode = filters.setCode;
  if (filters.search)  cardWhere.name    = { contains: filters.search };
  if (filters.hasPrice === true)  cardWhere.instantSellPrice = { not: null };
  if (filters.hasPrice === false) cardWhere.instantSellPrice = null;

  const where = { userId, quantity: { gt: 0 }, card: cardWhere };

  let orderBy: any = { obtainedAt: pagination.order };
  if (pagination.sort === "name")  orderBy = { card: { name: pagination.order } };
  if (pagination.sort === "rarity") orderBy = { card: { rarity: pagination.order } };
  if (pagination.sort === "value") orderBy = { card: { instantSellPrice: { sort: pagination.order, nulls: "last" } } };

  const [items, total, allForSummary] = await Promise.all([
    prisma.inventoryItem.findMany({ where, orderBy, skip, take: limit, include: { card: true } }),
    prisma.inventoryItem.count({ where }),
    prisma.inventoryItem.findMany({ where, select: { quantity: true, card: { select: { instantSellPrice: true } } } }),
  ]);

  const totalCards      = allForSummary.reduce((s, i) => s + i.quantity, 0);
  const estimatedValue  = allForSummary.reduce((s, i) => s + (i.card.instantSellPrice ?? 0) * i.quantity, 0);
  const totalPages      = Math.ceil(total / limit);

  return {
    items,
    meta: {
      page: pagination.page, limit, total, totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
    summary: {
      totalCards,
      totalItems:     total,
      estimatedValue: estimatedValue.toFixed(2),
    },
  };
}

export async function getInventoryItem(inventoryItemId: string, userId: string) {
  return prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId, userId },
    include: { card: true },
  });
}
