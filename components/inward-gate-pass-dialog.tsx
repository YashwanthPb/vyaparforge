"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  searchPurchaseOrder,
  createInwardGatePass,
} from "@/app/(dashboard)/inward-gate-passes/actions";

// ─── Types ──────────────────────────────────────────────────────────

export type LineItemForDialog = {
  id: string;
  partNumber: string;
  partName: string;
  workOrder: string | null;
  qtyOrdered: number;
  qtyReceived: number;
  balance: number;
};

export type POForDialog = {
  id: string;
  poNumber: string;
  date: string | Date;
  deliveryDate: string | Date | null;
  remarks: string | null;
  divisionName: string;
  lineItems: LineItemForDialog[];
};

type InwardGatePassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedPo?: POForDialog;
};

// ─── Component ──────────────────────────────────────────────────────

export function InwardGatePassDialog({
  open,
  onOpenChange,
  preSelectedPo,
}: InwardGatePassDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(preSelectedPo ? 2 : 1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<POForDialog[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPo, setSelectedPo] = useState<POForDialog | null>(
    preSelectedPo ?? null
  );
  const [selectedLineItem, setSelectedLineItem] =
    useState<LineItemForDialog | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [gpNumber, setGpNumber] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [batchNumber, setBatchNumber] = useState("");
  const [qty, setQty] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [challanNumber, setChallanNumber] = useState("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (preSelectedPo) {
        setSelectedPo(preSelectedPo);
        setStep(2);
      } else {
        setStep(1);
        setSelectedPo(null);
      }
      setSelectedLineItem(null);
      setSearchQuery("");
      setSearchResults([]);
      setGpNumber("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setBatchNumber("");
      setQty("");
      setVehicleNumber("");
      setChallanNumber("");
    }
  }, [open, preSelectedPo]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPurchaseOrder(searchQuery);
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  function selectPo(po: POForDialog) {
    setSelectedPo(po);
    setStep(2);
  }

  function selectLineItem(item: LineItemForDialog) {
    if (item.balance <= 0) return;
    setSelectedLineItem(item);
    setStep(3);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPo || !selectedLineItem) return;

    if (!gpNumber.trim()) {
      toast.error("GP Number is required");
      return;
    }
    if (!qty || Number(qty) <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (Number(qty) > selectedLineItem.balance) {
      toast.error(
        `Quantity cannot exceed balance of ${selectedLineItem.balance}`
      );
      return;
    }

    setSaving(true);
    const result = await createInwardGatePass({
      gpNumber: gpNumber.trim(),
      date,
      purchaseOrderId: selectedPo.id,
      poLineItemId: selectedLineItem.id,
      batchNumber: batchNumber.trim() || undefined,
      qty: Number(qty),
      vehicleNumber: vehicleNumber.trim() || undefined,
      challanNumber: challanNumber.trim() || undefined,
    });

    if (result.success) {
      toast.success(
        `Gate Pass ${result.gpNumber} recorded. PO balance updated.`
      );
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Failed to create gate pass");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Search Purchase Order"}
            {step === 2 && "Select Line Item"}
            {step === 3 && "Gate Pass Details"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Search by PO number to link this gate pass."}
            {step === 2 && "Choose the line item for this gate pass."}
            {step === 3 && "Enter the inward gate pass details."}
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1: PO Search ───────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Type PO number (min 3 chars)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {searching && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {searchResults.map((po) => (
                  <button
                    key={po.id}
                    type="button"
                    className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                    onClick={() => selectPo(po)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{po.poNumber}</span>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {po.divisionName} &middot; {po.lineItems.length} items
                      &middot;{" "}
                      {po.lineItems.filter((i) => i.balance > 0).length} with
                      balance
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!searching &&
              searchQuery.length >= 3 &&
              searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No matching POs with available balance.
                </p>
              )}
          </div>
        )}

        {/* ── Step 2: Select Line Item ────────────────────────────── */}
        {step === 2 && selectedPo && (
          <div className="space-y-4">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selectedPo.poNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPo.divisionName}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>
                      {format(new Date(selectedPo.date), "dd-MM-yyyy")}
                    </p>
                    {selectedPo.remarks && (
                      <p className="text-xs">{selectedPo.remarks}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {selectedPo.lineItems.map((item) => {
                const disabled = item.balance <= 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      disabled
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => selectLineItem(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{item.partNumber}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          — {item.partName}
                        </span>
                      </div>
                      {!disabled && (
                        <ArrowRight className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      {item.workOrder && (
                        <span className="text-muted-foreground">
                          WO: {item.workOrder}
                        </span>
                      )}
                      <Badge
                        variant={disabled ? "secondary" : "default"}
                        className="text-xs"
                      >
                        Balance: {item.balance}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>

            {!preSelectedPo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPo(null);
                  setStep(1);
                }}
              >
                &larr; Back to search
              </Button>
            )}
          </div>
        )}

        {/* ── Step 3: Gate Pass Details ───────────────────────────── */}
        {step === 3 && selectedPo && selectedLineItem && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="font-medium">{selectedPo.poNumber}</span>
              <span className="text-muted-foreground"> &rarr; </span>
              <span className="font-medium">
                {selectedLineItem.partNumber}
              </span>
              <span className="text-muted-foreground">
                {" "}
                — {selectedLineItem.partName}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">GP Number *</label>
                <Input
                  placeholder="e.g. IGP-001"
                  value={gpNumber}
                  onChange={(e) => setGpNumber(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date *</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Batch Number</label>
                <Input
                  placeholder="Batch No."
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Quantity Received *
                  <span className="text-muted-foreground font-normal ml-1">
                    (max: {selectedLineItem.balance})
                  </span>
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0.01"
                  max={selectedLineItem.balance}
                  step="0.01"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle Number</label>
                <Input
                  placeholder="Vehicle No."
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Challan Number</label>
                <Input
                  placeholder="Challan No."
                  value={challanNumber}
                  onChange={(e) => setChallanNumber(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSelectedLineItem(null);
                  setStep(2);
                }}
              >
                &larr; Back
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Gate Pass"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
