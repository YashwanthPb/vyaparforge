import type { Metadata } from "next";
import { getPOLedgerData, getDivisions } from "./actions";
import { POLedgerTable } from "./po-ledger-table";

export const metadata: Metadata = {
  title: "PO Ledger | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function POLedgerPage() {
  const [{ rows, summary }, divisions] = await Promise.all([
    getPOLedgerData(),
    getDivisions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">PO Ledger</h2>
        <p className="text-muted-foreground">
          Ordered vs Received vs Dispatched vs Balance tracking across all
          purchase orders.
        </p>
      </div>
      <POLedgerTable
        initialRows={rows}
        initialSummary={summary}
        divisions={divisions}
      />
    </div>
  );
}
