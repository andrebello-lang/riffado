import { and, eq, inArray, isNull, like, or } from "drizzle-orm";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { libraryFolders, libraryRecordingFolders } from "@/db/schema-garrido";
import { decryptText } from "@/lib/encryption/fields";
import {
    DEFAULT_FOLDER_COLOR,
    DEFAULT_FOLDER_ICON,
    isFolderColor,
    isFolderIcon,
    type LibraryData,
    type LibraryFolder,
} from "@/lib/library/types";

/** Everything the Biblioteca UI needs for one user, decrypted. */
export async function loadLibrary(userId: string): Promise<LibraryData> {
    const [folderRows, assignmentRows, originRows] = await Promise.all([
        db
            .select()
            .from(libraryFolders)
            .where(eq(libraryFolders.userId, userId)),
        db
            .select({
                recordingId: libraryRecordingFolders.recordingId,
                folderId: libraryRecordingFolders.folderId,
            })
            .from(libraryRecordingFolders)
            .where(eq(libraryRecordingFolders.userId, userId)),
        db
            .select({ id: recordings.id, plaudFileId: recordings.plaudFileId })
            .from(recordings)
            .where(
                and(
                    eq(recordings.userId, userId),
                    isNull(recordings.deletedAt),
                    or(
                        like(recordings.plaudFileId, "derived-%"),
                        like(recordings.plaudFileId, "uploaded-%"),
                    ),
                ),
            ),
    ]);

    const folders: LibraryFolder[] = folderRows.map((f) => ({
        id: f.id,
        parentId: f.parentId,
        name: decryptText(f.name),
        color: isFolderColor(f.color) ? f.color : DEFAULT_FOLDER_COLOR,
        icon: isFolderIcon(f.icon) ? f.icon : DEFAULT_FOLDER_ICON,
        sortOrder: f.sortOrder,
        createdAt: f.createdAt.toISOString(),
    }));

    const assignments: Record<string, string> = {};
    for (const a of assignmentRows) assignments[a.recordingId] = a.folderId;

    const origins: LibraryData["origins"] = {};
    for (const r of originRows) {
        origins[r.id] = r.plaudFileId.startsWith("derived-")
            ? "derived"
            : "uploaded";
    }

    return { folders, assignments, origins };
}

/** The user's folder, or undefined. */
export async function findUserFolder(userId: string, folderId: string) {
    const [row] = await db
        .select()
        .from(libraryFolders)
        .where(
            and(
                eq(libraryFolders.id, folderId),
                eq(libraryFolders.userId, userId),
            ),
        )
        .limit(1);
    return row;
}

/**
 * Put recordings in a folder (or "Sem pasta" when folderId is null).
 * Only the user's own, non-deleted recordings are touched. Returns how
 * many recordings were moved.
 */
export async function assignRecordings(
    userId: string,
    recordingIds: string[],
    folderId: string | null,
    source: "manual" | "plaud" = "manual",
): Promise<number> {
    if (recordingIds.length === 0) return 0;
    const owned = await db
        .select({ id: recordings.id })
        .from(recordings)
        .where(
            and(
                eq(recordings.userId, userId),
                isNull(recordings.deletedAt),
                inArray(recordings.id, recordingIds),
            ),
        );
    const ids = owned.map((r) => r.id);
    if (ids.length === 0) return 0;

    if (folderId === null) {
        await db
            .delete(libraryRecordingFolders)
            .where(
                and(
                    eq(libraryRecordingFolders.userId, userId),
                    inArray(libraryRecordingFolders.recordingId, ids),
                ),
            );
        return ids.length;
    }

    const now = new Date();
    await db
        .insert(libraryRecordingFolders)
        .values(
            ids.map((recordingId) => ({
                recordingId,
                userId,
                folderId,
                source,
                updatedAt: now,
            })),
        )
        .onConflictDoUpdate({
            target: libraryRecordingFolders.recordingId,
            set: { folderId, source, updatedAt: now },
        });
    return ids.length;
}

/** Folder of one recording, if any. */
export async function folderOfRecording(
    userId: string,
    recordingId: string,
): Promise<string | null> {
    const [row] = await db
        .select({ folderId: libraryRecordingFolders.folderId })
        .from(libraryRecordingFolders)
        .where(
            and(
                eq(libraryRecordingFolders.userId, userId),
                eq(libraryRecordingFolders.recordingId, recordingId),
            ),
        )
        .limit(1);
    return row?.folderId ?? null;
}
