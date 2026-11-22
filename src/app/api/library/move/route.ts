import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-server";
import { AppError, apiHandler, ErrorCode } from "@/lib/errors";
import { assignRecordings, findUserFolder } from "@/lib/library/server";

const MAX_BATCH = 500;

/** POST { recordingIds: string[], folderId: string | null } */
export const POST = apiHandler(async (request: Request) => {
    const session = await requireApiSession(request);
    const userId = session.user.id;
    const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
    >;

    const recordingIds = Array.isArray(body.recordingIds)
        ? [
              ...new Set(
                  body.recordingIds.filter(
                      (x): x is string => typeof x === "string" && x !== "",
                  ),
              ),
          ]
        : [];
    if (recordingIds.length === 0 || recordingIds.length > MAX_BATCH) {
        throw new AppError(
            ErrorCode.INVALID_INPUT,
            "Lista de gravações inválida",
            400,
            { field: "recordingIds" },
        );
    }

    const folderId =
        typeof body.folderId === "string" && body.folderId
            ? body.folderId
            : null;
    if (folderId && !(await findUserFolder(userId, folderId))) {
        throw new AppError(
            ErrorCode.INVALID_INPUT,
            "Pasta não encontrada",
            404,
        );
    }

    const moved = await assignRecordings(userId, recordingIds, folderId);
    return NextResponse.json({ success: true, moved });
});
