import type { Metadata } from "next";
import { getInvoices } from "./actions";
import { InvoiceTable } from "./invoice-table";

export const metadata: Metadata = {
  title: "Invoices | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
        <p className="text-muted-foreground">
          Generate and manage invoices with GST calculation.
        </p>
      </div>
      <InvoiceTable invoices={invoices} />
    </div>
  );
}
