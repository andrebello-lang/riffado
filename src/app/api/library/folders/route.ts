import { NextResponse } from "next/server";
import { db } from "@/db";
import { libraryFolders } from "@/db/schema-garrido";
import { requireApiSession } from "@/lib/auth-server";
import { encryptText } from "@/lib/encryption/fields";
import { AppError, apiHandler, ErrorCode } from "@/lib/errors";
import { findUserFolder, loadLibrary } from "@/lib/library/server";
import {
    DEFAULT_FOLDER_COLOR,
    DEFAULT_FOLDER_ICON,
    folderDepth,
    isFolderColor,
    isFolderIcon,
    MAX_FOLDER_DEPTH,
} from "@/lib/library/types";
import { parseFolderName } from "@/lib/library/validate";

/** GET: folders + recording placements for the Biblioteca. */
export const GET = apiHandler(async (request: Request) => {
    const session = await requireApiSession(request);
    return NextResponse.json(await loadLibrary(session.user.id));
});

/** POST { name, parentId?, color?, icon? }: create a folder. */
export const POST = apiHandler(async (request: Request) => {
    const session = await requireApiSession(request);
    const userId = session.user.id;
    const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
    >;

    const name = parseFolderName(body.name);
    const color = isFolderColor(body.color) ? body.color : DEFAULT_FOLDER_COLOR;
    const icon = isFolderIcon(body.icon) ? body.icon : DEFAULT_FOLDER_ICON;
    const parentId =
        typeof body.parentId === "string" && body.parentId
            ? body.parentId
            : null;

    if (parentId) {
        const parent = await findUserFolder(userId, parentId);
        if (!parent) {
            throw new AppError(
                ErrorCode.INVALID_INPUT,
                "Pasta de destino não encontrada",
                404,
            );
        }
        const { folders } = await loadLibrary(userId);
        if (folderDepth(folders, parentId) >= MAX_FOLDER_DEPTH) {
            throw new AppError(
                ErrorCode.INVALID_INPUT,
                `Máximo de ${MAX_FOLDER_DEPTH} níveis de subpastas`,
                400,
            );
        }
    }

    const [row] = await db
        .insert(libraryFolders)
        .values({ userId, parentId, name: encryptText(name), color, icon })
        .returning({ id: libraryFolders.id });

    return NextResponse.json({ success: true, id: row.id }, { status: 201 });
});
