import { buildAselectFilter, type Segment } from "@/lib/recordings/segments";
import { runFfmpeg } from "@/lib/transcription/ffmpeg";

/**
 * Render the kept ranges of an audio file into a new MP3. The original
 * buffer is only read. Mono/stereo layout and sample rate follow the
 * source; MP3 matches what Plaud delivers, so the new file behaves like
 * any synced recording (playback, transcription, export).
 */
export function renderSegmentsToMp3(
    input: Buffer,
    segments: readonly Segment[],
): Promise<Buffer> {
    return runFfmpeg(input, [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-map",
        "0:a:0",
        "-vn",
        "-map_metadata",
        "-1",
        "-af",
        buildAselectFilter(segments),
        "-c:a",
        "libmp3lame",
        "-b:a",
        "64k",
        "-f",
        "mp3",
        "pipe:1",
    ]);
}
