import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { MailX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { asPalette } from "@/components/ui/palette";
import { getSession } from "@/features/auth/session";
import { JoinGroupView } from "@/features/groups/components/JoinGroupView";
import { getInviteByToken, type PublicInvite } from "@/features/groups/members-service";
import { inviteLookupLimiter } from "@/server/ratelimit";

export const metadata: Metadata = { title: "Join group", robots: { index: false } };

function InvalidInvite() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <EmptyState
        icon={<MailX />}
        palette="ember"
        title="This invite has sailed"
        description="The link is invalid, expired, or was revoked. Ask your friend for a fresh one."
        action={
          <Link
            href="/"
            className="ease-out inline-flex h-11 items-center justify-center rounded-full bg-volt px-5 text-body font-medium text-on-volt shadow-glow-volt transition-transform duration-150 active:scale-[0.97]"
          >
            Open Cashflow
          </Link>
        }
      />
    </main>
  );
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Token guessing is rate limited per IP.
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const { success } = await inviteLookupLimiter.limit(ip);
  if (!success) return <InvalidInvite />;

  let invite: PublicInvite;
  try {
    invite = await getInviteByToken(token);
  } catch {
    return <InvalidInvite />;
  }

  const session = await getSession();
  const gradient = asPalette(invite.group.gradient);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 pt-safe pb-safe">
      <div className="text-center">
        <p className="text-caption text-fg-3 uppercase">You&apos;re invited to</p>
      </div>

      <GlassCard gradient={gradient} glow className="p-6 text-center">
        {invite.group.emoji ? (
          <p aria-hidden className="text-display">
            {invite.group.emoji}
          </p>
        ) : null}
        <h1 className="text-title-1 text-white">{invite.group.name}</h1>
        <p className="mt-1 text-footnote text-white/70">
          {invite.group.memberCount} member{invite.group.memberCount === 1 ? "" : "s"} · splitting
          on Cashflow
        </p>
      </GlassCard>

      {session ? (
        <JoinGroupView invite={invite} viewerName={session.user.name} />
      ) : (
        <div className="space-y-3 text-center">
          <p className="text-body text-fg-2">Sign in to join — it takes ten seconds.</p>
          <Link
            href={`/sign-in?next=/join/${token}`}
            className="ease-out inline-flex h-14 w-full items-center justify-center rounded-full bg-volt px-8 text-headline text-on-volt shadow-glow-volt transition-transform duration-150 active:scale-[0.97]"
          >
            Sign in to join
          </Link>
        </div>
      )}
    </main>
  );
}
