import { describe, expect, it } from "vitest";
import {
    buildAselectFilter,
    keepOnly,
    nextPlayablePosition,
    normalizeSegments,
    removeRange,
    totalDurationMs,
} from "@/lib/recordings/segments";

const D = 600_000; // 10 min

describe("recording segments", () => {
    it("normalizes: clamps, drops tiny, sorts and merges", () => {
        expect(
            normalizeSegments(
                [
                    { startMs: 5000, endMs: 9000 },
                    { startMs: -10, endMs: 1000 },
                    { startMs: 8000, endMs: 12000 },
                    { startMs: 20000, endMs: 20050 },
                    { startMs: 590_000, endMs: 700_000 },
                ],
                D,
            ),
        ).toEqual([
            { startMs: 0, endMs: 1000 },
            { startMs: 5000, endMs: 12000 },
            { startMs: 590_000, endMs: D },
        ]);
    });

    it("trim keeps only the selection", () => {
        const full = [{ startMs: 0, endMs: D }];
        const out = keepOnly(full, { startMs: 37_000, endMs: 94_000 }, D);
        expect(out).toEqual([{ startMs: 37_000, endMs: 94_000 }]);
        expect(totalDurationMs(out)).toBe(57_000);
    });

    it("delete splits a kept range", () => {
        const out = removeRange(
            [{ startMs: 0, endMs: D }],
            { startMs: 60_000, endMs: 120_000 },
            D,
        );
        expect(out).toEqual([
            { startMs: 0, endMs: 60_000 },
            { startMs: 120_000, endMs: D },
        ]);
    });

    it("playback skips removed gaps and stops at the end", () => {
        const segs = [
            { startMs: 0, endMs: 60_000 },
            { startMs: 120_000, endMs: 180_000 },
        ];
        expect(nextPlayablePosition(segs, 30_000)).toBe(30_000);
        expect(nextPlayablePosition(segs, 90_000)).toBe(120_000);
        expect(nextPlayablePosition(segs, 200_000)).toBeNull();
    });

    it("builds an ffmpeg aselect filter", () => {
        expect(
            buildAselectFilter([
                { startMs: 0, endMs: 1500 },
                { startMs: 3000, endMs: 4000 },
            ]),
        ).toBe(
            "aselect='between(t\\,0.000\\,1.500)+between(t\\,3.000\\,4.000)',asetpts=N/SR/TB",
        );
    });
});
