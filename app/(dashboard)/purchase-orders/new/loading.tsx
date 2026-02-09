import { Skeleton } from "@/components/ui/skeleton";

export default function NewPOLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
