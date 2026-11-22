import { AppError, ErrorCode } from "@/lib/errors";
import { MAX_FOLDER_NAME_LENGTH } from "@/lib/library/types";
import { normalizeRecordingTitle } from "@/lib/recordings/filename";

/** Trimmed, control-char-free folder name, or a 400. */
export function parseFolderName(value: unknown): string {
    const name =
        typeof value === "string" ? normalizeRecordingTitle(value) : "";
    if (!name) {
        throw new AppError(
            ErrorCode.MISSING_REQUIRED_FIELD,
            "Informe o nome da pasta",
            400,
            { field: "name" },
        );
    }
    if (name.length > MAX_FOLDER_NAME_LENGTH) {
        throw new AppError(
            ErrorCode.INVALID_INPUT,
            `O nome pode ter no máximo ${MAX_FOLDER_NAME_LENGTH} caracteres`,
            400,
            { field: "name" },
        );
    }
    return name;
}
