"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { exportToExcel } from "@/lib/export-excel";
import { getInwardRegister } from "../actions";

interface InwardRow {
  id: string;
  gpNumber: string;
  date: string;
  poNumber: string;
  division: string;
  partNumber: string;
  partName: string;
  batchNumber: string;
  qty: number;
  vehicleNumber: string;
  challanNumber: string;
}

interface Division {
  id: string;
  name: string;
  code: string;
}

export function InwardRegisterClient({
  initialData,
  divisions,
}: {
  initialData: InwardRow[];
  divisions: Division[];
}) {
  const [data, setData] = useState(initialData);
  const [divisionId, setDivisionId] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isPending, startTransition] = useTransition();

  function applyFilters() {
    startTransition(async () => {
      const result = await getInwardRegister({
        divisionId: divisionId === "ALL" ? undefined : divisionId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setData(
        result.map((gp) => ({
          id: gp.id,
          gpNumber: gp.gpNumber,
          date: gp.date.toISOString(),
          poNumber: gp.purchaseOrder.poNumber,
          division: gp.purchaseOrder.division.name,
          partNumber: gp.poLineItem.partNumber,
          partName: gp.poLineItem.partName,
          batchNumber: gp.batchNumber ?? "",
          qty: Number(gp.qty),
          vehicleNumber: gp.vehicleNumber ?? "",
          challanNumber: gp.challanNumber ?? "",
        }))
      );
    });
  }

  function handleExport() {
    const today = format(new Date(), "dd-MM-yyyy");
    exportToExcel({
      data: data as unknown as Record<string, unknown>[],
      columns: [
        { header: "GP Number", key: "gpNumber", width: 16 },
        { header: "Date", key: "date", format: "date", width: 14 },
        { header: "PO Number", key: "poNumber", width: 18 },
        { header: "Division", key: "division", width: 22 },
        { header: "Part Number", key: "partNumber", width: 16 },
        { header: "Part Name", key: "partName", width: 24 },
        { header: "Batch", key: "batchNumber", width: 14 },
        { header: "Qty", key: "qty", format: "number", width: 10 },
        { header: "Vehicle", key: "vehicleNumber", width: 14 },
        { header: "Challan", key: "challanNumber", width: 14 },
      ],
      filename: `Inward_GP_Register_${today}`,
      sheetName: "Inward GP Register",
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Division
          </label>
          <Select value={divisionId} onValueChange={setDivisionId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Divisions</SelectItem>
              {divisions.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Date From
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Date To
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <Button onClick={applyFilters} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Apply
        </Button>

        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GP Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>PO Number</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Part Number</TableHead>
              <TableHead>Part Name</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Challan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-muted-foreground"
                >
                  No inward gate passes found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.gpNumber}</TableCell>
                  <TableCell>
                    {format(new Date(row.date), "dd-MM-yyyy")}
                  </TableCell>
                  <TableCell>{row.poNumber}</TableCell>
                  <TableCell>{row.division}</TableCell>
                  <TableCell>{row.partNumber}</TableCell>
                  <TableCell>{row.partName}</TableCell>
                  <TableCell>{row.batchNumber}</TableCell>
                  <TableCell className="text-right">{row.qty}</TableCell>
                  <TableCell>{row.vehicleNumber}</TableCell>
                  <TableCell>{row.challanNumber}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
