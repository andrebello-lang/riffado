import type { FolderColor } from "@/lib/library/types";

const PLAUD_COLOR_MAP: Record<string, FolderColor> = {
    default: "gray",
    gray: "gray",
    grey: "gray",
    blue: "blue",
    green: "green",
    yellow: "yellow",
    orange: "yellow",
    cyan: "teal",
    teal: "teal",
    red: "red",
    pink: "pink",
    purple: "pink",
};

/** Plaud folder color key (e.g. "purple") to the Biblioteca palette. */
export function mapPlaudFolderColor(plaudColor: string): FolderColor {
    return PLAUD_COLOR_MAP[plaudColor.toLowerCase()] ?? "gray";
}
