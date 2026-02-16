import type { Metadata } from "next";
import { getOutstandingPayables } from "../actions";
import { OutstandingPayablesClient } from "./outstanding-payables-client";

export const metadata: Metadata = {
  title: "Outstanding Payables | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function OutstandingPayablesPage() {
  const data = await getOutstandingPayables();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Outstanding Payables
        </h2>
        <p className="text-muted-foreground">
          All unpaid purchase invoices sorted by oldest — what you owe suppliers.
        </p>
      </div>
      <OutstandingPayablesClient data={data} />
    </div>
  );
}
