import { describe, expect, it } from "vitest";
import { formatRecordingDateTimeRange } from "@/lib/format-date";

describe("formatRecordingDateTimeRange", () => {
    it("shows the recorded date with start and end times", () => {
        const start = new Date(2026, 8, 7, 11, 27);

        expect(formatRecordingDateTimeRange(start, 25 * 60 * 1000)).toBe(
            "7 de set de 2026 · 11:27–11:52",
        );
    });

    it("shows both dates when a recording crosses midnight", () => {
        const start = new Date(2026, 8, 7, 23, 50);

        expect(formatRecordingDateTimeRange(start, 20 * 60 * 1000)).toBe(
            "7 de set de 2026 · 23:50–8 de set de 2026 · 00:10",
        );
    });
});
