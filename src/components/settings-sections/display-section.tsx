"use client";

import { Monitor } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SettingsSectionHeader } from "@/components/settings/section-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/hooks/use-settings";

const dateTimeFormatOptions = [
    {
        label: "Relativo",
        value: "relative",
        description: "ex.: há 2 horas",
    },
    {
        label: "Data e hora",
        value: "absolute",
        description: "ex.: 15 de jan. de 2024, 15:45",
    },
    {
        label: "ISO",
        value: "iso",
        description: "ex.: 2024-01-15T15:45:00Z",
    },
];

const sortOrderOptions = [
    { label: "Mais recentes primeiro", value: "newest" },
    { label: "Mais antigas primeiro", value: "oldest" },
    { label: "Por nome", value: "name" },
];

const themeOptions = [
    { label: "Claro", value: "light" },
    { label: "Escuro", value: "dark" },
    {
        label: "Sistema",
        value: "system",
        description: "Segue o tema do aparelho",
    },
];

export function DisplaySection() {
    const { isLoadingSettings, isSavingSettings, setIsLoadingSettings } =
        useSettings();
    const [dateTimeFormat, setDateTimeFormat] = useState("relative");
    const [recordingListSortOrder, setRecordingListSortOrder] =
        useState("newest");
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [theme, setTheme] = useState("system");
    const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch("/api/settings/user");
                if (response.ok) {
                    const data = await response.json();
                    setDateTimeFormat(data.dateTimeFormat ?? "relative");
                    setRecordingListSortOrder(
                        data.recordingListSortOrder ?? "newest",
                    );
                    setItemsPerPage(data.itemsPerPage ?? 50);
                    setTheme(data.theme ?? "system");
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

    const handleDisplaySettingChange = async (
        updates: {
            dateTimeFormat?: string;
            recordingListSortOrder?: string;
            itemsPerPage?: number;
            theme?: string;
        },
        debounceMs?: number,
    ) => {
        const previousValues: Record<string, unknown> = {};
        if (updates.dateTimeFormat !== undefined) {
            previousValues.dateTimeFormat = dateTimeFormat;
            setDateTimeFormat(updates.dateTimeFormat);
        }
        if (updates.recordingListSortOrder !== undefined) {
            previousValues.recordingListSortOrder = recordingListSortOrder;
            setRecordingListSortOrder(updates.recordingListSortOrder);
        }
        if (updates.itemsPerPage !== undefined) {
            previousValues.itemsPerPage = itemsPerPage;
            setItemsPerPage(updates.itemsPerPage);
        }
        if (updates.theme !== undefined) {
            previousValues.theme = theme;
            setTheme(updates.theme);
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
                if (updates.dateTimeFormat !== undefined) {
                    const prev = previousValues.dateTimeFormat;
                    if (typeof prev === "string") setDateTimeFormat(prev);
                }
                if (updates.recordingListSortOrder !== undefined) {
                    const prev = previousValues.recordingListSortOrder;
                    if (typeof prev === "string")
                        setRecordingListSortOrder(prev);
                }
                if (updates.itemsPerPage !== undefined) {
                    const prev = previousValues.itemsPerPage;
                    if (typeof prev === "number") setItemsPerPage(prev);
                }
                if (updates.theme !== undefined) {
                    const prev = previousValues.theme;
                    if (typeof prev === "string") setTheme(prev);
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

    return (
        <div className="space-y-6">
            <SettingsSectionHeader
                title="Exibição"
                description="Como datas, listas e a interface aparecem."
                icon={Monitor}
            />
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="date-time-format">
                        Formato de data e hora
                    </Label>
                    <Select
                        value={dateTimeFormat}
                        onValueChange={(value) => {
                            setDateTimeFormat(value);
                            handleDisplaySettingChange({
                                dateTimeFormat: value,
                            });
                        }}
                        disabled={isSavingSettings}
                    >
                        <SelectTrigger id="date-time-format" className="w-full">
                            <SelectValue>
                                {dateTimeFormatOptions.find(
                                    (opt) => opt.value === dateTimeFormat,
                                )?.label || "Relativo"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {dateTimeFormatOptions.map((option) => (
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

                <div className="space-y-2">
                    <Label htmlFor="sort-order">
                        Ordem da lista de capturas
                    </Label>
                    <Select
                        value={recordingListSortOrder}
                        onValueChange={(value) => {
                            setRecordingListSortOrder(value);
                            handleDisplaySettingChange({
                                recordingListSortOrder: value,
                            });
                        }}
                        disabled={isSavingSettings}
                    >
                        <SelectTrigger id="sort-order" className="w-full">
                            <SelectValue>
                                {sortOrderOptions.find(
                                    (opt) =>
                                        opt.value === recordingListSortOrder,
                                )?.label || "Mais recentes primeiro"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {sortOrderOptions.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="items-per-page">Itens por página</Label>
                    <Input
                        id="items-per-page"
                        type="number"
                        min={10}
                        max={100}
                        value={itemsPerPage}
                        onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            if (
                                !Number.isNaN(value) &&
                                value >= 10 &&
                                value <= 100
                            ) {
                                setItemsPerPage(value);
                                handleDisplaySettingChange(
                                    { itemsPerPage: value },
                                    500,
                                );
                            }
                        }}
                    />
                    <p className="text-xs text-muted-foreground">
                        Number of recordings to display per page (10-100)
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="theme">Tema</Label>
                    <Select
                        value={theme}
                        onValueChange={(value) => {
                            setTheme(value);
                            handleDisplaySettingChange({ theme: value });
                        }}
                        disabled={isSavingSettings}
                    >
                        <SelectTrigger id="theme" className="w-full">
                            <SelectValue>
                                {themeOptions.find((opt) => opt.value === theme)
                                    ?.label || "Sistema"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {themeOptions.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    <div>
                                        <div>{option.label}</div>
                                        {option.description && (
                                            <div className="text-xs text-muted-foreground">
                                                {option.description}
                                            </div>
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
