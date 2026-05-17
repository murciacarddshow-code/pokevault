import { prisma } from "@/lib/db/prisma";
import { stripe, isStripeEnabled } from "@/lib/stripe/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!isStripeEnabled()) {
    return NextResponse.json({ received: true, note: "Stripe not configured" });
  }

  const rawBody = await req.text();
  const sig     = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[WEBHOOK] Signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { userId, amountEur } = session.metadata ?? {};
      if (!userId || !amountEur) return NextResponse.json({ received: true });

      const paymentIntentId = session.payment_intent as string | null;
      const amount = parseFloat(amountEur);

      // Idempotency check
      if (paymentIntentId) {
        const existing = await prisma.stripePayment.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
        if (existing?.status === "SUCCEEDED") {
          return NextResponse.json({ received: true });
        }
      }

      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) return NextResponse.json({ received: true, error: "Wallet not found" });

      const newBalance = parseFloat((Number(wallet.balance) + amount).toFixed(2));

      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });

        const walletTx = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id, userId,
            type: "DEPOSIT", status: "COMPLETED",
            amount, balanceBefore: Number(wallet.balance), balanceAfter: newBalance,
            description: `Recarga Stripe — ${amountEur}€`,
            metadata: JSON.stringify({ stripeSessionId: session.id, paymentIntentId }),
          },
        });

        await tx.stripePayment.update({
          where: { stripeSessionId: session.id },
          data: {
            stripePaymentIntentId: paymentIntentId,
            status: "SUCCEEDED",
            amountReceived: amount,
            walletTransactionId: walletTx.id,
          },
        });
      });
    } else if (event.type === "checkout.session.expired") {
      await prisma.stripePayment.updateMany({
        where: { stripeSessionId: event.data.object.id, status: "PENDING" },
        data:  { status: "EXPIRED" },
      });
    } else if (event.type === "payment_intent.payment_failed") {
      await prisma.stripePayment.updateMany({
        where: { stripePaymentIntentId: event.data.object.id, status: "PENDING" },
        data:  { status: "FAILED" },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[WEBHOOK] Handler error:", err);
    return NextResponse.json({ received: true, warning: "handler_error" });
  }
}
