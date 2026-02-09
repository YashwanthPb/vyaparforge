"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InwardGatePassDialog,
  type POForDialog,
} from "@/components/inward-gate-pass-dialog";

export function RecordGatePassButton({ po }: { po: POForDialog }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Record Gate Pass
      </Button>
      <InwardGatePassDialog
        open={open}
        onOpenChange={setOpen}
        preSelectedPo={po}
      />
    </>
  );
}
