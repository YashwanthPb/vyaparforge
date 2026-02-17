"use client";

import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function UploadButton() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Map Excel data to API structure
                // Assuming Excel matching the structured requested in prompt
                // But typically Excel keys are column headers.
                // Requirement: "Upload an Excel file with the same structure as the Google Sheet"
                // Columns: "Invoice Number", "Net Amount", "UTR Number", etc.

                const formattedData = data.map((row: any) => ({
                    invoiceNumber: String(row["Invoice Number"] || ""),
                    netAmount: parseFloat(row["Net Amount"] || "0"),
                    utrNumber: String(row["UTR Number"] || ""),
                    utrTotal: parseFloat(row["UTR Total"] || "0"),
                    date: String(row["Date"] || new Date().toISOString()),
                    division: String(row["Division"] || ""),
                    poNumber: String(row["PO Number"] || ""),
                    grossAmount: parseFloat(row["Gross Amount"] || "0"),
                    diffPercent: parseFloat(row["Diff % (Gross - Net)"] || "0"),
                    confidence: row["Confidence"],
                    mailLink: row["Mail Link"],
                }));

                // Fetch API Key if needed or just use a server action?
                // The API route requires x-api-key. 
                // We can't easily expose the key to the client. 
                // BUT, since we are authenticated users in the dashboard, we should probably have a protected server action 
                // OR route that allows session-based auth without API key.
                // However, re-using the logic from the route is good.
                // Let's call the API route but we need the key. 
                // Actually, for dashboard upload, we should use a server action to process the data to avoid exposing the key or needing it.
                // But the route is already built. 
                // Let's create a specific server action for bulk upload handling that calls the same logic or just copy logic?
                // Copying logic is bad. 
                // I will add a server action `processBulkUpload` in `actions.ts` that reuses the logic.
                // Reusing logic: I should probably extract the sync logic to a service function.
                // For now, I'll just call the API endpoint *from the server action* using the key, OR just re-implement matching in the action.
                // Re-implementing matching in the action is safer for auth.

                // Actually, I can just POST to the API route from the Client?
                // No, I need the API key.
                // I will invoke a server action that then processes the records.

                await uploadPayments(formattedData);
                toast.success("Payments uploaded successfully");
            } catch (error) {
                console.error(error);
                toast.error("Failed to process file");
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Import Excel"}
            </Button>
        </div>
    );
}

// Server Action for upload
import { processBulkUpload } from "./actions";

async function uploadPayments(data: any[]) {
    // Call server action
    const res = await processBulkUpload(data);
    if (!res.success) {
        throw new Error(res.error);
    }
    return res;
}
