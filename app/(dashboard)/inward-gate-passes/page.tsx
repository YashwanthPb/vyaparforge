import type { Metadata } from "next";
import { getInwardGatePasses } from "./actions";
import type { GPFilters } from "./actions";
import { GPTable } from "./gp-table";

export const metadata: Metadata = {
  title: "Inward Gate Passes | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function InwardGatePassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const filters: GPFilters = {
    sort: typeof params.sort === "string" ? params.sort : undefined,
    order:
      typeof params.order === "string" &&
        (params.order === "asc" || params.order === "desc")
        ? params.order
        : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
    dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : undefined,
    dateTo: typeof params.dateTo === "string" ? params.dateTo : undefined,
  };

  const gatePasses = await getInwardGatePasses(filters);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Inward Gate Passes
        </h2>
        <p className="text-muted-foreground">
          Track raw materials received from HAL.
        </p>
      </div>

      <GPTable gatePasses={gatePasses} />
    </div>
  );
}
