import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { requireUser } from "@/features/auth/session";
import { StatementImportScreen } from "@/features/expenses/components/StatementImportScreen";

export const metadata: Metadata = { title: "Import statement" };

export default async function StatementImportPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Import statement"
        eyebrow="Backfill from your bank"
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
        <StatementImportScreen />
      </div>
    </div>
  );
}
