import { auth }   from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const redemptions = await prisma.physicalRedemption.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      card:            { select: { name: true, rarity: true, imageUrl: true } },
      shippingAddress: true,
    },
  });

  return NextResponse.json({ data: redemptions });
}
