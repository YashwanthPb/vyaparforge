"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createDivision, updateDivision, deleteDivision } from "./actions";

type Division = {
  id: string;
  name: string;
  code: string;
  poCount: number;
  createdAt: Date;
};

export function DivisionManagement({
  divisions,
}: {
  divisions: Division[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");

  function startEdit(div: Division) {
    setEditingId(div.id);
    setEditName(div.name);
    setEditCode(div.code);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditCode("");
  }

  function handleSaveEdit(id: string) {
    if (!editName.trim() || !editCode.trim()) {
      toast.error("Name and code are required");
      return;
    }
    startTransition(async () => {
      const result = await updateDivision(id, {
        name: editName.trim(),
        code: editCode.trim(),
      });
      if (result.success) {
        toast.success("Division updated");
        cancelEdit();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAdd() {
    if (!newName.trim() || !newCode.trim()) {
      toast.error("Name and code are required");
      return;
    }
    startTransition(async () => {
      const result = await createDivision({
        name: newName.trim(),
        code: newCode.trim(),
      });
      if (result.success) {
        toast.success("Division added");
        setNewName("");
        setNewCode("");
        setShowAdd(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(id: string, name: string) {
    startTransition(async () => {
      const result = await deleteDivision(id);
      if (result.success) {
        toast.success(`${name} deleted`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>HAL Divisions</CardTitle>
            <CardDescription>
              Manage HAL divisions linked to purchase orders.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setShowAdd(true);
              setNewName("");
              setNewCode("");
            }}
            disabled={showAdd}
          >
            <Plus className="mr-2 size-4" />
            Add Division
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Division Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Linked POs</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {showAdd && (
                <TableRow>
                  <TableCell>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Aircraft Division"
                      className="h-8"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="e.g. AD"
                      className="h-8 w-24"
                      maxLength={10}
                      onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    />
                  </TableCell>
                  <TableCell />
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={handleAdd}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => setShowAdd(false)}
                        disabled={isPending}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {divisions.length === 0 && !showAdd ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No divisions yet. Add your first HAL division above.
                  </TableCell>
                </TableRow>
              ) : (
                divisions.map((div) => (
                  <TableRow key={div.id}>
                    <TableCell>
                      {editingId === div.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8"
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveEdit(div.id)
                          }
                        />
                      ) : (
                        <span className="font-medium">{div.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === div.id ? (
                        <Input
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="h-8 w-24"
                          maxLength={10}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveEdit(div.id)
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground font-mono text-sm">
                          {div.code}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{div.poCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {editingId === div.id ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              onClick={() => handleSaveEdit(div.id)}
                              disabled={isPending}
                            >
                              {isPending ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Check className="size-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              onClick={cancelEdit}
                              disabled={isPending}
                            >
                              <X className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              onClick={() => startEdit(div)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive size-8"
                              onClick={() => handleDelete(div.id, div.name)}
                              disabled={isPending || div.poCount > 0}
                              title={
                                div.poCount > 0
                                  ? "Cannot delete: has linked POs"
                                  : "Delete division"
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
