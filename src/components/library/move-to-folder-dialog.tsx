"use client";

import { Check, FolderPlus, Inbox, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FolderIcon } from "@/components/library/folder-icon";
import { FolderNameDialog } from "@/components/library/folder-name-dialog";
import { useLibrary } from "@/components/library/library-context";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { type LibraryFolder, sortFolders } from "@/lib/library/types";
import { cn } from "@/lib/utils";

interface Row {
    folder: LibraryFolder;
    depth: number;
}

export function flattenTree(folders: LibraryFolder[]): Row[] {
    const byParent = new Map<string | null, LibraryFolder[]>();
    for (const f of folders) {
        const key = f.parentId ?? null;
        byParent.set(key, [...(byParent.get(key) ?? []), f]);
    }
    const out: Row[] = [];
    const walk = (parent: string | null, depth: number) => {
        for (const f of sortFolders(byParent.get(parent) ?? [])) {
            out.push({ folder: f, depth });
            walk(f.id, depth + 1);
        }
    };
    walk(null, 0);
    return out;
}

/** "Mover para…": choose a folder (or Sem pasta) for one or more recordings. */
export function MoveToFolderDialog({
    recordingIds,
    onClose,
}: {
    recordingIds: string[] | null;
    onClose: () => void;
}) {
    const library = useLibrary();
    const open = recordingIds !== null && recordingIds.length > 0;
    const current =
        open && library && recordingIds.length === 1
            ? (library.assignments[recordingIds[0]] ?? null)
            : undefined;
    const [target, setTarget] = useState<string | null | undefined>(undefined);
    const [busy, setBusy] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (open) setTarget(current);
    }, [open, current]);

    const rows = useMemo(
        () => (library ? flattenTree(library.folders) : []),
        [library],
    );

    if (!library) return null;

    const confirm = async () => {
        if (!recordingIds || target === undefined) return;
        setBusy(true);
        await library.moveRecordings(recordingIds, target);
        setBusy(false);
        onClose();
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Mover para pasta</DialogTitle>
                        <DialogDescription>
                            {recordingIds && recordingIds.length > 1
                                ? `${recordingIds.length} gravações selecionadas`
                                : "Escolha onde guardar esta gravação."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-80 overflow-y-auto rounded-md border">
                        <button
                            type="button"
                            onClick={() => setTarget(null)}
                            className={cn(
                                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                                target === null && "bg-accent",
                            )}
                        >
                            <Inbox className="size-4 text-muted-foreground" />
                            <span className="flex-1">Sem pasta</span>
                            {target === null && <Check className="size-4" />}
                        </button>
                        {rows.map(({ folder, depth }) => (
                            <button
                                key={folder.id}
                                type="button"
                                onClick={() => setTarget(folder.id)}
                                className={cn(
                                    "flex w-full items-center gap-2 py-2 pr-3 text-left text-sm hover:bg-accent",
                                    target === folder.id && "bg-accent",
                                )}
                                style={{ paddingLeft: 12 + depth * 18 }}
                            >
                                <FolderIcon
                                    color={folder.color}
                                    icon={folder.icon}
                                />
                                <span className="flex-1 truncate">
                                    {folder.name}
                                </span>
                                {folder.id === current && (
                                    <span className="text-xs text-muted-foreground">
                                        atual
                                    </span>
                                )}
                                {target === folder.id && (
                                    <Check className="size-4" />
                                )}
                            </button>
                        ))}
                    </div>
                    <DialogFooter className="sm:justify-between">
                        <Button
                            variant="ghost"
                            onClick={() => setCreating(true)}
                            disabled={busy}
                        >
                            <FolderPlus className="size-4" /> Nova pasta
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                disabled={busy}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => void confirm()}
                                disabled={
                                    busy ||
                                    target === undefined ||
                                    target === current
                                }
                            >
                                {busy && (
                                    <Loader2 className="size-4 animate-spin" />
                                )}
                                Mover
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <FolderNameDialog
                open={creating}
                title="Criar nova pasta"
                description={
                    target
                        ? "Será criada dentro da pasta selecionada."
                        : "Será criada em Meus arquivos."
                }
                onClose={() => setCreating(false)}
                onSubmit={async (name, look) => {
                    const id = await library.createFolder(
                        name,
                        target ?? null,
                        look,
                    );
                    if (id) setTarget(id);
                    return id !== null;
                }}
            />
        </>
    );
}
