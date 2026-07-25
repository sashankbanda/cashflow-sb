import type { Instrumentation } from "next";

/**
 * Next instrumentation. Startup hook + a global request-error handler that
 * writes structured pino lines (drained by the platform). A Sentry DSN is a
 * drop-in here: gate `Sentry.init` in `register()` and
 * `Sentry.captureRequestError` in `onRequestError` on `env.SENTRY_DSN`.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logger } = await import("@/server/logger");
    logger.info({ version: process.env.APP_VERSION ?? "dev" }, "app instrumentation registered");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { logger } = await import("@/server/logger");
  logger.error(
    {
      err: error,
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      renderSource: context.renderSource,
    },
    "unhandled request error",
  );
  // Sentry drop-in:
  //   if (env.SENTRY_DSN) Sentry.captureRequestError(error, request, context);
};
