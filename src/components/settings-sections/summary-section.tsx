"use client";

import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { SettingsSectionHeader } from "@/components/settings/section-header";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import {
    AI_OUTPUT_LANGUAGES,
    type CustomSummaryPrompt,
    SUMMARY_PRESETS,
    type SummaryPromptConfiguration,
} from "@/lib/ai/summary-presets";

type EditingPrompt = {
    id?: string;
    name: string;
    prompt: string;
};

// Sentinel value used by the auto-summarize preset Select to represent
// "use the user's default prompt". The DB stores this as NULL.
const AUTO_PRESET_DEFAULT = "__default__";

export function SummarySection() {
    const confirm = useConfirm();
    const { isLoadingSettings, isSavingSettings, setIsLoadingSettings } =
        useSettings();
    const [selectedPrompt, setSelectedPrompt] = useState("general");
    const [customPrompts, setCustomPrompts] = useState<CustomSummaryPrompt[]>(
        [],
    );
    const [outputLanguage, setOutputLanguage] = useState<string>("auto");
    const [editingCustomPrompt, setEditingCustomPrompt] =
        useState<EditingPrompt | null>(null);
    const [viewingPromptId, setViewingPromptId] = useState<string | null>(null);
    const [autoSummarize, setAutoSummarize] = useState(false);
    const [autoSummarizePreset, setAutoSummarizePreset] = useState<
        string | null
    >(null);

    // Per-control AbortController refs so a fast-double-toggle can't let
    // a slow earlier save fail *after* a newer save succeeded and clobber
    // the displayed state with stale `previous` values. Each handler
    // aborts its predecessor and bails out of rollback when its own
    // controller is no longer the latest.
    const promptAbortRef = useRef<AbortController | null>(null);
    const languageAbortRef = useRef<AbortController | null>(null);
    const autoSummarizeAbortRef = useRef<AbortController | null>(null);
    const autoPresetAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch("/api/settings/user");
                if (response.ok) {
                    const data = await response.json();
                    const config =
                        data.summaryPrompt as SummaryPromptConfiguration | null;
                    if (config?.selectedPrompt) {
                        setSelectedPrompt(config.selectedPrompt);
                    }
                    setCustomPrompts(config?.customPrompts || []);
                    if (typeof data.aiOutputLanguage === "string") {
                        setOutputLanguage(data.aiOutputLanguage);
                    } else {
                        setOutputLanguage("auto");
                    }
                    setAutoSummarize(data.autoSummarize === true);
                    setAutoSummarizePreset(
                        typeof data.autoSummarizePreset === "string"
                            ? data.autoSummarizePreset
                            : null,
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

    /**
     * Always echoes the current `customPrompts` back to the server.
     * Sending a partial config here previously wiped custom prompts on
     * every preset change (issue #199) -- `selectedPrompt` and
     * `customPrompts` are one config object and must be saved together.
     */
    const savePromptConfig = async (
        config: SummaryPromptConfiguration,
        signal?: AbortSignal,
    ) => {
        const response = await fetch("/api/settings/user", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ summaryPrompt: config }),
            signal,
        });
        if (!response.ok) {
            throw new Error("Failed to save settings");
        }
    };

    const handlePresetChange = async (value: string) => {
        promptAbortRef.current?.abort();
        const ctrl = new AbortController();
        promptAbortRef.current = ctrl;
        const previous = selectedPrompt;
        setSelectedPrompt(value);

        try {
            await savePromptConfig(
                { selectedPrompt: value, customPrompts },
                ctrl.signal,
            );
        } catch {
            // Skip the rollback if a newer click already started a fresh
            // save: the latest click owns the displayed state, and
            // restoring `previous` here would resurrect an outdated value.
            if (promptAbortRef.current !== ctrl) return;
            setSelectedPrompt(previous);
            toast.error(
                "Não foi possível salvar. As mudanças foram desfeitas.",
            );
        }
    };

    const handleSaveCustomPrompt = async (prompt: EditingPrompt) => {
        const previousPrompts = customPrompts;
        const isEdit = !!prompt.id;
        const newPrompt: CustomSummaryPrompt = {
            id: prompt.id || nanoid(),
            name: prompt.name,
            prompt: prompt.prompt,
            createdAt: isEdit
                ? customPrompts.find((p) => p.id === prompt.id)?.createdAt ||
                  new Date().toISOString()
                : new Date().toISOString(),
        };

        const updatedPrompts = isEdit
            ? customPrompts.map((p) => (p.id === prompt.id ? newPrompt : p))
            : [...customPrompts, newPrompt];

        setCustomPrompts(updatedPrompts);
        setEditingCustomPrompt(null);

        try {
            await savePromptConfig({
                selectedPrompt,
                customPrompts: updatedPrompts,
            });
            toast.success("Modelo salvo");
        } catch {
            // Roll back the optimistic update -- otherwise a later save
            // (e.g. a preset change) would echo this rejected mutation
            // back to the server as if it had succeeded.
            setCustomPrompts(previousPrompts);
            toast.error(
                "Não foi possível salvar o modelo. As mudanças foram desfeitas.",
            );
        }
    };

    const handleDeleteCustomPrompt = (id: string) => {
        void confirm({
            title: "Excluir este modelo personalizado?",
            description:
                "As capturas já resumidas com ele mantêm os resumos, mas não será possível usá-lo de novo.",
            confirmLabel: "Excluir",
            destructive: true,
            onConfirm: async () => {
                const previousPrompts = customPrompts;
                const previousSelectedPrompt = selectedPrompt;
                const updatedPrompts = customPrompts.filter((p) => p.id !== id);
                const newSelectedPrompt =
                    selectedPrompt === id ? "general" : selectedPrompt;
                setCustomPrompts(updatedPrompts);
                setSelectedPrompt(newSelectedPrompt);
                try {
                    await savePromptConfig({
                        selectedPrompt: newSelectedPrompt,
                        customPrompts: updatedPrompts,
                    });
                } catch {
                    // Roll back both -- same reasoning as the save path above.
                    setCustomPrompts(previousPrompts);
                    setSelectedPrompt(previousSelectedPrompt);
                    toast.error(
                        "Não foi possível excluir o modelo. As mudanças foram desfeitas.",
                    );
                }
            },
        });
    };

    const handleLanguageChange = async (value: string) => {
        languageAbortRef.current?.abort();
        const ctrl = new AbortController();
        languageAbortRef.current = ctrl;
        const previous = outputLanguage;
        setOutputLanguage(value);

        try {
            // Persist `null` for `auto` so the column reflects "no preference".
            const response = await fetch("/api/settings/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    aiOutputLanguage: value === "auto" ? null : value,
                }),
                signal: ctrl.signal,
            });

            if (!response.ok) {
                throw new Error("Failed to save settings");
            }
        } catch {
            if (languageAbortRef.current !== ctrl) return;
            setOutputLanguage(previous);
            toast.error(
                "Não foi possível salvar. As mudanças foram desfeitas.",
            );
        }
    };

    const handleAutoSummarizeChange = async (checked: boolean) => {
        autoSummarizeAbortRef.current?.abort();
        const ctrl = new AbortController();
        autoSummarizeAbortRef.current = ctrl;
        const previous = autoSummarize;
        setAutoSummarize(checked);
        try {
            const response = await fetch("/api/settings/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ autoSummarize: checked }),
                signal: ctrl.signal,
            });
            if (!response.ok) {
                throw new Error("Failed to save settings");
            }
        } catch {
            if (autoSummarizeAbortRef.current !== ctrl) return;
            setAutoSummarize(previous);
            toast.error(
                "Não foi possível salvar. As mudanças foram desfeitas.",
            );
        }
    };

    const handleAutoPresetChange = async (value: string) => {
        autoPresetAbortRef.current?.abort();
        const ctrl = new AbortController();
        autoPresetAbortRef.current = ctrl;
        const previous = autoSummarizePreset;
        const next = value === AUTO_PRESET_DEFAULT ? null : value;
        setAutoSummarizePreset(next);
        try {
            const response = await fetch("/api/settings/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ autoSummarizePreset: next }),
                signal: ctrl.signal,
            });
            if (!response.ok) {
                throw new Error("Failed to save settings");
            }
        } catch {
            if (autoPresetAbortRef.current !== ctrl) return;
            setAutoSummarizePreset(previous);
            toast.error(
                "Não foi possível salvar. As mudanças foram desfeitas.",
            );
        }
    };

    if (isLoadingSettings) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    const viewingCustom = customPrompts.find((p) => p.id === viewingPromptId);
    const viewingPreset =
        viewingPromptId &&
        SUMMARY_PRESETS[viewingPromptId as keyof typeof SUMMARY_PRESETS];
    const viewingText = viewingPreset
        ? viewingPreset.prompt
        : viewingCustom?.prompt || "";
    const viewingName = viewingPreset
        ? viewingPreset.name
        : viewingCustom?.name || "Modelo";
    const viewingDescription = viewingPreset
        ? viewingPreset.description
        : "Modelo personalizado";
    const autoPresetValue = autoSummarizePreset ?? AUTO_PRESET_DEFAULT;

    return (
        <div className="space-y-6">
            <SettingsSectionHeader
                title="Resumo"
                description="Modelos e provedor usados para gerar os resumos das capturas."
                icon={ListChecks}
            />
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="summary-preset">
                        Modelo de resumo padrão
                    </Label>
                    <Select
                        value={selectedPrompt}
                        onValueChange={handlePresetChange}
                        disabled={isSavingSettings}
                    >
                        <SelectTrigger id="summary-preset" className="w-full">
                            <SelectValue>
                                {SUMMARY_PRESETS[
                                    selectedPrompt as keyof typeof SUMMARY_PRESETS
                                ]?.name ||
                                    customPrompts.find(
                                        (p) => p.id === selectedPrompt,
                                    )?.name ||
                                    "Resumo geral"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {Object.values(SUMMARY_PRESETS).map((preset) => (
                                <SelectItem key={preset.id} value={preset.id}>
                                    <div>
                                        <div>{preset.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {preset.description}
                                        </div>
                                    </div>
                                </SelectItem>
                            ))}
                            {customPrompts.map((prompt) => (
                                <SelectItem key={prompt.id} value={prompt.id}>
                                    <div>
                                        <div>{prompt.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            Modelo personalizado
                                        </div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        O modelo usado para gerar resumos. Dá para trocar em
                        cada captura.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ai-output-language">
                        Idioma das respostas da IA
                    </Label>
                    <Select
                        value={outputLanguage}
                        onValueChange={handleLanguageChange}
                        disabled={isSavingSettings}
                    >
                        <SelectTrigger
                            id="ai-output-language"
                            className="w-full"
                        >
                            <SelectValue>
                                {AI_OUTPUT_LANGUAGES.find(
                                    (l) => l.code === outputLanguage,
                                )?.label ?? "Automático (igual à transcrição)"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {AI_OUTPUT_LANGUAGES.map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                    {lang.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Vale para resumos e títulos gerados pela IA. Automático
                        usa o mesmo idioma da transcrição.
                    </p>
                </div>
                <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5 flex-1">
                        <Label htmlFor="auto-summarize" className="text-base">
                            Gerar resumo depois da transcrição
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Roda depois de toda transcrição concluída: manual,
                            automática ou refeita. Ative a transcrição
                            automática para cobrir também as capturas novas.
                            Cada resumo gera uma chamada a mais ao provedor de
                            IA.
                        </p>
                    </div>
                    <Switch
                        id="auto-summarize"
                        checked={autoSummarize}
                        onCheckedChange={handleAutoSummarizeChange}
                        disabled={isSavingSettings}
                    />
                </div>
                {autoSummarize && (
                    <div className="space-y-2">
                        <Label htmlFor="auto-summarize-preset">
                            Modelo do resumo automático
                        </Label>
                        <Select
                            value={autoPresetValue}
                            onValueChange={handleAutoPresetChange}
                            disabled={isSavingSettings}
                        >
                            <SelectTrigger
                                id="auto-summarize-preset"
                                className="w-full"
                            >
                                <SelectValue>
                                    {autoPresetValue === AUTO_PRESET_DEFAULT
                                        ? "Usar o modelo de resumo padrão"
                                        : SUMMARY_PRESETS[
                                              autoPresetValue as keyof typeof SUMMARY_PRESETS
                                          ]?.name ||
                                          "Usar o modelo de resumo padrão"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={AUTO_PRESET_DEFAULT}>
                                    <div>
                                        <div>
                                            Usar o modelo de resumo padrão
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Segue o modelo escolhido acima
                                        </div>
                                    </div>
                                </SelectItem>
                                {Object.values(SUMMARY_PRESETS).map(
                                    (preset) => (
                                        <SelectItem
                                            key={preset.id}
                                            value={preset.id}
                                        >
                                            <div>
                                                <div>{preset.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {preset.description}
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Escolha outro modelo para o resumo automático (ex.:
                            "Tarefas" para reuniões) sem mudar o padrão manual
                            acima.
                        </p>
                    </div>
                )}
            </div>

            {/* Custom summary prompts */}
            <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                        Modelos de resumo personalizados
                    </h3>
                    <Button
                        onClick={() =>
                            setEditingCustomPrompt({ name: "", prompt: "" })
                        }
                        size="sm"
                    >
                        <Plus className="size-4 mr-2" />
                        Adicionar modelo
                    </Button>
                </div>
                {customPrompts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum modelo personalizado ainda. Crie um para começar.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {customPrompts.map((prompt) => (
                            <div
                                key={prompt.id}
                                className="p-4 border rounded-lg"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium">
                                                {prompt.name}
                                            </h4>
                                            {selectedPrompt === prompt.id && (
                                                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/20">
                                                    Ativo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setViewingPromptId(prompt.id)
                                            }
                                        >
                                            Ver
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setEditingCustomPrompt({
                                                    id: prompt.id,
                                                    name: prompt.name,
                                                    prompt: prompt.prompt,
                                                })
                                            }
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleDeleteCustomPrompt(
                                                    prompt.id,
                                                )
                                            }
                                        >
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* View prompt dialog */}
            {viewingPromptId && (
                <Dialog
                    open={!!viewingPromptId}
                    onOpenChange={(open) => !open && setViewingPromptId(null)}
                >
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogTitle>{viewingName}</DialogTitle>
                        <DialogDescription>
                            {viewingDescription}
                        </DialogDescription>
                        <div className="mt-4">
                            <pre className="p-4 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                                {viewingText}
                            </pre>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Edit/create custom prompt dialog */}
            {editingCustomPrompt && (
                <Dialog
                    open={!!editingCustomPrompt}
                    onOpenChange={(open) =>
                        !open && setEditingCustomPrompt(null)
                    }
                >
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogTitle>
                            {editingCustomPrompt.id
                                ? "Editar modelo personalizado"
                                : "Criar modelo personalizado"}
                        </DialogTitle>
                        <DialogDescription>
                            Crie um modelo para gerar resumos. Use{" "}
                            <code className="px-1 py-0.5 bg-muted rounded">
                                {"{transcription}"}
                            </code>{" "}
                            no lugar do texto da transcrição. O modelo precisa
                            responder um objeto JSON com os campos{" "}
                            <code className="px-1 py-0.5 bg-muted rounded">
                                summary
                            </code>
                            ,{" "}
                            <code className="px-1 py-0.5 bg-muted rounded">
                                keyPoints
                            </code>
                            e{" "}
                            <code className="px-1 py-0.5 bg-muted rounded">
                                actionItems
                            </code>
                            .
                        </DialogDescription>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="custom-summary-prompt-name">
                                    Nome
                                </Label>
                                <Input
                                    id="custom-summary-prompt-name"
                                    value={editingCustomPrompt.name}
                                    onChange={(e) =>
                                        setEditingCustomPrompt((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      name: e.target.value,
                                                  }
                                                : prev,
                                        )
                                    }
                                    placeholder="Meu modelo"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="custom-summary-prompt-text">
                                    Modelo
                                </Label>
                                <textarea
                                    id="custom-summary-prompt-text"
                                    className="w-full min-h-[300px] px-3 py-2 text-sm border rounded-md resize-y font-mono"
                                    value={editingCustomPrompt.prompt}
                                    onChange={(e) =>
                                        setEditingCustomPrompt((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      prompt: e.target.value,
                                                  }
                                                : prev,
                                        )
                                    }
                                    placeholder={`Detect the type of recording (meeting, lecture, personal note, interview) and summarize it accordingly.

Respond in the following JSON format (no markdown, no code fences):
{
  "summary": "A concise paragraph summarizing the transcription",
  "keyPoints": ["key point 1", "key point 2"],
  "actionItems": ["action item 1", "action item 2"]
}

If there are no key points or action items, return empty arrays.

Transcription:
{transcription}`}
                                />
                                {editingCustomPrompt.prompt &&
                                    !editingCustomPrompt.prompt.includes(
                                        "{transcription}",
                                    ) && (
                                        <p className="text-xs text-amber-600 dark:text-amber-500">
                                            Este modelo não inclui{" "}
                                            <code className="px-1 py-0.5 bg-muted rounded">
                                                {"{transcription}"}
                                            </code>{" "}
                                            : a transcrição não será inserida e
                                            a IA verá só este texto.
                                        </p>
                                    )}
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditingCustomPrompt(null)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (
                                            !editingCustomPrompt.name ||
                                            !editingCustomPrompt.prompt
                                        ) {
                                            toast.error(
                                                "Nome e modelo são obrigatórios",
                                            );
                                            return;
                                        }
                                        handleSaveCustomPrompt(
                                            editingCustomPrompt,
                                        );
                                    }}
                                    disabled={
                                        !editingCustomPrompt.name ||
                                        !editingCustomPrompt.prompt
                                    }
                                >
                                    {editingCustomPrompt.id
                                        ? "Salvar"
                                        : "Criar"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
