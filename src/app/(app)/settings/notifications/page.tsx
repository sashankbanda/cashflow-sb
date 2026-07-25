import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { requireUser } from "@/features/auth/session";
import { PushSettings } from "@/features/notifications/components/PushSettings";
import { getNotificationPrefs } from "@/features/notifications/push-service";
import { isPushConfigured, pushPublicKey } from "@/server/push";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationSettingsPage() {
  const user = await requireUser();
  const prefs = await getNotificationPrefs(user.id);

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Notifications"
        trailing={
          <Link
            href="/profile"
            aria-label="Back"
            className="ease-out inline-flex size-9 items-center justify-center rounded-full glass text-fg-2 transition-transform duration-150 hover:text-fg-1 active:scale-[0.97] [&_svg]:size-4"
          >
            <ArrowLeft />
          </Link>
        }
      />
      <div className="px-5">
        <PushSettings configured={isPushConfigured()} publicKey={pushPublicKey()} prefs={prefs} />
      </div>
    </div>
  );
}
