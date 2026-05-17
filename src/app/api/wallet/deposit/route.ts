import { auth }   from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { stripe, isStripeEnabled } from "@/lib/stripe/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  // Allow any positive number ≥ 1, not forced to be integer
  // (some currencies or demo amounts may be non-integer)
  amount: z.number().min(1).max(10000),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Importe inválido (1–10000€)" }, { status: 400 });
  }

  const amount = Math.round(parsed.data.amount); // normalise to integer EUR

  // Demo mode: Stripe not configured — add balance directly
  if (!isStripeEnabled()) {
    const wallet = await prisma.wallet.findUnique({ where: { userId: session.user.id } });
    if (!wallet) {
      return NextResponse.json({ error: "Wallet no encontrado" }, { status: 404 });
    }

    const balanceBefore = parseFloat(Number(wallet.balance).toFixed(2));
    const balanceAfter  = parseFloat((balanceBefore + amount).toFixed(2));

    // Atomic: update wallet + create transaction in one DB transaction
    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: session.user.id },
        data:  { balance: balanceAfter },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId:      wallet.id,
          userId:        session.user.id,
          type:          "DEPOSIT",
          status:        "COMPLETED",
          amount,
          balanceBefore,
          balanceAfter,
          description:   `Demo recarga — ${amount}€`,
          metadata:      JSON.stringify({ demo: true }),
        },
      }),
    ]);

    // Re-read balance from DB to return ground truth (not calculated value)
    const updated = await prisma.wallet.findUnique({
      where:  { userId: session.user.id },
      select: { balance: true },
    });

    return NextResponse.json({
      success:    true,
      demo:       true,
      newBalance: parseFloat(Number(updated!.balance).toFixed(2)),
    });
  }

  // Real Stripe flow
  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode:                 "payment",
      currency:             "eur",
      line_items: [{
        quantity: 1,
        price_data: {
          currency:     "eur",
          unit_amount:  amount * 100,
          product_data: { name: `PokéVault — Recarga de ${amount}€` },
        },
      }],
      metadata:      { userId: session.user.id, amountEur: String(amount) },
      customer_email: session.user.email ?? undefined,
      success_url: `${process.env.AUTH_URL}/wallet?success=1&amount=${amount}`,
      cancel_url:  `${process.env.AUTH_URL}/wallet?cancelled=1`,
    });

    await prisma.stripePayment.create({
      data: {
        userId:          session.user.id,
        stripeSessionId: checkoutSession.id,
        status:          "PENDING",
        amountRequested: amount,
        currency:        "EUR",
      },
    });

    return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (err: any) {
    console.error("[DEPOSIT]", err);
    return NextResponse.json({ error: "Error al crear sesión de pago" }, { status: 500 });
  }
}
