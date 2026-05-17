// =============================================================================
// lib/pack-engine/errors.ts
// Errores tipados del motor de aperturas.
// Cada error tiene un código HTTP sugerido para la API route.
// =============================================================================

export class PackEngineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = "PackEngineError";
  }
}

export const PackErrors = {
  NOT_FOUND: () =>
    new PackEngineError("Pack no encontrado", "PACK_NOT_FOUND", 404),

  NOT_ACTIVE: () =>
    new PackEngineError(
      "Este pack no está disponible",
      "PACK_NOT_ACTIVE",
      403
    ),

  EMPTY_POOL: () =>
    new PackEngineError(
      "El pack no tiene cartas configuradas",
      "PACK_EMPTY_POOL",
      500
    ),

  INSUFFICIENT_BALANCE: (required: string, available: string) =>
    new PackEngineError(
      `Saldo insuficiente. Necesitas ${required} € pero tienes ${available} €`,
      "INSUFFICIENT_BALANCE",
      402
    ),

  DAILY_LIMIT_REACHED: (limit: number) =>
    new PackEngineError(
      `Has alcanzado el límite de ${limit} aperturas diarias para este pack`,
      "DAILY_LIMIT_REACHED",
      429
    ),

  USER_BANNED: () =>
    new PackEngineError(
      "Tu cuenta está suspendida",
      "USER_BANNED",
      403
    ),

  WALLET_NOT_FOUND: () =>
    new PackEngineError(
      "No se encontró tu wallet. Contacta con soporte.",
      "WALLET_NOT_FOUND",
      500
    ),

  INVALID_CLIENT_SEED: () =>
    new PackEngineError(
      "clientSeed inválido",
      "INVALID_CLIENT_SEED",
      400
    ),
} as const;
