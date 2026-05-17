import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, type: true, status: true,
        amount: true, balanceAfter: true,
        description: true, metadata: true, createdAt: true,
      },
    }),
    prisma.walletTransaction.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    data: transactions.map((t) => ({
      ...t,
      amount:       Number(t.amount).toFixed(2),
      balanceAfter: Number(t.balanceAfter).toFixed(2),
    })),
    meta: {
      page, limit, total,
      pages:   Math.ceil(total / limit),
      hasNext: page * limit < total,
    },
  });
}
