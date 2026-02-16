"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Plus, CheckCircle2, Pencil, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createParty, updateParty, deleteParty } from "./actions";

type PartyRow = {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  type: "CUSTOMER" | "SUPPLIER" | "BOTH";
  isHAL: boolean;
  receivableBalance: number;
  payableBalance: number;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

const typeConfig: Record<
  PartyRow["type"],
  { label: string; className: string }
> = {
  CUSTOMER: {
    label: "Customer",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  SUPPLIER: {
    label: "Supplier",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  },
  BOTH: {
    label: "Both",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
};

const emptyForm = {
  name: "",
  gstin: "",
  phone: "",
  email: "",
  address: "",
  type: "BOTH" as PartyRow["type"],
};

export function PartyTable({ parties }: { parties: PartyRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editParty, setEditParty] = useState<PartyRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isPending, startTransition] = useTransition();

  const filtered = parties.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.gstin.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setEditParty(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(party: PartyRow, e: React.MouseEvent) {
    e.stopPropagation();
    setEditParty(party);
    setForm({
      name: party.name,
      gstin: party.gstin,
      phone: party.phone,
      email: party.email,
      address: party.address,
      type: party.type,
    });
    setShowDialog(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editParty
        ? await updateParty(editParty.id, form)
        : await createParty(form);

      if (result.success) {
        toast.success(editParty ? "Party updated" : "Party created");
        setShowDialog(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  function handleDelete(party: PartyRow, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete party "${party.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteParty(party.id);
      if (result.success) {
        toast.success("Party deleted");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 size-4" />
          Add Party
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-center">HAL</TableHead>
              <TableHead className="text-right">Receivable</TableHead>
              <TableHead className="text-right">Payable</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground h-24 text-center"
                >
                  {search
                    ? "No parties match your search."
                    : "No parties yet. Add your first party."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((party) => {
                const typeCfg = typeConfig[party.type];
                return (
                  <TableRow
                    key={party.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/parties/${party.id}`)}
                  >
                    <TableCell className="font-medium">{party.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {party.gstin || "—"}
                    </TableCell>
                    <TableCell>{party.phone || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {party.address || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={typeCfg.className}>
                        {typeCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {party.isHAL && (
                        <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                      )}
                    </TableCell>
                    <TableCell className="text-right text-blue-700 dark:text-blue-400">
                      {party.receivableBalance > 0
                        ? formatCurrency(party.receivableBalance)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-orange-700 dark:text-orange-400">
                      {party.payableBalance > 0
                        ? formatCurrency(party.payableBalance)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => openEdit(party, e)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => handleDelete(party, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editParty ? "Edit Party" : "Add Party"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                placeholder="e.g. 29AAAAA0000A1Z5"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({ ...form, type: v as PartyRow["type"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="SUPPLIER">Supplier</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : editParty ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
