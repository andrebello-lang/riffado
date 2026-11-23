"use client";

import { AudioWaveform, Keyboard, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SettingsSectionHeader } from "@/components/settings/section-header";
import { SettingsCard } from "@/components/settings/settings-card";
import { ToggleRow } from "@/components/settings/toggle-row";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useSettings } from "@/hooks/use-settings";

const playbackSpeedOptions = [
    { label: "0.5x", value: 0.5 },
    { label: "0.75x", value: 0.75 },
    { label: "1x", value: 1.0 },
    { label: "1.25x", value: 1.25 },
    { label: "1.5x", value: 1.5 },
    { label: "2x", value: 2.0 },
];

export function PlaybackSection() {
    const { isLoadingSettings, isSavingSettings, setIsLoadingSettings } =
        useSettings();
    const [defaultPlaybackSpeed, setDefaultPlaybackSpeed] = useState(1.0);
    const [defaultVolume, setDefaultVolume] = useState(75);
    const [autoPlayNext, setAutoPlayNext] = useState(false);
    const [playerScrubber, setPlayerScrubber] = useState<"waveform" | "slider">(
        "waveform",
    );
    const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch("/api/settings/user");
                if (response.ok) {
                    const data = await response.json();
                    setDefaultPlaybackSpeed(data.defaultPlaybackSpeed ?? 1.0);
                    setDefaultVolume(data.defaultVolume ?? 75);
                    setAutoPlayNext(data.autoPlayNext ?? false);
                    setPlayerScrubber(
                        data.playerScrubber === "slider"
                            ? "slider"
                            : "waveform",
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

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const handlePlaybackSettingChange = async (
        updates: {
            defaultPlaybackSpeed?: number;
            defaultVolume?: number;
            autoPlayNext?: boolean;
            playerScrubber?: "waveform" | "slider";
        },
        debounceMs?: number,
    ) => {
        const previousValues: Record<string, unknown> = {};
        if (updates.defaultPlaybackSpeed !== undefined) {
            previousValues.defaultPlaybackSpeed = defaultPlaybackSpeed;
            setDefaultPlaybackSpeed(updates.defaultPlaybackSpeed);
        }
        if (updates.defaultVolume !== undefined) {
            previousValues.defaultVolume = defaultVolume;
            setDefaultVolume(updates.defaultVolume);
        }
        if (updates.autoPlayNext !== undefined) {
            previousValues.autoPlayNext = autoPlayNext;
            setAutoPlayNext(updates.autoPlayNext);
        }
        if (updates.playerScrubber !== undefined) {
            previousValues.playerScrubber = playerScrubber;
            setPlayerScrubber(updates.playerScrubber);
        }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        const performSave = async () => {
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
                if (updates.defaultPlaybackSpeed !== undefined) {
                    const prev = previousValues.defaultPlaybackSpeed;
                    if (typeof prev === "number") setDefaultPlaybackSpeed(prev);
                }
                if (updates.defaultVolume !== undefined) {
                    const prev = previousValues.defaultVolume;
                    if (typeof prev === "number") setDefaultVolume(prev);
                }
                if (updates.autoPlayNext !== undefined) {
                    const prev = previousValues.autoPlayNext;
                    if (typeof prev === "boolean") setAutoPlayNext(prev);
                }
                if (updates.playerScrubber !== undefined) {
                    const prev = previousValues.playerScrubber;
                    if (prev === "waveform" || prev === "slider") {
                        setPlayerScrubber(prev);
                    }
                }
                toast.error(
                    "Não foi possível salvar. As mudanças foram desfeitas.",
                );
            }
        };

        if (debounceMs) {
            saveTimeoutRef.current = setTimeout(performSave, debounceMs);
        } else {
            performSave();
        }
    };

    if (isLoadingSettings) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    const shortcuts: { keys: string; description: string }[] = [
        { keys: "Space", description: "Tocar / pausar" },
        { keys: "←", description: "Voltar 5 s" },
        { keys: "→", description: "Avançar 5 s" },
        { keys: "↑", description: "Aumentar volume" },
        { keys: "↓", description: "Diminuir volume" },
    ];

    return (
        <div className="space-y-6">
            <SettingsSectionHeader
                title="Reprodução"
                description="Padrões aplicados a cada captura quando ela abre no player."
                icon={Play}
            />

            <div className="space-y-3">
                {/* Speed + volume defaults grouped — the audio knobs that
                    apply at the moment a recording is selected. */}
                <SettingsCard title="Padrões de áudio">
                    <div className="space-y-2">
                        <Label htmlFor="playback-speed">
                            Velocidade padrão
                        </Label>
                        <Select
                            value={defaultPlaybackSpeed.toString()}
                            onValueChange={(value) => {
                                const speed = parseFloat(value);
                                setDefaultPlaybackSpeed(speed);
                                handlePlaybackSettingChange({
                                    defaultPlaybackSpeed: speed,
                                });
                            }}
                            disabled={isSavingSettings}
                        >
                            <SelectTrigger
                                id="playback-speed"
                                className="w-full"
                            >
                                <SelectValue>
                                    {playbackSpeedOptions.find(
                                        (opt) =>
                                            opt.value === defaultPlaybackSpeed,
                                    )?.label || "1x"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {playbackSpeedOptions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value.toString()}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="default-volume">
                                Volume padrão
                            </Label>
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {defaultVolume}%
                            </span>
                        </div>
                        <Slider
                            id="default-volume"
                            value={[defaultVolume]}
                            onValueChange={(value) => {
                                const volume = value[0] ?? 75;
                                setDefaultVolume(volume);
                                handlePlaybackSettingChange(
                                    { defaultVolume: volume },
                                    500,
                                );
                            }}
                            min={0}
                            max={100}
                            step={1}
                        />
                    </div>
                </SettingsCard>

                {/* Behavior toggles — things that change what the player
                    does, not what it sounds like. */}
                <SettingsCard title="Comportamento">
                    <ToggleRow
                        id="auto-play-next"
                        label="Tocar a próxima captura"
                        description="Ao terminar uma captura, toca a próxima automaticamente."
                        checked={autoPlayNext}
                        onCheckedChange={(checked) => {
                            setAutoPlayNext(checked);
                            handlePlaybackSettingChange({
                                autoPlayNext: checked,
                            });
                        }}
                        disabled={isSavingSettings}
                    />
                </SettingsCard>

                {/* Visual appearance of the player itself. */}
                <SettingsCard title="Aparência">
                    <div className="space-y-2">
                        <Label
                            htmlFor="player-scrubber"
                            className="flex items-center gap-2"
                        >
                            <AudioWaveform className="size-4 text-muted-foreground" />
                            Estilo da linha do tempo
                        </Label>
                        <Select
                            value={playerScrubber}
                            onValueChange={(value) => {
                                const next =
                                    value === "slider" ? "slider" : "waveform";
                                handlePlaybackSettingChange({
                                    playerScrubber: next,
                                });
                            }}
                            disabled={isSavingSettings}
                        >
                            <SelectTrigger
                                id="player-scrubber"
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="waveform">
                                    Forma de onda (padrão)
                                </SelectItem>
                                <SelectItem value="slider">
                                    Barra de progresso
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            A forma de onda mostra a intensidade do áudio e é
                            gerada no navegador na primeira vez. A barra de
                            progresso é mais simples e não precisa disso.
                        </p>
                    </div>
                </SettingsCard>

                {/* Reference — read-only. Lives in the same card system
                    so the visual rhythm doesn't break at the bottom. */}
                <SettingsCard
                    title={
                        <span className="inline-flex items-center gap-2">
                            <Keyboard
                                className="size-4 text-muted-foreground"
                                aria-hidden="true"
                            />
                            Atalhos de teclado
                        </span>
                    }
                    description="Funcionam quando o player está em foco."
                >
                    <ul className="space-y-1.5">
                        {shortcuts.map((s) => (
                            <li
                                key={s.keys}
                                className="flex items-center justify-between text-sm"
                            >
                                <span>{s.description}</span>
                                <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border bg-muted px-1.5 font-mono text-[11px] text-foreground">
                                    {s.keys}
                                </kbd>
                            </li>
                        ))}
                    </ul>
                </SettingsCard>
            </div>
        </div>
    );
}
