import { TabBar } from "@/components/ui/TabBar";

/**
 * Authenticated app shell: phone-width column with the floating dock.
 * Content pads with pb-dock so nothing hides behind the dock.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-md flex-1 pb-dock">{children}</div>
      <TabBar />
    </>
  );
}
