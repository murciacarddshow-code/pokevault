import { prisma } from "@/lib/db/prisma";

export interface AuditLogParams {
  userId?:    string;
  action:     string;
  success?:   boolean;
  targetId?:  string;
  targetType?:string;
  ipAddress?: string;
  userAgent?: string;
  metadata?:  Record<string, unknown>;
}

export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId:     params.userId,
        action:     params.action,
        success:    params.success ?? true,
        targetId:   params.targetId,
        targetType: params.targetType,
        ipAddress:  params.ipAddress,
        userAgent:  params.userAgent,
        // SQLite stores JSON as string
        metadata:   JSON.stringify(params.metadata ?? {}),
      },
    });
  } catch (err) {
    console.error("[AuditLog] Write failed:", err);
  }
}

export const AUDIT = {
  USER_LOGIN:            "USER_LOGIN",
  USER_REGISTER:         "USER_REGISTER",
  USER_LOGIN_FAILED:     "USER_LOGIN_FAILED",
  PACK_OPENED:           "PACK_OPENED",
  CARD_SOLD:             "CARD_SOLD",
  WALLET_DEPOSIT:        "WALLET_DEPOSIT",
  ADMIN_BAN_USER:        "ADMIN_BAN_USER",
  ADMIN_UNBAN_USER:      "ADMIN_UNBAN_USER",
  ADMIN_CREATE_PACK:     "ADMIN_CREATE_PACK",
  ADMIN_UPDATE_PACK:     "ADMIN_UPDATE_PACK",
  ADMIN_SYNC_PRICES:     "ADMIN_SYNC_PRICES",
  ADMIN_UPDATE_SETTINGS: "ADMIN_UPDATE_SETTINGS",
  ADMIN_CREDIT_USER:     "ADMIN_CREDIT_USER",
} as const;
