import { z } from "zod";

export const openPackSchema = z.object({
  // clientSeed opcional: string no vacío de hasta 256 chars.
  // Si no viene, el servidor genera uno aleatorio.
  clientSeed: z
    .string()
    .min(1, "clientSeed no puede estar vacío")
    .max(256, "clientSeed demasiado largo")
    .optional(),
});

export type OpenPackInput = z.infer<typeof openPackSchema>;
