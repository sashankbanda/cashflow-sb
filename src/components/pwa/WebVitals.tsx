"use client";

import { useReportWebVitals } from "next/web-vitals";

/** Beacons Core Web Vitals to /api/vitals for the log drain. Renders nothing. */
export function WebVitals() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
      path: window.location.pathname,
    });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon("/api/vitals", body);
    } else {
      void fetch("/api/vitals", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  });
  return null;
}
