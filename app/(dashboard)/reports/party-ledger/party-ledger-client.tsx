"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  TableFooter,
} from "@/components/ui/table";
import { exportToExcel } from "@/lib/export-excel";
import { getPartyLedger } from "../actions";

type Party = { id: string; name: string; type: string };
type Transaction = Awaited<ReturnType<typeof getPartyLedger>>["transactions"][number];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function PartyLedgerClient({
  parties,
  transactions,
  selectedPartyId,
  partyName,
}: {
  parties: Party[];
  transactions: Transaction[];
  selectedPartyId?: string;
  partyName?: string;
}) {
  const router = useRouter();

  function handlePartyChange(partyId: string) {
    router.push(`/reports/party-ledger?partyId=${partyId}`);
  }

  function handleExport() {
    if (!partyName) return;
    const today = format(new Date(), "dd-MM-yyyy");
    exportToExcel({
      data: transactions as unknown as Record<string, unknown>[],
      columns: [
        { header: "Date", key: "date", format: "date", width: 14 },
        { header: "Reference", key: "reference", width: 24 },
        { header: "Type", key: "type", width: 12 },
        { header: "Debit", key: "debit", format: "currency", width: 16 },
        { header: "Credit", key: "credit", format: "currency", width: 16 },
        { header: "Balance", key: "balance", format: "currency", width: 16 },
      ],
      filename: `Party_Ledger_${partyName}_${today}`,
      sheetName: "Party Ledger",
    });
  }

  const closingBalance = transactions.length > 0
    ? transactions[transactions.length - 1].balance
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-72">
          <Select
            value={selectedPartyId ?? ""}
            onValueChange={handlePartyChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a party..." />
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
        {transactions.length > 0 && (
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
        )}
      </div>

      {!selectedPartyId ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Select a party above to view their ledger.
          </CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No transactions found for this party.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Closing Balance — {partyName}</p>
              <p className={`text-3xl font-bold ${closingBalance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400"}`}>
                {formatCurrency(Math.abs(closingBalance))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {closingBalance >= 0
                  ? "Receivable (party owes you)"
                  : "Payable (you owe party)"}
              </p>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{format(new Date(row.date), "dd-MM-yyyy")}</TableCell>
                    <TableCell className="font-medium">{row.reference}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          row.type === "SALE"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                        }
                      >
                        {row.type === "SALE" ? "Sale" : "Purchase"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.debit > 0 ? formatCurrency(row.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.credit > 0 ? formatCurrency(row.credit) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${row.balance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400"}`}>
                      {formatCurrency(Math.abs(row.balance))}
                      {row.balance < 0 ? " Cr" : " Dr"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold">
                  <TableCell colSpan={3}>CLOSING BALANCE</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(transactions.reduce((s, r) => s + r.debit, 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(transactions.reduce((s, r) => s + r.credit, 0))}
                  </TableCell>
                  <TableCell className={`text-right ${closingBalance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400"}`}>
                    {formatCurrency(Math.abs(closingBalance))}
                    {closingBalance < 0 ? " Cr" : " Dr"}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
