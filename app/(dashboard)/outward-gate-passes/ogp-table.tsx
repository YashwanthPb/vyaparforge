"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Search, Plus } from "lucide-react";
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
import { OutwardGatePassDialog } from "@/components/outward-gate-pass-dialog";

type OutwardGatePassRow = {
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
  challanNumber: string | null;
  dispatchDate: Date | null;
};

export function OGPTable({
  gatePasses,
}: {
  gatePasses: OutwardGatePassRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = gatePasses.filter(
    (gp) =>
      gp.gpNumber.toLowerCase().includes(search.toLowerCase()) ||
      gp.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      gp.partNumber.toLowerCase().includes(search.toLowerCase()) ||
      gp.divisionName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by DC number, PO, part, division..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          New DC
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>DC Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>PO Number</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Part Number</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Qty Dispatched</TableHead>
              <TableHead>Vehicle No.</TableHead>
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
                    ? "No dispatches match your search."
                    : "No delivery challans yet. Create your first DC."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((gp) => (
                <TableRow key={gp.id} className="cursor-pointer" onClick={() => router.push(`/outward-gate-passes/${gp.id}`)}>
                  <TableCell className="font-medium">{gp.gpNumber}</TableCell>
                  <TableCell>
                    {format(new Date(gp.date), "dd-MM-yyyy")}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="text-primary underline-offset-4 hover:underline"
                      onClick={() =>
                        router.push(
                          `/purchase-orders/${gp.purchaseOrderId}`
                        )
                      }
                    >
                      {gp.poNumber}
                    </button>
                  </TableCell>
                  <TableCell>{gp.divisionName}</TableCell>
                  <TableCell>{gp.partNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {gp.batchNumber || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {gp.qty}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {gp.vehicleNumber || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <OutwardGatePassDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
