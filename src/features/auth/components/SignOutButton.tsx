"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { authClient } from "../client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    const { error } = await authClient.signOut();
    if (error) {
      setPending(false);
      toast.error("Couldn't sign out. Try again.");
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <Button variant="glass" block loading={pending} onClick={signOut}>
      <LogOut className="size-4" /> Sign out
    </Button>
  );
}
