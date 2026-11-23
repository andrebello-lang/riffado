"use client";

import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsSectionHeader } from "@/components/settings/section-header";
import { Button } from "@/components/ui/button";
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

const exportFormatOptions = [
    { label: "JSON", value: "json", description: "Dados estruturados" },
    { label: "TXT", value: "txt", description: "Texto simples" },
    { label: "SRT", value: "srt", description: "Legenda" },
    { label: "VTT", value: "vtt", description: "Legenda WebVTT" },
];

const backupFrequencyOptions = [
    { label: "Nunca", value: "never" },
    { label: "Diário", value: "daily" },
    { label: "Semanal", value: "weekly" },
    { label: "Mensal", value: "monthly" },
];

interface ExportJobStatus {
    id: string;
    // "expired" is a client-facing derived status: the server reports it
    // instead of "completed" once `expiresAt` has passed, even if the
    // row hasn't been swept from the DB yet (the cleanup worker keeps it
    // until the storage delete actually succeeds).
    status: "pending" | "processing" | "completed" | "failed" | "expired";
    createdAt: string;
    completedAt: string | null;
    expiresAt: string | null;
    recordingCount: number | null;
    fileSize: number | null;
    errorMessage: string | null;
}

const ACTIVE_STATUSES = new Set(["pending", "processing"]);
const POLL_INTERVAL_MS = 4000;

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(1)} ${units[unitIndex]}`;
}

interface ExportSectionProps {
    onReRunOnboarding?: () => void;
}

export function ExportSection({ onReRunOnboarding }: ExportSectionProps) {
    const { isLoadingSettings, isSavingSettings, setIsLoadingSettings } =
        useSettings();
    const [defaultExportFormat, setDefaultExportFormat] = useState("json");
    const [autoExport, setAutoExport] = useState(false);
    const [backupFrequency, setBackupFrequency] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isStartingBackup, setIsStartingBackup] = useState(false);
    const [backupJob, setBackupJob] = useState<ExportJobStatus | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch("/api/settings/user");
                if (response.ok) {
                    const data = await response.json();
                    setDefaultExportFormat(data.defaultExportFormat ?? "json");
                    setAutoExport(data.autoExport ?? false);
                    setBackupFrequency(data.backupFrequency ?? null);
                }
            } catch (error) {
                console.error("Failed to fetch settings:", error);
            } finally {
                setIsLoadingSettings(false);
            }
        };
        fetchSettings();
    }, [setIsLoadingSettings]);

    // Pick up the most recent job on load -- covers reopening Settings
    // after starting a backup elsewhere, or arriving from the
    // "export ready" email.
    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await fetch("/api/backup");
                if (!response.ok) return;
                const data = await response.json();
                if (data.jobs?.[0]) setBackupJob(data.jobs[0]);
            } catch {
                // Non-fatal -- the user can still start a fresh backup.
            }
        };
        fetchJobs();
    }, []);

    // Poll while a job is active. Stops itself once the job leaves
    // pending/processing, so there's no polling overhead once idle.
    // Single-flight by construction: the next poll is only scheduled
    // from the previous one's `finally`, so a slow response (>4s)
    // can't cause overlapping in-flight requests and duplicate
    // terminal-state handling (extra toasts).
    useEffect(() => {
        if (!backupJob || !ACTIVE_STATUSES.has(backupJob.status)) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;

        const poll = async () => {
            try {
                const response = await fetch(`/api/backup/${backupJob.id}`);
                if (!cancelled && response.ok) {
                    const data = await response.json();
                    if (!cancelled) {
                        setBackupJob(data.job);
                        if (data.job.status === "completed") {
                            toast.success("Backup pronto para baixar");
                        } else if (data.job.status === "failed") {
                            toast.error("O backup falhou");
                        }
                    }
                }
            } catch {
                // Transient -- the next tick will retry.
            } finally {
                if (!cancelled) {
                    timer = setTimeout(poll, POLL_INTERVAL_MS);
                }
            }
        };
        timer = setTimeout(poll, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [backupJob]);

    const handleExportBackupSettingChange = async (updates: {
        defaultExportFormat?: string;
        autoExport?: boolean;
        backupFrequency?: string | null;
    }) => {
        const previousValues: Record<string, unknown> = {};
        if (updates.defaultExportFormat !== undefined) {
            previousValues.defaultExportFormat = defaultExportFormat;
            setDefaultExportFormat(updates.defaultExportFormat);
        }
        if (updates.autoExport !== undefined) {
            previousValues.autoExport = autoExport;
            setAutoExport(updates.autoExport);
        }
        if (updates.backupFrequency !== undefined) {
            previousValues.backupFrequency = backupFrequency;
            setBackupFrequency(updates.backupFrequency);
        }

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
            if (updates.defaultExportFormat !== undefined) {
                const prev = previousValues.defaultExportFormat;
                if (typeof prev === "string") setDefaultExportFormat(prev);
            }
            if (updates.autoExport !== undefined) {
                const prev = previousValues.autoExport;
                if (typeof prev === "boolean") setAutoExport(prev);
            }
            if (updates.backupFrequency !== undefined) {
                const prev = previousValues.backupFrequency;
                if (typeof prev === "string" || prev === null)
                    setBackupFrequency(prev);
            }
            toast.error(
                "Não foi possível salvar. As mudanças foram desfeitas.",
            );
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await fetch(
                `/api/export?format=${defaultExportFormat}`,
            );
            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download =
                response.headers
                    .get("Content-Disposition")
                    ?.split("filename=")[1]
                    ?.replace(/"/g, "") || `export.${defaultExportFormat}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success("Exportação concluída");
        } catch {
            toast.error("Não foi possível exportar as capturas");
        } finally {
            setIsExporting(false);
        }
    };

    const handleStartBackup = async () => {
        setIsStartingBackup(true);
        try {
            const response = await fetch("/api/backup", { method: "POST" });
            if (!response.ok) throw new Error("Backup request failed");
            const data = await response.json();
            setBackupJob(data.job);
            toast.success(
                ACTIVE_STATUSES.has(data.job.status)
                    ? "Backup iniciado. Pode levar alguns minutos se houver muitas capturas."
                    : "Backup pronto para baixar",
            );
        } catch {
            toast.error("Não foi possível iniciar o backup");
        } finally {
            setIsStartingBackup(false);
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
                title="Exportar e backup"
                description="Leve seus dados com você: capturas, transcrições e resumos."
                icon={Download}
            />
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="export-format">
                        Formato padrão de exportação
                    </Label>
                    <Select
                        value={defaultExportFormat}
                        onValueChange={(value) => {
                            setDefaultExportFormat(value);
                            handleExportBackupSettingChange({
                                defaultExportFormat: value,
                            });
                        }}
                        disabled={isSavingSettings}
                    >
                        <SelectTrigger id="export-format" className="w-full">
                            <SelectValue>
                                {exportFormatOptions.find(
                                    (opt) => opt.value === defaultExportFormat,
                                )?.label || "JSON"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {exportFormatOptions.map((option) => (
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
                </div>

                <div className="flex items-center justify-between opacity-60">
                    <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="auto-export" className="text-base">
                                Exportar capturas novas automaticamente
                            </Label>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                Em breve
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Exporta as capturas assim que forem sincronizadas
                        </p>
                    </div>
                    <Switch
                        id="auto-export"
                        checked={autoExport}
                        onCheckedChange={(checked) => {
                            setAutoExport(checked);
                            handleExportBackupSettingChange({
                                autoExport: checked,
                            });
                        }}
                        disabled={true}
                    />
                </div>

                <div className="space-y-2 opacity-60">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="backup-frequency">
                            Frequência do backup
                        </Label>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            Em breve
                        </span>
                    </div>
                    <Select
                        value={backupFrequency || "never"}
                        onValueChange={(value) => {
                            const frequency = value === "never" ? null : value;
                            setBackupFrequency(frequency);
                            handleExportBackupSettingChange({
                                backupFrequency: frequency,
                            });
                        }}
                        disabled={true}
                    >
                        <SelectTrigger id="backup-frequency" className="w-full">
                            <SelectValue>
                                {backupFrequencyOptions.find(
                                    (opt) =>
                                        opt.value ===
                                        (backupFrequency || "never"),
                                )?.label || "Nunca"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {backupFrequencyOptions.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        De quanto em quanto tempo criar backups automáticos
                    </p>
                </div>
            </div>

            <div className="pt-4 border-t space-y-3">
                <div className="space-y-2">
                    <Label className="text-base">Ações</Label>
                    <Button
                        onClick={async () => {
                            try {
                                await fetch("/api/settings/user", {
                                    method: "PUT",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        onboardingCompleted: false,
                                    }),
                                });
                                onReRunOnboarding?.();
                            } catch {
                                toast.error(
                                    "Não foi possível reiniciar a configuração inicial",
                                );
                            }
                        }}
                        variant="outline"
                        className="w-full"
                    >
                        <RefreshCw className="size-4 mr-2" />
                        Refazer a configuração inicial
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Mostra a configuração inicial de novo na próxima visita
                    </p>
                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={handleExport}
                            disabled={isExporting}
                            variant="outline"
                            className="flex-1"
                        >
                            {isExporting ? (
                                <>
                                    <div className="animate-spin size-4 mr-2 border-2 border-primary border-t-transparent rounded-full" />
                                    Exporting…
                                </>
                            ) : (
                                <>
                                    <Download className="size-4 mr-2" />
                                    Exportar texto
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={handleStartBackup}
                            disabled={
                                isStartingBackup ||
                                (backupJob !== null &&
                                    ACTIVE_STATUSES.has(backupJob.status))
                            }
                            variant="outline"
                            className="flex-1"
                        >
                            {isStartingBackup ||
                            (backupJob !== null &&
                                ACTIVE_STATUSES.has(backupJob.status)) ? (
                                <>
                                    <div className="animate-spin size-4 mr-2 border-2 border-primary border-t-transparent rounded-full" />
                                    Building archive…
                                </>
                            ) : (
                                <>
                                    <Download className="size-4 mr-2" />
                                    Criar backup completo
                                </>
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        "Exportar texto" baixa na hora as transcrições e os
                        resumos. "Criar backup completo" também junta os áudios
                        originais num arquivo zip; com muitas capturas leva
                        alguns minutos e você recebe um e-mail quando ficar
                        pronto. O backup fica disponível por 7 dias, e um backup
                        novo com todos os áudios substitui o anterior.
                    </p>
                    {backupJob && (
                        <div className="rounded-md border p-3 text-sm space-y-1">
                            {backupJob.status === "completed" && (
                                <div className="flex items-center justify-between gap-2">
                                    <span>
                                        Backup pronto
                                        {backupJob.recordingCount !== null &&
                                            ` \u2014 ${backupJob.recordingCount} recording${backupJob.recordingCount === 1 ? "" : "s"}`}
                                        {backupJob.fileSize !== null &&
                                            ` (${formatBytes(backupJob.fileSize)})`}
                                    </span>
                                    <Button asChild size="sm">
                                        <a
                                            href={`/api/backup/${backupJob.id}/download`}
                                        >
                                            <Download className="size-4 mr-2" />
                                            Baixar
                                        </a>
                                    </Button>
                                </div>
                            )}
                            {ACTIVE_STATUSES.has(backupJob.status) && (
                                <span className="text-muted-foreground">
                                    Montando o arquivo
                                    {backupJob.status === "pending"
                                        ? " (queued)"
                                        : ""}
                                    …
                                </span>
                            )}
                            {backupJob.status === "failed" && (
                                <span className="text-destructive">
                                    O backup falhou. Tente de novo.
                                </span>
                            )}
                            {backupJob.status === "expired" && (
                                <span className="text-muted-foreground">
                                    Esse backup expirou. Crie um novo para
                                    baixar de novo.
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
