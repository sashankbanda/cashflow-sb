import { Skeleton } from "./Skeleton";

export type RouteSkeletonVariant = "list" | "dashboard" | "detail";

function ListBody() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24 rounded-sm" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}

function DashboardBody() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-40 rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-42 rounded-lg" />
        <Skeleton className="h-42 rounded-lg" />
      </div>
      <Skeleton className="h-28 rounded-lg" />
    </div>
  );
}

function DetailBody() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/**
 * The shared skeleton every route's `loading.tsx` renders. It mirrors the
 * large-title header plus a body shape, and the `route-skeleton` class holds it
 * invisible for the first 200ms so quick loads never flash it.
 */
export function RouteSkeleton({
  variant = "list",
  header = true,
}: {
  variant?: RouteSkeletonVariant;
  header?: boolean;
}) {
  return (
    <div className="route-skeleton flex flex-col gap-5">
      {header ? (
        <div className="px-5 pt-safe">
          <div className="pt-4">
            <Skeleton className="h-8 w-40 rounded-md" />
          </div>
        </div>
      ) : null}
      <div className="px-5">
        {variant === "dashboard" ? (
          <DashboardBody />
        ) : variant === "detail" ? (
          <DetailBody />
        ) : (
          <ListBody />
        )}
      </div>
    </div>
  );
}
