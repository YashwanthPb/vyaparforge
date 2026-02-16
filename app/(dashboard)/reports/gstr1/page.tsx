import type { Metadata } from "next";
import { GSTR1ExportClient } from "./gstr1-client";

export const metadata: Metadata = {
    title: "GSTR-1 Export | VyaparForge",
};

export default function GSTR1Page() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">GSTR-1 Export</h2>
                <p className="text-muted-foreground">
                    Export invoices in GSTR-1 format for GST filing.
                </p>
            </div>
            <GSTR1ExportClient />
        </div>
    );
}
