"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Toggle } from "@/components/ui/Toggle";
import { toast } from "@/components/ui/Toast";
import { urlBase64ToUint8Array } from "@/lib/push-client";
import { useAction } from "@/hooks/useAction";
import { useMounted } from "@/hooks/useMounted";
import type { NotificationPrefs } from "@/server/db/schema";
import {
  subscribePushAction,
  unsubscribePushAction,
  updateNotificationPrefsAction,
} from "../actions";
import { NOTIFICATION_TYPES } from "../push-schemas";

const TYPE_LABEL: Record<(typeof NOTIFICATION_TYPES)[number], string> = {
  expense_added: "New expenses in my groups",
  settlement_recorded: "Payments recorded to me",
  settlement_reminder: "Settle-up reminders",
  member_joined: "Someone joins a group",
  budget_threshold: "Budget warnings",
};

export function PushSettings({
  configured,
  publicKey,
  prefs: initialPrefs,
}: {
  configured: boolean;
  publicKey: string | null;
  prefs: NotificationPrefs;
}) {
  const mounted = useMounted();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);

  const subscribe = useAction(subscribePushAction);
  const unsubscribe = useAction(unsubscribePushAction);
  const savePrefs = useAction(updateNotificationPrefsAction, {
    successMessage: "Preferences saved",
  });

  useEffect(() => {
    const detect = async (): Promise<boolean> => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      return Boolean(subscription);
    };
    detect()
      .then(setEnabled)
      .catch(() => setEnabled(false));
  }, []);

  const enable = async () => {
    if (!publicKey) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        toast.error("Install Cashflow to your home screen first, then enable push.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications are blocked in your browser settings.");
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = subscription.toJSON();
      const result = await subscribe.execute({
        endpoint: json.endpoint ?? "",
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        userAgent: navigator.userAgent,
      });
      if (result.ok) {
        setEnabled(true);
        toast.success("Push notifications on");
      }
    } catch {
      toast.error("Couldn't enable push notifications.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await unsubscribe.execute({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  };

  const togglePref = (type: (typeof NOTIFICATION_TYPES)[number], value: boolean) => {
    const next = { ...prefs, [type]: value };
    setPrefs(next);
    void savePrefs.execute({ prefs: next as Record<string, boolean> });
  };

  if (!configured) {
    return (
      <GlassCard elevation="inset" className="p-5">
        <p className="text-footnote text-fg-3">
          Push notifications aren&apos;t configured on this deployment yet.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-5">
      <GlassCard className="flex items-center gap-4 p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-volt text-on-volt">
          <BellRing className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body text-fg-1">Push notifications</p>
          <p className="text-footnote text-fg-3">Get pinged on your phone about group activity.</p>
        </div>
        <Toggle
          aria-label="Enable push notifications"
          checked={enabled === true}
          disabled={busy || !mounted || enabled === null}
          onChange={(value) => void (value ? enable() : disable())}
        />
      </GlassCard>

      <section className="space-y-2">
        <h2 className="text-caption text-fg-3 uppercase">Notify me about</h2>
        <GlassCard elevation="inset" className="divide-y divide-white/6">
          {NOTIFICATION_TYPES.map((type) => (
            <div key={type} className="flex items-center gap-3 p-4">
              <p className="flex-1 text-body text-fg-1">{TYPE_LABEL[type]}</p>
              <Toggle
                aria-label={TYPE_LABEL[type]}
                checked={prefs[type] !== false}
                onChange={(value) => togglePref(type, value)}
              />
            </div>
          ))}
        </GlassCard>
      </section>
    </div>
  );
}
