import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { AppError, ErrorCode } from "@/lib/errors";

/** 404 unless the recording exists, is the user's and is not deleted. */
export async function requireOwnRecording(userId: string, recordingId: string) {
    const [row] = await db
        .select({ id: recordings.id })
        .from(recordings)
        .where(
            and(
                eq(recordings.id, recordingId),
                eq(recordings.userId, userId),
                isNull(recordings.deletedAt),
            ),
        )
        .limit(1);
    if (!row) {
        throw new AppError(
            ErrorCode.RECORDING_NOT_FOUND,
            "Recording not found",
            404,
        );
    }
}
