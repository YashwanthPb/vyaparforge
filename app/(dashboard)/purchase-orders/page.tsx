import type { Metadata } from "next";
import { getPurchaseOrders } from "./actions";
import { POTable } from "./po-table";

export const metadata: Metadata = {
  title: "Purchase Orders | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const purchaseOrders = await getPurchaseOrders();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Purchase Orders</h2>
        <p className="text-muted-foreground">
          Manage purchase orders from HAL divisions.
        </p>
      </div>
      <POTable purchaseOrders={purchaseOrders} />
    </div>
  );
}
