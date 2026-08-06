import { cookies } from "next/headers";
import { formatISO } from "date-fns";
import { EdgeSwipeBack } from "@/components/motion/EdgeSwipeBack";
import { defaultEntryDate, PERIOD_COOKIE, parsePeriodCookie, resolvePeriod } from "@/lib/period";
import { PullToRefresh } from "@/components/motion/PullToRefresh";
import { TabBar } from "@/components/ui/TabBar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { OutboxSync } from "@/features/expenses/components/OutboxSync";
import { getSplitSuggestions } from "@/features/expenses/personal-queries";
import { TourAutoStart } from "@/features/onboarding/components/TourAutoStart";
import { getSession } from "@/features/auth/session";
import { getCategoriesForUser } from "@/features/categories/queries";
import { getTagsForUser } from "@/features/categories/tags-service";
import { getMyGroups } from "@/features/groups/queries";

/**
 * Authenticated app shell: phone-width column with the floating dock.
 * Fetches the add-expense context (groups + categories) once so the volt
 * button opens instantly with data in hand.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const [groups, categories, tags, splitSuggestions] = session
    ? await Promise.all([
        getMyGroups(session.user.id),
        getCategoriesForUser(session.user.id),
        getTagsForUser(session.user.id),
        getSplitSuggestions(session.user.id),
      ])
    : [[], [], [], []];

  return (
    <>
      <OfflineBanner />
      <PullToRefresh>
        <EdgeSwipeBack>
          <div className="mx-auto w-full max-w-md flex-1 pb-dock">{children}</div>
        </EdgeSwipeBack>
      </PullToRefresh>
      <TabBar
        groups={groups}
        categories={categories}
        tags={tags}
        viewerUserId={session?.user.id ?? ""}
        splitSuggestions={splitSuggestions}
        defaultEntryDate={defaultEntryDate(
          resolvePeriod(parsePeriodCookie((await cookies()).get(PERIOD_COOKIE)?.value)),
          formatISO(new Date(), { representation: "date" }),
        )}
      />
      <InstallPrompt />
      <ServiceWorkerRegistrar />
      <OutboxSync />
      <TourAutoStart />
    </>
  );
}
