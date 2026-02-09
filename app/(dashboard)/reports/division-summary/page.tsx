import type { Metadata } from "next";
import { getDivisionSummary } from "../actions";
import { DivisionSummaryClient } from "./division-summary-client";

export const metadata: Metadata = {
  title: "Division-wise Summary | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function DivisionSummaryPage() {
  const data = await getDivisionSummary();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Division-wise Summary
        </h2>
        <p className="text-muted-foreground">
          Consolidated summary per HAL division — POs, orders, dispatches,
          invoicing & payments.
        </p>
      </div>
      <DivisionSummaryClient data={data} />
    </div>
  );
}
