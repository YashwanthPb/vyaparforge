"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPurchaseOrder } from "../actions";

type Division = {
  id: string;
  name: string;
  code: string;
};

type LineItem = {
  key: number;
  partNumber: string;
  partName: string;
  workOrder: string;
  qtyOrdered: string;
  rate: string;
  unit: "NOS" | "KG" | "MTR" | "SET" | "LOT";
};

const emptyLineItem = (key: number): LineItem => ({
  key,
  partNumber: "",
  partName: "",
  workOrder: "",
  qtyOrdered: "",
  rate: "",
  unit: "NOS",
});

export function POForm({ divisions }: { divisions: Division[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [poNumber, setPoNumber] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [date, setDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [nextKey, setNextKey] = useState(1);
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem(0)]);

  function addLineItem() {
    setLineItems((prev) => [...prev, emptyLineItem(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function removeLineItem(key: number) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((item) => item.key !== key));
  }

  function updateLineItem(
    key: number,
    field: keyof Omit<LineItem, "key">,
    value: string
  ) {
    setLineItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!poNumber.trim()) {
      toast.error("PO Number is required");
      return;
    }
    if (!divisionId) {
      toast.error("Please select a division");
      return;
    }
    if (!date) {
      toast.error("PO Date is required");
      return;
    }

    for (const item of lineItems) {
      if (!item.partNumber.trim() || !item.partName.trim()) {
        toast.error("Part Number and Part Name are required for all line items");
        return;
      }
      if (!item.qtyOrdered || Number(item.qtyOrdered) <= 0) {
        toast.error("Quantity must be greater than 0 for all line items");
        return;
      }
      if (!item.rate || Number(item.rate) <= 0) {
        toast.error("Rate must be greater than 0 for all line items");
        return;
      }
    }

    setSaving(true);
    const result = await createPurchaseOrder({
      poNumber: poNumber.trim(),
      divisionId,
      date,
      deliveryDate: deliveryDate || undefined,
      remarks: remarks.trim() || undefined,
      lineItems: lineItems.map((item) => ({
        partNumber: item.partNumber.trim(),
        partName: item.partName.trim(),
        workOrder: item.workOrder.trim() || undefined,
        qtyOrdered: Number(item.qtyOrdered),
        rate: Number(item.rate),
        unit: item.unit,
      })),
    });

    if (result.success) {
      toast.success("Purchase order created successfully");
      router.push(`/purchase-orders/${result.id}`);
    } else {
      toast.error(result.error ?? "Failed to create purchase order");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>PO Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">PO Number *</label>
              <Input
                placeholder="e.g. HAL/AD/2024/001"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">HAL Division *</label>
              <Select value={divisionId} onValueChange={setDivisionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((div) => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">PO Date *</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Date</label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
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

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
          >
            <Plus className="mr-1 size-4" />
            Add Line Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((item, index) => (
            <div
              key={item.key}
              className="rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Item {index + 1}
                </span>
                {lineItems.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeLineItem(item.key)}
                  >
                    <Trash2 className="mr-1 size-4" />
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Part Number *</label>
                  <Input
                    placeholder="Part No."
                    value={item.partNumber}
                    onChange={(e) =>
                      updateLineItem(item.key, "partNumber", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Part Name *</label>
                  <Input
                    placeholder="Part Name"
                    value={item.partName}
                    onChange={(e) =>
                      updateLineItem(item.key, "partName", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Work Order No.</label>
                  <Input
                    placeholder="Work Order"
                    value={item.workOrder}
                    onChange={(e) =>
                      updateLineItem(item.key, "workOrder", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Qty Ordered *</label>
                  <Input
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={item.qtyOrdered}
                    onChange={(e) =>
                      updateLineItem(item.key, "qtyOrdered", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Rate (₹) *</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) =>
                      updateLineItem(item.key, "rate", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Unit</label>
                  <Select
                    value={item.unit}
                    onValueChange={(val) =>
                      updateLineItem(
                        item.key,
                        "unit",
                        val as LineItem["unit"]
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOS">Nos</SelectItem>
                      <SelectItem value="KG">Kg</SelectItem>
                      <SelectItem value="MTR">Mtr</SelectItem>
                      <SelectItem value="SET">Set</SelectItem>
                      <SelectItem value="LOT">Lot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Purchase Order"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/purchase-orders")}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
