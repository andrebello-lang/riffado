"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import { MetalButton } from "@/components/metal-button";

/**
 * App Router error boundary. Catches render errors that `capture_exceptions`
 * autocapture misses (React error boundaries don't propagate to
 * `window.onerror`). No-ops when PostHog isn't initialized (self-host).
 */
export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        if (posthog.__loaded) {
            posthog.captureException(error);
        }
    }, [error]);

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
            <h2 className="text-lg font-medium">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground">
                Tente de novo ou recarregue a página se continuar acontecendo.
            </p>
            <MetalButton onClick={() => reset()}>Tentar de novo</MetalButton>
        </div>
    );
}
