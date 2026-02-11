"use client";

import { useState, useCallback } from "react";
import { InvoiceRenderer } from "@/components/invoice-templates/invoice-renderer";
import { ThemeSelector } from "@/components/invoice-templates/theme-selector";
import type { InvoiceTheme, InvoiceData } from "@/components/invoice-templates/types";

const INVOICE_THEMES: { value: InvoiceTheme; label: string }[] = [
  { value: "classic", label: "Classic (Tally)" },
  { value: "modern", label: "Modern (Vyapar)" },
  { value: "minimal", label: "Minimal" },
];

export function InvoicePreview({ data }: { data: InvoiceData }) {
  const [theme, setTheme] = useState<InvoiceTheme>("classic");

  const handleThemeChange = useCallback((t: InvoiceTheme) => {
    setTheme(t);
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <ThemeSelector<InvoiceTheme>
          storageKey="vyaparforge-invoice-theme"
          themes={INVOICE_THEMES}
          defaultTheme="classic"
          onThemeChange={handleThemeChange}
        />
      </div>
      <div id="printable-area" className="print:m-0 print:p-0">
        <InvoiceRenderer data={data} theme={theme} />
      </div>
    </div>
  );
}
