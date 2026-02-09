import type { Metadata } from "next";
import { getOutstandingPayments } from "../actions";
import { OutstandingClient } from "./outstanding-client";

export const metadata: Metadata = {
  title: "Outstanding Payments | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function OutstandingPaymentsPage() {
  const data = await getOutstandingPayments();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Outstanding Payments
        </h2>
        <p className="text-muted-foreground">
          Track unpaid and partially paid invoices sorted by days overdue.
        </p>
      </div>
      <OutstandingClient data={data} />
    </div>
  );
}
