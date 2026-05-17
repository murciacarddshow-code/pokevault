// =============================================================================
// lib/analytics/events.ts  v2
// Typed analytics event bus.
// Drop-in PostHog / Mixpanel / GA4 by swapping the emit functions.
// session_start / session_end tracked via the SessionTracker component.
// =============================================================================

export type AnalyticsEvent =
  // Wallet
  | { event: "deposit_start";    userId?: string; amount: number }
  | { event: "deposit_complete"; userId?: string; amount: number }
  // Packs
  | { event: "pack_opened";      packId: string; packName: string; pricePaid: number; userId?: string }
  | { event: "pack_view";        packId: string; packName: string }
  // Cards
  | { event: "instant_sell";     cardId: string; cardName: string; sellPrice: number; rarity: string }
  | { event: "keep_card";        cardId: string; rarity: string }
  | { event: "big_hit";          cardId: string; cardName: string; value: number; rarity: string }
  // Fakeout A/B
  | { event: "fakeout_shown";    fakeRarity: string; realRarity: string }
  // Session
  | { event: "session_start";    userId?: string }
  | { event: "session_end";      userId?: string; durationSeconds: number; packsOpened: number }
  // Navigation
  | { event: "page_view";        path: string };

// ── Providers ─────────────────────────────────────────────────────────────────

function emitConsole(payload: AnalyticsEvent) {
  if (process.env.NODE_ENV === "development") {
    const { event, ...rest } = payload;
    const color = event.includes("big_hit") ? "color:#F59E0B;font-weight:bold" : "color:#B44FFF";
    if (typeof window !== "undefined") console.log(`%c[Analytics] ${event}`, color, rest);
  }
}

function emitPostHog(payload: AnalyticsEvent) {
  if (typeof window === "undefined") return;
  const ph = (window as any).posthog;
  if (!ph) return;
  const { event, ...props } = payload;
  ph.capture(event, props);
}

function emitGA4(payload: AnalyticsEvent) {
  if (typeof window === "undefined") return;
  const gtag = (window as any).gtag;
  if (!gtag) return;
  const { event, ...params } = payload;
  gtag("event", event, params);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function track(payload: AnalyticsEvent): void {
  try {
    emitConsole(payload);
    emitPostHog(payload);
    emitGA4(payload);
  } catch { /* never throw from analytics */ }
}

export function useAnalytics() {
  return { track };
}

// ── Session tracker (server-side compatible noop) ─────────────────────────────

let _sessionStart: number | null = null;
let _packsOpened  = 0;

export function trackSessionStart(userId?: string) {
  _sessionStart = Date.now();
  _packsOpened  = 0;
  track({ event: "session_start", userId });
}

export function trackPackOpened(packId: string, packName: string, pricePaid: number) {
  _packsOpened++;
  track({ event: "pack_opened", packId, packName, pricePaid });
}

export function trackSessionEnd(userId?: string) {
  if (_sessionStart === null) return;
  const duration = Math.round((Date.now() - _sessionStart) / 1000);
  track({ event: "session_end", userId, durationSeconds: duration, packsOpened: _packsOpened });
  _sessionStart = null;
  _packsOpened  = 0;
}
