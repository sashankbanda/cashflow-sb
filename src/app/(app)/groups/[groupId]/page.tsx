import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { requireUser } from "@/features/auth/session";
import { ExpenseTimeline } from "@/features/expenses/components/ExpenseTimeline";
import { getGroupTimeline } from "@/features/expenses/queries";
import { GroupDetailHeader } from "@/features/groups/components/GroupDetailHeader";
import { getGroupDetail, type GroupDetail } from "@/features/groups/queries";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Group" };

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await requireUser();

  let group: GroupDetail;
  try {
    group = await getGroupDetail(user.id, groupId);
  } catch (error) {
    if (error instanceof AppError) {
      notFound();
    }
    throw error;
  }

  const timeline = await getGroupTimeline(user.id, groupId);

  return (
    <div className="flex flex-col gap-6">
      <GroupDetailHeader group={group} />
      <div className="px-5">
        {timeline.length === 0 ? (
          <GlassCard elevation="inset">
            <EmptyState
              icon={<ReceiptText />}
              palette={group.gradient}
              title="No expenses yet"
              description="Add the first expense with the volt button below — Cashflow splits it instantly."
            />
          </GlassCard>
        ) : (
          <ExpenseTimeline expenses={timeline} />
        )}
      </div>
    </div>
  );
}
