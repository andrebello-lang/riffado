import { NextResponse } from "next/server";
import { deleteAttachment, findAttachment } from "@/lib/attachments/server";
import { requireApiSession } from "@/lib/auth-server";
import { decryptText } from "@/lib/encryption/fields";
import { AppError, apiHandler, ErrorCode } from "@/lib/errors";
import { createUserStorageProvider } from "@/lib/storage/factory";

type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

async function requireAttachment(request: Request, context: Ctx) {
    const session = await requireApiSession(request);
    const { id, attachmentId } = await context.params;
    const row = await findAttachment(session.user.id, id, attachmentId);
    if (!row) {
        throw new AppError(ErrorCode.NOT_FOUND, "Anexo não encontrado", 404);
    }
    return row;
}

/** GET: the file itself (`?download=1` forces a download). */
export const GET = apiHandler<Ctx>(async (request, context) => {
    const row = await requireAttachment(request, context as Ctx);
    const storage = await createUserStorageProvider(row.userId);
    const buffer = await storage.downloadFile(row.storagePath);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const name = encodeURIComponent(decryptText(row.filename));
    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            "Content-Type": row.mimeType,
            "Content-Length": String(buffer.length),
            "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${name}`,
            "Cache-Control": "private, max-age=300",
            "X-Content-Type-Options": "nosniff",
        },
    });
});

/** DELETE: remove the attachment and its file. */
export const DELETE = apiHandler<Ctx>(async (request, context) => {
    const row = await requireAttachment(request, context as Ctx);
    await deleteAttachment(row);
    return NextResponse.json({ success: true });
});
