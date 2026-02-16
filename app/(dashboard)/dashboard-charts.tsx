"use client";

interface BarChartProps {
    data: { month: string; revenue: number }[];
    title: string;
}

interface ComparisonChartProps {
    data: { month: string; invoiced: number; collected: number }[];
}

function formatCompact(value: number): string {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value.toFixed(0)}`;
}

export function RevenueBarChart({ data, title }: BarChartProps) {
    const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

    return (
        <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-end gap-1.5 h-40">
                {data.map((item) => {
                    const heightPct = Math.max((item.revenue / maxRevenue) * 100, 2);
                    return (
                        <div
                            key={item.month}
                            className="flex-1 flex flex-col items-center gap-1 group"
                        >
                            <div className="relative w-full flex justify-center">
                                <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-foreground bg-popover border rounded px-1.5 py-0.5 shadow-sm whitespace-nowrap z-10">
                                    {formatCompact(item.revenue)}
                                </div>
                            </div>
                            <div
                                className="w-full rounded-t-sm bg-primary/80 hover:bg-primary transition-colors min-h-[2px]"
                                style={{ height: `${heightPct}%` }}
                            />
                            <span className="text-[9px] text-muted-foreground leading-tight">
                                {item.month}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function InvoiceVsPaymentChart({ data }: ComparisonChartProps) {
    const maxVal = Math.max(
        ...data.map((d) => Math.max(d.invoiced, d.collected)),
        1
    );

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-muted-foreground">Invoice vs Payment</p>
                <div className="flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-muted-foreground">Invoiced</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-muted-foreground">Collected</span>
                    </div>
                </div>
            </div>
            <div className="flex items-end gap-3 h-32">
                {data.map((item) => {
                    const invoicedPct = Math.max((item.invoiced / maxVal) * 100, 2);
                    const collectedPct = Math.max((item.collected / maxVal) * 100, 2);
                    return (
                        <div key={item.month} className="flex-1 flex flex-col items-center gap-1 group">
                            <div className="flex items-end gap-0.5 w-full justify-center">
                                <div
                                    className="flex-1 max-w-3 rounded-t-sm bg-blue-500/80 hover:bg-blue-500 transition-colors"
                                    style={{ height: `${invoicedPct}%` }}
                                    title={`Invoiced: ${formatCompact(item.invoiced)}`}
                                />
                                <div
                                    className="flex-1 max-w-3 rounded-t-sm bg-green-500/80 hover:bg-green-500 transition-colors"
                                    style={{ height: `${collectedPct}%` }}
                                    title={`Collected: ${formatCompact(item.collected)}`}
                                />
                            </div>
                            <span className="text-[9px] text-muted-foreground">{item.month}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
