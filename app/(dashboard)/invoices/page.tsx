import type { Metadata } from "next";
import { getInvoices, getPartiesForFilter } from "./actions";
import type { InvoiceFilters } from "./actions";
import { InvoiceTable } from "./invoice-table";

export const metadata: Metadata = {
  title: "Invoices | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const filters: InvoiceFilters = {
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

  const [invoices, parties] = await Promise.all([
    getInvoices(filters),
    getPartiesForFilter(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
        <p className="text-muted-foreground">
          Generate and manage invoices with GST calculation.
        </p>
      </div>
      <InvoiceTable invoices={invoices} parties={parties} />
    </div>
  );
}
