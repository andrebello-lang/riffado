"use client";

import { FolderIcon } from "@/components/library/folder-icon";
import { useLibrary } from "@/components/library/library-context";
import { cn } from "@/lib/utils";

/** "📁 Imersão de Closer" line under a recording in the list, as in Plaud. */
export function RecordingFolderLine({
    recordingId,
    className,
}: {
    recordingId: string;
    className?: string;
}) {
    const lib = useLibrary();
    const folderId = lib?.assignments[recordingId];
    const folder = folderId
        ? lib?.folders.find((f) => f.id === folderId)
        : undefined;
    if (!folder) return null;
    return (
        <p
            className={cn(
                "flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground",
                className,
            )}
        >
            <FolderIcon
                color={folder.color}
                icon={folder.icon}
                className="size-3.5"
            />
            <span className="truncate">{folder.name}</span>
        </p>
    );
}
