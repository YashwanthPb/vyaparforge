import type { Metadata } from "next";
import { getOutwardGatePasses, getDCPartiesForFilter } from "./actions";
import type { DCFilters } from "./actions";
import { OGPTable } from "./ogp-table";

export const metadata: Metadata = {
  title: "Delivery Challans | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function OutwardGatePassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const filters: DCFilters = {
    sort: typeof params.sort === "string" ? params.sort : undefined,
    order:
      typeof params.order === "string" &&
        (params.order === "asc" || params.order === "desc")
        ? params.order
        : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
    partyId: typeof params.partyId === "string" ? params.partyId : undefined,
    dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : undefined,
    dateTo: typeof params.dateTo === "string" ? params.dateTo : undefined,
  };

  const [gatePasses, parties] = await Promise.all([
    getOutwardGatePasses(filters),
    getDCPartiesForFilter(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Delivery Challans
        </h2>
        <p className="text-muted-foreground">
          Track delivery challans for fabricated parts dispatched to HAL.
        </p>
      </div>

      <OGPTable gatePasses={gatePasses} parties={parties} />
    </div>
  );
}
