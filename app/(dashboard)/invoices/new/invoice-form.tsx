"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { createInvoice } from "../actions";

type LineItemData = {
  id: string;
  partNumber: string;
  partName: string;
  workOrder: string | null;
  unit: string;
  qtyDispatched: number;
  alreadyInvoiced: number;
  invoiceableQty: number;
  rate: number;
};

type POData = {
  id: string;
  poNumber: string;
  divisionName: string;
  lineItems: LineItemData[];
};

type ItemState = {
  poLineItemId: string;
  qty: string;
  checked: boolean;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function InvoiceForm({
  purchaseOrders,
  nextInvoiceNumber,
}: {
  purchaseOrders: POData[];
  nextInvoiceNumber: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState("");
  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [itemStates, setItemStates] = useState<ItemState[]>([]);

  const selectedPO = purchaseOrders.find((po) => po.id === selectedPOId);

  function handlePOChange(poId: string) {
    setSelectedPOId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      setItemStates(
        po.lineItems.map((item) => ({
          poLineItemId: item.id,
          qty: String(item.invoiceableQty),
          checked: true,
        }))
      );
    } else {
      setItemStates([]);
    }
  }

  function toggleItem(poLineItemId: string, checked: boolean) {
    setItemStates((prev) =>
      prev.map((item) =>
        item.poLineItemId === poLineItemId ? { ...item, checked } : item
      )
    );
  }

  function updateItemQty(poLineItemId: string, qty: string) {
    setItemStates((prev) =>
      prev.map((item) =>
        item.poLineItemId === poLineItemId ? { ...item, qty } : item
      )
    );
  }

  const calculations = useMemo(() => {
    if (!selectedPO)
      return { subtotal: 0, cgst: 0, sgst: 0, total: 0, items: [] };

    const items = selectedPO.lineItems.map((item) => {
      const state = itemStates.find((s) => s.poLineItemId === item.id);
      const checked = state?.checked ?? true;
      const qty = checked ? Math.max(0, Number(state?.qty || 0)) : 0;
      const amount = qty * item.rate;
      return { ...item, invoiceQty: qty, amount, checked };
    });

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const cgst = subtotal * 0.09;
    const sgst = subtotal * 0.09;
    const total = subtotal + cgst + sgst;

    return { subtotal, cgst, sgst, total, items };
  }, [selectedPO, itemStates]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedPOId) {
      toast.error("Please select a purchase order");
      return;
    }
    if (!date) {
      toast.error("Invoice date is required");
      return;
    }

    const validItems = calculations.items.filter(
      (item) => item.checked && item.invoiceQty > 0
    );
    if (validItems.length === 0) {
      toast.error("At least one checked item must have a quantity greater than 0");
      return;
    }

    for (const item of validItems) {
      if (item.invoiceQty > item.invoiceableQty) {
        toast.error(
          `Qty for ${item.partNumber} exceeds invoiceable quantity of ${item.invoiceableQty}`
        );
        return;
      }
    }

    setSaving(true);
    const result = await createInvoice({
      purchaseOrderId: selectedPOId,
      date,
      remarks: remarks.trim() || undefined,
      items: validItems.map((item) => ({
        poLineItemId: item.id,
        qty: item.invoiceQty,
        rate: item.rate,
      })),
    });

    if (result.success) {
      toast.success("Invoice created successfully");
      router.push(`/invoices/${result.id}`);
    } else {
      toast.error(result.error ?? "Failed to create invoice");
      setSaving(false);
    }
  }

  if (purchaseOrders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No purchase orders available for invoicing
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Invoices can only be created for POs that have dispatched items
            (delivery challans). Create delivery challans first, then return
            here to generate invoices.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Invoice Number</label>
              <Input value={nextInvoiceNumber} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase Order *</label>
              <Select value={selectedPOId} onValueChange={handlePOChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select PO" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.poNumber} — {po.divisionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Invoice Date *</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <Input
                placeholder="Optional remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedPO && (
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" />
                    <TableHead>Part Number</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Work Order</TableHead>
                    <TableHead className="text-right">Dispatched</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                    <TableHead className="text-right">Invoiceable</TableHead>
                    <TableHead className="w-[120px] text-right">
                      Invoice Qty
                    </TableHead>
                    <TableHead className="text-right">Rate (₹)</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculations.items.map((item) => {
                    const state = itemStates.find(
                      (s) => s.poLineItemId === item.id
                    );
                    return (
                      <TableRow
                        key={item.id}
                        className={!item.checked ? "opacity-50" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={(checked) =>
                              toggleItem(item.id, checked === true)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.partNumber}
                        </TableCell>
                        <TableCell>{item.partName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.workOrder || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.qtyDispatched}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.alreadyInvoiced}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.invoiceableQty}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            max={item.invoiceableQty}
                            step="0.01"
                            value={state?.qty || ""}
                            onChange={(e) =>
                              updateItemQty(item.id, e.target.value)
                            }
                            disabled={!item.checked}
                            className="ml-auto w-[100px] text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.rate)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {formatCurrency(calculations.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST (9%)</span>
                  <span>{formatCurrency(calculations.cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST (9%)</span>
                  <span>{formatCurrency(calculations.sgst)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Grand Total</span>
                  <span>{formatCurrency(calculations.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving || !selectedPOId}>
          {saving ? "Creating..." : "Create Invoice"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/invoices")}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
