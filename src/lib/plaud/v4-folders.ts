import type {
    PlaudV4FolderRef,
    PlaudV4Node,
    PlaudV4RecordingItem,
} from "@/types/plaud";
import { plaudV4FileIdToRecordingId } from "./v4";

/** A user-created Plaud folder (system folders excluded). */
export interface PlaudUserFolder {
    nodeId: string;
    parentNodeId: string | null;
    name: string;
    /** Raw Plaud color key without the "folder-color-" prefix, e.g. "blue". */
    color: string;
    createdAtMs: number | null;
}

export interface PlaudFolderLayout {
    /** Parents always come before their children. */
    folders: PlaudUserFolder[];
    /** Riffado recording id (plaudFileId) -> user folder node id, or null for system folders. */
    placements: Map<string, string | null>;
}

const MAX_FOLDERS = 500;

/**
 * Build the user's Plaud 4.0 folder tree and where each recording sits.
 *
 * In Plaud 4.0 every recording lives in its own per-recording folder (the
 * item's `parent_id`), which in turn sits in the folder the user sees
 * (`parent_folder`). A cut made in the Plaud app is placed inside the
 * original's per-recording folder, so such placements resolve to the
 * original's folder. Per-recording folders are never imported as folders.
 */
export async function buildPlaudFolderLayout(
    items: readonly PlaudV4RecordingItem[],
    listChildren: (nodeId: string | null) => Promise<PlaudV4Node[]>,
): Promise<PlaudFolderLayout> {
    const recordingFolderIds = new Set<string>();
    const recordingFolderParent = new Map<string, PlaudV4FolderRef | null>();
    for (const item of items) {
        if (!item.parent_id) continue;
        recordingFolderIds.add(item.parent_id);
        recordingFolderParent.set(item.parent_id, item.parent_folder ?? null);
    }

    const folders: PlaudUserFolder[] = [];
    const queue: (string | null)[] = [null];
    const visited = new Set<string>();
    while (queue.length > 0 && folders.length < MAX_FOLDERS) {
        const parent = queue.shift() as string | null;
        for (const node of await listChildren(parent)) {
            const id = node.node_id;
            if (!id || visited.has(id)) continue;
            if (node.type !== 1) continue;
            if (node.system_folder_type) continue;
            if (node.trashed_at_ms) continue;
            if (recordingFolderIds.has(id)) continue;
            visited.add(id);
            folders.push({
                nodeId: id,
                parentNodeId: parent,
                name: (node.name ?? "").trim() || "Pasta do Plaud",
                color: (node.color ?? "").replace(/^folder-color-/, ""),
                createdAtMs: node.created_at_show_ms ?? null,
            });
            queue.push(id);
        }
    }

    const userFolderIds = new Set(folders.map((f) => f.nodeId));
    const resolve = (
        ref: PlaudV4FolderRef | null | undefined,
        depth = 0,
    ): string | null => {
        if (!ref?.folder_id || ref.system_folder_type) return null;
        if (userFolderIds.has(ref.folder_id)) return ref.folder_id;
        if (recordingFolderIds.has(ref.folder_id) && depth < 3) {
            return resolve(recordingFolderParent.get(ref.folder_id), depth + 1);
        }
        return null;
    };

    const placements = new Map<string, string | null>();
    for (const item of items) {
        if (!item.file_id) continue;
        placements.set(
            plaudV4FileIdToRecordingId(item.file_id),
            resolve(item.parent_folder),
        );
    }
    return { folders, placements };
}
