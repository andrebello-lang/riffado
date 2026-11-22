import { describe, expect, it } from "vitest";
import { mapPlaudFolderColor } from "@/lib/library/plaud-colors";
import { buildPlaudFolderLayout } from "@/lib/plaud/v4-folders";
import type { PlaudV4Node, PlaudV4RecordingItem } from "@/types/plaud";

const SYS = {
    folder_id: "n_system_mem_x_1",
    name: "Recordings",
    system_folder_type: 1,
};
const IMERSAO = {
    folder_id: "on_fd_imersao",
    name: "Imersão de Closer",
    system_folder_type: 0,
};
const DIA1 = { folder_id: "n_dia1", name: "Dia 1", system_folder_type: 0 };

const items: PlaudV4RecordingItem[] = [
    {
        file_id: "of_aaa",
        node_id: "on_f_aaa",
        parent_id: "on_w_aaa",
        parent_folder: SYS,
    },
    {
        file_id: "f_bbb",
        node_id: "n_bbb",
        parent_id: "on_w_aaa",
        parent_folder: {
            folder_id: "on_w_aaa",
            name: "aaa",
            system_folder_type: 0,
        },
    },
    {
        file_id: "of_ccc",
        node_id: "on_f_ccc",
        parent_id: "on_w_ccc",
        parent_folder: IMERSAO,
    },
    {
        file_id: "f_ddd",
        node_id: "n_ddd",
        parent_id: "n_w_ddd",
        parent_folder: DIA1,
    },
    {
        file_id: "f_eee",
        node_id: "n_eee",
        parent_id: "on_w_eee",
        parent_folder: {
            folder_id: "on_w_ccc",
            name: "ccc",
            system_folder_type: 0,
        },
    },
];

const tree: Record<string, PlaudV4Node[]> = {
    root: [
        {
            node_id: "n_system_mem_x_1",
            type: 1,
            system_folder_type: 1,
            name: "Recordings",
        },
        {
            node_id: "n_system_mem_x_2",
            type: 1,
            system_folder_type: 2,
            name: "Import",
        },
        {
            node_id: "on_fd_imersao",
            type: 1,
            system_folder_type: 0,
            name: "Imersão de Closer",
            color: "folder-color-blue",
            created_at_show_ms: 1763469000000,
        },
        {
            node_id: "on_fd_comercial",
            type: 1,
            system_folder_type: 0,
            name: "Comercial",
            color: "folder-color-orange",
        },
        {
            node_id: "on_fd_lixo",
            type: 1,
            system_folder_type: 0,
            name: "Apagada",
            trashed_at_ms: 1,
        },
    ],
    on_fd_imersao: [
        { node_id: "on_w_ccc", type: 1, system_folder_type: 0, name: "ccc" },
        {
            node_id: "n_dia1",
            type: 1,
            system_folder_type: 0,
            name: "Dia 1",
            color: "",
        },
    ],
    n_dia1: [
        { node_id: "n_w_ddd", type: 1, system_folder_type: 0, name: "ddd" },
    ],
    on_fd_comercial: [],
};

describe("Plaud 4.0 folder layout", () => {
    it("keeps user folders, skips system, trashed and per-recording folders", async () => {
        const calls: (string | null)[] = [];
        const layout = await buildPlaudFolderLayout(items, async (id) => {
            calls.push(id);
            return tree[id ?? "root"] ?? [];
        });
        expect(
            layout.folders.map((f) => [f.nodeId, f.parentNodeId, f.color]),
        ).toEqual([
            ["on_fd_imersao", null, "blue"],
            ["on_fd_comercial", null, "orange"],
            ["n_dia1", "on_fd_imersao", ""],
        ]);
        expect(calls).not.toContain("n_system_mem_x_1");
        expect(calls).not.toContain("on_w_ccc");
    });

    it("places recordings, resolving cuts inside another recording's folder", async () => {
        const layout = await buildPlaudFolderLayout(
            items,
            async (id) => tree[id ?? "root"] ?? [],
        );
        expect(Object.fromEntries(layout.placements)).toEqual({
            aaa: null,
            f_bbb: null,
            ccc: "on_fd_imersao",
            f_ddd: "n_dia1",
            f_eee: "on_fd_imersao",
        });
    });

    it("maps Plaud colors to the Biblioteca palette", () => {
        expect(mapPlaudFolderColor("blue")).toBe("blue");
        expect(mapPlaudFolderColor("orange")).toBe("yellow");
        expect(mapPlaudFolderColor("purple")).toBe("pink");
        expect(mapPlaudFolderColor("default")).toBe("gray");
        expect(mapPlaudFolderColor("whatever")).toBe("gray");
    });
});
