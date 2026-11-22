import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { requireApiSession } from "@/lib/auth-server";
import { encryptText } from "@/lib/encryption/fields";
import { isHostedLockedOut } from "@/lib/entitlements";
import { env } from "@/lib/env";
import { AppError, apiHandler, ErrorCode } from "@/lib/errors";
import { enforceStorageCap } from "@/lib/hosted/billing/storage-cap";
import { assignRecordings, folderOfRecording } from "@/lib/library/server";
import { renderSegmentsToMp3 } from "@/lib/recordings/derive-audio";
import {
    MAX_RECORDING_TITLE_LENGTH,
    normalizeRecordingTitle,
} from "@/lib/recordings/filename";
import {
    MAX_SEGMENTS,
    normalizeSegments,
    type Segment,
    totalDurationMs,
} from "@/lib/recordings/segments";
import { deleteStorageObjectOrQueue } from "@/lib/storage/delete-object";
import { createUserStorageProvider } from "@/lib/storage/factory";

type IdContext = { params: Promise<{ id: string }> };

/**
 * "Salvar como" from the audio editor: render the kept ranges of a
 * recording into a NEW recording. The source recording, its audio file,
 * transcript and summary are left untouched.
 *
 * Body: { filename: string, segments: [{ startMs, endMs }] }  (ranges to
 * keep, on the source timeline, in milliseconds).
 *
 * The new row's plaudFileId is `derived-<sourceId>-<nanoid>`: it can never
 * collide with a Plaud file id (so sync ignores it) and it records which
 * recording it was cut from without needing a schema change.
 */
export const POST = apiHandler<IdContext>(async (request, context) => {
    const session = await requireApiSession(request);
    const userId = session.user.id;
    const { id } = await (context as IdContext).params;

    if (await isHostedLockedOut(userId)) {
        throw new AppError(
            ErrorCode.ACCOUNT_LOCKED,
            "Your hosted plan has lapsed.",
            403,
        );
    }

    const body = (await request.json().catch(() => null)) as {
        filename?: unknown;
        segments?: unknown;
    } | null;

    const filename =
        typeof body?.filename === "string"
            ? normalizeRecordingTitle(body.filename)
            : "";
    if (!filename) {
        throw new AppError(
            ErrorCode.MISSING_REQUIRED_FIELD,
            "Informe um nome para o novo arquivo",
            400,
            { field: "filename" },
        );
    }
    if (filename.length > MAX_RECORDING_TITLE_LENGTH) {
        throw new AppError(
            ErrorCode.INVALID_INPUT,
            `O nome pode ter no máximo ${MAX_RECORDING_TITLE_LENGTH} caracteres`,
            400,
            { field: "filename" },
        );
    }

    const rawSegments = Array.isArray(body?.segments) ? body.segments : [];
    if (rawSegments.length === 0 || rawSegments.length > MAX_SEGMENTS) {
        throw new AppError(
            ErrorCode.INVALID_INPUT,
            "Lista de trechos inválida",
            400,
            { field: "segments" },
        );
    }

    const [source] = await db
        .select()
        .from(recordings)
        .where(
            and(
                eq(recordings.id, id),
                eq(recordings.userId, userId),
                isNull(recordings.deletedAt),
            ),
        )
        .limit(1);
    if (!source) {
        throw new AppError(
            ErrorCode.RECORDING_NOT_FOUND,
            "Recording not found",
            404,
        );
    }

    const segments = normalizeSegments(
        rawSegments.map((s) => {
            const seg = (s ?? {}) as Partial<Segment>;
            return {
                startMs: Number(seg.startMs),
                endMs: Number(seg.endMs),
            };
        }),
        source.duration,
    );
    if (segments.length === 0) {
        throw new AppError(
            ErrorCode.INVALID_INPUT,
            "Nenhum trecho de áudio para salvar",
            400,
            { field: "segments" },
        );
    }

    const storage = await createUserStorageProvider(userId);
    const original = await storage.downloadFile(source.storagePath);

    let output: Buffer;
    try {
        output = await renderSegmentsToMp3(original, segments);
    } catch (err) {
        console.error("[derive] ffmpeg failed:", err);
        throw new AppError(
            ErrorCode.INTERNAL_ERROR,
            "Não foi possível recortar o áudio",
            500,
        );
    }
    if (output.length === 0) {
        throw new AppError(
            ErrorCode.INTERNAL_ERROR,
            "O recorte gerou um arquivo vazio",
            500,
        );
    }

    const cap = await enforceStorageCap({
        userId,
        additionalBytes: output.length,
    });
    if (!cap.allowed) {
        throw new AppError(
            ErrorCode.STORAGE_QUOTA_EXCEEDED,
            "This would exceed your plan's storage limit.",
            413,
        );
    }

    const fileId = `derived-${source.id}-${nanoid(10)}`;
    const storageKey = `${userId}/${fileId}.mp3`;
    await storage.uploadFile(storageKey, output, "audio/mpeg");

    const durationMs = totalDurationMs(segments);
    // Place the cut where its first kept second actually happened, so it
    // sorts right next to its source in the list.
    const startTime = new Date(
        source.startTime.getTime() + segments[0].startMs,
    );
    const endTime = new Date(startTime.getTime() + durationMs);
    const now = new Date();
    const newId = nanoid();

    try {
        await db.insert(recordings).values({
            id: newId,
            userId,
            deviceSn: source.deviceSn,
            plaudFileId: fileId,
            filename: encryptText(filename),
            duration: durationMs,
            startTime,
            endTime,
            filesize: output.length,
            fileMd5: createHash("md5").update(output).digest("hex"),
            storageType: env.DEFAULT_STORAGE_TYPE,
            storagePath: storageKey,
            downloadedAt: now,
            plaudVersion: "1",
            timezone: source.timezone,
            zonemins: source.zonemins,
            scene: source.scene,
            isTrash: false,
        });
    } catch (dbError) {
        await deleteStorageObjectOrQueue(
            storage,
            storageKey,
            "recording_cleanup",
        );
        throw dbError;
    }

    // Biblioteca: the cut lands in the same folder as its source.
    const sourceFolder = await folderOfRecording(userId, source.id);
    if (sourceFolder) {
        await assignRecordings(userId, [newId], sourceFolder).catch((err) =>
            console.error("[derive] folder copy failed:", err),
        );
    }

    return NextResponse.json({
        success: true,
        recording: {
            id: newId,
            filename,
            duration: durationMs,
            startTime: startTime.toISOString(),
        },
    });
});
