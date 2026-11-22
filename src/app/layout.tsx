import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import { AppProgress } from "@/components/app-progress";
import { ConfirmDialogProvider } from "@/components/confirm-dialog";
import { OpenAnalytics } from "@/components/open-analytics";
import { PostHogAnalytics } from "@/components/posthog-analytics";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { env } from "@/lib/env";
import "./globals.css";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
    variable: "--font-space-grotesk",
    subsets: ["latin"],
    weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    // Resolves relative URLs in `openGraph.images` / `twitter.images`
    // (e.g. `/docs-og/<slug>.png` emitted by per-doc `generateMetadata`)
    // against the deployment origin. Without this, Next falls back to
    // `http://localhost:3000` in production and ships broken social
    // previews. `APP_URL` is allowed to be unset during `next build`
    // (see `src/lib/env.ts`); the fallback keeps the build green and
    // self-host deployments override it at runtime via env.
    metadataBase: new URL(env.APP_URL ?? "https://riffado.com"),
    title: {
        default:
            "Brieffado · Seu segundo cérebro para reuniões, aulas e ideias",
        template: "%s · Brieffado",
    },
    description:
        "Seu segundo cérebro para reuniões, aulas e ideias. Baseado no Riffado (AGPL-3.0).",
    applicationName: "Brieffado",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
        capable: true,
        title: "Brieffado",
        statusBarStyle: "default",
    },
};

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#fafafa" },
        { media: "(prefers-color-scheme: dark)", color: "#161616" },
    ],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="pt-BR"
            suppressHydrationWarning
            className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable}`}
        >
            <body className="antialiased">
                <AppProgress>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        {/*
                          Tooltip provider wraps the app so any descendant
                          `<Tooltip>` works without a local provider. 200ms
                          delay is the shadcn default-ish: short enough to
                          feel responsive, long enough to avoid firing on
                          incidental mouseovers.
                        */}
                        <TooltipProvider delayDuration={200}>
                            {/*
                              App-wide imperative confirm dialog. Any
                              client component can `useConfirm()` to get
                              a Promise-returning function for destructive
                              flows (delete recording, delete webhook,
                              delete API key, delete custom prompt, etc.).
                              One instance, one dialog node, consistent
                              look + pending-state handling.
                            */}
                            <ConfirmDialogProvider>
                                {children}
                                <Toaster />
                            </ConfirmDialogProvider>
                        </TooltipProvider>
                    </ThemeProvider>
                    <OpenAnalytics />
                    <PostHogAnalytics />
                </AppProgress>
            </body>
        </html>
    );
}
