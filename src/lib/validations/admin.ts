import { z } from "zod";

const PACK_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"] as const;

export const adminPackSchema = z.object({
  name:            z.string().min(2).max(80),
  slug:            z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  description:     z.string().max(500).optional(),
  imageUrl:        z.string().url(),
  price:           z.number().positive(),
  houseEdgePercent:z.number().min(0).max(100).default(30),
  cardsPerOpening: z.number().int().min(1).max(20).default(5),
  dailyLimit:      z.number().int().min(0).optional().nullable(),
  status:          z.enum(PACK_STATUSES).default("DRAFT"),
  isFeatured:      z.boolean().default(false),
  sortOrder:       z.number().int().default(0),
});

export const adminSettingsSchema = z.object({
  minDepositEur:          z.number().positive().optional(),
  maxDepositEur:          z.number().positive().optional(),
  instantSellMargin:      z.number().min(0).max(1).optional(),
  globalDailyPackLimit:   z.number().int().min(0).optional(),
  priceSyncEnabled:       z.boolean().optional(),
  priceSyncIntervalHours: z.number().int().min(1).optional(),
  maintenanceMode:        z.boolean().optional(),
  maintenanceMessage:     z.string().max(300).optional().nullable(),
  allowNewRegistrations:  z.boolean().optional(),
});

export type AdminPackInput     = z.infer<typeof adminPackSchema>;
export type AdminSettingsInput = z.infer<typeof adminSettingsSchema>;
