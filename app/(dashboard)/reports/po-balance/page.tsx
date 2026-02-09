import type { Metadata } from "next";
import { getPOBalanceReport, getDivisions } from "../actions";
import { POBalanceClient } from "./po-balance-client";

export const metadata: Metadata = {
  title: "PO Balance Report | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function POBalanceReportPage() {
  const [data, divisions] = await Promise.all([
    getPOBalanceReport({}),
    getDivisions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          PO Balance Report
        </h2>
        <p className="text-muted-foreground">
          Ordered, received, dispatched & balance quantities across all purchase
          orders.
        </p>
      </div>
      <POBalanceClient initialData={data} divisions={divisions} />
    </div>
  );
}
