"use client";

import { useRouter } from "next/navigation";
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { toast } from "sonner";
import { MoveToFolderDialog } from "@/components/library/move-to-folder-dialog";
import {
    descendantIds,
    type FolderColor,
    type FolderIconKey,
    type LibraryData,
    type LibraryFolder,
    type LibraryView,
} from "@/lib/library/types";

/** dataTransfer type used when dragging recording rows onto folders. */
export const RECORDING_DRAG_TYPE = "application/x-riffado-recording";

interface LibraryContextValue {
    folders: LibraryFolder[];
    assignments: Record<string, string>;
    origins: LibraryData["origins"];
    view: LibraryView;
    setView: (view: LibraryView) => void;
    /** Recording ids that the current view shows (null = no filter). */
    viewFilter: ((recordingId: string) => boolean) | null;
    /** Recordings per folder, counting subfolders. */
    countFor: (view: LibraryView) => number;
    moveRecordings: (ids: string[], folderId: string | null) => Promise<void>;
    openMoveDialog: (ids: string[]) => void;
    createFolder: (
        name: string,
        parentId: string | null,
        look?: { color: FolderColor; icon: FolderIconKey },
    ) => Promise<string | null>;
    updateFolder: (
        id: string,
        patch: {
            name?: string;
            color?: FolderColor;
            icon?: FolderIconKey;
            parentId?: string | null;
        },
    ) => Promise<boolean>;
    deleteFolder: (id: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

/** Library state, or null outside the dashboard (e.g. /recordings/[id]). */
export function useLibrary(): LibraryContextValue | null {
    return useContext(LibraryContext);
}

async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.error ?? `Erro ${res.status}`);
    }
    return data;
}

export function LibraryProvider({
    library,
    recordingIds,
    children,
}: {
    library: LibraryData;
    /** Ids of the (non-deleted) recordings the dashboard knows about. */
    recordingIds: string[];
    children: ReactNode;
}) {
    const router = useRouter();
    const [view, setView] = useState<LibraryView>({ kind: "all" });
    // Optimistic placements, cleared whenever fresh server data arrives.
    const [pending, setPending] = useState<Record<string, string | null>>({});
    const [moveIds, setMoveIds] = useState<string[] | null>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: reset whenever fresh server data arrives
    useEffect(() => {
        setPending({});
    }, [library]);

    // If the selected folder disappears (deleted elsewhere), fall back.
    useEffect(() => {
        if (
            view.kind === "folder" &&
            !library.folders.some((f) => f.id === view.id)
        ) {
            setView({ kind: "all" });
        }
    }, [library.folders, view]);

    const assignments = useMemo(() => {
        const out = { ...library.assignments };
        for (const [id, folderId] of Object.entries(pending)) {
            if (folderId === null) delete out[id];
            else out[id] = folderId;
        }
        return out;
    }, [library.assignments, pending]);

    const matcher = useCallback(
        (v: LibraryView): ((id: string) => boolean) | null => {
            switch (v.kind) {
                case "all":
                    return null;
                case "unfiled":
                    return (id) => !assignments[id];
                case "derived":
                    return (id) => library.origins[id] === "derived";
                case "uploaded":
                    return (id) => library.origins[id] === "uploaded";
                case "folder": {
                    const ids = descendantIds(library.folders, v.id);
                    return (id) => {
                        const f = assignments[id];
                        return f !== undefined && ids.has(f);
                    };
                }
            }
        },
        [assignments, library.folders, library.origins],
    );

    const countFor = useCallback(
        (v: LibraryView) => {
            const m = matcher(v);
            return m ? recordingIds.filter(m).length : recordingIds.length;
        },
        [matcher, recordingIds],
    );

    const moveRecordings = useCallback(
        async (ids: string[], folderId: string | null) => {
            setPending((p) => {
                const next = { ...p };
                for (const id of ids) next[id] = folderId;
                return next;
            });
            try {
                await call("/api/library/move", "POST", {
                    recordingIds: ids,
                    folderId,
                });
                const name = folderId
                    ? library.folders.find((f) => f.id === folderId)?.name
                    : "Sem pasta";
                toast.success(
                    ids.length === 1
                        ? `Movida para ${name}`
                        : `${ids.length} gravações movidas para ${name}`,
                );
                router.refresh();
            } catch (err) {
                setPending((p) => {
                    const next = { ...p };
                    for (const id of ids) delete next[id];
                    return next;
                });
                toast.error(
                    err instanceof Error ? err.message : "Falha ao mover",
                );
            }
        },
        [library.folders, router],
    );

    const createFolder = useCallback(
        async (
            name: string,
            parentId: string | null,
            look?: { color: FolderColor; icon: FolderIconKey },
        ) => {
            try {
                const data = await call("/api/library/folders", "POST", {
                    name,
                    parentId,
                    color: look?.color,
                    icon: look?.icon,
                });
                router.refresh();
                return data.id as string;
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : "Falha ao criar pasta",
                );
                return null;
            }
        },
        [router],
    );

    const updateFolder = useCallback(
        async (
            id: string,
            patch: {
                name?: string;
                color?: FolderColor;
                icon?: FolderIconKey;
                parentId?: string | null;
            },
        ) => {
            try {
                await call(`/api/library/folders/${id}`, "PATCH", patch);
                router.refresh();
                return true;
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "Falha ao alterar pasta",
                );
                return false;
            }
        },
        [router],
    );

    const deleteFolder = useCallback(
        async (id: string) => {
            await call(`/api/library/folders/${id}`, "DELETE");
            toast.success("Pasta excluída. As gravações foram para Sem pasta.");
            router.refresh();
        },
        [router],
    );

    const value = useMemo<LibraryContextValue>(
        () => ({
            folders: library.folders,
            assignments,
            origins: library.origins,
            view,
            setView,
            viewFilter: matcher(view),
            countFor,
            moveRecordings,
            openMoveDialog: setMoveIds,
            createFolder,
            updateFolder,
            deleteFolder,
        }),
        [
            library.folders,
            library.origins,
            assignments,
            view,
            matcher,
            countFor,
            moveRecordings,
            createFolder,
            updateFolder,
            deleteFolder,
        ],
    );

    return (
        <LibraryContext.Provider value={value}>
            {children}
            <MoveToFolderDialog
                recordingIds={moveIds}
                onClose={() => setMoveIds(null)}
            />
        </LibraryContext.Provider>
    );
}
