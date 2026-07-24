"use client";

import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useSheet } from "@/hooks/useSheet";
import type { GroupSummary } from "../queries";
import { GroupFormSheet } from "./GroupFormSheet";
import { GroupsDeck } from "./GroupsDeck";

export interface GroupsViewProps {
  groups: GroupSummary[];
  subtitles?: Record<string, string>;
}

/** Groups screen: header + stacked deck + create sheet. */
export function GroupsView({ groups, subtitles }: GroupsViewProps) {
  const createSheet = useSheet();

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Groups"
        trailing={
          <IconButton aria-label="New group" size="sm" onClick={createSheet.open}>
            <Plus />
          </IconButton>
        }
      />

      <div className="px-5">
        {groups.length === 0 ? (
          <GlassCard elevation="inset">
            <EmptyState
              icon={<Users />}
              palette="ocean"
              title="No groups yet"
              description="Start one for your next trip, flat, or Friday dinners."
              action={
                <Button variant="volt" size="sm" onClick={createSheet.open}>
                  <Plus className="size-4" /> New group
                </Button>
              }
            />
          </GlassCard>
        ) : (
          <GroupsDeck groups={groups} subtitles={subtitles} />
        )}
      </div>

      <GroupFormSheet open={createSheet.isOpen} onClose={createSheet.close} />
    </div>
  );
}
