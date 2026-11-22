"use client";

import { Inbox } from "lucide-react";
import { FolderIcon } from "@/components/library/folder-icon";
import { useLibrary } from "@/components/library/library-context";
import { folderPath } from "@/lib/library/types";

/** "📁 Visitação" chip for the player; click to move the recording. */
export function FolderChip({ recordingId }: { recordingId: string }) {
    const lib = useLibrary();
    if (!lib) return null;
    const folderId = lib.assignments[recordingId];
    const folder = folderId
        ? lib.folders.find((f) => f.id === folderId)
        : undefined;
    return (
        <button
            type="button"
            onClick={() => lib.openMoveDialog([recordingId])}
            title="Mover para outra pasta"
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
            {folder ? (
                <FolderIcon
                    color={folder.color}
                    icon={folder.icon}
                    className="size-4"
                />
            ) : (
                <Inbox className="size-3.5 shrink-0" />
            )}
            <span className="truncate">
                {folder ? folderPath(lib.folders, folder.id) : "Sem pasta"}
            </span>
        </button>
    );
}
