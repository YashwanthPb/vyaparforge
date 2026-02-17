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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { InwardGatePassDialog } from "@/components/inward-gate-pass-dialog";

type GPRow = {
  id: string;
  gpNumber: string;
  date: Date;
  purchaseOrderId: string;
  poNumber: string;
  divisionName: string;
  partNumber: string;
  partName: string;
  batchNumber: string | null;
  qty: number;
  vehicleNumber: string | null;
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

// ─── Main Component ─────────────────────────────────────────────────

export function GPTable({
  gatePasses,
}: {
  gatePasses: GPRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Read from URL
  const currentSort = searchParams.get("sort") || "";
  const currentOrder = (searchParams.get("order") || "") as "asc" | "desc" | "";
  const currentSearch = searchParams.get("search") || "";
  const currentDateFrom = searchParams.get("dateFrom") || "";
  const currentDateTo = searchParams.get("dateTo") || "";

  // Local state for inputs
  const [search, setSearch] = useState(currentSearch);
  const [dateFrom, setDateFrom] = useState(currentDateFrom);
  const [dateTo, setDateTo] = useState(currentDateTo);

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

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-xs flex-1 min-w-[200px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search GPs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </form>

        {/* New GP Button */}
        <Button onClick={() => setDialogOpen(true)} className="ml-auto">
          <Plus className="mr-2 size-4" />
          New Gate Pass
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
          {gatePasses.length} result{gatePasses.length !== 1 ? "s" : ""}
          {isPending && " · loading..."}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="GP Number" field="gpNumber" sortState={sortState} onSort={handleSort} />
              <SortableHeader label="Date" field="date" sortState={sortState} onSort={handleSort} />
              <SortableHeader label="PO Number" field="poNumber" sortState={sortState} onSort={handleSort} />
              <TableHead>Division</TableHead>
              <TableHead>Part Number</TableHead>
              <TableHead>Batch</TableHead>
              <SortableHeader label="Qty" field="qty" sortState={sortState} onSort={handleSort} className="text-right" />
              <TableHead>Vehicle No.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gatePasses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                  {currentSearch || currentDateFrom
                    ? "No gate passes match your filters."
                    : "No gate passes yet. Create your first gate pass."}
                </TableCell>
              </TableRow>
            ) : (
              gatePasses.map((gp) => (
                <TableRow key={gp.id} className="cursor-pointer" onClick={() => router.push(`/purchase-orders/${gp.purchaseOrderId}`)}>
                  <TableCell className="font-medium">{gp.gpNumber}</TableCell>
                  <TableCell>{format(new Date(gp.date), "dd-MM-yyyy")}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="text-primary underline-offset-4 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/purchase-orders/${gp.purchaseOrderId}`);
                      }}
                    >
                      {gp.poNumber}
                    </button>
                  </TableCell>
                  <TableCell>{gp.divisionName}</TableCell>
                  <TableCell>{gp.partNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{gp.batchNumber || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{gp.qty}</TableCell>
                  <TableCell className="text-muted-foreground">{gp.vehicleNumber || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InwardGatePassDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
