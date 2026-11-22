/** Client-safe library ("Biblioteca") types and pure helpers. */

/** Same seven colors as the Plaud app's "Escolher um ícone" sheet. */
export const FOLDER_COLORS = [
    "gray",
    "blue",
    "green",
    "yellow",
    "teal",
    "red",
    "pink",
] as const;
export type FolderColor = (typeof FOLDER_COLORS)[number];

export const FOLDER_COLOR_LABELS: Record<FolderColor, string> = {
    gray: "Cinza",
    blue: "Azul",
    green: "Verde",
    yellow: "Amarelo",
    teal: "Turquesa",
    red: "Salmão",
    pink: "Rosa",
};

/** Tailwind text color for the folder icon (icons use currentColor). */
export const FOLDER_COLOR_CLASSES: Record<FolderColor, string> = {
    gray: "text-zinc-400",
    blue: "text-sky-500",
    green: "text-green-500",
    yellow: "text-yellow-500",
    teal: "text-teal-400",
    red: "text-red-400",
    pink: "text-pink-400",
};

/** Swatch background for the color picker. */
export const FOLDER_COLOR_SWATCHES: Record<FolderColor, string> = {
    gray: "bg-zinc-400",
    blue: "bg-sky-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    teal: "bg-teal-400",
    red: "bg-red-400",
    pink: "bg-pink-400",
};

export const DEFAULT_FOLDER_COLOR: FolderColor = "gray";

/**
 * Glyphs offered in the icon picker (kebab-case keys, rendered with
 * lucide-react in components/library/folder-icon.tsx). Modelled on the
 * Plaud picker plus a few pharmacy-specific ones.
 */
export const FOLDER_ICONS = [
    "folder",
    "book-open",
    "gamepad-2",
    "users",
    "phone-call",
    "heart",
    "award",
    "message-square-more",
    "file-text",
    "cloud",
    "house",
    "globe",
    "mic",
    "id-card",
    "camera",
    "video",
    "music",
    "star",
    "user",
    "tag",
    "database",
    "circle-user",
    "folder-up",
    "list",
    "clipboard-list",
    "list-checks",
    "syringe",
    "heart-pulse",
    "stethoscope",
    "map-pin",
    "image",
    "mountain",
    "flower-2",
    "briefcase",
    "car",
    "calendar",
    "history",
    "app-window",
    "chart-column",
    "scale",
    "shapes",
    "smile",
    "audio-lines",
    "contact",
    "user-round-pen",
    "file-user",
    "user-check",
    "users-round",
    "hand-heart",
    "lightbulb",
    "user-plus",
    "file-signature",
    "receipt",
    "notebook-pen",
    "square-arrow-down",
    "sliders-horizontal",
    "gavel",
    "columns-3",
    "pencil-ruler",
    "pill",
    "flask-conical",
    "graduation-cap",
    "presentation",
    "store",
    "megaphone",
    "handshake",
    "trending-up",
] as const;
export type FolderIconKey = (typeof FOLDER_ICONS)[number];
export const DEFAULT_FOLDER_ICON: FolderIconKey = "folder";

export function isFolderIcon(value: unknown): value is FolderIconKey {
    return (
        typeof value === "string" &&
        (FOLDER_ICONS as readonly string[]).includes(value)
    );
}

export const MAX_FOLDER_NAME_LENGTH = 120;
export const MAX_FOLDER_DEPTH = 6;

export function isFolderColor(value: unknown): value is FolderColor {
    return (
        typeof value === "string" &&
        (FOLDER_COLORS as readonly string[]).includes(value)
    );
}

export interface LibraryFolder {
    id: string;
    parentId: string | null;
    name: string;
    color: FolderColor;
    icon: FolderIconKey;
    sortOrder: number;
    createdAt: string;
}

export interface LibraryData {
    folders: LibraryFolder[];
    /** recordingId -> folderId. Missing = "Sem pasta". */
    assignments: Record<string, string>;
    /** Recordings that did not come from Plaud: cuts and manual uploads. */
    origins: Record<string, "derived" | "uploaded">;
}

/** Built-in views shown above the user's folders. */
export type LibraryView =
    | { kind: "all" }
    | { kind: "unfiled" }
    | { kind: "derived" }
    | { kind: "uploaded" }
    | { kind: "folder"; id: string };

/** The folder itself plus every folder beneath it. */
export function descendantIds(
    folders: readonly LibraryFolder[],
    rootId: string,
): Set<string> {
    const byParent = new Map<string, string[]>();
    for (const f of folders) {
        if (!f.parentId) continue;
        const list = byParent.get(f.parentId) ?? [];
        list.push(f.id);
        byParent.set(f.parentId, list);
    }
    const out = new Set<string>([rootId]);
    const stack = [rootId];
    while (stack.length > 0) {
        const id = stack.pop() as string;
        for (const child of byParent.get(id) ?? []) {
            if (!out.has(child)) {
                out.add(child);
                stack.push(child);
            }
        }
    }
    return out;
}

/** Depth of a folder (root folders are 1). */
export function folderDepth(
    folders: readonly LibraryFolder[],
    id: string | null,
): number {
    const byId = new Map(folders.map((f) => [f.id, f]));
    let depth = 0;
    let cur = id ? byId.get(id) : undefined;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        depth++;
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return depth;
}

/** "Pasta › Subpasta" path for a folder. */
export function folderPath(
    folders: readonly LibraryFolder[],
    id: string,
): string {
    const byId = new Map(folders.map((f) => [f.id, f]));
    const parts: string[] = [];
    let cur = byId.get(id);
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        parts.unshift(cur.name);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return parts.join(" › ");
}

/** Folders sorted for display: sortOrder, then name (pt-BR collation). */
export function sortFolders<T extends LibraryFolder>(folders: T[]): T[] {
    return [...folders].sort(
        (a, b) =>
            a.sortOrder - b.sortOrder ||
            a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    );
}
