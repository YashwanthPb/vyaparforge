"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

type PurchaseOrderRow = {
  id: string;
  poNumber: string;
  divisionName: string;
  date: Date;
  status: "OPEN" | "PARTIALLY_FULFILLED" | "COMPLETED" | "CANCELLED";
  itemCount: number;
  totalOrdered: number;
  totalReceived: number;
  totalDispatched: number;
  balance: number;
};

const statusConfig: Record<
  PurchaseOrderRow["status"],
  { label: string; className: string }
> = {
  OPEN: {
    label: "Open",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  PARTIALLY_FULFILLED: {
    label: "Partial",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

export function POTable({
  purchaseOrders,
}: {
  purchaseOrders: PurchaseOrderRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = purchaseOrders.filter(
    (po) =>
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.divisionName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by PO number or division..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => router.push("/purchase-orders/new")}>
          <Plus className="mr-2 size-4" />
          New PO
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Dispatched</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground h-24 text-center"
                >
                  {search
                    ? "No purchase orders match your search."
                    : "No purchase orders yet. Create your first PO."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((po) => {
                const status = statusConfig[po.status];
                return (
                  <TableRow
                    key={po.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/purchase-orders/${po.id}`)}
                  >
                    <TableCell className="font-medium">
                      {po.poNumber}
                    </TableCell>
                    <TableCell>{po.divisionName}</TableCell>
                    <TableCell>{format(new Date(po.date), "dd-MM-yyyy")}</TableCell>
                    <TableCell className="text-center">
                      {po.itemCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {po.totalReceived}
                    </TableCell>
                    <TableCell className="text-right">
                      {po.totalDispatched}
                    </TableCell>
                    <TableCell className="text-right">
                      {po.balance}
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
    </div>
  );
}
