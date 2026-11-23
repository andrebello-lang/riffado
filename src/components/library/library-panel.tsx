"use client";

import {
    ChevronDown,
    ChevronRight,
    FolderInput,
    FolderPlus,
    Inbox,
    Layers,
    MoreHorizontal,
    Pencil,
    Scissors,
    Trash2,
    Upload,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { FolderIcon } from "@/components/library/folder-icon";
import { FolderNameDialog } from "@/components/library/folder-name-dialog";
import {
    RECORDING_DRAG_TYPE,
    useLibrary,
} from "@/components/library/library-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    DEFAULT_FOLDER_COLOR,
    DEFAULT_FOLDER_ICON,
    descendantIds,
    type LibraryFolder,
    type LibraryView,
    sortFolders,
} from "@/lib/library/types";
import { cn } from "@/lib/utils";

function sameView(a: LibraryView, b: LibraryView) {
    return (
        a.kind === b.kind &&
        (a.kind !== "folder" || (b.kind === "folder" && a.id === b.id))
    );
}

function itemsLabel(n: number) {
    return `${n} ${n === 1 ? "item" : "itens"}`;
}

/** Shared drop-target behaviour for folder rows and "Sem pasta". */
function useDropTarget(onDropIds: (ids: string[]) => void) {
    const [over, setOver] = useState(false);
    return {
        over,
        handlers: {
            onDragOver: (e: React.DragEvent) => {
                if (!e.dataTransfer.types.includes(RECORDING_DRAG_TYPE)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOver(true);
            },
            onDragLeave: () => setOver(false),
            onDrop: (e: React.DragEvent) => {
                setOver(false);
                const raw = e.dataTransfer.getData(RECORDING_DRAG_TYPE);
                if (!raw) return;
                e.preventDefault();
                onDropIds(raw.split(",").filter(Boolean));
            },
        },
    };
}

function ViewRow({
    icon,
    label,
    count,
    active,
    onClick,
    dropTo,
}: {
    icon: ReactNode;
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
    dropTo?: (ids: string[]) => void;
}) {
    const drop = useDropTarget((ids) => dropTo?.(ids));
    return (
        <button
            type="button"
            onClick={onClick}
            {...(dropTo ? drop.handlers : {})}
            className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/60",
                active && "bg-accent font-medium",
                drop.over && "ring-2 ring-primary",
            )}
        >
            {icon}
            <span className="flex-1 truncate">{label}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
                {count}
            </span>
        </button>
    );
}

function FolderNode({
    folder,
    depth,
    childrenOf,
    expanded,
    toggle,
    onRename,
    onNewSub,
    onMoveFolder,
}: {
    folder: LibraryFolder;
    depth: number;
    childrenOf: (id: string) => LibraryFolder[];
    expanded: Set<string>;
    toggle: (id: string) => void;
    onRename: (f: LibraryFolder) => void;
    onNewSub: (f: LibraryFolder) => void;
    onMoveFolder: (f: LibraryFolder, parentId: string | null) => void;
}) {
    // biome-ignore lint/style/noNonNullAssertion: rendered inside provider
    const lib = useLibrary()!;
    const confirm = useConfirm();
    const kids = childrenOf(folder.id);
    const isOpen = expanded.has(folder.id);
    const view: LibraryView = { kind: "folder", id: folder.id };
    const active = sameView(lib.view, view);
    const count = lib.countFor(view);
    const drop = useDropTarget((ids) => lib.moveRecordings(ids, folder.id));
    const created = new Date(folder.createdAt).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
    const blocked = descendantIds(lib.folders, folder.id);
    const moveTargets = sortFolders(
        lib.folders.filter((f) => !blocked.has(f.id)),
    );

    return (
        <div>
            <div
                {...drop.handlers}
                className={cn(
                    "group/folder flex items-center gap-1 rounded-md pr-1 transition-colors hover:bg-accent/60",
                    active && "bg-accent",
                    drop.over && "ring-2 ring-primary",
                )}
                style={{ paddingLeft: depth * 16 }}
            >
                <button
                    type="button"
                    onClick={() => toggle(folder.id)}
                    className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground",
                        kids.length === 0 && "invisible",
                    )}
                    aria-label={isOpen ? "Recolher" : "Expandir"}
                >
                    {isOpen ? (
                        <ChevronDown className="size-4" />
                    ) : (
                        <ChevronRight className="size-4" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => lib.setView(view)}
                    onDoubleClick={() => toggle(folder.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
                >
                    <FolderIcon
                        color={folder.color}
                        icon={folder.icon}
                        open={isOpen && kids.length > 0}
                        className="size-6"
                    />
                    <span className="min-w-0 flex-1">
                        <span
                            className={cn(
                                "block truncate text-sm",
                                active && "font-medium",
                            )}
                        >
                            {folder.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                            {created} · {itemsLabel(count)}
                        </span>
                    </span>
                </button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover/folder:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                            aria-label="Ações da pasta"
                        >
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onNewSub(folder)}>
                            <FolderPlus /> Nova subpasta
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onRename(folder)}>
                            <Pencil /> Editar pasta
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <FolderInput className="size-4" /> Mover pasta
                                para
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                                {folder.parentId && (
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            onMoveFolder(folder, null)
                                        }
                                    >
                                        <Layers /> Meus arquivos (raiz)
                                    </DropdownMenuItem>
                                )}
                                {moveTargets
                                    .filter((f) => f.id !== folder.parentId)
                                    .map((f) => (
                                        <DropdownMenuItem
                                            key={f.id}
                                            onSelect={() =>
                                                onMoveFolder(folder, f.id)
                                            }
                                        >
                                            <FolderIcon
                                                color={f.color}
                                                icon={f.icon}
                                                className="size-4"
                                            />
                                            {f.name}
                                        </DropdownMenuItem>
                                    ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={(e) => {
                                e.preventDefault();
                                void confirm({
                                    title: "Excluir esta pasta?",
                                    description: (
                                        <>
                                            <span className="font-medium text-foreground">
                                                {folder.name}
                                            </span>
                                            {kids.length > 0 &&
                                                " e suas subpastas"}
                                            <br />
                                            Nenhuma gravação é apagada: as{" "}
                                            {itemsLabel(count)} voltam para "Sem
                                            pasta".
                                        </>
                                    ),
                                    confirmLabel: "Excluir pasta",
                                    pendingLabel: "Excluindo…",
                                    destructive: true,
                                    onConfirm: () =>
                                        lib.deleteFolder(folder.id),
                                });
                            }}
                        >
                            <Trash2 /> Excluir pasta
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {isOpen &&
                kids.map((k) => (
                    <FolderNode
                        key={k.id}
                        folder={k}
                        depth={depth + 1}
                        childrenOf={childrenOf}
                        expanded={expanded}
                        toggle={toggle}
                        onRename={onRename}
                        onNewSub={onNewSub}
                        onMoveFolder={onMoveFolder}
                    />
                ))}
        </div>
    );
}

/**
 * "Biblioteca" panel: built-in views (Todas, Sem pasta, Recortes,
 * Enviadas) plus the user's nested, colored folders. Selecting an entry
 * filters the recording list; recordings can be dropped onto folders.
 */
export function LibraryPanel({
    variant = "card",
}: {
    /** "sidebar": flat column for the desktop layout; "card": stacked above the list. */
    variant?: "card" | "sidebar";
} = {}) {
    const isSidebar = variant === "sidebar";
    const lib = useLibrary();
    const [collapsed, setCollapsed] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [dialog, setDialog] = useState<
        | { mode: "create"; parent: LibraryFolder | null }
        | { mode: "rename"; folder: LibraryFolder }
        | null
    >(null);

    const childrenOf = useMemo(() => {
        const map = new Map<string | null, LibraryFolder[]>();
        for (const f of lib?.folders ?? []) {
            const key = f.parentId ?? null;
            map.set(key, [...(map.get(key) ?? []), f]);
        }
        return (id: string | null) => sortFolders(map.get(id) ?? []);
    }, [lib?.folders]);

    if (!lib) return null;

    const toggle = (id: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const derivedCount = lib.countFor({ kind: "derived" });
    const uploadedCount = lib.countFor({ kind: "uploaded" });
    const roots = childrenOf(null);
    const activeFolderName =
        lib.view.kind === "folder"
            ? lib.folders.find(
                  (f) => lib.view.kind === "folder" && f.id === lib.view.id,
              )?.name
            : null;

    return (
        <Card
            className={cn(
                "mb-4 gap-0 py-3",
                isSidebar && "mb-0 border-0 bg-transparent py-0 shadow-none",
            )}
        >
            <div className="flex items-center gap-1 px-3 pb-1">
                <button
                    type="button"
                    onClick={() => setCollapsed((c) => !c)}
                    className="flex min-w-0 flex-1 items-center gap-1 text-left"
                    aria-expanded={!collapsed}
                >
                    {collapsed ? (
                        <ChevronRight className="size-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                    <span
                        className={cn(
                            "text-base font-semibold",
                            isSidebar &&
                                "text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase",
                        )}
                    >
                        Meus arquivos
                    </span>
                    {collapsed && activeFolderName && (
                        <span className="ml-2 truncate text-xs text-muted-foreground">
                            · {activeFolderName}
                        </span>
                    )}
                </button>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDialog({ mode: "create", parent: null })}
                    aria-label="Nova pasta"
                    title="Nova pasta"
                >
                    <FolderPlus className="size-4" />
                </Button>
            </div>

            {!collapsed && (
                <div
                    className={cn(
                        "space-y-0.5 px-2",
                        !isSidebar && "max-h-[45vh] overflow-y-auto",
                    )}
                >
                    <ViewRow
                        icon={
                            <Layers className="size-4 text-muted-foreground" />
                        }
                        label="Todas as capturas"
                        count={lib.countFor({ kind: "all" })}
                        active={lib.view.kind === "all"}
                        onClick={() => lib.setView({ kind: "all" })}
                    />
                    <ViewRow
                        icon={
                            <Inbox className="size-4 text-muted-foreground" />
                        }
                        label="Sem pasta"
                        count={lib.countFor({ kind: "unfiled" })}
                        active={lib.view.kind === "unfiled"}
                        onClick={() => lib.setView({ kind: "unfiled" })}
                        dropTo={(ids) => void lib.moveRecordings(ids, null)}
                    />
                    {derivedCount > 0 && (
                        <ViewRow
                            icon={
                                <Scissors className="size-4 text-muted-foreground" />
                            }
                            label="Recortes"
                            count={derivedCount}
                            active={lib.view.kind === "derived"}
                            onClick={() => lib.setView({ kind: "derived" })}
                        />
                    )}
                    {uploadedCount > 0 && (
                        <ViewRow
                            icon={
                                <Upload className="size-4 text-muted-foreground" />
                            }
                            label="Enviadas"
                            count={uploadedCount}
                            active={lib.view.kind === "uploaded"}
                            onClick={() => lib.setView({ kind: "uploaded" })}
                        />
                    )}

                    <div className="my-2 border-t" />

                    {roots.length === 0 ? (
                        <button
                            type="button"
                            onClick={() =>
                                setDialog({ mode: "create", parent: null })
                            }
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        >
                            <FolderPlus className="size-4" />
                            Criar a primeira pasta
                        </button>
                    ) : (
                        roots.map((f) => (
                            <FolderNode
                                key={f.id}
                                folder={f}
                                depth={0}
                                childrenOf={childrenOf}
                                expanded={expanded}
                                toggle={toggle}
                                onRename={(folder) =>
                                    setDialog({ mode: "rename", folder })
                                }
                                onNewSub={(parent) =>
                                    setDialog({ mode: "create", parent })
                                }
                                onMoveFolder={(folder, parentId) =>
                                    void lib.updateFolder(folder.id, {
                                        parentId,
                                    })
                                }
                            />
                        ))
                    )}
                    <p className="px-2 pt-2 text-[11px] text-muted-foreground">
                        Dica: arraste uma gravação da lista até uma pasta.
                    </p>
                </div>
            )}

            <FolderNameDialog
                open={dialog !== null}
                title={
                    dialog?.mode === "rename"
                        ? "Editar pasta"
                        : dialog?.parent
                          ? `Nova subpasta em ${dialog.parent.name}`
                          : "Criar nova pasta"
                }
                initialName={
                    dialog?.mode === "rename" ? dialog.folder.name : ""
                }
                initialColor={
                    dialog?.mode === "rename"
                        ? dialog.folder.color
                        : (dialog?.parent?.color ?? DEFAULT_FOLDER_COLOR)
                }
                initialIcon={
                    dialog?.mode === "rename"
                        ? dialog.folder.icon
                        : DEFAULT_FOLDER_ICON
                }
                onClose={() => setDialog(null)}
                onSubmit={async (name, look) => {
                    if (!dialog) return false;
                    if (dialog.mode === "rename") {
                        return lib.updateFolder(dialog.folder.id, {
                            name,
                            ...look,
                        });
                    }
                    const parentId = dialog.parent?.id ?? null;
                    const id = await lib.createFolder(name, parentId, look);
                    if (id && parentId) {
                        setExpanded((prev) => new Set(prev).add(parentId));
                    }
                    return id !== null;
                }}
            />
        </Card>
    );
}
