"use client";

import { ArrowDownAZ, Rows3, Search, X } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export type SortOrder = "newest" | "oldest" | "name";
export type ListDensity = "comfortable" | "compact";

export function RecordingListToolbar({
    query,
    onQueryChange,
    onEnterSelectFirst,
    searchRef,
    filteredCount,
    totalCount,
    sortOrder,
    onSortOrderChange,
    density,
    onDensityChange,
}: {
    query: string;
    onQueryChange: (next: string) => void;
    onEnterSelectFirst: () => void;
    searchRef: React.RefObject<HTMLInputElement | null>;
    filteredCount: number;
    totalCount: number;
    sortOrder: SortOrder;
    onSortOrderChange: (next: SortOrder) => void;
    density: ListDensity;
    onDensityChange: (next: ListDensity) => void;
}) {
    return (
        <div className="mb-2 flex flex-col gap-2">
            <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            onEnterSelectFirst();
                        }
                    }}
                    placeholder="Buscar capturas e transcrições..."
                    className="h-9 pl-8 pr-8"
                    aria-label="Buscar capturas"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => onQueryChange("")}
                        aria-label="Limpar busca"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                    {query
                        ? `${filteredCount} de ${totalCount} ${totalCount !== 1 ? "capturas" : "captura"}`
                        : `${totalCount} ${totalCount !== 1 ? "capturas" : "captura"}`}
                </span>
                <div className="flex items-center gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                aria-label="Ordenar"
                            >
                                <ArrowDownAZ className="size-3.5" />
                                <span>
                                    {sortOrder === "newest"
                                        ? "Mais recentes"
                                        : sortOrder === "oldest"
                                          ? "Mais antigas"
                                          : "Nome"}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                                value={sortOrder}
                                onValueChange={(v) =>
                                    onSortOrderChange(v as SortOrder)
                                }
                            >
                                <DropdownMenuRadioItem value="newest">
                                    Mais recentes primeiro
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="oldest">
                                    Mais antigas primeiro
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="name">
                                    Name
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                aria-label="Densidade"
                            >
                                <Rows3 className="size-3.5" />
                                <span>
                                    {density === "compact"
                                        ? "Compacta"
                                        : "Confortável"}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Densidade</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                                value={density}
                                onValueChange={(v) =>
                                    onDensityChange(v as ListDensity)
                                }
                            >
                                <DropdownMenuRadioItem value="comfortable">
                                    Comfortable
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="compact">
                                    Compact
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}
