import pino from "pino";

/**
 * Structured JSON logs (requestId, userId, action, durationMs on every action
 * line). Drained by the platform; no PII beyond user ids.
 */
export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  base: { app: "cashflow" },
});

export type Logger = typeof logger;
