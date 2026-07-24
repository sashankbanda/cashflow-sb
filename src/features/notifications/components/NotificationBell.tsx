"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { useSheet } from "@/hooks/useSheet";
import { useAction } from "@/hooks/useAction";
import { listNotificationsAction, markAllNotificationsReadAction } from "../actions";
import type { NotificationView } from "../queries";

export function NotificationBell({ unread }: { unread: number }) {
  const router = useRouter();
  const sheet = useSheet();
  const [items, setItems] = useState<NotificationView[] | null>(null);
  const [localUnread, setLocalUnread] = useState(unread);

  const list = useAction(listNotificationsAction, {
    onSuccess: (result) => setItems(result),
  });
  const markAll = useAction(markAllNotificationsReadAction, {
    onSuccess: () => {
      setItems((current) => current?.map((item) => ({ ...item, read: true })) ?? current);
      setLocalUnread(0);
      router.refresh();
    },
  });

  const open = () => {
    sheet.open();
    if (items === null) void list.execute({});
  };

  return (
    <>
      <IconButton aria-label="Notifications" size="sm" onClick={open} className="relative">
        <Bell />
        {localUnread > 0 ? (
          <span
            aria-label={`${localUnread} unread`}
            className="absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-volt px-1 text-[0.625rem] font-semibold text-on-volt tabular-nums"
          >
            {localUnread > 9 ? "9+" : localUnread}
          </span>
        ) : null}
      </IconButton>

      <Sheet open={sheet.isOpen} onClose={sheet.close} title="Notifications">
        <div className="space-y-3 pt-1">
          {items !== null && items.some((item) => !item.read) ? (
            <Button
              variant="ghost"
              size="sm"
              loading={markAll.pending}
              onClick={() => void markAll.execute({})}
            >
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          ) : null}

          {list.pending && items === null ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : items && items.length > 0 ? (
            <ul className="divide-y divide-white/6">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-3">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      item.read ? "bg-transparent" : "bg-volt",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-body", item.read ? "text-fg-2" : "text-fg-1")}>
                      {item.text}
                    </p>
                    <p className="text-footnote text-fg-3">
                      {format(parseISO(item.createdAt), "d MMM · h:mm a")}
                    </p>
                  </div>
                  {typeof item.amountMinor === "number" ? (
                    <p className="shrink-0 text-footnote text-fg-2 tabular-nums">
                      {formatMoney(item.amountMinor)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-footnote text-fg-3">You&apos;re all caught up.</p>
          )}
        </div>
      </Sheet>
    </>
  );
}
