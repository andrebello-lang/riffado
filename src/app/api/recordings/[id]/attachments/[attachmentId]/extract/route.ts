import { NextResponse } from "next/server";
import { findAttachment, reextractAttachment } from "@/lib/attachments/server";
import { requireApiSession } from "@/lib/auth-server";
import { AppError, apiHandler, ErrorCode } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

/** POST: read the attachment's text again (e.g. after adding an AI provider). */
export const POST = apiHandler<Ctx>(async (request, context) => {
    const session = await requireApiSession(request);
    const { id, attachmentId } = await (context as Ctx).params;
    const row = await findAttachment(session.user.id, id, attachmentId);
    if (!row) {
        throw new AppError(ErrorCode.NOT_FOUND, "Anexo não encontrado", 404);
    }
    return NextResponse.json({ attachment: await reextractAttachment(row) });
});
