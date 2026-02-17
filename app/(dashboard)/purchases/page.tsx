import type { Metadata } from "next";
import { getPurchaseInvoices, getSuppliers, getSuppliersForFilter } from "./actions";
import type { PurchaseFilters } from "./actions";
import { PurchaseTable } from "./purchase-table";

export const metadata: Metadata = {
  title: "Purchases | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const filters: PurchaseFilters = {
    sort: typeof params.sort === "string" ? params.sort : undefined,
    order:
      typeof params.order === "string" &&
        (params.order === "asc" || params.order === "desc")
        ? params.order
        : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    partyId: typeof params.partyId === "string" ? params.partyId : undefined,
    dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : undefined,
    dateTo: typeof params.dateTo === "string" ? params.dateTo : undefined,
  };

  const [invoices, suppliers, filterParties] = await Promise.all([
    getPurchaseInvoices(filters),
    getSuppliers(),
    getSuppliersForFilter(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Purchase Invoices</h2>
        <p className="text-muted-foreground">
          Track supplier invoices and payables.
        </p>
      </div>
      <PurchaseTable invoices={invoices} suppliers={suppliers} filterParties={filterParties} />
    </div>
  );
}
