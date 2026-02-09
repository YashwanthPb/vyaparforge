import * as XLSX from "xlsx";

export interface ColumnDef {
  header: string;
  key: string;
  width?: number;
  format?: "currency" | "date" | "number";
}

interface ExportOptions {
  data: Record<string, unknown>[];
  columns: ColumnDef[];
  filename: string;
  summaryRow?: Record<string, unknown>;
  sheetName?: string;
}

function formatIndianCurrency(value: number): string {
  return (
    "\u20B9" +
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  );
}

function formatDateDDMMYYYY(date: Date | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatCellValue(
  value: unknown,
  format?: "currency" | "date" | "number"
): string | number {
  if (value === null || value === undefined) return "";
  if (format === "currency") {
    return formatIndianCurrency(Number(value));
  }
  if (format === "date") {
    return formatDateDDMMYYYY(value as string | Date);
  }
  if (format === "number") {
    return Number(value);
  }
  return String(value);
}

export function exportToExcel({
  data,
  columns,
  filename,
  summaryRow,
  sheetName = "Report",
}: ExportOptions): void {
  const headers = columns.map((col) => col.header);

  const rows = data.map((row) =>
    columns.map((col) => formatCellValue(row[col.key], col.format))
  );

  if (summaryRow) {
    rows.push(
      columns.map((col) => {
        const val = summaryRow[col.key];
        if (val !== undefined && val !== null) {
          return formatCellValue(val, col.format);
        }
        return "";
      })
    );
  }

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = columns.map((col) => ({ wch: col.width ?? 16 }));

  // Style header row - bold with light blue background
  const headerRange = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "DBEAFE" } },
        alignment: { horizontal: "center" },
      };
    }
  }

  // Style summary row if present - bold
  if (summaryRow) {
    const lastRow = rows.length; // 0-indexed header + data rows = lastRow is summary
    for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: lastRow, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "F3F4F6" } },
        };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  XLSX.writeFile(wb, `${filename}.xlsx`);
}
