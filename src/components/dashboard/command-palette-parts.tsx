"use client";

import { Command } from "cmdk";
import {
    FileText,
    Keyboard,
    Loader2,
    Mic,
    Monitor,
    Moon,
    RefreshCw,
    Settings,
    Sparkles,
    Sun,
    Upload,
} from "lucide-react";
import type { ReactNode } from "react";
import { type DateTimeFormat, formatDateTime } from "@/lib/format-date";
import { formatDurationMs } from "@/lib/format-duration";
import type { Recording } from "@/types/recording";

export const RECORDING_CAP = 200;

interface TranscriptionData {
    text?: string;
    language?: string;
}

// Mirror of the helper in `recording-list.tsx`; kept local on both sides.
export function transcriptSnippet(
    text: string | undefined,
    maxChars = 140,
): string | null {
    if (!text) return null;
    const stripped = text
        .replace(/\[[^\]]+\]/g, " ")
        .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!stripped) return null;
    if (stripped.length <= maxChars) return stripped;
    return `${stripped.slice(0, maxChars - 1).trimEnd()}…`;
}

export function Row({
    icon,
    title,
    subtitle,
    accessory,
}: {
    icon: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    accessory?: ReactNode;
}) {
    return (
        <>
            <span aria-hidden="true" className="shrink-0">
                {icon}
            </span>
            <span className="cmd-body">
                <span className="cmd-title">{title}</span>
                {subtitle ? (
                    <span className="cmd-subtitle">{subtitle}</span>
                ) : null}
            </span>
            {accessory ? (
                <span className="cmd-accessory">{accessory}</span>
            ) : null}
        </>
    );
}

export function Kbd({ children }: { children: ReactNode }) {
    return <kbd className="cmd-kbd">{children}</kbd>;
}

export function RecordingsGroup({
    recordings,
    transcriptions,
    currentRecording,
    inFlightActions,
    dateTimeFormat,
    onSelectRecording,
    onTranscribeRecording,
    runAction,
}: {
    recordings: Recording[];
    transcriptions: Map<string, TranscriptionData>;
    currentRecording: Recording | null;
    inFlightActions: Map<string, "transcribing" | "summarizing">;
    dateTimeFormat: DateTimeFormat;
    onSelectRecording: (r: Recording) => void;
    onTranscribeRecording: (id: string) => void;
    runAction: (fn: () => void) => () => void;
}) {
    if (recordings.length === 0) return null;
    const overflowCount = Math.max(0, recordings.length - RECORDING_CAP);

    return (
        <Command.Group heading="Recentes">
            {recordings.map((r) => {
                const snippet = transcriptSnippet(
                    transcriptions.get(r.id)?.text,
                );
                const inFlight = inFlightActions.get(r.id);
                const isCurrent = currentRecording?.id === r.id;

                let stateIcon: ReactNode;
                let stateLabel: string;
                if (inFlight) {
                    stateIcon = (
                        <Loader2 className="size-4 animate-spin text-primary" />
                    );
                    stateLabel =
                        inFlight === "transcribing"
                            ? "Transcrevendo"
                            : "Resumindo";
                } else if (!r.hasTranscript) {
                    stateIcon = (
                        <Mic className="size-4 text-muted-foreground" />
                    );
                    stateLabel = "Só áudio";
                } else if (!r.hasSummary) {
                    stateIcon = (
                        <FileText className="size-4 text-foreground/70" />
                    );
                    stateLabel = "Transcrita";
                } else {
                    stateIcon = <Sparkles className="size-4 text-primary" />;
                    stateLabel = "Transcrita e resumida";
                }

                const durationText =
                    r.duration != null ? formatDurationMs(r.duration) : null;
                const timeText = formatDateTime(r.startTime, dateTimeFormat);
                const subtitle: ReactNode = snippet
                    ? snippet
                    : durationText
                      ? `${durationText} · ${timeText}`
                      : timeText;

                const searchValue = [r.filename, r.id, snippet ?? ""].join(" ");

                let accessory: ReactNode = null;
                if (inFlight === "transcribing") {
                    accessory = (
                        <span className="cmd-pill">
                            <Loader2 className="size-3 animate-spin" />
                            Transcrevendo
                        </span>
                    );
                } else if (inFlight === "summarizing") {
                    accessory = (
                        <span className="cmd-pill">
                            <Loader2 className="size-3 animate-spin" />
                            Resumindo
                        </span>
                    );
                } else if (!r.hasTranscript) {
                    // stopPropagation: cmdk treats inner pointerdown as selection.
                    accessory = (
                        <button
                            type="button"
                            className="cmd-row-action"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onTranscribeRecording(r.id);
                            }}
                            aria-label={`Transcrever ${r.filename}`}
                        >
                            <Sparkles className="size-3" aria-hidden="true" />
                            Transcrever
                        </button>
                    );
                } else if (isCurrent) {
                    accessory = (
                        <span className="cmd-pill">
                            <span
                                aria-hidden="true"
                                className="inline-block size-1.5 rounded-full bg-primary"
                            />
                            Selecionada
                        </span>
                    );
                }

                return (
                    <Command.Item
                        key={r.id}
                        value={searchValue}
                        onSelect={runAction(() => onSelectRecording(r))}
                    >
                        <Row
                            icon={
                                <span title={stateLabel} aria-hidden="true">
                                    {stateIcon}
                                </span>
                            }
                            title={r.filename}
                            subtitle={subtitle}
                            accessory={accessory}
                        />
                    </Command.Item>
                );
            })}
            {overflowCount > 0 && (
                <div className="cmd-more-hint">
                    +{overflowCount} more · refine your search to narrow the
                    list
                </div>
            )}
        </Command.Group>
    );
}

export function ActionsGroup({
    onSync,
    onUpload,
    onOpenSettings,
    onOpenShortcuts,
    runAction,
}: {
    onSync: () => void;
    onUpload: () => void;
    onOpenSettings: () => void;
    onOpenShortcuts: () => void;
    runAction: (fn: () => void) => () => void;
}) {
    return (
        <Command.Group heading="Ações">
            <Command.Item onSelect={runAction(onSync)}>
                <Row
                    icon={
                        <RefreshCw className="size-4 text-muted-foreground" />
                    }
                    title="Sincronizar"
                />
            </Command.Item>
            <Command.Item onSelect={runAction(onUpload)}>
                <Row
                    icon={<Upload className="size-4 text-muted-foreground" />}
                    title="Enviar áudio"
                />
            </Command.Item>
            <Command.Item onSelect={runAction(onOpenSettings)}>
                <Row
                    icon={<Settings className="size-4 text-muted-foreground" />}
                    title="Abrir configurações"
                    accessory={<Kbd>,</Kbd>}
                />
            </Command.Item>
            <Command.Item onSelect={runAction(onOpenShortcuts)}>
                <Row
                    icon={<Keyboard className="size-4 text-muted-foreground" />}
                    title="Atalhos de teclado"
                    accessory={<Kbd>?</Kbd>}
                />
            </Command.Item>
        </Command.Group>
    );
}

export function ThemeGroup({
    currentTheme,
    onSetTheme,
    runAction,
}: {
    currentTheme: "light" | "dark" | "system";
    onSetTheme: (t: "light" | "dark" | "system") => void;
    runAction: (fn: () => void) => () => void;
}) {
    return (
        <Command.Group heading="Tema">
            <Command.Item onSelect={runAction(() => onSetTheme("light"))}>
                <Row
                    icon={<Sun className="size-4 text-muted-foreground" />}
                    title="Claro"
                    accessory={
                        currentTheme === "light" ? (
                            <span className="cmd-pill">Ativo</span>
                        ) : null
                    }
                />
            </Command.Item>
            <Command.Item onSelect={runAction(() => onSetTheme("dark"))}>
                <Row
                    icon={<Moon className="size-4 text-muted-foreground" />}
                    title="Escuro"
                    accessory={
                        currentTheme === "dark" ? (
                            <span className="cmd-pill">Ativo</span>
                        ) : null
                    }
                />
            </Command.Item>
            <Command.Item onSelect={runAction(() => onSetTheme("system"))}>
                <Row
                    icon={<Monitor className="size-4 text-muted-foreground" />}
                    title="Automático"
                    accessory={
                        currentTheme === "system" ? (
                            <span className="cmd-pill">Ativo</span>
                        ) : null
                    }
                />
            </Command.Item>
        </Command.Group>
    );
}

export function PaletteFooter({
    showTranscribeHint,
}: {
    showTranscribeHint: boolean;
}) {
    return (
        <div className="cmd-footer">
            <div className="cmd-footer-group">
                <span className="cmd-footer-hint">
                    <Kbd>↑</Kbd>
                    <Kbd>↓</Kbd>
                    navegar
                </span>
                <span className="cmd-footer-hint">
                    <Kbd>↵</Kbd>
                    abrir
                </span>
                <span className="cmd-footer-hint">
                    <Kbd>esc</Kbd>
                    fechar
                </span>
                {showTranscribeHint && (
                    <span className="cmd-footer-hint">
                        <Kbd>⌘</Kbd>
                        <Kbd>↵</Kbd>
                        transcribe
                    </span>
                )}
            </div>
            <span className="cmd-footer-hint">
                <Kbd>⌘K</Kbd>
                toggle
            </span>
        </div>
    );
}
