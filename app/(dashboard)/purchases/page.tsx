import type { Metadata } from "next";
import { getPurchaseInvoices, getSuppliers } from "./actions";
import { PurchaseTable } from "./purchase-table";

export const metadata: Metadata = {
  title: "Purchases | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const [invoices, suppliers] = await Promise.all([
    getPurchaseInvoices(),
    getSuppliers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Purchase Invoices</h2>
        <p className="text-muted-foreground">
          Track supplier invoices and payables.
        </p>
      </div>
      <PurchaseTable invoices={invoices} suppliers={suppliers} />
    </div>
  );
}
