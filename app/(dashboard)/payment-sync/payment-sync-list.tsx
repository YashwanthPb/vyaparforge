"use client";

import { useState, useEffect } from "react";
import { getPaymentSyncRecords, ignorePayment, searchInvoices, manualMatchPayment } from "./actions";
import { PaymentSyncStatus } from "@prisma/client";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import { ExternalLink, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

type PaymentSyncWithRelations = any; // Simplify for now or define stricter type if possible

export function PaymentSyncList() {
    const [data, setData] = useState<PaymentSyncWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<PaymentSyncStatus | "ALL">("ALL");
    const [divisionFilter, setDivisionFilter] = useState<string>("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const records = await getPaymentSyncRecords({
                status: statusFilter === "ALL" ? undefined : statusFilter,
                division: divisionFilter || undefined,
            });
            setData(records);
        } catch (error) {
            toast.error("Failed to fetch records");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [statusFilter, divisionFilter]);

    const handleIgnore = async (id: string) => {
        const res = await ignorePayment(id);
        if (res.success) {
            toast.success("Payment marked as ignored");
            fetchData();
        } else {
            toast.error(res.error || "Failed to ignore");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as PaymentSyncStatus | "ALL")}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="MATCHED">Matched</SelectItem>
                        <SelectItem value="UNMATCHED">Unmatched</SelectItem>
                        <SelectItem value="ERROR">Error</SelectItem>
                        <SelectItem value="IGNORED">Ignored</SelectItem>
                    </SelectContent>
                </Select>

                <Input
                    placeholder="Filter Division"
                    value={divisionFilter}
                    onChange={(e) => setDivisionFilter(e.target.value)}
                    className="w-[180px]"
                />

                <Button variant="outline" onClick={fetchData} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Invoice</TableHead>
                            <TableHead>Division</TableHead>
                            <TableHead>UTR</TableHead>
                            <TableHead className="text-right">Net Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">No records found</TableCell>
                            </TableRow>
                        ) : (
                            data.map((record: any) => (
                                <TableRow key={record.id}>
                                    <TableCell>{format(new Date(record.paymentDate), "dd MMM yyyy")}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{record.invoiceNumber}</div>
                                        {record.matchedInvoice && (
                                            <Link href={`/invoices/${record.matchedInvoice.id}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                                View Invoice <ExternalLink className="h-3 w-3" />
                                            </Link>
                                        )}
                                    </TableCell>
                                    <TableCell>{record.division}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{record.utrNumber}</span>
                                            <span className="text-xs text-muted-foreground">{format(new Date(record.createdAt), "HH:mm")}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ₹{Number(record.netAmount).toLocaleString('en-IN')}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={record.status} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {record.status === "UNMATCHED" && (
                                            <div className="flex items-center justify-end gap-2">
                                                <ManualMatchDialog record={record} onSuccess={fetchData} />
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleIgnore(record.id)}
                                                >
                                                    Ignore
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "MATCHED":
            return <Badge className="bg-green-500 hover:bg-green-600">Matched</Badge>;
        case "UNMATCHED":
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Unmatched</Badge>;
        case "ERROR":
            return <Badge variant="destructive">Error</Badge>;
        case "IGNORED":
            return <Badge variant="outline" className="text-muted-foreground">Ignored</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

function ManualMatchDialog({ record, onSuccess }: { record: any; onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [matching, setMatching] = useState(false);
    const [comboboxOpen, setComboboxOpen] = useState(false);

    useEffect(() => {
        if (search.length >= 2) {
            setLoading(true);
            searchInvoices(search).then((res) => {
                setSearchResults(res);
                setLoading(false);
            });
        }
    }, [search]);

    const handleMatch = async () => {
        if (!selectedInvoice) return;
        setMatching(true);
        try {
            const res = await manualMatchPayment(record.id, selectedInvoice.id);
            if (res.success) {
                toast.success("Successfully matched payment");
                setOpen(false);
                onSuccess();
            } else {
                toast.error(res.error || "Failed to match");
            }
        } catch (e) {
            toast.error("An unexpected error occurred");
        } finally {
            setMatching(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="default">Match</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Match Payment Manually</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="p-3 bg-muted rounded-md text-sm">
                        <p><strong>Raw Invoice No:</strong> {record.invoiceNumber}</p>
                        <p><strong>Amount:</strong> ₹{Number(record.netAmount).toLocaleString('en-IN')}</p>
                        <p><strong>UTR:</strong> {record.utrNumber}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Invoice</label>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={comboboxOpen} className="w-full justify-between">
                                    {selectedInvoice ? `${selectedInvoice.invoiceNumber} - ${selectedInvoice.party.name}` : "Search invoice number..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search invoice..." onValueChange={setSearch} />
                                    <CommandList>
                                        <CommandEmpty>{loading ? "Searching..." : "No invoice found."}</CommandEmpty>
                                        <CommandGroup>
                                            {searchResults.map((invoice) => (
                                                <CommandItem
                                                    key={invoice.id}
                                                    value={invoice.invoiceNumber}
                                                    onSelect={() => {
                                                        setSelectedInvoice(invoice);
                                                        setComboboxOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedInvoice?.id === invoice.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span>{invoice.invoiceNumber}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {invoice.party?.name} • Due: ₹{Number(invoice.balanceDue).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleMatch} disabled={!selectedInvoice || matching}>
                        {matching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Match"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

