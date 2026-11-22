"use client";

import { Check, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
    FOLDER_ICON_COMPONENTS,
    FolderIcon,
} from "@/components/library/folder-icon";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DEFAULT_FOLDER_COLOR,
    DEFAULT_FOLDER_ICON,
    FOLDER_COLOR_LABELS,
    FOLDER_COLOR_SWATCHES,
    FOLDER_COLORS,
    FOLDER_ICONS,
    type FolderColor,
    type FolderIconKey,
    MAX_FOLDER_NAME_LENGTH,
} from "@/lib/library/types";
import { cn } from "@/lib/utils";

export interface FolderLook {
    color: FolderColor;
    icon: FolderIconKey;
}

/**
 * "Criar nova pasta" / "Editar pasta", modelled on the Plaud app: a name
 * field plus an "Ícone" row that opens the "Escolher um ícone" step
 * (big preview, seven colors, glyph grid, Concluído).
 */
export function FolderNameDialog({
    open,
    title,
    description,
    initialName = "",
    initialColor = DEFAULT_FOLDER_COLOR,
    initialIcon = DEFAULT_FOLDER_ICON,
    confirmLabel = "Salvar",
    onSubmit,
    onClose,
}: {
    open: boolean;
    title: string;
    description?: string;
    initialName?: string;
    initialColor?: FolderColor;
    initialIcon?: FolderIconKey;
    confirmLabel?: string;
    onSubmit: (name: string, look: FolderLook) => Promise<boolean>;
    onClose: () => void;
}) {
    const [step, setStep] = useState<"form" | "icon">("form");
    const [name, setName] = useState(initialName);
    const [look, setLook] = useState<FolderLook>({
        color: initialColor,
        icon: initialIcon,
    });
    // Picker edits a draft so closing it with ✕ discards the change.
    const [draft, setDraft] = useState<FolderLook>(look);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setStep("form");
            setName(initialName);
            setLook({ color: initialColor, icon: initialIcon });
        }
    }, [open, initialName, initialColor, initialIcon]);

    const submit = async () => {
        if (!name.trim() || busy) return;
        setBusy(true);
        const ok = await onSubmit(name.trim(), look);
        setBusy(false);
        if (ok) onClose();
    };

    const close = () => {
        if (busy) return;
        if (step === "icon") setStep("form");
        else onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && close()}>
            <DialogContent className="gap-5 sm:max-w-md">
                {step === "form" ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-xl">
                                {title}
                            </DialogTitle>
                            {description && (
                                <DialogDescription>
                                    {description}
                                </DialogDescription>
                            )}
                        </DialogHeader>
                        <label className="flex items-center gap-4 rounded-lg border border-foreground/60 px-4 py-3 focus-within:border-foreground">
                            <span className="w-14 shrink-0 text-sm">nome</span>
                            <input
                                value={name}
                                maxLength={MAX_FOLDER_NAME_LENGTH}
                                placeholder="Obrigatório"
                                autoFocus
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        void submit();
                                    }
                                }}
                                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                setDraft(look);
                                setStep("icon");
                            }}
                            className="flex items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent"
                        >
                            <span className="flex-1 text-sm">Ícone</span>
                            <FolderIcon
                                color={look.color}
                                icon={look.icon}
                                className="size-8"
                            />
                            <ChevronRight className="size-4 text-muted-foreground" />
                        </button>
                        <Button
                            size="lg"
                            className="w-full"
                            onClick={() => void submit()}
                            disabled={busy || !name.trim()}
                        >
                            {busy && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            {confirmLabel}
                        </Button>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-xl">
                                Escolher um ícone
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Cor e desenho da pasta
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-center py-1">
                            <FolderIcon
                                color={draft.color}
                                icon={draft.icon}
                                className="size-16"
                            />
                        </div>
                        <div className="flex justify-between gap-2">
                            {FOLDER_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() =>
                                        setDraft((d) => ({ ...d, color: c }))
                                    }
                                    title={FOLDER_COLOR_LABELS[c]}
                                    aria-label={FOLDER_COLOR_LABELS[c]}
                                    aria-pressed={draft.color === c}
                                    className={cn(
                                        "flex size-9 items-center justify-center rounded-md transition-transform hover:scale-105",
                                        FOLDER_COLOR_SWATCHES[c],
                                    )}
                                >
                                    {draft.color === c && (
                                        <Check className="size-4 text-black/70" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="border-t" />
                        <div className="grid max-h-[40vh] grid-cols-7 gap-2 overflow-y-auto pr-1">
                            {FOLDER_ICONS.map((key) => {
                                const Glyph = FOLDER_ICON_COMPONENTS[key];
                                const selected = draft.icon === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() =>
                                            setDraft((d) => ({
                                                ...d,
                                                icon: key,
                                            }))
                                        }
                                        aria-label={key}
                                        aria-pressed={selected}
                                        className={cn(
                                            "flex aspect-square items-center justify-center rounded-md border transition-colors hover:bg-accent",
                                            selected
                                                ? "border-foreground"
                                                : "border-border/60",
                                        )}
                                    >
                                        <Glyph className="size-5" />
                                    </button>
                                );
                            })}
                        </div>
                        <Button
                            size="lg"
                            variant="secondary"
                            className="w-full bg-foreground text-background hover:bg-foreground/90"
                            onClick={() => {
                                setLook(draft);
                                setStep("form");
                            }}
                        >
                            Concluído
                        </Button>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
