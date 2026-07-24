import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartyPopper, ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { requireUser } from "@/features/auth/session";
import { getGroupBalances } from "@/features/balances/queries";
import { getCategoriesForUser } from "@/features/categories/queries";
import { ExpenseTimeline } from "@/features/expenses/components/ExpenseTimeline";
import { getGroupTimeline } from "@/features/expenses/queries";
import { GroupDetailHeader } from "@/features/groups/components/GroupDetailHeader";
import { getGroupDetail, type GroupDetail } from "@/features/groups/queries";
import { SettleUpLauncher } from "@/features/settlements/components/SettleUpLauncher";
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

  const [timeline, categories, balances] = await Promise.all([
    getGroupTimeline(user.id, groupId),
    getCategoriesForUser(user.id),
    getGroupBalances(user.id, groupId),
  ]);

  const allSettled =
    timeline.length > 0 && balances.members.every((member) => member.netMinor === 0);

  return (
    <div className="flex flex-col gap-6">
      <GroupDetailHeader group={group} balances={balances} />
      <div className="space-y-5 px-5">
        {allSettled ? (
          <GlassCard gradient="mint" glow className="flex items-center gap-3 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15">
              <PartyPopper className="size-5 text-white" aria-hidden />
            </span>
            <div>
              <p className="text-headline text-white">All settled</p>
              <p className="text-footnote text-white/70">Every balance in this group is at zero.</p>
            </div>
          </GlassCard>
        ) : null}
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
          <ExpenseTimeline
            items={timeline}
            group={group}
            categories={categories}
            viewerUserId={user.id}
          />
        )}
      </div>
      <SettleUpLauncher groupId={group.id} balances={balances} viewerUserId={user.id} />
    </div>
  );
}
