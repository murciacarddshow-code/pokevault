import { createHash, createHmac, randomBytes } from "crypto";

// =============================================================================
// lib/pack-engine/rng.ts
// RNG criptográficamente seguro con soporte completo de Provably Fair.
//
// Flujo Provably Fair:
//   1. Servidor genera serverSeed (privado) y publica serverSeedHash al usuario.
//   2. Usuario aporta clientSeed (o se genera uno aleatorio como fallback).
//   3. Se abre el sobre: los resultados derivan de HMAC(serverSeed, clientSeed:nonce).
//   4. Tras la apertura, el servidor revela serverSeed.
//   5. El usuario verifica: SHA256(serverSeed) === serverSeedHash publicado,
//      y reproduce todos los resultados con la misma función.
// =============================================================================

/** Genera una semilla criptográficamente segura. 32 bytes → 64 chars hex. */
export function generateSeed(): string {
  return randomBytes(32).toString("hex");
}

/**
 * SHA256 de la semilla — se publica ANTES de la apertura.
 * Garantiza que el servidor no puede cambiar serverSeed después de que
 * el usuario haya visto el hash.
 */
export function hashSeed(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

/**
 * Verifica que una semilla coincide con su hash publicado.
 * Usado en el endpoint de verificación provably fair.
 */
export function verifySeed(serverSeed: string, publishedHash: string): boolean {
  return hashSeed(serverSeed) === publishedHash;
}

/**
 * Genera un número flotante en [0, 1) determinista para un slot dado.
 *
 * Algoritmo:
 *   bytes = HMAC-SHA256(key=serverSeed, data="clientSeed:nonce")
 *   value = readUInt32BE(bytes[0:4]) / 0x100000000
 *
 * Por qué HMAC y no SHA256 simple:
 *   - serverSeed actúa como clave secreta del HMAC.
 *   - Sin conocer serverSeed no se puede predecir el resultado,
 *     aunque se conozcan clientSeed y nonce.
 *   - 0x100000000 (2^32) como divisor para distribución uniforme exacta.
 *
 * @param serverSeed  Semilla privada del servidor (hex 64 chars)
 * @param clientSeed  Semilla del cliente (cualquier string no vacío)
 * @param nonce       Índice del slot 0-based (posición en el sobre)
 */
export function seededRandom(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number {
  const hmac = createHmac("sha256", Buffer.from(serverSeed, "hex"));
  hmac.update(`${clientSeed}:${nonce}`);
  const bytes = hmac.digest();
  // Primeros 4 bytes como UInt32BE → [0, 2^32)
  const uint32 = bytes.readUInt32BE(0);
  return uint32 / 0x100000000; // [0, 1)
}

/**
 * Reproduce todos los rolls de una apertura para verificación.
 * Devuelve los floats brutos; el cliente puede mapearlos a cartas
 * usando los mismos pesos del pool en el momento de la apertura.
 */
export function reproduceOpeningRolls(
  serverSeed: string,
  clientSeed: string,
  cardsPerOpening: number
): number[] {
  return Array.from({ length: cardsPerOpening }, (_, nonce) =>
    seededRandom(serverSeed, clientSeed, nonce)
  );
}
