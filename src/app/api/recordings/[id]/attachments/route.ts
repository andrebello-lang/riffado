import path from "node:path";
import { NextResponse } from "next/server";
import { requireOwnRecording } from "@/lib/attachments/guard";
import { createAttachment, listAttachments } from "@/lib/attachments/server";
import {
    ATTACHMENT_TYPES,
    MAX_ATTACHMENT_BYTES,
    MAX_ATTACHMENTS_PER_RECORDING,
} from "@/lib/attachments/types";
import { requireApiSession } from "@/lib/auth-server";
import { AppError, apiHandler, ErrorCode } from "@/lib/errors";
import { enforceStorageCap } from "@/lib/hosted/billing/storage-cap";
import { normalizeRecordingTitle } from "@/lib/recordings/filename";

type IdContext = { params: Promise<{ id: string }> };

/** GET: the recording's attachments. */
export const GET = apiHandler<IdContext>(async (request, context) => {
    const session = await requireApiSession(request);
    const { id } = await (context as IdContext).params;
    await requireOwnRecording(session.user.id, id);
    return NextResponse.json({
        attachments: await listAttachments(session.user.id, id),
    });
});

/** POST multipart `file`: attach a PDF or image and extract its text. */
export const POST = apiHandler<IdContext>(async (request, context) => {
    const session = await requireApiSession(request);
    const userId = session.user.id;
    const { id } = await (context as IdContext).params;
    await requireOwnRecording(userId, id);

    const existing = await listAttachments(userId, id);
    if (existing.length >= MAX_ATTACHMENTS_PER_RECORDING) {
        throw new AppError(
            ErrorCode.INVALID_INPUT,
            `Máximo de ${MAX_ATTACHMENTS_PER_RECORDING} anexos por captura`,
            400,
        );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
        throw new AppError(
            ErrorCode.MISSING_REQUIRED_FIELD,
            "Nenhum arquivo enviado",
            400,
            { field: "file" },
        );
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
        throw new AppError(
            ErrorCode.FILE_TOO_LARGE,
            "O arquivo passa de 25 MB",
            413,
        );
    }
    const ext = path.extname(file.name).toLowerCase();
    const mimeType = ATTACHMENT_TYPES[ext];
    if (!mimeType) {
        throw new AppError(
            ErrorCode.INVALID_FILE_FORMAT,
            "Formato não aceito. Use PDF, PNG, JPG ou WebP.",
            400,
        );
    }
    const cap = await enforceStorageCap({ userId, additionalBytes: file.size });
    if (!cap.allowed) {
        throw new AppError(
            ErrorCode.STORAGE_QUOTA_EXCEEDED,
            "Sem espaço de armazenamento para este arquivo.",
            413,
        );
    }

    const filename =
        normalizeRecordingTitle(path.basename(file.name)).slice(0, 200) ||
        `anexo${ext}`;
    const attachment = await createAttachment({
        userId,
        recordingId: id,
        filename,
        ext,
        mimeType,
        buffer: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ attachment }, { status: 201 });
});
