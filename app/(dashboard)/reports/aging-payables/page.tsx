import type { Metadata } from "next";
import { getPayablesAging } from "../actions";
import { AgingTable } from "../aging-table";

export const metadata: Metadata = {
    title: "Payables Aging | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function PayablesAgingPage() {
    const data = await getPayablesAging();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Payables Aging</h2>
                <p className="text-muted-foreground">
                    Outstanding payables grouped by supplier and age bucket.
                </p>
            </div>
            <AgingTable data={data} title="Payables Aging" type="payables" />
        </div>
    );
}
