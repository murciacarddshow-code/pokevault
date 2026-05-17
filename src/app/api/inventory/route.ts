// =============================================================================
// app/api/inventory/route.ts
// GET — Inventario del usuario autenticado
//
// Query params:
//   page      number   default: 1
//   limit     number   default: 24, max: 100
//   sort      string   "obtainedAt" | "value" | "rarity" | "name"  default: "obtainedAt"
//   order     string   "asc" | "desc"  default: "desc"
//   search    string   Búsqueda por nombre de carta
//   rarity    string   CardRarity exacto
//   set       string   setCode exacto ("sv1", "swsh12"...)
//   hasPrice  boolean  "true" | "false" — filtra por disponibilidad de precio
//
// Respuesta 200: { data: InventoryPage }
// Respuesta 401: { error, code }
// =============================================================================

import { auth } from "@/lib/auth/config";
import { getInventoryPage } from "@/lib/inventory/queries";
import { parseInventoryParams } from "@/lib/inventory/parsers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "No autenticado", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // ── Parsear y sanitizar query params ──────────────────────────────────────
  const { filters, pagination } = parseInventoryParams(req.nextUrl.searchParams);

  // ── Query ─────────────────────────────────────────────────────────────────
  try {
    const page = await getInventoryPage(session.user.id, filters, pagination);
    return NextResponse.json({ data: page }, { status: 200 });
  } catch (err) {
    console.error("[INVENTORY_GET]", err);
    return NextResponse.json(
      { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
