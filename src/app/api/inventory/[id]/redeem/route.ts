import { auth }     from "@/lib/auth/config";
import { prisma }   from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  fullName:   z.string().min(2).max(100),
  address:    z.string().min(5).max(200),
  city:       z.string().min(2).max(100),
  postalCode: z.string().min(3).max(20),
  country:    z.string().min(2).max(100),
  phone:      z.string().max(30).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const userId          = session.user.id;
  const { id: itemId }  = await params;

  const body   = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  // Verify ownership + quantity
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: { card: { select: { id: true, name: true } } },
  });
  if (!item || item.userId !== userId) {
    return NextResponse.json({ error: "Carta no encontrada en tu inventario" }, { status: 404 });
  }
  if (item.quantity <= 0) {
    return NextResponse.json({ error: "No tienes unidades disponibles" }, { status: 400 });
  }

  // Check no pending redemption already exists for this item
  const existing = await prisma.physicalRedemption.findFirst({
    where: { inventoryItemId: itemId, userId, status: { in: ["PENDING","APPROVED","PREPARING","SHIPPED"] } },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya tienes una solicitud activa para esta carta" }, { status: 409 });
  }

  const { fullName, address, city, postalCode, country, phone } = parsed.data;

  // Atomic: decrement inventory + create address + create redemption
  const redemption = await prisma.$transaction(async (tx) => {
    // Decrement quantity (or delete if last)
    if (item.quantity > 1) {
      await tx.inventoryItem.update({
        where: { id: itemId },
        data:  { quantity: { decrement: 1 } },
      });
    } else {
      await tx.inventoryItem.delete({ where: { id: itemId } });
    }

    const addr = await tx.shippingAddress.create({
      data: { userId, fullName, address, city, postalCode, country, phone },
    });

    return tx.physicalRedemption.create({
      data: {
        userId,
        inventoryItemId: itemId,
        cardId:          item.card.id,
        shippingAddressId: addr.id,
        status:          "PENDING",
      },
      include: {
        card:            { select: { name: true, rarity: true, imageUrl: true } },
        shippingAddress: true,
      },
    });
  });

  return NextResponse.json({ data: redemption }, { status: 201 });
}
