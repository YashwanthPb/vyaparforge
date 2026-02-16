import type { Metadata } from "next";
import { getReceivablesAging } from "../actions";
import { AgingTable } from "../aging-table";

export const metadata: Metadata = {
    title: "Receivables Aging | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function ReceivablesAgingPage() {
    const data = await getReceivablesAging();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Receivables Aging</h2>
                <p className="text-muted-foreground">
                    Outstanding receivables grouped by party and age bucket.
                </p>
            </div>
            <AgingTable data={data} title="Receivables Aging" type="receivables" />
        </div>
    );
}
