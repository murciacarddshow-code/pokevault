// =============================================================================
// lib/inventory/parsers.ts
// Parsing y sanitización de query params para el endpoint GET /api/inventory.
// Centralizado aquí para ser testeable y reutilizable.
// =============================================================================

import type { InventoryFilters, InventoryPaginationOptions, InventorySortField, SortOrder } from "./queries";

const VALID_RARITIES = new Set<string>([
  "COMMON", "UNCOMMON", "RARE", "DOUBLE_RARE", "ULTRA_RARE",
  "ILLUSTRATION_RARE", "SPECIAL_ILLUSTRATION_RARE", "HYPER_RARE", "SECRET_RARE",
  "GOD_HIT",
]);

const VALID_SORT_FIELDS = new Set<string>(["obtainedAt", "value", "rarity", "name"]);
const VALID_ORDERS      = new Set<string>(["asc", "desc"]);

export interface ParsedInventoryParams {
  filters:    InventoryFilters;
  pagination: InventoryPaginationOptions;
}

export function parseInventoryParams(searchParams: URLSearchParams): ParsedInventoryParams {
  // ── Paginación ─────────────────────────────────────────────────────────────
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10) || 24)
  );

  // ── Ordenación ─────────────────────────────────────────────────────────────
  const sortRaw  = searchParams.get("sort")  ?? "obtainedAt";
  const orderRaw = searchParams.get("order") ?? "desc";

  const sort:  InventorySortField = VALID_SORT_FIELDS.has(sortRaw)  ? sortRaw  as InventorySortField : "obtainedAt";
  const order: SortOrder          = VALID_ORDERS.has(orderRaw)      ? orderRaw as SortOrder          : "desc";

  // ── Filtros ────────────────────────────────────────────────────────────────
  const rarityRaw = searchParams.get("rarity");
  const rarity    = rarityRaw && VALID_RARITIES.has(rarityRaw.toUpperCase())
    ? rarityRaw.toUpperCase()
    : undefined;

  const search  = searchParams.get("search")?.trim().slice(0, 100) || undefined;
  const setCode = searchParams.get("set")?.trim().slice(0, 20)     || undefined;

  const hasPriceRaw = searchParams.get("hasPrice");
  const hasPrice    = hasPriceRaw === "true"  ? true
                    : hasPriceRaw === "false" ? false
                    : undefined;

  return {
    filters:    { search, rarity, setCode, hasPrice },
    pagination: { page, limit, sort, order },
  };
}
