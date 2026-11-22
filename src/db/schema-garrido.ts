/**
 * Tables added by the Garrido fork. Kept out of `schema.ts` (and migrated
 * from `src/db/migrations-garrido` with their own drizzle journal and
 * migrations table) so upstream Riffado releases merge without conflicts
 * in the schema file or the migration numbering.
 */
import {
    type AnyPgColumn,
    index,
    integer,
    pgTable,
    text,
    timestamp,
    unique,
    varchar,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { recordings, users } from "./schema";

/** "Biblioteca": user folders, nestable. Names are encrypted at rest. */
export const libraryFolders = pgTable(
    "library_folders",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => nanoid()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        // Deleting a folder deletes its subtree; recordings inside fall
        // back to "Sem pasta" through the assignment FK below.
        parentId: text("parent_id").references(
            (): AnyPgColumn => libraryFolders.id,
            { onDelete: "cascade" },
        ),
        name: text("name").notNull(),
        color: varchar("color", { length: 20 }).notNull().default("gray"),
        icon: varchar("icon", { length: 40 }).notNull().default("folder"),
        sortOrder: integer("sort_order").notNull().default(0),
        // Plaud 4.0 folder node this folder mirrors (import), if any.
        plaudNodeId: varchar("plaud_node_id", { length: 255 }),
        // Set when a Plaud-imported folder is deleted in Riffado, so the
        // next sync does not recreate it. Hidden folders are not listed.
        hiddenAt: timestamp("hidden_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (table) => ({
        userIdx: index("library_folders_user_id_idx").on(table.userId),
        parentIdx: index("library_folders_parent_id_idx").on(table.parentId),
        userPlaudNodeUnique: unique(
            "library_folders_user_plaud_node_unique",
        ).on(table.userId, table.plaudNodeId),
    }),
);

/** One folder per recording (like Plaud). No row = "Sem pasta". */
export const libraryRecordingFolders = pgTable(
    "library_recording_folders",
    {
        recordingId: text("recording_id")
            .primaryKey()
            .references(() => recordings.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        // Null = the user chose "Sem pasta" by hand (source 'manual'), which
        // keeps Plaud folder import from placing the recording again.
        folderId: text("folder_id").references(() => libraryFolders.id, {
            onDelete: "cascade",
        }),
        // 'manual' (moved in Riffado) or 'plaud' (imported). Plaud import
        // never overrides a manual placement.
        source: varchar("source", { length: 10 }).notNull().default("manual"),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (table) => ({
        folderIdx: index("library_recording_folders_folder_id_idx").on(
            table.folderId,
        ),
        userIdx: index("library_recording_folders_user_id_idx").on(
            table.userId,
        ),
    }),
);
