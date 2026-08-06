import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";
import { getSession } from "@/features/auth/session";

export const metadata: Metadata = { title: "Sign in" };

/** Only same-app paths may be used as a post-auth destination. */
function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/home";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (session) {
    redirect(safeNext(params.next));
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-volt shadow-lg">
          <span aria-hidden className="font-dot text-[34px] font-black text-on-volt">₹</span>
        </div>
        <h1 className="mt-4 text-title-1">Cashflow</h1>
        <p className="mt-1 text-body text-fg-2">
          Group expenses and personal finance, settled beautifully.
        </p>
      </div>

      <GlassCard className="space-y-4 p-6">
        <GoogleSignInButton callbackURL={safeNext(params.next)} />
        {params.error ? (
          <p role="alert" className="text-center text-footnote text-negative">
            Sign-in didn&apos;t complete. Please try again.
          </p>
        ) : null}
        <p className="text-center text-caption text-fg-3">
          By continuing you agree to keep your group&apos;s secrets. Your data stays yours — export
          anytime.
        </p>
      </GlassCard>
    </div>
  );
}
