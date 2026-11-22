import { defineConfig } from "drizzle-kit";

/** Garrido fork tables only (src/db/schema-garrido.ts), own migration track. */
export default defineConfig({
    schema: "./src/db/schema-garrido.ts",
    out: "./src/db/migrations-garrido",
    dialect: "postgresql",
    dbCredentials: {
        // biome-ignore lint: Forbidden non-null assertion.
        url: process.env.POSTGRES_URL!,
    },
});
