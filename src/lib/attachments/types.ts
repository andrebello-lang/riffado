/** Client-safe attachment types and limits. */

export const ATTACHMENT_TYPES: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
};

export const ATTACHMENT_ACCEPT = Object.keys(ATTACHMENT_TYPES).join(",");
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_RECORDING = 20;
/** Upper bound of attachment text sent along with a summary request. */
export const MAX_ATTACHMENT_CONTEXT_CHARS = 40_000;

export type ExtractionStatus = "pending" | "done" | "failed";

export interface AttachmentInfo {
    id: string;
    recordingId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    extractionStatus: ExtractionStatus;
    extractionError: string | null;
    pageCount: number | null;
    /** Characters of extracted text (the text itself is fetched on demand). */
    textLength: number;
    createdAt: string;
}

export function isImageMime(mime: string): boolean {
    return mime.startsWith("image/");
}
