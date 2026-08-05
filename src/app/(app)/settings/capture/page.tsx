import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { env } from "@/env";
import { requireUser } from "@/features/auth/session";
import { getCaptureToken } from "@/features/capture/service";
import { CaptureSettings } from "@/features/capture/components/CaptureSettings";

export const metadata: Metadata = { title: "Auto-capture" };

export default async function CaptureSettingsPage() {
  const user = await requireUser();
  const token = await getCaptureToken(user.id);

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Auto-capture"
        eyebrow="Payments enter themselves"
        leading={
          <Link
            href="/profile"
            aria-label="Back"
            className="ease-out inline-flex size-9 items-center justify-center rounded-full glass text-fg-2 transition-transform duration-150 active:scale-[0.97] [&_svg]:size-4"
          >
            <ArrowLeft />
          </Link>
        }
      />
      <div className="px-5">
        <CaptureSettings token={token} origin={env.BETTER_AUTH_URL} />
      </div>
    </div>
  );
}
