import type { Metadata } from "next";
import { getPartyLedger } from "../actions";
import { PartyLedgerClient } from "./party-ledger-client";

export const metadata: Metadata = {
  title: "Party Ledger | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function PartyLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ partyId?: string }>;
}) {
  const { partyId } = await searchParams;
  const { parties, transactions, partyName } = await getPartyLedger(partyId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Party Ledger</h2>
        <p className="text-muted-foreground">
          View all transactions per party — sales, purchases, and running balance.
        </p>
      </div>
      <PartyLedgerClient
        parties={parties}
        transactions={transactions}
        selectedPartyId={partyId}
        partyName={partyName}
      />
    </div>
  );
}
