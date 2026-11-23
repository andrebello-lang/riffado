"use client";

import { useLibrary } from "@/components/library/library-context";
import { folderPath } from "@/lib/library/types";

const VIEW_TITLES = {
    all: "Todas as capturas",
    unfiled: "Sem pasta",
    derived: "Recortes",
    uploaded: "Enviadas",
} as const;

/** Breadcrumb + big title for the Biblioteca view the list is showing. */
export function LibraryViewTitle() {
    const lib = useLibrary();
    if (!lib) return null;
    const view = lib.view;
    let title: string = view.kind === "folder" ? "" : VIEW_TITLES[view.kind];
    let crumb = "Meus arquivos";
    if (view.kind === "folder") {
        const folder = lib.folders.find((f) => f.id === view.id);
        title = folder?.name ?? "Pasta";
        const path = folder ? folderPath(lib.folders, folder.id) : "";
        const parent = path.split(" › ").slice(0, -1).join(" › ");
        if (parent) crumb = `Meus arquivos › ${parent}`;
    }
    return (
        <div className="mb-3 space-y-0.5 px-1">
            <p className="text-xs text-muted-foreground">{crumb}</p>
            <h2 className="font-display text-2xl font-bold tracking-tight">
                {title}
            </h2>
        </div>
    );
}
