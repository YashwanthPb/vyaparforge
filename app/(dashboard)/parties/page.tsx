import type { Metadata } from "next";
import { getParties } from "./actions";
import { PartyTable } from "./party-table";

export const metadata: Metadata = {
  title: "Parties | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function PartiesPage() {
  const parties = await getParties();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Parties</h2>
        <p className="text-muted-foreground">
          Manage customers, suppliers, and HAL divisions.
        </p>
      </div>
      <PartyTable parties={parties} />
    </div>
  );
}
