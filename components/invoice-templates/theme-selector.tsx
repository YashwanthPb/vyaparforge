"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ThemeSelectorProps<T extends string> {
  storageKey: string;
  themes: { value: T; label: string }[];
  defaultTheme: T;
  onThemeChange: (theme: T) => void;
}

export function ThemeSelector<T extends string>({
  storageKey,
  themes,
  defaultTheme,
  onThemeChange,
}: ThemeSelectorProps<T>) {
  const [selectedTheme, setSelectedTheme] = useState<T>(defaultTheme);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const saved = localStorage.getItem(storageKey);
    if (saved && themes.some((t) => t.value === saved)) {
      setSelectedTheme(saved as T);
      onThemeChange(saved as T);
    }
  }, [storageKey, themes, onThemeChange]);

  const handleChange = useCallback(
    (value: string) => {
      const theme = value as T;
      setSelectedTheme(theme);
      onThemeChange(theme);
      localStorage.setItem(storageKey, theme);
    },
    [storageKey, onThemeChange]
  );

  const handleDownloadPDF = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="flex items-center gap-3 print:hidden">
      <Select value={selectedTheme} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select template" />
        </SelectTrigger>
        <SelectContent>
          {themes.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="mr-2 size-4" />
        Print
      </Button>
      <Button variant="outline" onClick={handleDownloadPDF}>
        <Download className="mr-2 size-4" />
        Download PDF
      </Button>
    </div>
  );
}
