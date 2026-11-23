"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ShortcutRow {
    keys: string[];
    description: string;
}

const groups: { title: string; rows: ShortcutRow[] }[] = [
    {
        title: "Geral",
        rows: [
            { keys: ["⌘", "K"], description: "Busca e comandos" },
            { keys: ["?"], description: "Mostrar esta lista" },
            { keys: [","], description: "Abrir configurações" },
            { keys: ["/"], description: "Ir para a busca" },
        ],
    },
    {
        title: "Lista de capturas",
        rows: [
            { keys: ["j"], description: "Próxima captura" },
            { keys: ["k"], description: "Captura anterior" },
            // No `Enter → Focus player` row here: selecting a recording
            // via j/k already mounts the player; there's no separate
            // "focus the player" gesture and adding one would conflict
            // with the search box's Enter handler.
        ],
    },
    {
        title: "Player",
        rows: [
            { keys: ["Space"], description: "Tocar / pausar" },
            { keys: ["←"], description: "Voltar 5 s" },
            { keys: ["→"], description: "Avançar 5 s" },
            { keys: ["↑"], description: "Aumentar volume" },
            { keys: ["↓"], description: "Diminuir volume" },
        ],
    },
];

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-foreground shadow-sm">
            {children}
        </kbd>
    );
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Atalhos de teclado</DialogTitle>
                    <DialogDescription>
                        Atalhos disponíveis em todo o painel.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-5">
                    {groups.map((group) => (
                        <div key={group.title}>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {group.title}
                            </h3>
                            <ul className="space-y-1.5">
                                {group.rows.map((row) => (
                                    <li
                                        key={row.description}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <span className="text-foreground">
                                            {row.description}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            {row.keys.map((k) => (
                                                <Kbd key={k}>{k}</Kbd>
                                            ))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
