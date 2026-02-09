"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  OutwardGatePassDialog,
  type POForDispatchDialog,
} from "@/components/outward-gate-pass-dialog";

export function RecordDispatchButton({ po }: { po: POForDispatchDialog }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Record Dispatch
      </Button>
      <OutwardGatePassDialog
        open={open}
        onOpenChange={setOpen}
        preSelectedPo={po}
      />
    </>
  );
}
