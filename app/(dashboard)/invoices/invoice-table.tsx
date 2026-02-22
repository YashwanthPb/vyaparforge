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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { bulkMarkAsPaid } from "./actions";

type InvoiceStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  date: Date;
  poNumber: string;
  divisionName: string;
  partyId: string;
  partyName: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  status: InvoiceStatus;
  dcNumber: string;
  gatePassNumber: string;
};

type Party = {
  id: string;
  name: string;
};

const statusConfig: Record<
  InvoiceStatus,
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

// ─── Date range presets ─────────────────────────────────────────────

function getDateRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case "thisMonth": {
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0);
      return {
        from: format(from, "yyyy-MM-dd"),
        to: format(to, "yyyy-MM-dd"),
      };
    }
    case "lastMonth": {
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);
      return {
        from: format(from, "yyyy-MM-dd"),
        to: format(to, "yyyy-MM-dd"),
      };
    }
    case "thisFY": {
      // FY: April to March
      const fyStartYear = month >= 3 ? year : year - 1;
      const from = new Date(fyStartYear, 3, 1);
      const to = new Date(fyStartYear + 1, 2, 31);
      return {
        from: format(from, "yyyy-MM-dd"),
        to: format(to, "yyyy-MM-dd"),
      };
    }
    case "lastFY": {
      const fyStartYear = month >= 3 ? year - 1 : year - 2;
      const from = new Date(fyStartYear, 3, 1);
      const to = new Date(fyStartYear + 1, 2, 31);
      return {
        from: format(from, "yyyy-MM-dd"),
        to: format(to, "yyyy-MM-dd"),
      };
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

// ─── Main Component ─────────────────────────────────────────────────

export function InvoiceTable({
  invoices,
  parties,
}: {
  invoices: InvoiceRow[];
  parties: Party[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read initial state from URL
  const currentSort = searchParams.get("sort") || "";
  const currentOrder = (searchParams.get("order") || "") as "asc" | "desc" | "";
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "ALL";
  const currentPartyId = searchParams.get("partyId") || "";
  const currentDateFrom = searchParams.get("dateFrom") || "";
  const currentDateTo = searchParams.get("dateTo") || "";

  // Local state for inputs
  const [search, setSearch] = useState(currentSearch);
  const [dateFrom, setDateFrom] = useState(currentDateFrom);
  const [dateTo, setDateTo] = useState(currentDateTo);
  const [partyOpen, setPartyOpen] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Helper to update URL params
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router, startTransition]
  );

  // Sort state from URL
  const sortState: SortState =
    currentSort && currentOrder
      ? { field: currentSort, order: currentOrder }
      : null;

  // Handle sort column click (3-state cycling)
  function handleSort(field: string) {
    if (sortState?.field === field) {
      if (sortState.order === "asc") {
        updateParams({ sort: field, order: "desc" });
      } else {
        // Third click: reset
        updateParams({ sort: "", order: "" });
      }
    } else {
      updateParams({ sort: field, order: "asc" });
    }
  }

  // Handle search submit
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search: search.trim() });
  }

  // Handle date preset
  function handleDatePreset(preset: string) {
    if (preset === "custom") return;
    const range = getDateRange(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
    updateParams({ dateFrom: range.from, dateTo: range.to });
  }

  // Handle date apply
  function handleDateApply() {
    updateParams({ dateFrom, dateTo });
  }

  // Handle clear date
  function handleDateClear() {
    setDateFrom("");
    setDateTo("");
    updateParams({ dateFrom: "", dateTo: "" });
  }

  // Handle status change
  function handleStatusChange(value: string) {
    updateParams({ status: value === "ALL" ? "" : value });
  }

  // Handle party change
  function handlePartyChange(partyId: string) {
    setPartyOpen(false);
    updateParams({ partyId: partyId === currentPartyId ? "" : partyId });
  }

  // Handle clear party filter
  function handlePartyClear() {
    setPartyOpen(false);
    updateParams({ partyId: "" });
  }

  // Bulk select
  const allSelected =
    invoices.length > 0 && invoices.every((inv) => selectedIds.has(inv.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map((inv) => inv.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleBulkMarkPaid() {
    const ids = Array.from(selectedIds);
    setBulkLoading(true);
    try {
      const result = await bulkMarkAsPaid(ids);
      if (result.success) {
        toast.success(`${result.count} invoice${result.count !== 1 ? "s" : ""} marked as paid`);
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

  const selectedParty = parties.find((p) => p.id === currentPartyId);

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-xs flex-1 min-w-[200px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search invoices..."
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
                {selectedParty ? selectedParty.name : "All Parties"}
              </span>
              <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search parties..." />
              <CommandList>
                <CommandEmpty>No party found.</CommandEmpty>
                <CommandGroup>
                  {currentPartyId && (
                    <CommandItem onSelect={handlePartyClear}>
                      <X className="mr-2 size-4" />
                      Clear Filter
                    </CommandItem>
                  )}
                  {parties.map((party) => (
                    <CommandItem
                      key={party.id}
                      value={party.name}
                      onSelect={() => handlePartyChange(party.id)}
                    >
                      <Check
                        className={`mr-2 size-4 ${currentPartyId === party.id
                          ? "opacity-100"
                          : "opacity-0"
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

        {/* New Invoice Button */}
        <Button onClick={() => router.push("/invoices/new")} className="ml-auto">
          <Plus className="mr-2 size-4" />
          New Invoice
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
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={handleDateClear}
            >
              Clear
            </Button>
          )}
        </div>
        {/* Result count */}
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
              <SortableHeader
                label="Invoice Number"
                field="invoiceNumber"
                sortState={sortState}
                onSort={handleSort}
              />
              <SortableHeader
                label="Date"
                field="date"
                sortState={sortState}
                onSort={handleSort}
              />
              <SortableHeader
                label="PO Number"
                field="poNumber"
                sortState={sortState}
                onSort={handleSort}
              />
              <SortableHeader
                label="Party"
                field="party"
                sortState={sortState}
                onSort={handleSort}
              />
              <TableHead>DC Number</TableHead>
              <TableHead>Gate Pass</TableHead>
              <SortableHeader
                label="Total Amount"
                field="totalAmount"
                sortState={sortState}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Status"
                field="status"
                sortState={sortState}
                onSort={handleSort}
                className="text-center"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground h-24 text-center"
                >
                  {currentSearch || currentStatus !== "ALL" || currentPartyId || currentDateFrom
                    ? "No invoices match your filters."
                    : "No invoices yet. Create your first invoice."}
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const status = statusConfig[inv.status];
                return (
                  <TableRow
                    key={inv.id}
                    className={`cursor-pointer ${selectedIds.has(inv.id) ? "bg-muted/50" : ""
                      }`}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(inv.id)}
                        onCheckedChange={() => toggleSelect(inv.id)}
                        aria-label={`Select ${inv.invoiceNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      {format(new Date(inv.date), "dd-MM-yyyy")}
                    </TableCell>
                    <TableCell>{inv.poNumber || "—"}</TableCell>
                    <TableCell>
                      {inv.partyName ? (
                        <span
                          className="hover:underline text-blue-700 dark:text-blue-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/parties/${inv.partyId}`);
                          }}
                        >
                          {inv.partyName}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.dcNumber || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.gatePassNumber || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(inv.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={status.className}
                      >
                        {status.label}
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
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            onClick={handleBulkMarkPaid}
            disabled={bulkLoading}
          >
            <Check className="mr-2 size-4" />
            {bulkLoading
              ? "Processing..."
              : `Mark ${selectedIds.size} as Paid`}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Deselect All
          </Button>
        </div>
      )}
    </div>
  );
}
