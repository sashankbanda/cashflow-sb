"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { authClient } from "../client";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export interface GoogleSignInButtonProps {
  /** Where to land after successful auth. */
  callbackURL?: string;
}

/** Primary auth CTA: white pill with the Google mark, per HIG sign-in idiom. */
export function GoogleSignInButton({ callbackURL = "/home" }: GoogleSignInButtonProps) {
  const [pending, setPending] = useState(false);

  const signIn = async () => {
    setPending(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });
    if (error) {
      setPending(false);
      toast.error(error.message ?? "Couldn't reach Google. Try again.");
    }
    // On success the browser navigates to Google — leave the spinner on.
  };

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-white",
        "text-headline text-black select-none",
        "ease-out transition-[transform,opacity] duration-150 active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-60",
      )}
    >
      {pending ? <Spinner className="size-5 text-black" /> : <GoogleMark />}
      Continue with Google
    </button>
  );
}
