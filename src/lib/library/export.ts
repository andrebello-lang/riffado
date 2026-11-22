import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { libraryFolders } from "@/db/schema-garrido";
import { loadLibrary } from "@/lib/library/server";
import { folderPath, sortFolders } from "@/lib/library/types";

/** One Biblioteca folder as written to backups and exports. */
export interface ExportedFolder {
    id: string;
    parentId: string | null;
    name: string;
    /** Full path, e.g. "Visitação › Julliany". */
    path: string;
    color: string;
    icon: string;
    createdAt: string;
    /** True when the folder was imported from Plaud. */
    fromPlaud: boolean;
}

export interface LibraryExport {
    folders: ExportedFolder[];
    /** Folder of a recording ({ id, path }), or null for "Sem pasta". */
    folderOf: (recordingId: string) => { id: string; path: string } | null;
}

/** Visible folders and recording placements for one user, decrypted. */
export async function loadLibraryExport(
    userId: string,
): Promise<LibraryExport> {
    const [library, plaudRows] = await Promise.all([
        loadLibrary(userId),
        db
            .select({
                id: libraryFolders.id,
                plaudNodeId: libraryFolders.plaudNodeId,
            })
            .from(libraryFolders)
            .where(
                and(
                    eq(libraryFolders.userId, userId),
                    isNull(libraryFolders.hiddenAt),
                ),
            ),
    ]);
    const fromPlaud = new Set(
        plaudRows.filter((r) => r.plaudNodeId).map((r) => r.id),
    );
    const paths = new Map(
        library.folders.map((f) => [f.id, folderPath(library.folders, f.id)]),
    );

    const folders: ExportedFolder[] = sortFolders(library.folders)
        .map((f) => ({
            id: f.id,
            parentId: f.parentId,
            name: f.name,
            path: paths.get(f.id) ?? f.name,
            color: f.color,
            icon: f.icon,
            createdAt: f.createdAt,
            fromPlaud: fromPlaud.has(f.id),
        }))
        .sort((a, b) => a.path.localeCompare(b.path, "pt-BR"));

    return {
        folders,
        folderOf: (recordingId) => {
            const id = library.assignments[recordingId];
            const path = id ? paths.get(id) : undefined;
            return id && path ? { id, path } : null;
        },
    };
}
