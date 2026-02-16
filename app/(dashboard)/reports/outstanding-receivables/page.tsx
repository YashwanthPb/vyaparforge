import type { Metadata } from "next";
import { getOutstandingReceivables } from "../actions";
import { OutstandingReceivablesClient } from "./outstanding-receivables-client";

export const metadata: Metadata = {
  title: "Outstanding Receivables | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function OutstandingReceivablesPage() {
  const data = await getOutstandingReceivables();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Outstanding Receivables
        </h2>
        <p className="text-muted-foreground">
          All unpaid sale invoices sorted by oldest — what customers owe you.
        </p>
      </div>
      <OutstandingReceivablesClient data={data} />
    </div>
  );
}
