"use client";

import { useEffect } from "react";
import { trackSessionStart, trackSessionEnd } from "@/lib/analytics/events";

export function SessionTracker({ userId }: { userId?: string }) {
  useEffect(() => {
    trackSessionStart(userId);
    return () => trackSessionEnd(userId);
  }, [userId]); // eslint-disable-line

  return null; // Invisible component
}
