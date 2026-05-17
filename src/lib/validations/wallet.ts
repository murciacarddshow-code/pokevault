import { z } from "zod";

export const depositSchema = z.object({
  // Importe en céntimos: 500 = 5€, 50000 = 500€
  amount: z.number().int().min(500, "Mínimo 5€").max(50000, "Máximo 500€"),
});

export type DepositInput = z.infer<typeof depositSchema>;
