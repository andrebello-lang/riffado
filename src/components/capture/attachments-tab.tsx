"use client";

import {
    ExternalLink,
    FileText,
    Loader2,
    Paperclip,
    RefreshCw,
    Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
    ATTACHMENT_ACCEPT,
    type AttachmentInfo,
    isImageMime,
    MAX_ATTACHMENT_BYTES,
} from "@/lib/attachments/types";
import { formatBytes } from "@/lib/format-bytes";
import { cn } from "@/lib/utils";

async function readError(res: Response, fallback: string) {
    const data = await res.json().catch(() => ({}));
    return (data as { error?: string }).error ?? fallback;
}

/** Attachments of one recording, with upload/delete/re-read actions. */
export function useAttachments(recordingId: string) {
    const [items, setItems] = useState<AttachmentInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const base = `/api/recordings/${recordingId}/attachments`;

    const reload = useCallback(async () => {
        try {
            const res = await fetch(base);
            if (!res.ok) throw new Error();
            const data = (await res.json()) as {
                attachments: AttachmentInfo[];
            };
            setItems(data.attachments);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [base]);

    useEffect(() => {
        setLoading(true);
        setItems([]);
        void reload();
    }, [reload]);

    return { items, setItems, loading, base, reload };
}

function statusLine(a: AttachmentInfo) {
    if (a.extractionStatus === "done") {
        return a.pageCount
            ? `Texto lido · ${a.pageCount} ${a.pageCount === 1 ? "página" : "páginas"}`
            : "Texto lido";
    }
    if (a.extractionStatus === "pending") {
        return a.extractionError ?? "Aguardando leitura";
    }
    return a.extractionError ?? "Não foi possível ler o arquivo";
}

export function AttachmentsTab({
    attachments,
}: {
    attachments: ReturnType<typeof useAttachments>;
}) {
    const { items, setItems, loading, base } = attachments;
    const confirm = useConfirm();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(0);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const upload = async (files: FileList | File[]) => {
        for (const file of Array.from(files)) {
            if (file.size > MAX_ATTACHMENT_BYTES) {
                toast.error(`"${file.name}" passa de 25 MB`);
                continue;
            }
            setUploading((n) => n + 1);
            try {
                const body = new FormData();
                body.append("file", file);
                const res = await fetch(base, { method: "POST", body });
                if (!res.ok) {
                    throw new Error(
                        await readError(res, "Não foi possível anexar"),
                    );
                }
                const { attachment } = (await res.json()) as {
                    attachment: AttachmentInfo;
                };
                setItems((prev) => [...prev, attachment]);
                toast.success(`"${attachment.filename}" anexado`);
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : "Falha ao anexar",
                );
            } finally {
                setUploading((n) => n - 1);
            }
        }
    };

    const reread = async (a: AttachmentInfo) => {
        setBusyId(a.id);
        try {
            const res = await fetch(`${base}/${a.id}/extract`, {
                method: "POST",
            });
            if (!res.ok) {
                throw new Error(await readError(res, "Falha ao ler de novo"));
            }
            const { attachment } = (await res.json()) as {
                attachment: AttachmentInfo;
            };
            setItems((prev) =>
                prev.map((x) => (x.id === attachment.id ? attachment : x)),
            );
            if (attachment.extractionStatus === "done") {
                toast.success("Texto lido");
            } else {
                toast.error(statusLine(attachment));
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Falha");
        } finally {
            setBusyId(null);
        }
    };

    const remove = (a: AttachmentInfo) =>
        confirm({
            title: "Excluir este anexo?",
            description: (
                <>
                    <span className="font-medium text-foreground">
                        {a.filename}
                    </span>{" "}
                    sai da captura e deixa de ser usado nas ideias.
                </>
            ),
            confirmLabel: "Excluir",
            pendingLabel: "Excluindo…",
            destructive: true,
            onConfirm: async () => {
                const res = await fetch(`${base}/${a.id}`, {
                    method: "DELETE",
                });
                if (!res.ok) {
                    toast.error(await readError(res, "Falha ao excluir"));
                    return;
                }
                setItems((prev) => prev.filter((x) => x.id !== a.id));
                toast.success("Anexo excluído");
            },
        });

    return (
        <div className="space-y-4">
            {/* biome-ignore lint/a11y/noStaticElementInteractions: drop target; the button inside is the keyboard path */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files.length) {
                        void upload(e.dataTransfer.files);
                    }
                }}
                className={cn(
                    "flex flex-col items-start gap-3 rounded-xl border border-dashed bg-card p-5",
                    dragOver && "border-foreground bg-accent/40",
                )}
            >
                <div className="space-y-1">
                    <p className="font-display text-base font-bold tracking-tight">
                        Slides, PDFs e fotos da aula
                    </p>
                    <p className="max-w-prose text-sm text-muted-foreground">
                        Anexe o material desta captura. O texto é lido e usado
                        como contexto quando você extrai as ideias. Arraste os
                        arquivos para cá ou escolha abaixo (PDF, PNG, JPG ou
                        WebP, até 25 MB).
                    </p>
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={ATTACHMENT_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files?.length) void upload(e.target.files);
                        e.target.value = "";
                    }}
                />
                <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading > 0}
                >
                    {uploading > 0 ? (
                        <Loader2 className="mr-1 size-4 animate-spin" />
                    ) : (
                        <Paperclip className="mr-1 size-4" />
                    )}
                    {uploading > 0 ? "Anexando e lendo…" : "Anexar arquivos"}
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Carregando
                    anexos…
                </div>
            ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Nenhum anexo nesta captura.
                </p>
            ) : (
                <ul className="space-y-2">
                    {items.map((a) => (
                        <li
                            key={a.id}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3"
                        >
                            {isImageMime(a.mimeType) ? (
                                // biome-ignore lint/performance/noImgElement: authenticated API thumbnail
                                <img
                                    src={`${base}/${a.id}`}
                                    alt=""
                                    className="size-12 shrink-0 rounded-md border object-cover"
                                />
                            ) : (
                                <span className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted">
                                    <FileText className="size-5 text-muted-foreground" />
                                </span>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                    {a.filename}
                                </p>
                                <p
                                    className={cn(
                                        "truncate text-xs",
                                        a.extractionStatus === "failed"
                                            ? "text-destructive"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    {formatBytes(a.sizeBytes)} · {statusLine(a)}
                                </p>
                            </div>
                            {a.extractionStatus !== "done" && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full"
                                    disabled={busyId === a.id}
                                    onClick={() => void reread(a)}
                                >
                                    {busyId === a.id ? (
                                        <Loader2 className="mr-1 size-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="mr-1 size-4" />
                                    )}
                                    {isImageMime(a.mimeType)
                                        ? "Ler com IA"
                                        : "Tentar de novo"}
                                </Button>
                            )}
                            <Button
                                asChild
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Abrir ${a.filename}`}
                            >
                                <a
                                    href={`${base}/${a.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="size-4" />
                                </a>
                            </Button>
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Excluir ${a.filename}`}
                                onClick={() => void remove(a)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
