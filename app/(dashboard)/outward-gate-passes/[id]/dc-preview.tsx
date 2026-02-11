"use client";

import { useState, useCallback } from "react";
import { DCRenderer } from "@/components/invoice-templates/dc-renderer";
import { ThemeSelector } from "@/components/invoice-templates/theme-selector";
import type { DCTheme, DCData } from "@/components/invoice-templates/types";

const DC_THEMES: { value: DCTheme; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "modern", label: "Modern" },
];

export function DCPreview({ data }: { data: DCData }) {
  const [theme, setTheme] = useState<DCTheme>("classic");

  const handleThemeChange = useCallback((t: DCTheme) => {
    setTheme(t);
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <ThemeSelector<DCTheme>
          storageKey="vyaparforge-dc-theme"
          themes={DC_THEMES}
          defaultTheme="classic"
          onThemeChange={handleThemeChange}
        />
      </div>
      <div id="printable-area" className="print:m-0 print:p-0">
        <DCRenderer data={data} theme={theme} />
      </div>
    </div>
  );
}
