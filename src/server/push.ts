import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import { db } from "@/server/db";
import { pushSubscriptions, users } from "@/server/db/schema";
import { logger } from "@/server/logger";

/** Whether Web Push is wired (a VAPID keypair is present). */
export function isPushConfigured(): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

export function pushPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY ?? null;
}

let vapidReady = false;
function ensureVapid(): boolean {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, publicKey, privateKey);
    vapidReady = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Deep-link opened on notification click. */
  url?: string;
  tag?: string;
}

/** Send a push to one user's devices, honoring their per-type preference. */
export async function sendPushToUser(
  userId: string,
  type: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureVapid()) return;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { notificationPrefs: true },
  });
  if (user?.notificationPrefs?.[type] === false) return; // muted this type

  const subs = await db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.userId, userId),
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Subscription is gone — prune it.
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        } else {
          logger.error({ err: error, userId }, "push send failed");
        }
      }
    }),
  );
}

/** Best-effort push fan-out to many users (deduped). Never throws. */
export async function sendPushToUsers(
  userIds: ReadonlyArray<string>,
  type: string,
  payload: PushPayload,
): Promise<void> {
  if (!isPushConfigured()) return;
  const unique = [...new Set(userIds)].filter(Boolean);
  await Promise.all(
    unique.map(async (userId) => {
      try {
        await sendPushToUser(userId, type, payload);
      } catch (error) {
        logger.error({ err: error, userId }, "push fan-out failed");
      }
    }),
  );
}
