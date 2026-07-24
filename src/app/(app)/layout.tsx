import { PullToRefresh } from "@/components/motion/PullToRefresh";
import { TabBar } from "@/components/ui/TabBar";
import { getSession } from "@/features/auth/session";
import { getCategoriesForUser } from "@/features/categories/queries";
import { getMyGroups } from "@/features/groups/queries";

/**
 * Authenticated app shell: phone-width column with the floating dock.
 * Fetches the add-expense context (groups + categories) once so the volt
 * button opens instantly with data in hand.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const [groups, categories] = session
    ? await Promise.all([getMyGroups(session.user.id), getCategoriesForUser(session.user.id)])
    : [[], []];

  return (
    <>
      <PullToRefresh>
        <div className="mx-auto w-full max-w-md flex-1 pb-dock">{children}</div>
      </PullToRefresh>
      <TabBar groups={groups} categories={categories} viewerUserId={session?.user.id ?? ""} />
    </>
  );
}
