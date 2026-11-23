"use client";

import { Languages, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { TranscribeInBrowserButton } from "@/components/dashboard/transcribe-in-browser-button";
import {
    RichMarkdown,
    SpeakerTranscript,
} from "@/components/recordings/rich-content";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useTranscriptionSummary } from "@/hooks/use-transcription-summary";
import { cn } from "@/lib/utils";
import type { Recording } from "@/types/recording";

interface Transcription {
    text?: string;
    language?: string;
}

interface CapturePanelProps {
    recording: Recording;
    transcription?: Transcription;
    isTranscribing: boolean;
    onTranscribe: () => void;
    onTranscribeComplete?: () => void;
}

type Tab = "essencia" | "transcricao";

const HIGHLIGHT =
    "bg-[linear-gradient(transparent_55%,var(--highlight-mark)_55%)] box-decoration-clone";

function taskStorageKey(recordingId: string) {
    return `brieffado:tarefas:${recordingId}`;
}

/** Done-state of a recording's tasks, kept per browser (keyed by task text). */
function useTaskChecks(recordingId: string) {
    const [done, setDone] = useState<Set<string>>(new Set());
    useEffect(() => {
        try {
            const raw = localStorage.getItem(taskStorageKey(recordingId));
            setDone(new Set(raw ? (JSON.parse(raw) as string[]) : []));
        } catch {
            setDone(new Set());
        }
    }, [recordingId]);
    const toggle = (task: string) => {
        setDone((prev) => {
            const next = new Set(prev);
            if (next.has(task)) next.delete(task);
            else next.add(task);
            try {
                localStorage.setItem(
                    taskStorageKey(recordingId),
                    JSON.stringify([...next]),
                );
            } catch {
                // storage unavailable: keep the in-memory state only
            }
            return next;
        });
    };
    return { done, toggle };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {children}
        </h3>
    );
}

/**
 * Brieffado capture view: "Essência" (best ideas, tasks, summary) and
 * "Transcrição" tabs. Ideas and tasks come from the summary's keyPoints
 * and actionItems.
 */
export function CapturePanel({
    recording,
    transcription,
    isTranscribing,
    onTranscribe,
    onTranscribeComplete,
}: CapturePanelProps) {
    const [tab, setTab] = useState<Tab>("essencia");
    const text = transcription?.text;
    const {
        summaryData,
        isSummarizing,
        summaryPreset,
        setSummaryPreset,
        summaryPromptOptions,
        handleSummarize,
        handleDeleteSummary,
    } = useTranscriptionSummary({
        recordingId: recording.id,
        transcriptionText: text,
    });
    const { done, toggle } = useTaskChecks(recording.id);

    const ideas = summaryData?.keyPoints ?? [];
    const tasks = summaryData?.actionItems ?? [];
    const doneCount = tasks.filter((t) => done.has(t)).length;

    const transcribeActions = (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                onClick={onTranscribe}
                size="sm"
                className="rounded-full"
                disabled={isTranscribing}
            >
                <Sparkles className="mr-1 size-4" />
                Transcrever
            </Button>
            <TranscribeInBrowserButton
                recordingId={recording.id}
                disabled={isTranscribing}
                onComplete={onTranscribeComplete ?? (() => {})}
            />
        </div>
    );

    const presetSelect = (
        <Select value={summaryPreset} onValueChange={setSummaryPreset}>
            <SelectTrigger
                className="h-8 w-[180px] text-xs"
                aria-label="Modelo de resumo"
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {summaryPromptOptions.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    return (
        <div className="space-y-5">
            <div role="tablist" className="flex gap-1 border-b">
                {(
                    [
                        ["essencia", "Essência"],
                        ["transcricao", "Transcrição"],
                    ] as const
                ).map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={tab === id}
                        onClick={() => setTab(id)}
                        className={cn(
                            "-mb-px h-10 border-b-2 px-3.5 text-sm transition-colors",
                            tab === id
                                ? "border-foreground font-semibold text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === "essencia" ? (
                isTranscribing ? (
                    <Pending label="Transcrevendo o áudio…" />
                ) : !text ? (
                    <EmptyCard
                        title="Ainda sem transcrição"
                        body="Para extrair as melhores ideias e as tarefas, primeiro transcreva esta captura."
                    >
                        {transcribeActions}
                    </EmptyCard>
                ) : isSummarizing ? (
                    <Pending label="Extraindo as melhores ideias…" />
                ) : !summaryData?.summary && ideas.length === 0 ? (
                    <EmptyCard
                        title="Pronto para extrair a essência"
                        body="A IA lê a transcrição e devolve as melhores ideias, as tarefas e um resumo."
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            {presetSelect}
                            <Button
                                onClick={handleSummarize}
                                size="sm"
                                className="rounded-full"
                            >
                                <Sparkles className="mr-1 size-4" />
                                Extrair ideias
                            </Button>
                        </div>
                    </EmptyCard>
                ) : (
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-start gap-5">
                            <section className="min-w-0 flex-[999_1_380px] space-y-3">
                                <SectionLabel>Melhores ideias</SectionLabel>
                                {ideas.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Este modelo de resumo não trouxe ideias
                                        em destaque. Tente "Pontos-chave".
                                    </p>
                                ) : (
                                    ideas.map((idea, i) => (
                                        <div
                                            key={`${i.toString()}-${idea.slice(0, 24)}`}
                                            className="flex gap-4 rounded-xl border bg-card px-4 py-3.5"
                                        >
                                            <span className="font-display text-lg font-bold text-muted-foreground tabular-nums">
                                                {String(i + 1).padStart(2, "0")}
                                            </span>
                                            <p className="min-w-0 text-[15px] leading-relaxed">
                                                <span className={HIGHLIGHT}>
                                                    {idea}
                                                </span>
                                            </p>
                                        </div>
                                    ))
                                )}
                            </section>

                            <section className="min-w-0 flex-[1_1_260px] space-y-3 rounded-xl border bg-card p-4">
                                <div className="flex items-center justify-between">
                                    <SectionLabel>Tarefas</SectionLabel>
                                    {tasks.length > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                            {doneCount} de {tasks.length}{" "}
                                            {doneCount === 1
                                                ? "feita"
                                                : "feitas"}
                                        </span>
                                    )}
                                </div>
                                {tasks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma tarefa citada nesta conversa.
                                    </p>
                                ) : (
                                    tasks.map((task, i) => {
                                        const checked = done.has(task);
                                        const id = `task-${recording.id}-${i.toString()}`;
                                        return (
                                            <label
                                                key={id}
                                                htmlFor={id}
                                                className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug"
                                            >
                                                <input
                                                    id={id}
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() =>
                                                        toggle(task)
                                                    }
                                                    className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                                                />
                                                <span
                                                    className={cn(
                                                        checked &&
                                                            "text-muted-foreground line-through",
                                                    )}
                                                >
                                                    {task}
                                                </span>
                                            </label>
                                        );
                                    })
                                )}
                            </section>
                        </div>

                        {summaryData?.summary && (
                            <section className="space-y-3">
                                <SectionLabel>Resumo</SectionLabel>
                                <div className="rounded-xl border bg-card p-4 text-sm leading-relaxed">
                                    <RichMarkdown
                                        content={summaryData.summary}
                                    />
                                </div>
                            </section>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {summaryData?.provider && (
                                    <span className="rounded bg-muted px-2 py-0.5">
                                        {summaryData.provider}
                                    </span>
                                )}
                                {summaryData?.model && (
                                    <span className="rounded bg-muted px-2 py-0.5 font-mono">
                                        {summaryData.model}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {presetSelect}
                                <Button
                                    onClick={handleSummarize}
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full"
                                >
                                    <RefreshCw className="mr-1 size-4" />
                                    Extrair de novo
                                </Button>
                                <Button
                                    onClick={handleDeleteSummary}
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="mr-1 size-4" />
                                    Excluir
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            ) : isTranscribing ? (
                <Pending label="Transcrevendo o áudio…" />
            ) : text ? (
                <div className="space-y-3">
                    <div className="max-h-[60vh] overflow-y-auto rounded-xl border bg-card p-4 text-sm leading-relaxed">
                        <SpeakerTranscript text={text} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-3">
                            {transcription?.language && (
                                <span className="flex items-center gap-1">
                                    <Languages className="size-3" />
                                    Idioma: {transcription.language}
                                </span>
                            )}
                            <span>
                                {text.trim().split(/\s+/).length} palavras
                            </span>
                        </div>
                        <Button
                            onClick={onTranscribe}
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                        >
                            <RefreshCw className="mr-1 size-4" />
                            Transcrever de novo
                        </Button>
                    </div>
                </div>
            ) : (
                <EmptyCard
                    title="Ainda sem transcrição"
                    body="Transcreva no servidor, com o seu provedor de IA, ou direto no navegador."
                >
                    {transcribeActions}
                </EmptyCard>
            )}
        </div>
    );
}

function Pending({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-12">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{label}</p>
        </div>
    );
}

function EmptyCard({
    title,
    body,
    children,
}: {
    title: string;
    body: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-start gap-3 rounded-xl border bg-card p-6">
            <h3 className="font-display text-lg font-bold tracking-tight">
                {title}
            </h3>
            <p className="max-w-prose text-sm text-muted-foreground">{body}</p>
            {children}
        </div>
    );
}
