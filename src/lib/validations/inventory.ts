import { z } from "zod";

export const sellSchema = z.object({
  // Cuántas unidades vender. Default 1. Máximo 999 por llamada.
  quantity: z
    .number({ invalid_type_error: "quantity debe ser un número" })
    .int("quantity debe ser un entero")
    .min(1, "quantity debe ser al menos 1")
    .max(999, "No puedes vender más de 999 unidades a la vez")
    .default(1),
});

export type SellInput = z.infer<typeof sellSchema>;
