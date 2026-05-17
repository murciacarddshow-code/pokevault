import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wallet = await prisma.wallet.findUnique({
    where:  { userId: session.user.id },
    select: { balance: true, currency: true },
  });

  return NextResponse.json({
    balance:  wallet ? Number(wallet.balance).toFixed(2) : "0.00",
    currency: wallet?.currency ?? "EUR",
  });
}
