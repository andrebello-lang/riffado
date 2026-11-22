/**
 * Time ranges used by the audio editor ("Editar áudio"). Everything is in
 * milliseconds on the ORIGINAL recording's timeline. The editor keeps a
 * list of ranges to KEEP; cutting/trimming only reshapes that list, and the
 * server renders the kept ranges into a brand-new recording on save. The
 * original audio is never modified.
 *
 * Shared by the client editor and the derive route so both agree on the
 * exact same rules.
 */

export interface Segment {
    startMs: number;
    endMs: number;
}

/** Shortest range worth keeping. Anything smaller is dropped as noise. */
export const MIN_SEGMENT_MS = 100;

/** Upper bound on kept ranges, so the ffmpeg filter stays small. */
export const MAX_SEGMENTS = 200;

/**
 * Clamp to [0, durationMs], drop tiny/invalid ranges, sort, and merge
 * overlapping or touching ranges. Pure; never throws.
 */
export function normalizeSegments(
    segments: readonly Segment[],
    durationMs: number,
): Segment[] {
    const clamped = segments
        .filter(
            (s) =>
                Number.isFinite(s.startMs) &&
                Number.isFinite(s.endMs) &&
                s.endMs > s.startMs,
        )
        .map((s) => ({
            startMs: Math.max(0, Math.round(s.startMs)),
            endMs: Math.min(durationMs, Math.round(s.endMs)),
        }))
        .filter((s) => s.endMs - s.startMs >= MIN_SEGMENT_MS)
        .sort((a, b) => a.startMs - b.startMs);

    const merged: Segment[] = [];
    for (const s of clamped) {
        const last = merged[merged.length - 1];
        if (last && s.startMs <= last.endMs) {
            last.endMs = Math.max(last.endMs, s.endMs);
        } else {
            merged.push({ ...s });
        }
    }
    return merged;
}

/** Total kept duration. */
export function totalDurationMs(segments: readonly Segment[]): number {
    return segments.reduce((sum, s) => sum + (s.endMs - s.startMs), 0);
}

/** "Aparar": keep only what is inside the selection. */
export function keepOnly(
    segments: readonly Segment[],
    selection: Segment,
    durationMs: number,
): Segment[] {
    return normalizeSegments(
        segments.map((s) => ({
            startMs: Math.max(s.startMs, selection.startMs),
            endMs: Math.min(s.endMs, selection.endMs),
        })),
        durationMs,
    );
}

/** "Excluir": remove the selection from the kept ranges. */
export function removeRange(
    segments: readonly Segment[],
    selection: Segment,
    durationMs: number,
): Segment[] {
    const out: Segment[] = [];
    for (const s of segments) {
        if (selection.endMs <= s.startMs || selection.startMs >= s.endMs) {
            out.push({ ...s });
            continue;
        }
        if (selection.startMs > s.startMs) {
            out.push({ startMs: s.startMs, endMs: selection.startMs });
        }
        if (selection.endMs < s.endMs) {
            out.push({ startMs: selection.endMs, endMs: s.endMs });
        }
    }
    return normalizeSegments(out, durationMs);
}

/**
 * Where playback should be for a given position: inside a kept range it
 * stays put, inside a removed gap it jumps to the next kept start, and
 * past the last kept range it returns null (stop).
 */
export function nextPlayablePosition(
    segments: readonly Segment[],
    positionMs: number,
): number | null {
    for (const s of segments) {
        if (positionMs < s.startMs) return s.startMs;
        if (positionMs < s.endMs) return positionMs;
    }
    return null;
}

/** ffmpeg `aselect` expression that keeps exactly these ranges. */
export function buildAselectFilter(segments: readonly Segment[]): string {
    const parts = segments.map(
        (s) =>
            `between(t\\,${(s.startMs / 1000).toFixed(3)}\\,${(s.endMs / 1000).toFixed(3)})`,
    );
    return `aselect='${parts.join("+")}',asetpts=N/SR/TB`;
}
