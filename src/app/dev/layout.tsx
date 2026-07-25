import { notFound } from "next/navigation";

/**
 * The /dev galleries (kit, tokens) are development-only. Returning 404 in
 * production keeps them out of the shipped app (and out of static generation).
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <>{children}</>;
}
