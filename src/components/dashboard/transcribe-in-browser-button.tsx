"use client";

import { Cpu, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { transcribeInBrowser } from "@/lib/transcription/browser-transcriber";
import type { TranscriptionModel } from "@/types/transcription";

interface Props {
    recordingId: string;
    /** Disabled while another action is running. */
    disabled?: boolean;
    /** Called after a successful POST so the parent can refresh data. */
    onComplete: () => void;
    /** Defaults to `"whisper-base"` (~75MB download, multilingual). */
    model?: TranscriptionModel;
}

type Phase =
    | "idle"
    | "downloading-audio"
    | "decoding-audio"
    | "loading-model"
    | "transcribing";

const PHASE_LABEL: Record<Exclude<Phase, "idle">, string> = {
    "downloading-audio": "Baixando o áudio…",
    "decoding-audio": "Decodificando o áudio…",
    "loading-model": "Carregando o Whisper (download único)…",
    transcribing: "Transcrevendo no computador…",
};

/**
 * Run Whisper in the browser via Transformers.js, then POST the result
 * to `/api/recordings/[id]/transcription/from-browser`. No API key
 * needed; audio never leaves the user's machine.
 *
 * The Whisper model is fetched from the Hugging Face CDN on first use
 * (~75MB for whisper-base) and cached by the browser, so subsequent
 * transcriptions are instant-start. Cancellation is best-effort: if the
 * user closes the tab mid-transcribe the worker is terminated by the
 * browser.
 */
export function TranscribeInBrowserButton({
    recordingId,
    disabled,
    onComplete,
    model = "whisper-base",
}: Props) {
    const [phase, setPhase] = useState<Phase>("idle");

    const run = useCallback(async () => {
        try {
            setPhase("downloading-audio");
            const audioRes = await fetch(
                `/api/recordings/${recordingId}/audio`,
            );
            if (!audioRes.ok) {
                throw new Error(`Falha ao baixar o áudio (${audioRes.status})`);
            }
            const blob = await audioRes.blob();
            const file = new File([blob], `recording-${recordingId}`, {
                type: blob.type || "audio/mpeg",
            });

            setPhase("decoding-audio");
            const result = await transcribeInBrowser(file, model, (status) => {
                if (status === "decoding-audio") setPhase("decoding-audio");
                if (status === "loading-model") setPhase("loading-model");
                if (status === "transcribing") setPhase("transcribing");
            });

            const postRes = await fetch(
                `/api/recordings/${recordingId}/transcription/from-browser`,
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        text: result.text,
                        detectedLanguage: result.detectedLanguage,
                        model,
                    }),
                },
            );
            if (!postRes.ok) {
                const err = await postRes.json().catch(() => ({}));
                throw new Error(err.error ?? "Falha ao salvar a transcrição");
            }

            toast.success("Transcrito no navegador");
            onComplete();
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Falha na transcrição pelo navegador",
            );
        } finally {
            setPhase("idle");
        }
    }, [recordingId, model, onComplete]);

    const busy = phase !== "idle";

    return (
        <Button
            onClick={run}
            size="sm"
            variant="outline"
            disabled={disabled || busy}
            title="Roda o Whisper no navegador. Não precisa de chave de API e o áudio não sai do seu computador."
        >
            {busy ? (
                <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    {PHASE_LABEL[phase as Exclude<Phase, "idle">]}
                </>
            ) : (
                <>
                    <Cpu className="size-4 mr-2" />
                    Transcrever no navegador
                </>
            )}
        </Button>
    );
}
