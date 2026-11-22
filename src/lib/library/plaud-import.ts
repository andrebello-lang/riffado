import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { libraryFolders, libraryRecordingFolders } from "@/db/schema-garrido";
import { encryptText } from "@/lib/encryption/fields";
import { mapPlaudFolderColor } from "@/lib/library/plaud-colors";
import type { PlaudFolderLayout } from "@/lib/plaud/v4-folders";

export interface PlaudFolderImportResult {
    foldersCreated: number;
    recordingsPlaced: number;
    recordingsUnplaced: number;
}

/**
 * Mirror the user's Plaud folders into the Biblioteca.
 *
 * - Missing Plaud folders are created once (keyed by plaud_node_id); a
 *   folder already in Riffado keeps whatever name/color the user set.
 * - Folders the user deleted in Riffado stay hidden and are never recreated.
 * - Recordings follow Plaud unless the user placed them manually in Riffado.
 * - Nothing is ever written to Plaud.
 */
export async function importPlaudFolders(
    userId: string,
    layout: PlaudFolderLayout,
): Promise<PlaudFolderImportResult> {
    const result: PlaudFolderImportResult = {
        foldersCreated: 0,
        recordingsPlaced: 0,
        recordingsUnplaced: 0,
    };

    const existing = await db
        .select({
            id: libraryFolders.id,
            plaudNodeId: libraryFolders.plaudNodeId,
            hiddenAt: libraryFolders.hiddenAt,
        })
        .from(libraryFolders)
        .where(eq(libraryFolders.userId, userId));

    const byNode = new Map<string, { id: string; hidden: boolean }>();
    for (const f of existing) {
        if (f.plaudNodeId) {
            byNode.set(f.plaudNodeId, {
                id: f.id,
                hidden: f.hiddenAt !== null,
            });
        }
    }

    for (const folder of layout.folders) {
        if (byNode.has(folder.nodeId)) continue;
        const parent = folder.parentNodeId
            ? byNode.get(folder.parentNodeId)
            : undefined;
        if (folder.parentNodeId && (!parent || parent.hidden)) continue;
        const createdAt = folder.createdAtMs
            ? new Date(folder.createdAtMs)
            : new Date();
        const [row] = await db
            .insert(libraryFolders)
            .values({
                userId,
                parentId: parent?.id ?? null,
                name: encryptText(folder.name),
                color: mapPlaudFolderColor(folder.color),
                plaudNodeId: folder.nodeId,
                createdAt,
            })
            .onConflictDoNothing({
                target: [libraryFolders.userId, libraryFolders.plaudNodeId],
            })
            .returning({ id: libraryFolders.id });
        if (row) {
            byNode.set(folder.nodeId, { id: row.id, hidden: false });
            result.foldersCreated++;
        }
    }

    const plaudFileIds = [...layout.placements.keys()];
    if (plaudFileIds.length === 0) return result;

    const recRows = await db
        .select({ id: recordings.id, plaudFileId: recordings.plaudFileId })
        .from(recordings)
        .where(
            and(
                eq(recordings.userId, userId),
                isNull(recordings.deletedAt),
                inArray(recordings.plaudFileId, plaudFileIds),
            ),
        );
    if (recRows.length === 0) return result;

    const current = await db
        .select({
            recordingId: libraryRecordingFolders.recordingId,
            folderId: libraryRecordingFolders.folderId,
            source: libraryRecordingFolders.source,
        })
        .from(libraryRecordingFolders)
        .where(
            and(
                eq(libraryRecordingFolders.userId, userId),
                inArray(
                    libraryRecordingFolders.recordingId,
                    recRows.map((r) => r.id),
                ),
            ),
        );
    const currentById = new Map(current.map((c) => [c.recordingId, c]));

    const toPlace = new Map<string, string[]>();
    const toUnplace: string[] = [];
    for (const rec of recRows) {
        const cur = currentById.get(rec.id);
        if (cur?.source === "manual") continue;
        const nodeId = layout.placements.get(rec.plaudFileId) ?? null;
        const target = nodeId ? byNode.get(nodeId) : undefined;
        const targetId = target && !target.hidden ? target.id : null;
        if (targetId === null) {
            if (cur) toUnplace.push(rec.id);
            continue;
        }
        if (cur?.folderId === targetId) continue;
        toPlace.set(targetId, [...(toPlace.get(targetId) ?? []), rec.id]);
    }

    const now = new Date();
    for (const [folderId, ids] of toPlace) {
        await db
            .insert(libraryRecordingFolders)
            .values(
                ids.map((recordingId) => ({
                    recordingId,
                    userId,
                    folderId,
                    source: "plaud",
                    updatedAt: now,
                })),
            )
            .onConflictDoUpdate({
                target: libraryRecordingFolders.recordingId,
                set: { folderId, source: "plaud", updatedAt: now },
                setWhere: eq(libraryRecordingFolders.source, "plaud"),
            });
        result.recordingsPlaced += ids.length;
    }
    if (toUnplace.length > 0) {
        await db
            .delete(libraryRecordingFolders)
            .where(
                and(
                    eq(libraryRecordingFolders.userId, userId),
                    eq(libraryRecordingFolders.source, "plaud"),
                    inArray(libraryRecordingFolders.recordingId, toUnplace),
                ),
            );
        result.recordingsUnplaced = toUnplace.length;
    }
    return result;
}
