"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useCallback, useTransition } from "react";
import { format } from "date-fns";
import {
  Search,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { createPurchaseInvoice, bulkMarkPurchasesPaid } from "./actions";

type PurchaseRow = {
  id: string;
  invoiceNumber: string;
  date: Date;
  supplierName: string;
  partyId: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  poNumber: string;
};

type Supplier = { id: string; name: string };

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

const statusConfig: Record<
  PurchaseRow["paymentStatus"],
  { label: string; className: string }
> = {
  UNPAID: {
    label: "Unpaid",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  PARTIALLY_PAID: {
    label: "Partial",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
  PAID: {
    label: "Paid",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
};

// ─── Date range presets ─────────────────────────────────────────────

function getDateRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case "thisMonth": {
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0);
      return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") };
    }
    case "lastMonth": {
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);
      return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") };
    }
    case "thisFY": {
      const fyStartYear = month >= 3 ? year : year - 1;
      const from = new Date(fyStartYear, 3, 1);
      const to = new Date(fyStartYear + 1, 2, 31);
      return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") };
    }
    case "lastFY": {
      const fyStartYear = month >= 3 ? year - 1 : year - 2;
      const from = new Date(fyStartYear, 3, 1);
      const to = new Date(fyStartYear + 1, 2, 31);
      return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") };
    }
    default:
      return { from: "", to: "" };
  }
}

// ─── Sortable Column Header ─────────────────────────────────────────

type SortState = { field: string; order: "asc" | "desc" } | null;

function SortableHeader({
  label,
  field,
  sortState,
  onSort,
  className,
}: {
  label: string;
  field: string;
  sortState: SortState;
  onSort: (field: string) => void;
  className?: string;
}) {
  const isActive = sortState?.field === field;
  const Icon = isActive
    ? sortState.order === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors -ml-2 px-2 py-1 rounded hover:bg-muted"
        onClick={() => onSort(field)}
      >
        {label}
        <Icon className={`size-3 ${isActive ? "text-foreground" : "text-muted-foreground/50"}`} />
      </button>
    </TableHead>
  );
}

// ─── Empty form state ───────────────────────────────────────────────

const emptyForm = {
  partyId: "",
  invoiceNumber: "",
  date: "",
  totalAmount: "",
  paymentType: "",
  poNumber: "",
  workOrder: "",
  description: "",
};

// ─── Main Component ─────────────────────────────────────────────────

export function PurchaseTable({
  invoices,
  suppliers,
  filterParties,
}: {
  invoices: PurchaseRow[];
  suppliers: Supplier[];
  filterParties: Supplier[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read from URL
  const currentSort = searchParams.get("sort") || "";
  const currentOrder = (searchParams.get("order") || "") as "asc" | "desc" | "";
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "ALL";
  const currentPartyId = searchParams.get("partyId") || "";
  const currentDateFrom = searchParams.get("dateFrom") || "";
  const currentDateTo = searchParams.get("dateTo") || "";

  // Local state
  const [search, setSearch] = useState(currentSearch);
  const [dateFrom, setDateFrom] = useState(currentDateFrom);
  const [dateTo, setDateTo] = useState(currentDateTo);
  const [partyOpen, setPartyOpen] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router, startTransition]
  );

  const sortState: SortState =
    currentSort && currentOrder
      ? { field: currentSort, order: currentOrder }
      : null;

  function handleSort(field: string) {
    if (sortState?.field === field) {
      if (sortState.order === "asc") {
        updateParams({ sort: field, order: "desc" });
      } else {
        updateParams({ sort: "", order: "" });
      }
    } else {
      updateParams({ sort: field, order: "asc" });
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search: search.trim() });
  }

  function handleStatusChange(value: string) {
    updateParams({ status: value === "ALL" ? "" : value });
  }

  function handleDatePreset(preset: string) {
    const range = getDateRange(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
    updateParams({ dateFrom: range.from, dateTo: range.to });
  }

  function handleDateApply() {
    updateParams({ dateFrom, dateTo });
  }

  function handleDateClear() {
    setDateFrom("");
    setDateTo("");
    updateParams({ dateFrom: "", dateTo: "" });
  }

  function handlePartyChange(partyId: string) {
    setPartyOpen(false);
    updateParams({ partyId: partyId === currentPartyId ? "" : partyId });
  }

  function handlePartyClear() {
    setPartyOpen(false);
    updateParams({ partyId: "" });
  }

  // Bulk
  const allSelected =
    invoices.length > 0 && invoices.every((inv) => selectedIds.has(inv.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(invoices.map((inv) => inv.id)));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkMarkPaid() {
    const ids = Array.from(selectedIds);
    setBulkLoading(true);
    try {
      const result = await bulkMarkPurchasesPaid(ids);
      if (result.success) {
        toast.success(`${result.count} purchase${result.count !== 1 ? "s" : ""} marked as paid`);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to mark as paid");
      }
    } catch {
      toast.error("Failed to mark as paid");
    } finally {
      setBulkLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.totalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    startTransition(async () => {
      const result = await createPurchaseInvoice({
        partyId: form.partyId,
        invoiceNumber: form.invoiceNumber,
        date: form.date,
        totalAmount: amount,
        paymentType: form.paymentType,
        poNumber: form.poNumber,
        workOrder: form.workOrder,
        description: form.description,
      });

      if (result.success) {
        toast.success("Purchase invoice created");
        setShowDialog(false);
        setForm(emptyForm);
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  const selectedParty = filterParties.find((p) => p.id === currentPartyId);

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-xs flex-1 min-w-[200px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search purchases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </form>

        {/* Status Filter */}
        <div className="w-36">
          <Select value={currentStatus || "ALL"} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PARTIALLY_PAID">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Party Filter */}
        <Popover open={partyOpen} onOpenChange={setPartyOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={partyOpen}
              className="w-48 justify-between"
            >
              <span className="truncate">
                {selectedParty ? selectedParty.name : "All Suppliers"}
              </span>
              <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search suppliers..." />
              <CommandList>
                <CommandEmpty>No supplier found.</CommandEmpty>
                <CommandGroup>
                  {currentPartyId && (
                    <CommandItem onSelect={handlePartyClear}>
                      <X className="mr-2 size-4" />
                      Clear Filter
                    </CommandItem>
                  )}
                  {filterParties.map((party) => (
                    <CommandItem
                      key={party.id}
                      value={party.name}
                      onSelect={() => handlePartyChange(party.id)}
                    >
                      <Check
                        className={`mr-2 size-4 ${currentPartyId === party.id ? "opacity-100" : "opacity-0"
                          }`}
                      />
                      {party.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* New Purchase Invoice Button */}
        <Button onClick={() => setShowDialog(true)} className="ml-auto">
          <Plus className="mr-2 size-4" />
          New Purchase Invoice
        </Button>
      </div>

      {/* Date Range Row */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex items-center gap-1">
          {["thisMonth", "lastMonth", "thisFY", "lastFY"].map((preset) => {
            const labels: Record<string, string> = {
              thisMonth: "This Month",
              lastMonth: "Last Month",
              thisFY: "This FY",
              lastFY: "Last FY",
            };
            return (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => handleDatePreset(preset)}
              >
                {labels[preset]}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36 h-8 text-xs"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36 h-8 text-xs"
          />
          <Button size="sm" className="h-8 text-xs" onClick={handleDateApply}>
            Apply
          </Button>
          {(currentDateFrom || currentDateTo) && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleDateClear}>
              Clear
            </Button>
          )}
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {invoices.length} result{invoices.length !== 1 ? "s" : ""}
          {isPending && " · loading..."}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <SortableHeader label="Invoice No" field="invoiceNumber" sortState={sortState} onSort={handleSort} />
              <SortableHeader label="Date" field="date" sortState={sortState} onSort={handleSort} />
              <SortableHeader label="Supplier" field="party" sortState={sortState} onSort={handleSort} />
              <SortableHeader label="Amount" field="totalAmount" sortState={sortState} onSort={handleSort} className="text-right" />
              <TableHead className="text-right">Paid</TableHead>
              <SortableHeader label="Balance" field="balanceDue" sortState={sortState} onSort={handleSort} className="text-right" />
              <SortableHeader label="Status" field="status" sortState={sortState} onSort={handleSort} className="text-center" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                  {currentSearch || currentStatus !== "ALL" || currentPartyId || currentDateFrom
                    ? "No purchases match your filters."
                    : "No purchase invoices yet."}
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const statusCfg = statusConfig[inv.paymentStatus];
                return (
                  <TableRow
                    key={inv.id}
                    className={`cursor-pointer ${selectedIds.has(inv.id) ? "bg-muted/50" : ""}`}
                    onClick={() => router.push(`/purchases/${inv.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(inv.id)}
                        onCheckedChange={() => toggleSelect(inv.id)}
                        aria-label={`Select ${inv.invoiceNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{format(new Date(inv.date), "dd-MM-yyyy")}</TableCell>
                    <TableCell>{inv.supplierName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(inv.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      {inv.paidAmount > 0 ? formatCurrency(inv.paidAmount) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-orange-700 dark:text-orange-400">
                      {inv.balanceDue > 0 ? formatCurrency(inv.balanceDue) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={statusCfg.className}>
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Floating Bulk Action Bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border bg-background px-6 py-3 shadow-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" onClick={handleBulkMarkPaid} disabled={bulkLoading}>
            <Check className="mr-2 size-4" />
            {bulkLoading ? "Processing..." : `Mark ${selectedIds.size} as Paid`}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Deselect All
          </Button>
        </div>
      )}

      {/* New Purchase Invoice Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Purchase Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Select
                value={form.partyId}
                onValueChange={(v) => setForm({ ...form, partyId: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-number">Invoice Number *</Label>
                <Input
                  id="inv-number"
                  required
                  value={form.invoiceNumber}
                  onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-date">Date *</Label>
                <Input
                  id="inv-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.totalAmount}
                  onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-type">Payment Type</Label>
                <Select
                  value={form.paymentType}
                  onValueChange={(v) => setForm({ ...form, paymentType: v })}
                >
                  <SelectTrigger id="payment-type">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="po-number">PO Number</Label>
                <Input
                  id="po-number"
                  value={form.poNumber}
                  onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="work-order">Work Order</Label>
                <Input
                  id="work-order"
                  value={form.workOrder}
                  onChange={(e) => setForm({ ...form, workOrder: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !form.partyId}>
                {isPending ? "Creating…" : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
