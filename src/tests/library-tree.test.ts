import { describe, expect, it } from "vitest";
import {
    descendantIds,
    folderDepth,
    folderPath,
    type LibraryFolder,
    sortFolders,
} from "@/lib/library/types";

const f = (
    id: string,
    parentId: string | null,
    name: string,
    sortOrder = 0,
): LibraryFolder => ({
    id,
    parentId,
    name,
    color: "blue",
    icon: "folder",
    sortOrder,
    createdAt: "2026-11-22T00:00:00.000Z",
});

const tree = [
    f("v", null, "Visitação"),
    f("j", "v", "Julliany"),
    f("d", "j", "Dia 1"),
    f("l", null, "Laboratório"),
];

describe("library tree helpers", () => {
    it("collects a folder and everything below it", () => {
        expect([...descendantIds(tree, "v")].sort()).toEqual(["d", "j", "v"]);
        expect([...descendantIds(tree, "l")]).toEqual(["l"]);
    });

    it("computes depth and path", () => {
        expect(folderDepth(tree, null)).toBe(0);
        expect(folderDepth(tree, "v")).toBe(1);
        expect(folderDepth(tree, "d")).toBe(3);
        expect(folderPath(tree, "d")).toBe("Visitação › Julliany › Dia 1");
    });

    it("survives a corrupt cycle without looping forever", () => {
        const cyclic = [f("a", "b", "A"), f("b", "a", "B")];
        expect(folderDepth(cyclic, "a")).toBe(2);
        expect(descendantIds(cyclic, "a").size).toBe(2);
    });

    it("sorts by order, then name with pt-BR accents", () => {
        const sorted = sortFolders([
            f("1", null, "Visitação"),
            f("2", null, "álbum"),
            f("3", null, "Comercial"),
        ]);
        expect(sorted.map((x) => x.name)).toEqual([
            "álbum",
            "Comercial",
            "Visitação",
        ]);
    });
});
