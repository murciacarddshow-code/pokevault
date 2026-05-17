// =============================================================================
// app/api/packs/[id]/open/route.ts
// POST — Apertura de sobre
//
// Autenticación:  JWT (NextAuth v5)
// Autorización:   Usuario autenticado, no baneado, con saldo suficiente
// Idempotencia:   NO — cada llamada abre un sobre y consume saldo
// Rate limiting:  Básico por IP en middleware; límite diario en el motor
//
// Respuesta 200: { data: OpenPackResult }
// Respuestas de error: { error: string, code: string }
// =============================================================================

import { auth } from "@/lib/auth/config";
import { openPack } from "@/lib/pack-engine/resolver";
import { PackEngineError } from "@/lib/pack-engine/errors";
import { openPackSchema } from "@/lib/validations/packs";
import { auditLog, AUDIT } from "@/lib/audit/log";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Autenticación ─────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "No autenticado", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id: packId } = await params;
  const userId = session.user.id;

  // ── Validar body ──────────────────────────────────────────────────────────
  let clientSeed: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = openPackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Body inválido", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    clientSeed = parsed.data.clientSeed;
  } catch {
    // Body vacío o no-JSON es válido — clientSeed se generará en el motor
  }

  // ── Ejecutar apertura ─────────────────────────────────────────────────────
  try {
    const result = await openPack({ userId, packId, clientSeed });
    return NextResponse.json({ data: result }, { status: 200 });

  } catch (err) {
    // Errores tipados del motor
    if (err instanceof PackEngineError) {
      // Log de intentos fallidos por razones de negocio
      if (["INSUFFICIENT_BALANCE", "DAILY_LIMIT_REACHED", "USER_BANNED"].includes(err.code)) {
        await auditLog({
          userId,
          action:     AUDIT.PACK_OPENED,
          success:    false,
          targetType: "Pack",
          targetId:   packId,
          ipAddress:  req.headers.get("x-forwarded-for") ?? undefined,
          metadata:   { code: err.code, message: err.message },
        });
      }
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      );
    }

    // Error inesperado — log completo en servidor, respuesta genérica al cliente
    console.error("[PACK_OPEN]", { userId, packId, err });
    return NextResponse.json(
      { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
