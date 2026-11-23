"use client";

import { FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SettingsSectionHeader } from "@/components/settings/section-header";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/use-settings";

// ISO-639-1 codes from Whisper's supported-languages list. Sticking to
// languages with non-trivial user populations to keep the dropdown
// scannable. Auto-detect already covers everything Whisper handles —
// these entries just let users force a language for noisy recordings
// or when auto-detect mis-routes (Slavic / Romance neighbours).
const languageOptions = [
    { label: "Detectar automaticamente", value: null },
    { label: "Inglês", value: "en" },
    { label: "Espanhol", value: "es" },
    { label: "Francês", value: "fr" },
    { label: "Alemão", value: "de" },
    { label: "Italiano", value: "it" },
    { label: "Português", value: "pt" },
    { label: "Holandês", value: "nl" },
    { label: "Sueco", value: "sv" },
    { label: "Dinamarquês", value: "da" },
    { label: "Norueguês", value: "no" },
    { label: "Finlandês", value: "fi" },
    { label: "Polonês", value: "pl" },
    { label: "Tcheco", value: "cs" },
    { label: "Ucraniano", value: "uk" },
    { label: "Russo", value: "ru" },
    { label: "Romeno", value: "ro" },
    { label: "Húngaro", value: "hu" },
    { label: "Grego", value: "el" },
    { label: "Turco", value: "tr" },
    { label: "Árabe", value: "ar" },
    { label: "Hebraico", value: "he" },
    { label: "Híndi", value: "hi" },
    { label: "Indonésio", value: "id" },
    { label: "Vietnamita", value: "vi" },
    { label: "Tailandês", value: "th" },
    { label: "Chinês", value: "zh" },
    { label: "Japonês", value: "ja" },
    { label: "Coreano", value: "ko" },
];

const qualityOptions = [
    {
        label: "Rápida",
        value: "fast",
        description: "Mais rápida, menos precisa",
    },
    {
        label: "Equilibrada",
        value: "balanced",
        description: "Bom equilíbrio entre velocidade e precisão",
    },
    {
        label: "Precisa",
        value: "accurate",
        description: "Mais precisa, mais lenta",
    },
];

export function TranscriptionSection() {
    const { isLoadingSettings, isSavingSettings, setIsLoadingSettings } =
        useSettings();
    const [isSaving, setIsSaving] = useState(false);
    const [autoTranscribe, setAutoTranscribe] = useState(false);
    const [defaultTranscriptionLanguage, setDefaultTranscriptionLanguage] =
        useState<string | null>(null);
    const [transcriptionQuality, setTranscriptionQuality] =
        useState("balanced");
    const [speakerDiarization, setSpeakerDiarization] = useState(true);
    const [diarizationSpeakerCount, setDiarizationSpeakerCount] = useState<
        number | null
    >(null);
    const [autoGenerateTitle, setAutoGenerateTitle] = useState(true);
    const [syncTitleToPlaud, setSyncTitleToPlaud] = useState(false);
    const [importPlaudContent, setImportPlaudContent] = useState(false);
    const [transcriptMode, setTranscriptMode] = useState("plaud_only");
    const [preferredTranscriptSource, setPreferredTranscriptSource] =
        useState("plaud");
    const pendingChangesRef = useRef<Map<string, unknown>>(new Map());

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch("/api/settings/user");
                if (response.ok) {
                    const data = await response.json();
                    setAutoTranscribe(data.autoTranscribe ?? false);
                    setDefaultTranscriptionLanguage(
                        data.defaultTranscriptionLanguage ?? null,
                    );
                    setTranscriptionQuality(
                        data.transcriptionQuality ?? "balanced",
                    );
                    setSpeakerDiarization(data.speakerDiarization ?? true);
                    setDiarizationSpeakerCount(
                        data.diarizationSpeakerCount ?? null,
                    );
                    setAutoGenerateTitle(data.autoGenerateTitle ?? true);
                    setSyncTitleToPlaud(data.syncTitleToPlaud ?? false);
                    setImportPlaudContent(data.importPlaudContent ?? false);
                    setTranscriptMode(data.transcriptMode ?? "plaud_only");
                    setPreferredTranscriptSource(
                        data.preferredTranscriptSource ?? "plaud",
                    );
                }
            } catch (error) {
                console.error("Failed to fetch settings:", error);
            } finally {
                setIsLoadingSettings(false);
            }
        };
        fetchSettings();
    }, [setIsLoadingSettings]);

    const handleAutoTranscribeChange = async (checked: boolean) => {
        const previous = autoTranscribe;
        setAutoTranscribe(checked);
        pendingChangesRef.current.set("autoTranscribe", previous);

        setIsSaving(true);
        try {
            const response = await fetch("/api/settings/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ autoTranscribe: checked }),
            });

            if (!response.ok) {
                throw new Error("Failed to save settings");
            }

            pendingChangesRef.current.delete("autoTranscribe");
        } catch {
            setAutoTranscribe(previous);
            pendingChangesRef.current.delete("autoTranscribe");
            toast.error(
                "Não foi possível salvar. As mudanças foram desfeitas.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleImportSettingChange = async (updates: {
        importPlaudContent?: boolean;
        transcriptMode?: string;
        preferredTranscriptSource?: string;
    }) => {
        const prev = {
            importPlaudContent,
            transcriptMode,
            preferredTranscriptSource,
        };
        if (updates.importPlaudContent !== undefined) {
            setImportPlaudContent(updates.importPlaudContent);
        }
        if (updates.transcriptMode !== undefined) {
            setTranscriptMode(updates.transcriptMode);
        }
        if (updates.preferredTranscriptSource !== undefined) {
            setPreferredTranscriptSource(updates.preferredTranscriptSource);
        }

        setIsSaving(true);
        try {
            const response = await fetch("/api/settings/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (!response.ok) {
                throw new Error("Failed to save settings");
            }
        } catch {
            setImportPlaudContent(prev.importPlaudContent);
            setTranscriptMode(prev.transcriptMode);
            setPreferredTranscriptSource(prev.preferredTranscriptSource);
            toast.error(
                "Não foi possível salvar. As mudanças foram desfeitas.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleTranscriptionSettingChange = async (updates: {
        defaultTranscriptionLanguage?: string | null;
        transcriptionQuality?: string;
        speakerDiarization?: boolean;
        diarizationSpeakerCount?: number | null;
        autoGenerateTitle?: boolean;
        syncTitleToPlaud?: boolean;
    }) => {
        if (updates.defaultTranscriptionLanguage !== undefined) {
            const previous = defaultTranscriptionLanguage;
            setDefaultTranscriptionLanguage(
                updates.defaultTranscriptionLanguage,
            );
            pendingChangesRef.current.set(
                "defaultTranscriptionLanguage",
                previous,
            );
        }
        if (updates.transcriptionQuality !== undefined) {
            const previous = transcriptionQuality;
            setTranscriptionQuality(updates.transcriptionQuality);
            pendingChangesRef.current.set("transcriptionQuality", previous);
        }
        if (updates.speakerDiarization !== undefined) {
            const previous = speakerDiarization;
            setSpeakerDiarization(updates.speakerDiarization);
            pendingChangesRef.current.set("speakerDiarization", previous);
        }
        if (updates.diarizationSpeakerCount !== undefined) {
            const previous = diarizationSpeakerCount;
            setDiarizationSpeakerCount(updates.diarizationSpeakerCount);
            pendingChangesRef.current.set("diarizationSpeakerCount", previous);
        }
        if (updates.autoGenerateTitle !== undefined) {
            const previous = autoGenerateTitle;
            setAutoGenerateTitle(updates.autoGenerateTitle);
            pendingChangesRef.current.set("autoGenerateTitle", previous);
        }
        if (updates.syncTitleToPlaud !== undefined) {
            const previous = syncTitleToPlaud;
            setSyncTitleToPlaud(updates.syncTitleToPlaud);
            pendingChangesRef.current.set("syncTitleToPlaud", previous);
        }

        setIsSaving(true);
        try {
            const response = await fetch("/api/settings/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                throw new Error("Failed to save settings");
            }

            if (updates.defaultTranscriptionLanguage !== undefined) {
                pendingChangesRef.current.delete(
                    "defaultTranscriptionLanguage",
                );
            }
            if (updates.transcriptionQuality !== undefined) {
                pendingChangesRef.current.delete("transcriptionQuality");
            }
            if (updates.speakerDiarization !== undefined) {
                pendingChangesRef.current.delete("speakerDiarization");
            }
            if (updates.diarizationSpeakerCount !== undefined) {
                pendingChangesRef.current.delete("diarizationSpeakerCount");
            }
            if (updates.autoGenerateTitle !== undefined) {
                pendingChangesRef.current.delete("autoGenerateTitle");
            }
            if (updates.syncTitleToPlaud !== undefined) {
                pendingChangesRef.current.delete("syncTitleToPlaud");
            }
        } catch {
            if (updates.defaultTranscriptionLanguage !== undefined) {
                const previous = pendingChangesRef.current.get(
                    "defaultTranscriptionLanguage",
                );
                if (
                    previous !== undefined &&
                    (typeof previous === "string" || previous === null)
                ) {
                    setDefaultTranscriptionLanguage(previous);
                    pendingChangesRef.current.delete(
                        "defaultTranscriptionLanguage",
                    );
                }
            }
            if (updates.transcriptionQuality !== undefined) {
                const previous = pendingChangesRef.current.get(
                    "transcriptionQuality",
                );
                if (previous !== undefined && typeof previous === "string") {
                    setTranscriptionQuality(previous);
                    pendingChangesRef.current.delete("transcriptionQuality");
                }
            }
            if (updates.speakerDiarization !== undefined) {
                const previous =
                    pendingChangesRef.current.get("speakerDiarization");
                if (previous !== undefined && typeof previous === "boolean") {
                    setSpeakerDiarization(previous);
                    pendingChangesRef.current.delete("speakerDiarization");
                }
            }
            if (updates.diarizationSpeakerCount !== undefined) {
                const previous = pendingChangesRef.current.get(
                    "diarizationSpeakerCount",
                );
                if (
                    previous !== undefined &&
                    (typeof previous === "number" || previous === null)
                ) {
                    setDiarizationSpeakerCount(previous);
                    pendingChangesRef.current.delete("diarizationSpeakerCount");
                }
            }
            if (updates.autoGenerateTitle !== undefined) {
                const previous =
                    pendingChangesRef.current.get("autoGenerateTitle");
                if (previous !== undefined && typeof previous === "boolean") {
                    setAutoGenerateTitle(previous);
                    pendingChangesRef.current.delete("autoGenerateTitle");
                }
            }
            if (updates.syncTitleToPlaud !== undefined) {
                const previous =
                    pendingChangesRef.current.get("syncTitleToPlaud");
                if (previous !== undefined && typeof previous === "boolean") {
                    setSyncTitleToPlaud(previous);
                    pendingChangesRef.current.delete("syncTitleToPlaud");
                }
            }
            toast.error(
                "Não foi possível salvar. As mudanças foram desfeitas.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingSettings) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SettingsSectionHeader
                title="Transcrição"
                description="Padrões e provedor usados para transformar áudio em texto."
                icon={FileText}
            />
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                        <Label htmlFor="auto-transcribe" className="text-base">
                            Transcrever capturas novas automaticamente
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Transcreve as capturas assim que chegam do Plaud
                        </p>
                    </div>
                    <Switch
                        id="auto-transcribe"
                        checked={autoTranscribe}
                        onCheckedChange={handleAutoTranscribeChange}
                        disabled={isSavingSettings || isSaving}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                        <Label
                            htmlFor="import-plaud-content"
                            className="text-base"
                        >
                            Importar transcrições e resumos do Plaud
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Quando o Plaud já transcreveu uma gravação, traz a
                            transcrição e o resumo dele na sincronização, em vez
                            de refazer com o seu provedor de IA.
                        </p>
                    </div>
                    <Switch
                        id="import-plaud-content"
                        checked={importPlaudContent}
                        onCheckedChange={(checked) =>
                            handleImportSettingChange({
                                importPlaudContent: checked,
                            })
                        }
                        disabled={isSavingSettings || isSaving}
                    />
                </div>

                {importPlaudContent && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="transcript-mode">
                                Quando o Plaud tem transcrição
                            </Label>
                            <Select
                                value={transcriptMode}
                                onValueChange={(value) =>
                                    handleImportSettingChange({
                                        transcriptMode: value,
                                    })
                                }
                                disabled={isSavingSettings || isSaving}
                            >
                                <SelectTrigger
                                    id="transcript-mode"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="plaud_only">
                                        Usar só a do Plaud (economiza créditos
                                        de IA)
                                    </SelectItem>
                                    <SelectItem value="keep_both">
                                        Manter as duas: também usar meu provedor
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Manter as duas também transcreve com o seu
                                provedor, para você comparar.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="preferred-transcript-source">
                                Transcrição principal
                            </Label>
                            <Select
                                value={preferredTranscriptSource}
                                onValueChange={(value) =>
                                    handleImportSettingChange({
                                        preferredTranscriptSource: value,
                                    })
                                }
                                disabled={isSavingSettings || isSaving}
                            >
                                <SelectTrigger
                                    id="preferred-transcript-source"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="plaud">Plaud</SelectItem>
                                    <SelectItem value="riffado">
                                        Meu provedor
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Aparece por padrão e é usada nos resumos quando
                                existem as duas.
                            </p>
                        </div>
                    </>
                )}

                <div className="space-y-2">
                    <Label htmlFor="transcription-language">
                        Idioma padrão da transcrição
                    </Label>
                    <Select
                        value={defaultTranscriptionLanguage || "auto"}
                        onValueChange={(value) => {
                            const lang = value === "auto" ? null : value;
                            setDefaultTranscriptionLanguage(lang);
                            handleTranscriptionSettingChange({
                                defaultTranscriptionLanguage: lang,
                            });
                        }}
                        disabled={isSavingSettings || isSaving}
                    >
                        <SelectTrigger
                            id="transcription-language"
                            className="w-full"
                        >
                            <SelectValue>
                                {languageOptions.find(
                                    (opt) =>
                                        opt.value ===
                                        defaultTranscriptionLanguage,
                                )?.label || "Detectar automaticamente"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {languageOptions.map((option) => (
                                <SelectItem
                                    key={option.value || "auto"}
                                    value={option.value || "auto"}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Idioma usado na transcrição. Detectar automaticamente
                        identifica o idioma sozinho.
                    </p>
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                        <Label
                            htmlFor="speaker-diarization"
                            className="text-base"
                        >
                            Identificar quem fala
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Separa a transcrição por pessoa (Speaker 1:, Speaker
                            2:). Funciona com o ElevenLabs Scribe; outros
                            provedores ignoram.
                        </p>
                    </div>
                    <Switch
                        id="speaker-diarization"
                        checked={speakerDiarization}
                        onCheckedChange={(checked) => {
                            setSpeakerDiarization(checked);
                            handleTranscriptionSettingChange({
                                speakerDiarization: checked,
                            });
                        }}
                        disabled={isSavingSettings || isSaving}
                    />
                </div>

                {speakerDiarization && (
                    <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                        <Label htmlFor="diarization-speaker-count">
                            Quantas pessoas falam
                        </Label>
                        <Select
                            value={
                                diarizationSpeakerCount === null
                                    ? "auto"
                                    : String(diarizationSpeakerCount)
                            }
                            onValueChange={(value) => {
                                const count =
                                    value === "auto" ? null : Number(value);
                                handleTranscriptionSettingChange({
                                    diarizationSpeakerCount: count,
                                });
                            }}
                            disabled={isSavingSettings || isSaving}
                        >
                            <SelectTrigger
                                id="diarization-speaker-count"
                                className="w-full"
                            >
                                <SelectValue>
                                    {diarizationSpeakerCount === null
                                        ? "Automático"
                                        : String(diarizationSpeakerCount)}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">Automático</SelectItem>
                                {Array.from(
                                    { length: 32 },
                                    (_, i) => i + 1,
                                ).map((count) => (
                                    <SelectItem
                                        key={count}
                                        value={String(count)}
                                    >
                                        {count}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            É só uma dica, não um limite. Automático funciona
                            bem na maioria das capturas.
                        </p>
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="transcription-quality">
                        Qualidade da transcrição
                    </Label>
                    <Select
                        value={transcriptionQuality}
                        onValueChange={(value) => {
                            setTranscriptionQuality(value);
                            handleTranscriptionSettingChange({
                                transcriptionQuality: value,
                            });
                        }}
                        disabled={isSavingSettings || isSaving}
                    >
                        <SelectTrigger
                            id="transcription-quality"
                            className="w-full"
                        >
                            <SelectValue>
                                {qualityOptions.find(
                                    (opt) => opt.value === transcriptionQuality,
                                )?.label || "Equilibrada"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {qualityOptions.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    <div>
                                        <div>{option.label}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {option.description}
                                        </div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Equilíbrio entre velocidade e precisão
                    </p>
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                        <Label
                            htmlFor="auto-generate-title"
                            className="text-base"
                        >
                            Gerar títulos automaticamente
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Cria títulos descritivos a partir da transcrição,
                            com IA
                        </p>
                    </div>
                    <Switch
                        id="auto-generate-title"
                        checked={autoGenerateTitle}
                        onCheckedChange={(checked) => {
                            setAutoGenerateTitle(checked);
                            handleTranscriptionSettingChange({
                                autoGenerateTitle: checked,
                            });
                        }}
                        disabled={isSavingSettings || isSaving}
                    />
                </div>

                {autoGenerateTitle && (
                    <div className="flex items-center justify-between pl-4 border-l-2 border-primary/20">
                        <div className="space-y-0.5 flex-1">
                            <Label
                                htmlFor="sync-title-plaud"
                                className="text-base"
                            >
                                Mandar títulos para o Plaud
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Atualiza o nome do arquivo no Plaud quando o
                                título é gerado
                            </p>
                        </div>
                        <Switch
                            id="sync-title-plaud"
                            checked={syncTitleToPlaud}
                            onCheckedChange={(checked) => {
                                setSyncTitleToPlaud(checked);
                                handleTranscriptionSettingChange({
                                    syncTitleToPlaud: checked,
                                });
                            }}
                            disabled={isSavingSettings || isSaving}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
