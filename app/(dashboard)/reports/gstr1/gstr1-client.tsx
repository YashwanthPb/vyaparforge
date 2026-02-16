"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { getGSTR1Data } from "../actions";
import * as XLSX from "xlsx";

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export function GSTR1ExportClient() {
    const [month, setMonth] = useState(String(new Date().getMonth() + 1));
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [loading, setLoading] = useState(false);

    async function handleExport() {
        setLoading(true);
        try {
            const data = await getGSTR1Data(parseInt(month), parseInt(year));

            const wb = XLSX.utils.book_new();

            // B2B Sheet
            if (data.b2b.length > 0) {
                const b2bData = data.b2b.map((row) => ({
                    "GSTIN/UIN": row.gstin,
                    "Receiver Name": row.partyName,
                    "Invoice Number": row.invoiceNumber,
                    "Invoice Date": new Date(row.invoiceDate).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                    }),
                    "Invoice Value": row.invoiceValue,
                    "Place of Supply": row.placeOfSupply,
                    "Reverse Charge": row.reverseCharge,
                    "Invoice Type": row.invoiceType,
                    "E-Commerce GSTIN": row.eCommerceGSTIN,
                    "Taxable Value": row.taxableValue,
                    "CGST": row.cgst,
                    "SGST": row.sgst,
                    "IGST": row.igst,
                    "Cess": row.cess,
                }));
                const ws = XLSX.utils.json_to_sheet(b2bData);
                ws["!cols"] = [
                    { wch: 18 }, { wch: 25 }, { wch: 18 }, { wch: 12 },
                    { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
                    { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
                ];
                XLSX.utils.book_append_sheet(wb, ws, "B2B");
            }

            // B2CS Sheet
            if (data.b2cs.length > 0) {
                const b2csData = data.b2cs.map((row) => ({
                    "Place of Supply": row.placeOfSupply,
                    "Type": row.type,
                    "Taxable Value": row.taxableValue,
                    "CGST": row.cgst,
                    "SGST": row.sgst,
                    "IGST": row.igst,
                    "Cess": row.cess,
                }));
                const ws = XLSX.utils.json_to_sheet(b2csData);
                ws["!cols"] = [
                    { wch: 16 }, { wch: 8 }, { wch: 14 }, { wch: 12 },
                    { wch: 12 }, { wch: 12 }, { wch: 8 },
                ];
                XLSX.utils.book_append_sheet(wb, ws, "B2CS");
            }

            // HSN Sheet
            if (data.hsn.length > 0) {
                const hsnData = data.hsn.map((row) => ({
                    "HSN": row.hsn,
                    "Description": row.description,
                    "UQC": row.uqc,
                    "Total Quantity": row.totalQty,
                    "Total Value": row.totalValue,
                    "Taxable Value": row.taxableValue,
                    "IGST": Math.round(row.igst * 100) / 100,
                    "CGST": Math.round(row.cgst * 100) / 100,
                    "SGST": Math.round(row.sgst * 100) / 100,
                }));
                const ws = XLSX.utils.json_to_sheet(hsnData);
                ws["!cols"] = [
                    { wch: 10 }, { wch: 30 }, { wch: 8 }, { wch: 14 },
                    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
                ];
                XLSX.utils.book_append_sheet(wb, ws, "HSN");
            }

            if (wb.SheetNames.length === 0) {
                toast.info("No invoices found for the selected period.");
                setLoading(false);
                return;
            }

            const monthName = months[parseInt(month) - 1];
            XLSX.writeFile(wb, `GSTR1_${monthName}_${year}.xlsx`);
            toast.success(`GSTR-1 exported for ${monthName} ${year}`);
        } catch {
            toast.error("Failed to export GSTR-1");
        }
        setLoading(false);
    }

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <Card className="max-w-lg">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950">
                        <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <CardTitle className="text-base">Export GSTR-1</CardTitle>
                        <CardDescription>
                            Generate Excel file with B2B, B2CS, and HSN sheets
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Month</label>
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((m, i) => (
                                    <SelectItem key={i} value={String(i + 1)}>
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Year</label>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((y) => (
                                    <SelectItem key={y} value={String(y)}>
                                        {y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button onClick={handleExport} disabled={loading} className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    {loading ? "Generating..." : "Download GSTR-1 Excel"}
                </Button>
            </CardContent>
        </Card>
    );
}
