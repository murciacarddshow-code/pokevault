let stripe: any = null;

if (process.env.STRIPE_SECRET_KEY) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require("stripe");
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" });
  } catch {
    console.warn("[Stripe] Failed to initialize");
  }
}

export { stripe };
export const isStripeEnabled = () => !!stripe;
