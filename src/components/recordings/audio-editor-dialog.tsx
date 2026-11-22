"use client";

import {
    Loader2,
    Pause,
    Play,
    Redo2,
    Scissors,
    SkipBack,
    SkipForward,
    Trash2,
    Undo2,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AUTO_DECODE_MAX_MS, decodePeaks } from "@/lib/audio/waveform";
import { MAX_RECORDING_TITLE_LENGTH } from "@/lib/recordings/filename";
import {
    keepOnly,
    MIN_SEGMENT_MS,
    nextPlayablePosition,
    removeRange,
    type Segment,
    totalDurationMs,
} from "@/lib/recordings/segments";
import { cn } from "@/lib/utils";

interface AudioEditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recordingId: string;
    filename: string;
    durationMs: number;
    peaks: number[] | null;
}

const EDITOR_PEAK_BUCKETS = 2048;
const HANDLE_HIT_PX = 10;
const CLICK_SLOP_PX = 4;

function fmt(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
    return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

function isKept(segments: readonly Segment[], ms: number): boolean {
    return segments.some((s) => ms >= s.startMs && ms < s.endMs);
}

/**
 * Audio editor ("Editar áudio"), modelled on the Plaud app: select a range
 * on the waveform, then Aparar (keep only the selection) or Excluir (cut
 * it out); undo/redo; "Salvar como" renders the result into a NEW
 * recording on the server. The original recording is never changed.
 */
export function AudioEditorDialog({
    open,
    onOpenChange,
    recordingId,
    filename,
    durationMs,
    peaks: initialPeaks,
}: AudioEditorDialogProps) {
    const router = useRouter();
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overviewRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);

    const full = useMemo<Segment[]>(
        () => [{ startMs: 0, endMs: durationMs }],
        [durationMs],
    );
    const [segments, setSegments] = useState<Segment[]>(full);
    const [past, setPast] = useState<Segment[][]>([]);
    const [future, setFuture] = useState<Segment[][]>([]);
    const [selection, setSelection] = useState<Segment | null>(null);
    const [positionMs, setPositionMs] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [selectionOnly, setSelectionOnly] = useState(false);
    const [view, setView] = useState<Segment>({
        startMs: 0,
        endMs: durationMs,
    });
    const [peaks, setPeaks] = useState<number[] | null>(initialPeaks);
    const [saveOpen, setSaveOpen] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [saving, setSaving] = useState(false);

    // Reset everything each time the editor opens.
    useEffect(() => {
        if (!open) return;
        setSegments(full);
        setPast([]);
        setFuture([]);
        setSelection(null);
        setPositionMs(0);
        setPlaying(false);
        setView({ startMs: 0, endMs: durationMs });
        // Pause the main player so two audio elements never overlap.
        for (const a of document.querySelectorAll("audio")) {
            if (a !== audioRef.current) a.pause();
        }
    }, [open, full, durationMs]);

    // Finer peaks for the editor when the recording is short enough to
    // decode in the browser; otherwise fall back to the cached 500.
    useEffect(() => {
        if (!open) return;
        setPeaks(initialPeaks);
        if (durationMs > AUTO_DECODE_MAX_MS) return;
        const controller = new AbortController();
        (async () => {
            try {
                const res = await fetch(
                    `/api/recordings/${recordingId}/audio`,
                    {
                        signal: controller.signal,
                    },
                );
                if (!res.ok) return;
                const buf = await res.arrayBuffer();
                const result = await decodePeaks(buf, EDITOR_PEAK_BUCKETS);
                if (!controller.signal.aborted) setPeaks(result.peaks);
            } catch {
                // keep the cached peaks
            }
        })();
        return () => controller.abort();
    }, [open, recordingId, durationMs, initialPeaks]);

    const commit = useCallback(
        (next: Segment[]) => {
            if (next.length === 0) {
                toast.error("Isso removeria todo o áudio");
                return;
            }
            setPast((p) => [...p, segments]);
            setFuture([]);
            setSegments(next);
            setSelection(null);
        },
        [segments],
    );

    const undo = useCallback(() => {
        if (past.length === 0) return;
        setFuture([segments, ...future]);
        setSegments(past[past.length - 1]);
        setPast(past.slice(0, -1));
        setSelection(null);
    }, [segments, past, future]);

    const redo = useCallback(() => {
        if (future.length === 0) return;
        setPast([...past, segments]);
        setSegments(future[0]);
        setFuture(future.slice(1));
        setSelection(null);
    }, [segments, past, future]);

    // ---- playback -------------------------------------------------------

    const stopLoop = useCallback(() => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
    }, []);

    const pause = useCallback(() => {
        audioRef.current?.pause();
        setPlaying(false);
        stopLoop();
    }, [stopLoop]);

    const seek = useCallback(
        (ms: number) => {
            const clamped = Math.max(0, Math.min(durationMs, ms));
            setPositionMs(clamped);
            if (audioRef.current) audioRef.current.currentTime = clamped / 1000;
        },
        [durationMs],
    );

    const tick = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const ms = audio.currentTime * 1000;
        const limit = selectionOnly && selection ? selection.endMs : null;
        if (limit !== null && ms >= limit) {
            pause();
            seek(selection?.startMs ?? 0);
            return;
        }
        const next = nextPlayablePosition(segments, ms);
        if (next === null) {
            pause();
            return;
        }
        if (next !== ms) audio.currentTime = next / 1000;
        setPositionMs(next);
        rafRef.current = requestAnimationFrame(tick);
    }, [segments, selection, selectionOnly, pause, seek]);

    const play = useCallback(
        async (onlySelection = false) => {
            const audio = audioRef.current;
            if (!audio) return;
            setSelectionOnly(onlySelection);
            let from = positionMs;
            if (onlySelection && selection) from = selection.startMs;
            const playable = nextPlayablePosition(segments, from);
            if (playable === null) {
                const first = segments[0]?.startMs ?? 0;
                from = first;
            } else {
                from = playable;
            }
            audio.currentTime = from / 1000;
            setPositionMs(from);
            try {
                await audio.play();
                setPlaying(true);
            } catch {
                toast.error("Não foi possível tocar o áudio");
            }
        },
        [positionMs, selection, segments],
    );

    useEffect(() => {
        if (!playing) return;
        stopLoop();
        rafRef.current = requestAnimationFrame(tick);
        return stopLoop;
    }, [playing, tick, stopLoop]);

    useEffect(() => {
        if (!open) pause();
    }, [open, pause]);

    // ---- drawing --------------------------------------------------------

    const msToX = useCallback(
        (ms: number, width: number) =>
            ((ms - view.startMs) / (view.endMs - view.startMs)) * width,
        [view],
    );

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;
        const dpr = window.devicePixelRatio || 1;
        const w = wrap.clientWidth;
        const h = 160;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const styles = getComputedStyle(wrap);
        const primary = styles.getPropertyValue("--primary").trim() || "#c50";
        const muted =
            styles.getPropertyValue("--muted-foreground").trim() || "#888";

        const bars = Math.max(40, Math.floor(w / 4));
        const span = view.endMs - view.startMs;
        const mid = h / 2;
        for (let i = 0; i < bars; i++) {
            const ms = view.startMs + ((i + 0.5) / bars) * span;
            let p = 0.15;
            if (peaks && peaks.length > 0) {
                const a = Math.floor(
                    ((view.startMs + (i / bars) * span) / durationMs) *
                        peaks.length,
                );
                const b = Math.max(
                    a + 1,
                    Math.floor(
                        ((view.startMs + ((i + 1) / bars) * span) /
                            durationMs) *
                            peaks.length,
                    ),
                );
                p = 0;
                for (let j = a; j < b && j < peaks.length; j++) {
                    if (peaks[j] > p) p = peaks[j];
                }
            }
            const half = Math.max(1.5, p * (h / 2 - 6));
            const kept = isKept(segments, ms);
            ctx.fillStyle = kept ? primary : muted;
            ctx.globalAlpha = kept ? 1 : 0.18;
            ctx.fillRect(
                i * (w / bars) + 0.5,
                mid - half,
                w / bars - 1.5,
                half * 2,
            );
        }
        ctx.globalAlpha = 1;

        // Removed ranges: hatched veil.
        ctx.fillStyle = muted;
        let prevEnd = 0;
        for (const s of [
            ...segments,
            { startMs: durationMs, endMs: durationMs },
        ]) {
            if (s.startMs > prevEnd) {
                const x1 = msToX(prevEnd, w);
                const x2 = msToX(s.startMs, w);
                ctx.globalAlpha = 0.08;
                ctx.fillRect(x1, 0, x2 - x1, h);
            }
            prevEnd = s.endMs;
        }
        ctx.globalAlpha = 1;

        if (selection) {
            const x1 = msToX(selection.startMs, w);
            const x2 = msToX(selection.endMs, w);
            ctx.fillStyle = primary;
            ctx.globalAlpha = 0.15;
            ctx.fillRect(x1, 0, x2 - x1, h);
            ctx.globalAlpha = 1;
            ctx.fillRect(x1 - 1, 0, 2, h);
            ctx.fillRect(x2 - 1, 0, 2, h);
            for (const x of [x1, x2]) {
                ctx.beginPath();
                ctx.arc(x, 6, 5, 0, Math.PI * 2);
                ctx.arc(x, h - 6, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const px = msToX(positionMs, w);
        if (px >= 0 && px <= w) {
            ctx.fillStyle =
                styles.getPropertyValue("--foreground").trim() || "#fff";
            ctx.fillRect(px - 1, 0, 2, h);
        }
    }, [peaks, segments, selection, positionMs, view, durationMs, msToX]);

    const drawOverview = useCallback(() => {
        const canvas = overviewRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;
        const dpr = window.devicePixelRatio || 1;
        const w = wrap.clientWidth;
        const h = 36;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const styles = getComputedStyle(wrap);
        const primary = styles.getPropertyValue("--primary").trim() || "#c50";
        const muted =
            styles.getPropertyValue("--muted-foreground").trim() || "#888";
        const bars = Math.max(40, Math.floor(w / 3));
        for (let i = 0; i < bars; i++) {
            const ms = ((i + 0.5) / bars) * durationMs;
            let p = 0.3;
            if (peaks && peaks.length > 0) {
                p =
                    peaks[
                        Math.min(
                            peaks.length - 1,
                            Math.floor((i / bars) * peaks.length),
                        )
                    ];
            }
            const half = Math.max(1, p * (h / 2 - 2));
            const kept = isKept(segments, ms);
            ctx.fillStyle = kept ? primary : muted;
            ctx.globalAlpha = kept ? 0.8 : 0.2;
            ctx.fillRect(i * (w / bars), h / 2 - half, w / bars - 1, half * 2);
        }
        // viewport
        ctx.globalAlpha = 1;
        ctx.strokeStyle =
            styles.getPropertyValue("--foreground").trim() || "#fff";
        ctx.lineWidth = 1.5;
        const vx1 = (view.startMs / durationMs) * w;
        const vx2 = (view.endMs / durationMs) * w;
        ctx.strokeRect(vx1 + 0.75, 0.75, Math.max(2, vx2 - vx1 - 1.5), h - 1.5);
        const px = (positionMs / durationMs) * w;
        ctx.fillRect(px, 0, 1, h);
    }, [peaks, segments, view, positionMs, durationMs]);

    useEffect(() => {
        if (!open) return;
        draw();
        drawOverview();
    }, [open, draw, drawOverview]);

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!open || !wrap || typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver(() => {
            draw();
            drawOverview();
        });
        ro.observe(wrap);
        return () => ro.disconnect();
    }, [open, draw, drawOverview]);

    // ---- pointer interaction on the main waveform -----------------------

    const dragRef = useRef<{
        mode: "start" | "end" | "new";
        anchorMs: number;
        downX: number;
        moved: boolean;
    } | null>(null);

    const xToMs = useCallback(
        (clientX: number) => {
            const canvas = canvasRef.current;
            if (!canvas) return 0;
            const rect = canvas.getBoundingClientRect();
            const ratio = Math.max(
                0,
                Math.min(1, (clientX - rect.left) / rect.width),
            );
            return view.startMs + ratio * (view.endMs - view.startMs);
        },
        [view],
    );

    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.setPointerCapture(e.pointerId);
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ms = xToMs(e.clientX);
        if (selection) {
            const sx = msToX(selection.startMs, rect.width);
            const ex = msToX(selection.endMs, rect.width);
            if (Math.abs(x - sx) <= HANDLE_HIT_PX) {
                dragRef.current = {
                    mode: "start",
                    anchorMs: selection.endMs,
                    downX: e.clientX,
                    moved: true,
                };
                return;
            }
            if (Math.abs(x - ex) <= HANDLE_HIT_PX) {
                dragRef.current = {
                    mode: "end",
                    anchorMs: selection.startMs,
                    downX: e.clientX,
                    moved: true,
                };
                return;
            }
        }
        dragRef.current = {
            mode: "new",
            anchorMs: ms,
            downX: e.clientX,
            moved: false,
        };
    };

    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const drag = dragRef.current;
        if (!drag) return;
        if (!drag.moved && Math.abs(e.clientX - drag.downX) < CLICK_SLOP_PX)
            return;
        drag.moved = true;
        const ms = xToMs(e.clientX);
        const a = drag.anchorMs;
        setSelection({ startMs: Math.min(a, ms), endMs: Math.max(a, ms) });
    };

    const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (!drag) return;
        if (!drag.moved) {
            // Plain click: move the playhead, keep the selection.
            seek(xToMs(e.clientX));
            return;
        }
        setSelection((sel) =>
            sel && sel.endMs - sel.startMs >= MIN_SEGMENT_MS ? sel : null,
        );
    };

    const onOverviewPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.type === "pointermove" && e.buttons !== 1) return;
        const canvas = overviewRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const center =
            Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) *
            durationMs;
        const span = view.endMs - view.startMs;
        let start = center - span / 2;
        start = Math.max(0, Math.min(durationMs - span, start));
        setView({ startMs: start, endMs: start + span });
    };

    const zoom = (factor: number) => {
        const span = view.endMs - view.startMs;
        const nextSpan = Math.max(5000, Math.min(durationMs, span * factor));
        const center =
            positionMs >= view.startMs && positionMs <= view.endMs
                ? positionMs
                : view.startMs + span / 2;
        let start = center - nextSpan / 2;
        start = Math.max(0, Math.min(durationMs - nextSpan, start));
        setView({ startMs: start, endMs: start + nextSpan });
    };

    // ---- actions --------------------------------------------------------

    const markStart = () => {
        const end = selection?.endMs ?? durationMs;
        if (positionMs >= end) {
            setSelection({ startMs: positionMs, endMs: durationMs });
        } else {
            setSelection({ startMs: positionMs, endMs: end });
        }
    };
    const markEnd = () => {
        const start = selection?.startMs ?? 0;
        if (positionMs <= start) {
            setSelection({ startMs: 0, endMs: positionMs });
        } else {
            setSelection({ startMs: start, endMs: positionMs });
        }
    };

    const trim = () => {
        if (!selection) return;
        pause();
        commit(keepOnly(segments, selection, durationMs));
        seek(selection.startMs);
    };
    const cut = () => {
        if (!selection) return;
        pause();
        commit(removeRange(segments, selection, durationMs));
    };

    const keptMs = totalDurationMs(segments);
    const changed =
        segments.length !== 1 ||
        segments[0].startMs !== 0 ||
        segments[0].endMs !== durationMs;

    const openSave = () => {
        pause();
        setSaveName(
            `${filename} (recorte)`.slice(0, MAX_RECORDING_TITLE_LENGTH),
        );
        setSaveOpen(true);
    };

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/recordings/${recordingId}/derive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: saveName, segments }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(
                    data?.error ?? data?.message ?? `Erro ${res.status}`,
                );
            }
            const newId: string = data.recording.id;
            setSaveOpen(false);
            onOpenChange(false);
            router.refresh();
            toast.success("Recorte salvo como nova gravação", {
                description: `${saveName} · ${fmt(keptMs)}`,
                duration: 12000,
                action: {
                    label: "Transcrever agora",
                    onClick: () => {
                        fetch(`/api/recordings/${newId}/transcribe`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: "{}",
                        })
                            .then(async (r) => {
                                if (!r.ok) throw new Error();
                                toast.success("Transcrição concluída");
                                router.refresh();
                            })
                            .catch(() =>
                                toast.error("Falha ao transcrever o recorte"),
                            );
                        toast.info("Transcrevendo o recorte…");
                    },
                },
            });
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Falha ao salvar o recorte",
            );
        } finally {
            setSaving(false);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        const t = e.target as HTMLElement;
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
        // Keep the dashboard's global player shortcuts out of the editor.
        e.stopPropagation();
        const mod = e.metaKey || e.ctrlKey;
        if (e.key === " ") {
            e.preventDefault();
            if (playing) pause();
            else void play(false);
        } else if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
            e.preventDefault();
            undo();
        } else if (
            mod &&
            (e.key.toLowerCase() === "y" ||
                (e.key.toLowerCase() === "z" && e.shiftKey))
        ) {
            e.preventDefault();
            redo();
        } else if (e.key === "i") {
            markStart();
        } else if (e.key === "o") {
            markEnd();
        } else if (e.key === "Escape" && selection) {
            e.preventDefault();
            setSelection(null);
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onOpenChange={(o) => !saving && onOpenChange(o)}
            >
                <DialogContent
                    className="w-[calc(100vw-2rem)] max-w-5xl sm:max-w-5xl"
                    onKeyDown={onKeyDown}
                >
                    <DialogHeader>
                        <DialogTitle className="truncate pr-6">
                            Editar áudio · {filename}
                        </DialogTitle>
                        <DialogDescription>
                            Arraste na onda para selecionar um trecho. O
                            original não é alterado: o resultado vira uma nova
                            gravação.
                        </DialogDescription>
                    </DialogHeader>

                    <div
                        ref={wrapRef}
                        className="flex w-full min-w-0 flex-col gap-2"
                    >
                        <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                            <span>{fmt(view.startMs)}</span>
                            {selection && (
                                <span className="text-foreground">
                                    Seleção {fmt(selection.startMs)} –{" "}
                                    {fmt(selection.endMs)} (
                                    {fmt(selection.endMs - selection.startMs)})
                                </span>
                            )}
                            <span>{fmt(view.endMs)}</span>
                        </div>
                        <canvas
                            ref={canvasRef}
                            className="w-full cursor-crosshair touch-none rounded-md bg-muted/40"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={() => {
                                dragRef.current = null;
                            }}
                        />
                        <canvas
                            ref={overviewRef}
                            className="w-full cursor-pointer touch-none rounded-md bg-muted/30"
                            onPointerDown={onOverviewPointer}
                            onPointerMove={onOverviewPointer}
                        />
                        {!peaks && (
                            <p className="text-xs text-muted-foreground">
                                <Loader2 className="mr-1 inline size-3 animate-spin" />
                                Gerando forma de onda…
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={undo}
                            disabled={past.length === 0}
                            aria-label="Desfazer"
                            title="Desfazer (Ctrl/Cmd+Z)"
                        >
                            <Undo2 className="size-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={redo}
                            disabled={future.length === 0}
                            aria-label="Refazer"
                            title="Refazer"
                        >
                            <Redo2 className="size-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => zoom(0.5)}
                            aria-label="Aproximar"
                            title="Aproximar"
                        >
                            <ZoomIn className="size-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => zoom(2)}
                            aria-label="Afastar"
                            title="Afastar"
                        >
                            <ZoomOut className="size-4" />
                        </Button>
                        <span className="mx-2 font-mono text-sm tabular-nums">
                            {fmt(positionMs)} / {fmt(durationMs)}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                                seek(selection?.startMs ?? segments[0].startMs)
                            }
                            aria-label="Ir para o início"
                            title="Ir para o início da seleção"
                        >
                            <SkipBack className="size-4" />
                        </Button>
                        <Button
                            size="icon"
                            onClick={() =>
                                playing ? pause() : void play(false)
                            }
                            aria-label={playing ? "Pausar" : "Tocar"}
                            title="Tocar/pausar (espaço)"
                        >
                            {playing ? (
                                <Pause className="size-4" />
                            ) : (
                                <Play className="size-4" />
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                                seek(
                                    selection?.endMs ??
                                        segments[segments.length - 1].endMs,
                                )
                            }
                            aria-label="Ir para o fim"
                            title="Ir para o fim da seleção"
                        >
                            <SkipForward className="size-4" />
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={markStart}
                            title="Atalho: I"
                        >
                            Marcar início aqui
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={markEnd}
                            title="Atalho: O"
                        >
                            Marcar fim aqui
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void play(true)}
                            disabled={!selection}
                        >
                            <Play className="size-3.5" /> Ouvir seleção
                        </Button>
                        <span
                            className="mx-1 h-6 w-px bg-border"
                            aria-hidden="true"
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={trim}
                            disabled={!selection}
                        >
                            <Scissors className="size-3.5" /> Aparar
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={cut}
                            disabled={!selection}
                        >
                            <Trash2 className="size-3.5" /> Excluir trecho
                        </Button>
                    </div>

                    <DialogFooter className="items-center sm:justify-between">
                        <span
                            className={cn(
                                "text-sm text-muted-foreground",
                                changed && "text-foreground",
                            )}
                        >
                            Duração final:{" "}
                            <strong className="font-mono">{fmt(keptMs)}</strong>
                            {segments.length > 1 &&
                                ` · ${segments.length} trechos`}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button onClick={openSave} disabled={!changed}>
                                Salvar como…
                            </Button>
                        </div>
                    </DialogFooter>

                    <audio
                        ref={audioRef}
                        src={
                            open
                                ? `/api/recordings/${recordingId}/audio`
                                : undefined
                        }
                        preload="metadata"
                        className="hidden"
                        onEnded={() => {
                            setPlaying(false);
                            stopLoop();
                        }}
                    >
                        <track kind="captions" />
                    </audio>
                </DialogContent>
            </Dialog>

            <Dialog
                open={saveOpen}
                onOpenChange={(o) => !saving && setSaveOpen(o)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Salvar como</DialogTitle>
                        <DialogDescription>
                            O recorte ({fmt(keptMs)}) será salvo como uma nova
                            gravação. O original continua intacto.
                        </DialogDescription>
                    </DialogHeader>
                    <textarea
                        className="min-h-24 w-full resize-none rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        value={saveName}
                        maxLength={MAX_RECORDING_TITLE_LENGTH}
                        onChange={(e) => setSaveName(e.target.value)}
                        onFocus={(e) => e.currentTarget.select()}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                if (saveName.trim() && !saving) void save();
                            }
                        }}
                    />
                    <p className="text-right text-xs text-muted-foreground">
                        {saveName.length}/{MAX_RECORDING_TITLE_LENGTH}
                    </p>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setSaveOpen(false)}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => void save()}
                            disabled={saving || !saveName.trim()}
                        >
                            {saving && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
