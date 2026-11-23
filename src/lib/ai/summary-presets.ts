export type SummaryPreset =
    | "general"
    | "meeting-notes"
    | "key-points"
    | "action-items";

export interface SummaryPromptConfig {
    id: SummaryPreset;
    name: string;
    description: string;
    prompt: string;
}

export interface CustomSummaryPrompt {
    id: string;
    name: string;
    prompt: string;
    createdAt: string;
}

export interface SummaryPromptConfiguration {
    /** Preset id or custom prompt id. */
    selectedPrompt: string;
    customPrompts: CustomSummaryPrompt[];
}

export const SUMMARY_PRESETS: Record<SummaryPreset, SummaryPromptConfig> = {
    general: {
        id: "general",
        name: "Resumo geral",
        description: "Resumo curto de qualquer captura",
        prompt: `Provide a concise summary of this audio transcription. Then extract key points and action items if any exist.

Respond in the following JSON format (no markdown, no code fences):
{
  "summary": "A concise paragraph summarizing the transcription",
  "keyPoints": ["key point 1", "key point 2"],
  "actionItems": ["action item 1", "action item 2"]
}

If there are no key points or action items, return empty arrays.

Transcription:
{transcription}`,
    },
    "meeting-notes": {
        id: "meeting-notes",
        name: "Ata de reunião",
        description: "Resumo da reunião com participantes, decisões e tarefas",
        prompt: `Summarize this meeting recording. Include attendees mentioned, decisions made, and action items.

Respond in the following JSON format (no markdown, no code fences):
{
  "summary": "A structured summary of the meeting including attendees and decisions",
  "keyPoints": ["decision 1", "decision 2", "key discussion point"],
  "actionItems": ["action item with owner if mentioned", "follow-up task"]
}

If there are no key points or action items, return empty arrays.

Transcription:
{transcription}`,
    },
    "key-points": {
        id: "key-points",
        name: "Pontos-chave",
        description: "As ideias principais em tópicos",
        prompt: `Extract the key points from this transcription. Focus on the most important information, facts, and insights.

Respond in the following JSON format (no markdown, no code fences):
{
  "summary": "A brief one-sentence overview of the transcription",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "actionItems": []
}

Transcription:
{transcription}`,
    },
    "action-items": {
        id: "action-items",
        name: "Tarefas",
        description: "Todas as tarefas e próximos passos citados",
        prompt: `Extract all action items, tasks, and follow-ups mentioned in this transcription. Include who is responsible if mentioned.

Respond in the following JSON format (no markdown, no code fences):
{
  "summary": "A brief overview of what was discussed",
  "keyPoints": [],
  "actionItems": ["action item 1 (owner if known)", "task 2", "follow-up 3"]
}

If there are no action items, return an empty array but still provide a summary.

Transcription:
{transcription}`,
    },
};

export function getSummaryPromptForPreset(preset: SummaryPreset): string {
    return SUMMARY_PRESETS[preset].prompt;
}

export function getDefaultSummaryPromptConfig(): SummaryPromptConfiguration {
    return {
        selectedPrompt: "general",
        customPrompts: [],
    };
}

export function getAllSummaryPrompts(
    config: SummaryPromptConfiguration,
): Array<{
    id: string;
    name: string;
    description: string;
    prompt: string;
    isPreset: boolean;
}> {
    const presets = Object.values(SUMMARY_PRESETS).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        prompt: p.prompt,
        isPreset: true,
    }));

    const customs = config.customPrompts.map((p) => ({
        id: p.id,
        name: p.name,
        description: "Modelo personalizado",
        prompt: p.prompt,
        isPreset: false,
    }));

    return [...presets, ...customs];
}

export interface AiOutputLanguageOption {
    code: string;
    label: string;
}

export const AI_OUTPUT_LANGUAGES: readonly AiOutputLanguageOption[] = [
    { code: "auto", label: "Automático (igual à transcrição)" },
    { code: "en", label: "Inglês" },
    { code: "es", label: "Espanhol" },
    { code: "fr", label: "Francês" },
    { code: "de", label: "Alemão" },
    { code: "it", label: "Italiano" },
    { code: "pt", label: "Português" },
    { code: "nl", label: "Holandês" },
    { code: "pl", label: "Polonês" },
    { code: "ru", label: "Russo" },
    { code: "tr", label: "Turco" },
    { code: "uk", label: "Ucraniano" },
    { code: "cs", label: "Tcheco" },
    { code: "sv", label: "Sueco" },
    { code: "da", label: "Dinamarquês" },
    { code: "no", label: "Norueguês" },
    { code: "fi", label: "Finlandês" },
    { code: "el", label: "Grego" },
    { code: "ro", label: "Romeno" },
    { code: "hu", label: "Húngaro" },
    { code: "ja", label: "Japonês" },
    { code: "zh", label: "Chinês (simplificado)" },
    { code: "ko", label: "Coreano" },
    { code: "ar", label: "Árabe" },
    { code: "he", label: "Hebraico" },
    { code: "hi", label: "Híndi" },
    { code: "id", label: "Indonésio" },
    { code: "vi", label: "Vietnamita" },
    { code: "th", label: "Tailandês" },
] as const;

const LANGUAGE_CODES = new Set(AI_OUTPUT_LANGUAGES.map((l) => l.code));

/** Validate against `AI_OUTPUT_LANGUAGES`; returns the code or null. */
export function normalizeAiOutputLanguage(value: unknown): string | null {
    if (typeof value !== "string") return null;
    return LANGUAGE_CODES.has(value) ? value : null;
}

/** Directive sentence for the model; null for `auto`/missing/unknown. */
export function getAiOutputLanguageDirective(
    code: string | null | undefined,
): string | null {
    if (!code || code === "auto") return null;
    const match = AI_OUTPUT_LANGUAGES.find((l) => l.code === code);
    if (!match) return null;
    return `IMPORTANT: Write all natural-language output in ${match.label}, regardless of the transcription's language. Keep any JSON keys in English exactly as specified.`;
}

export function getSummaryPromptById(
    id: string,
    config: SummaryPromptConfiguration,
): string | null {
    if (id in SUMMARY_PRESETS) {
        return SUMMARY_PRESETS[id as SummaryPreset].prompt;
    }

    const custom = config.customPrompts.find((p) => p.id === id);
    return custom?.prompt || null;
}

/**
 * Validate an untrusted `summaryPrompt` payload before it's encrypted and
 * stored. Only shape is checked (strings where expected, array of
 * well-formed custom-prompt entries) -- this is user-owned settings data,
 * not a cross-user boundary, but a malformed value would otherwise be
 * silently encrypted and only surface as a broken dropdown or a crash in
 * `getAllSummaryPrompts` on the next read.
 */
export function isValidSummaryPromptConfig(
    value: unknown,
): value is SummaryPromptConfiguration {
    if (typeof value !== "object" || value === null) return false;
    const config = value as Record<string, unknown>;
    if (typeof config.selectedPrompt !== "string") return false;
    if (!Array.isArray(config.customPrompts)) return false;
    return config.customPrompts.every(
        (p) =>
            typeof p === "object" &&
            p !== null &&
            typeof (p as Record<string, unknown>).id === "string" &&
            typeof (p as Record<string, unknown>).name === "string" &&
            typeof (p as Record<string, unknown>).prompt === "string" &&
            typeof (p as Record<string, unknown>).createdAt === "string",
    );
}
