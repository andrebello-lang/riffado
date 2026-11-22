import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { libraryFolders, libraryRecordingFolders } from "@/db/schema-garrido";
import { requireApiSession } from "@/lib/auth-server";
import { encryptText } from "@/lib/encryption/fields";
import { AppError, apiHandler, ErrorCode } from "@/lib/errors";
import { findUserFolder, loadLibrary } from "@/lib/library/server";
import {
    descendantIds,
    folderDepth,
    isFolderColor,
    isFolderIcon,
    MAX_FOLDER_DEPTH,
} from "@/lib/library/types";
import { parseFolderName } from "@/lib/library/validate";

type IdContext = { params: Promise<{ id: string }> };

async function requireFolder(userId: string, id: string) {
    const folder = await findUserFolder(userId, id);
    if (!folder) {
        throw new AppError(
            ErrorCode.INVALID_INPUT,
            "Pasta não encontrada",
            404,
        );
    }
    return folder;
}

/**
 * PATCH { name?, color?, icon?, parentId? (null = raiz), sortOrder? }.
 * Moving a folder under itself or one of its subfolders is rejected.
 */
export const PATCH = apiHandler<IdContext>(async (request, context) => {
    const session = await requireApiSession(request);
    const userId = session.user.id;
    const { id } = await (context as IdContext).params;
    await requireFolder(userId, id);

    const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
    >;
    const update: Partial<typeof libraryFolders.$inferInsert> = {};

    if ("name" in body) update.name = encryptText(parseFolderName(body.name));
    if ("color" in body) {
        if (!isFolderColor(body.color)) {
            throw new AppError(ErrorCode.INVALID_INPUT, "Cor inválida", 400);
        }
        update.color = body.color;
    }
    if ("icon" in body) {
        if (!isFolderIcon(body.icon)) {
            throw new AppError(ErrorCode.INVALID_INPUT, "Ícone inválido", 400);
        }
        update.icon = body.icon;
    }
    if ("sortOrder" in body && Number.isInteger(body.sortOrder)) {
        update.sortOrder = body.sortOrder as number;
    }
    if ("parentId" in body) {
        const parentId =
            typeof body.parentId === "string" && body.parentId
                ? body.parentId
                : null;
        if (parentId) {
            await requireFolder(userId, parentId);
            const { folders } = await loadLibrary(userId);
            const subtree = descendantIds(folders, id);
            if (subtree.has(parentId)) {
                throw new AppError(
                    ErrorCode.INVALID_INPUT,
                    "Não dá para mover uma pasta para dentro dela mesma",
                    400,
                );
            }
            // Depth of the moved subtree under its new parent.
            const subtreeHeight = Math.max(
                ...[...subtree].map(
                    (fid) =>
                        folderDepth(folders, fid) -
                        folderDepth(folders, id) +
                        1,
                ),
            );
            if (
                folderDepth(folders, parentId) + subtreeHeight >
                MAX_FOLDER_DEPTH
            ) {
                throw new AppError(
                    ErrorCode.INVALID_INPUT,
                    `Máximo de ${MAX_FOLDER_DEPTH} níveis de subpastas`,
                    400,
                );
            }
        }
        update.parentId = parentId;
    }

    if (Object.keys(update).length === 0) {
        throw new AppError(ErrorCode.INVALID_INPUT, "Nada para alterar", 400);
    }
    update.updatedAt = new Date();
    await db
        .update(libraryFolders)
        .set(update)
        .where(
            and(eq(libraryFolders.id, id), eq(libraryFolders.userId, userId)),
        );

    return NextResponse.json({ success: true });
});

/**
 * DELETE: removes the folder and its subfolders. Recordings inside are
 * NOT deleted; they go back to "Sem pasta". When the subtree holds folders
 * imported from Plaud, the subtree is hidden instead of deleted so the next
 * sync does not recreate it.
 */
export const DELETE = apiHandler<IdContext>(async (request, context) => {
    const session = await requireApiSession(request);
    const userId = session.user.id;
    const { id } = await (context as IdContext).params;
    await requireFolder(userId, id);

    const rows = await db
        .select({
            id: libraryFolders.id,
            parentId: libraryFolders.parentId,
            plaudNodeId: libraryFolders.plaudNodeId,
        })
        .from(libraryFolders)
        .where(
            and(
                eq(libraryFolders.userId, userId),
                isNull(libraryFolders.hiddenAt),
            ),
        );
    const subtree = new Set([id]);
    let grew = true;
    while (grew) {
        grew = false;
        for (const r of rows) {
            if (r.parentId && subtree.has(r.parentId) && !subtree.has(r.id)) {
                subtree.add(r.id);
                grew = true;
            }
        }
    }
    const ids = [...subtree];
    const hasPlaud = rows.some((r) => subtree.has(r.id) && r.plaudNodeId);

    if (hasPlaud) {
        await db
            .delete(libraryRecordingFolders)
            .where(
                and(
                    eq(libraryRecordingFolders.userId, userId),
                    inArray(libraryRecordingFolders.folderId, ids),
                ),
            );
        await db
            .update(libraryFolders)
            .set({ hiddenAt: new Date(), updatedAt: new Date() })
            .where(
                and(
                    eq(libraryFolders.userId, userId),
                    inArray(libraryFolders.id, ids),
                ),
            );
    } else {
        await db
            .delete(libraryFolders)
            .where(
                and(
                    eq(libraryFolders.id, id),
                    eq(libraryFolders.userId, userId),
                ),
            );
    }
    return NextResponse.json({ success: true });
});
