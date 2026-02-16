"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getPartyList } from "../actions";
import { createCreditNote } from "../../reports/actions";

type Party = {
    id: string;
    name: string;
};

type LineItem = {
    itemName: string;
    hsnCode: string;
    qty: number;
    rate: number;
};

export default function NewCreditNotePage() {
    const router = useRouter();
    const [parties, setParties] = useState<Party[]>([]);
    const [partyId, setPartyId] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [reason, setReason] = useState("");
    const [items, setItems] = useState<LineItem[]>([
        { itemName: "", hsnCode: "", qty: 1, rate: 0 },
    ]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getPartyList().then(setParties);
    }, []);

    function addItem() {
        setItems([...items, { itemName: "", hsnCode: "", qty: 1, rate: 0 }]);
    }

    function removeItem(index: number) {
        setItems(items.filter((_, i) => i !== index));
    }

    function updateItem(index: number, field: keyof LineItem, value: string | number) {
        const updated = [...items];
        (updated[index] as Record<string, string | number>)[field] = value;
        setItems(updated);
    }

    const total = items.reduce((sum, item) => sum + item.qty * item.rate, 0);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!partyId) {
            toast.error("Please select a party");
            return;
        }

        const validItems = items.filter((i) => i.itemName && i.qty > 0 && i.rate > 0);
        if (validItems.length === 0) {
            toast.error("Please add at least one valid item");
            return;
        }

        setLoading(true);
        const result = await createCreditNote({
            partyId,
            date,
            reason: reason || undefined,
            items: validItems,
        });

        if (result.success) {
            toast.success("Credit note created successfully");
            router.push("/credit-notes");
            router.refresh();
        } else {
            toast.error(result.error ?? "Failed to create credit note");
        }
        setLoading(false);
    }

    function formatCurrency(value: number): string {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        }).format(value);
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">New Credit Note</h2>
                <p className="text-muted-foreground">
                    Create a new credit note for a party.
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Credit Note Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="party" className="text-sm font-medium">
                                    Party *
                                </label>
                                <Select value={partyId} onValueChange={setPartyId}>
                                    <SelectTrigger id="party">
                                        <SelectValue placeholder="Select party" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {parties.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="date" className="text-sm font-medium">
                                    Date *
                                </label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="reason" className="text-sm font-medium">
                                Reason
                            </label>
                            <Input
                                id="reason"
                                placeholder="e.g., Goods returned, Discount given, etc."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>

                        {/* Line Items */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">Line Items</h3>
                                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                    <Plus className="mr-1 h-3 w-3" /> Add Item
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-end"
                                    >
                                        <div>
                                            {index === 0 && (
                                                <label className="text-xs text-muted-foreground">Item Name</label>
                                            )}
                                            <Input
                                                placeholder="Item name"
                                                value={item.itemName}
                                                onChange={(e) => updateItem(index, "itemName", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="w-24">
                                            {index === 0 && (
                                                <label className="text-xs text-muted-foreground">HSN</label>
                                            )}
                                            <Input
                                                placeholder="HSN"
                                                value={item.hsnCode}
                                                onChange={(e) => updateItem(index, "hsnCode", e.target.value)}
                                            />
                                        </div>
                                        <div className="w-20">
                                            {index === 0 && (
                                                <label className="text-xs text-muted-foreground">Qty</label>
                                            )}
                                            <Input
                                                type="number"
                                                min={1}
                                                value={item.qty}
                                                onChange={(e) => updateItem(index, "qty", Number(e.target.value))}
                                                required
                                            />
                                        </div>
                                        <div className="w-28">
                                            {index === 0 && (
                                                <label className="text-xs text-muted-foreground">Rate</label>
                                            )}
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={item.rate}
                                                onChange={(e) => updateItem(index, "rate", Number(e.target.value))}
                                                required
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {index === 0 && (
                                                <label className="text-xs text-muted-foreground invisible">Del</label>
                                            )}
                                            {items.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(index)}
                                                    className="h-9 w-9 text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total */}
                        <div className="flex justify-end border-t pt-4">
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Total Amount</p>
                                <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push("/credit-notes")}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Creating..." : "Create Credit Note"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
