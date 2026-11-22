import { cn } from "@/lib/utils";

const BRAIN_PATHS = [
    "M13.5 29.5C12 21.5 18 14.6 26 14.2C30.2 11 37.6 11.2 41.6 14.4C48.8 14.4 54 20.2 52.8 27C55 31.4 52.6 36.4 47.6 36.8C45.6 39.6 41.2 40.6 37.6 39.2H30.4C23.8 41.2 15.6 38 13.5 29.5Z",
    "M41.2 39.4C45.6 39.2 48.4 41.4 47.4 44C46.4 46.6 42.4 46.6 40.4 44.2",
    "M35.6 39.4C35.8 43.6 35 47 32.8 50.2",
    "M20.4 22.6C22.6 19.6 27.4 20.4 27 24.2C26.8 26.6 29 28 31.2 27.2",
    "M31.4 16.8C34.6 15.6 37.8 17.8 36.8 21.2C36.2 23.6 38.4 26 41.4 25.4",
    "M45.2 20.2C47.4 22.6 46.2 25.6 48.8 28",
    "M18.4 31.6C20.6 29.8 23 31.8 25.2 30.4C27 29.2 29.2 30.2 30 32.4",
    "M33.8 33.6C35.2 31.2 38.2 31 39.6 32.8C40.8 34.2 43.2 34 44.6 32.4",
];

/** Brieffado symbol: line-drawn brain with a highlighter stroke behind it. */
export function BrieffadoMark({
    className,
    strokeWidth = 2.6,
}: {
    className?: string;
    strokeWidth?: number;
}) {
    return (
        <svg
            viewBox="8 8 50 46"
            className={cn("shrink-0", className)}
            aria-hidden="true"
            focusable="false"
        >
            <rect
                x="8"
                y="19"
                width="48"
                height="7.5"
                rx="3.75"
                fill="var(--highlight)"
            />
            <g
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {BRAIN_PATHS.map((d) => (
                    <path key={d} d={d} />
                ))}
            </g>
        </svg>
    );
}

/** Symbol + "brieffado" wordmark in the display face. */
export function BrieffadoWordmark({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-2 font-display font-bold tracking-tight",
                className,
            )}
        >
            <BrieffadoMark className="h-[1.25em] w-auto" />
            <span>brieffado</span>
        </span>
    );
}
