"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Receipt,
    FileOutput,
    Users,
    FileText,
    ArrowDownToLine,
    Loader2,
} from "lucide-react";
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandSeparator,
} from "@/components/ui/command";
import { globalSearch } from "@/lib/sidebar-actions";

type SearchResult = {
    id: string;
    title: string;
    subtitle: string;
    href: string;
    meta?: string;
};

type SearchResults = {
    invoices: SearchResult[];
    dcs: SearchResult[];
    parties: SearchResult[];
    pos: SearchResult[];
    gatePasses: SearchResult[];
};

export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResults>({
        invoices: [],
        dcs: [],
        parties: [],
        pos: [],
        gatePasses: [],
    });
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Ctrl+K / Cmd+K shortcut
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Debounced search
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults({ invoices: [], dcs: [], parties: [], pos: [], gatePasses: [] });
            return;
        }

        const timer = setTimeout(() => {
            startTransition(async () => {
                const data = await globalSearch(query);
                setResults(data);
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [query, startTransition]);

    const handleSelect = useCallback(
        (href: string) => {
            setOpen(false);
            setQuery("");
            router.push(href);
        },
        [router]
    );

    const totalResults =
        results.invoices.length +
        results.dcs.length +
        results.parties.length +
        results.pos.length +
        results.gatePasses.length;

    return (
        <CommandDialog
            open={open}
            onOpenChange={setOpen}
            title="Global Search"
            description="Search across invoices, challans, parties, POs, and gate passes."
        >
            <CommandInput
                placeholder="Search invoices, challans, parties, POs..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                {isPending ? (
                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Searching...
                    </div>
                ) : query.length >= 2 && totalResults === 0 ? (
                    <CommandEmpty>No results found for &ldquo;{query}&rdquo;</CommandEmpty>
                ) : null}

                {results.pos.length > 0 && (
                    <CommandGroup heading="Purchase Orders">
                        {results.pos.map((item) => (
                            <CommandItem
                                key={item.id}
                                value={`po-${item.title}`}
                                onSelect={() => handleSelect(item.href)}
                            >
                                <FileText className="mr-2 size-4" />
                                <div className="flex flex-col">
                                    <span className="font-medium">{item.title}</span>
                                    <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                                </div>
                                {item.meta && (
                                    <span className="ml-auto text-xs text-muted-foreground">{item.meta}</span>
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {results.invoices.length > 0 && (
                    <>
                        {results.pos.length > 0 && <CommandSeparator />}
                        <CommandGroup heading="Invoices">
                            {results.invoices.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={`inv-${item.title}`}
                                    onSelect={() => handleSelect(item.href)}
                                >
                                    <Receipt className="mr-2 size-4" />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{item.title}</span>
                                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                                    </div>
                                    {item.meta && (
                                        <span className="ml-auto text-xs text-muted-foreground">{item.meta}</span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                {results.dcs.length > 0 && (
                    <>
                        {(results.pos.length > 0 || results.invoices.length > 0) && <CommandSeparator />}
                        <CommandGroup heading="Delivery Challans">
                            {results.dcs.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={`dc-${item.title}`}
                                    onSelect={() => handleSelect(item.href)}
                                >
                                    <FileOutput className="mr-2 size-4" />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{item.title}</span>
                                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                                    </div>
                                    {item.meta && (
                                        <span className="ml-auto text-xs text-muted-foreground">{item.meta}</span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                {results.gatePasses.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Inward Gate Passes">
                            {results.gatePasses.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={`gp-${item.title}`}
                                    onSelect={() => handleSelect(item.href)}
                                >
                                    <ArrowDownToLine className="mr-2 size-4" />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{item.title}</span>
                                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                                    </div>
                                    {item.meta && (
                                        <span className="ml-auto text-xs text-muted-foreground">{item.meta}</span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                {results.parties.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Parties">
                            {results.parties.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={`party-${item.title}`}
                                    onSelect={() => handleSelect(item.href)}
                                >
                                    <Users className="mr-2 size-4" />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{item.title}</span>
                                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}
            </CommandList>
        </CommandDialog>
    );
}
