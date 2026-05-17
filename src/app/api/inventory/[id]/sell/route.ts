// =============================================================================
// app/api/inventory/[id]/sell/route.ts
// POST — Venta instantánea de un InventoryItem
//
// [id] = inventoryItemId (no cardId)
//
// Body (JSON, opcional):
//   { "quantity": 1 }   — cuántas unidades vender; default 1
//
// Respuesta 200: { data: ExecuteSellResult }
// Respuestas de error: { error: string, code: string }
// =============================================================================

import { auth } from "@/lib/auth/config";
import { executeSell } from "@/lib/sell-engine/executor";
import { SellEngineError } from "@/lib/sell-engine/errors";
import { sellSchema } from "@/lib/validations/inventory";
import { auditLog, AUDIT } from "@/lib/audit/log";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "No autenticado", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id: inventoryItemId } = await params;
  const userId = session.user.id;

  // ── Parsear body ───────────────────────────────────────────────────────────
  let quantityToSell = 1;
  try {
    const body   = await req.json().catch(() => ({}));
    const parsed = sellSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Body inválido", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    quantityToSell = parsed.data.quantity;
  } catch {
    // Body vacío o no-JSON → usar default quantity=1
  }

  // ── Ejecutar venta ────────────────────────────────────────────────────────
  try {
    const result = await executeSell({ userId, inventoryItemId, quantityToSell });
    return NextResponse.json({ data: result }, { status: 200 });

  } catch (err) {
    // Errores tipados del motor de venta
    if (err instanceof SellEngineError) {
      // Loguear intentos fallidos por razones de negocio relevantes
      if (["USER_BANNED", "ZERO_QUANTITY", "QUANTITY_EXCEEDS_STOCK"].includes(err.code)) {
        await auditLog({
          userId,
          action:     AUDIT.CARD_SOLD,
          success:    false,
          targetType: "InventoryItem",
          targetId:   inventoryItemId,
          ipAddress:  req.headers.get("x-forwarded-for") ?? undefined,
          metadata:   { code: err.code, message: err.message, quantityToSell },
        });
      }
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      );
    }

    // Error inesperado
    console.error("[INVENTORY_SELL]", { userId, inventoryItemId, err });
    return NextResponse.json(
      { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
