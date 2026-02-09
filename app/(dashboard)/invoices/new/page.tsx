import type { Metadata } from "next";
import { getPOsWithDispatches, getNextInvoiceNumber } from "../actions";
import { InvoiceForm } from "./invoice-form";

export const metadata: Metadata = {
  title: "New Invoice | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const [purchaseOrders, nextInvoiceNumber] = await Promise.all([
    getPOsWithDispatches(),
    getNextInvoiceNumber(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Invoice</h2>
        <p className="text-muted-foreground">
          Generate a new invoice from dispatched items.
        </p>
      </div>
      <InvoiceForm
        purchaseOrders={purchaseOrders}
        nextInvoiceNumber={nextInvoiceNumber}
      />
    </div>
  );
}
