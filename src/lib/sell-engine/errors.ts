// =============================================================================
// lib/sell-engine/errors.ts
// Errores tipados del motor de venta instantánea.
// =============================================================================

export class SellEngineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = "SellEngineError";
  }
}

export const SellErrors = {
  ITEM_NOT_FOUND: () =>
    new SellEngineError(
      "Carta no encontrada en tu inventario",
      "ITEM_NOT_FOUND",
      404
    ),

  NOT_OWNER: () =>
    new SellEngineError(
      "No tienes permiso para vender esta carta",
      "FORBIDDEN",
      403
    ),

  ZERO_QUANTITY: () =>
    new SellEngineError(
      "No tienes unidades disponibles de esta carta",
      "ZERO_QUANTITY",
      409
    ),

  NO_PRICE: (cardName: string) =>
    new SellEngineError(
      `${cardName} no tiene precio de venta configurado. Sincroniza los precios primero.`,
      "NO_PRICE",
      422
    ),

  ZERO_PRICE: (cardName: string) =>
    new SellEngineError(
      `El precio de venta de ${cardName} es 0. Contacta con soporte.`,
      "ZERO_PRICE",
      422
    ),

  WALLET_NOT_FOUND: () =>
    new SellEngineError(
      "No se encontró tu wallet. Contacta con soporte.",
      "WALLET_NOT_FOUND",
      500
    ),

  USER_BANNED: () =>
    new SellEngineError(
      "Tu cuenta está suspendida",
      "USER_BANNED",
      403
    ),

  INVALID_QUANTITY: () =>
    new SellEngineError(
      "La cantidad a vender debe ser al menos 1",
      "INVALID_QUANTITY",
      400
    ),

  QUANTITY_EXCEEDS_STOCK: (available: number) =>
    new SellEngineError(
      `Solo tienes ${available} unidad${available === 1 ? "" : "es"} disponible${available === 1 ? "" : "s"}`,
      "QUANTITY_EXCEEDS_STOCK",
      409
    ),
} as const;
