import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { auditLog, AUDIT } from "@/lib/audit/log";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { email, username, password } = parsed.data;

    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { username } }),
    ]);

    if (existingEmail)    return NextResponse.json({ error: "Este email ya está registrado" },          { status: 409 });
    if (existingUsername) return NextResponse.json({ error: "Este nombre de usuario ya está en uso" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, username, name: username, passwordHash, role: "USER" },
        select: { id: true, email: true, username: true },
      });
      await tx.wallet.create({
        data: { userId: user.id, balance: 0, currency: "EUR" },
      });
      return user;
    });

    await auditLog({
      userId:     user.id,
      action:     AUDIT.USER_REGISTER,
      targetId:   user.id,
      targetType: "User",
      ipAddress:  req.headers.get("x-forwarded-for") ?? undefined,
      metadata:   { username },
    });

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (err) {
    console.error("[REGISTER]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
