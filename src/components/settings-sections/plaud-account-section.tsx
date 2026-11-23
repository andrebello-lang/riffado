"use client";

import { CheckCircle2, Link2Off, Mic, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PlaudConnectTabs } from "@/components/plaud-connect-tabs";
import { SettingsSectionHeader } from "@/components/settings/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/api-errors";
import { formatDateTime } from "@/lib/format-date";
import { plaudConnectionBannerState } from "@/lib/plaud/connection-expiry";
import { PLAUD_SERVERS, type PlaudServerKey } from "@/lib/plaud/servers";

interface ConnectionInfo {
    connected: boolean;
    server?: PlaudServerKey;
    plaudEmail?: string | null;
    needsReconnect?: boolean;
    accessExpiresAt?: string | null;
    sessionExpiresAt?: string | null;
    autoRenews?: boolean;
    createdAt?: string;
    updatedAt?: string;
    apiBase?: string;
}

/**
 * Short region label for the connection card. Falls back to the raw
 * apiBase for "custom" entries (custom-server users want to see exactly
 * which host they're talking to).
 */
function regionLabel(
    server: PlaudServerKey | undefined,
    apiBase?: string,
): string {
    if (!server) return "Unknown";
    if (server === "custom") return apiBase ?? PLAUD_SERVERS.custom.label;
    if (server === "global") return "Global";
    if (server === "eu") return "EU (Frankfurt)";
    if (server === "apse1") return "Asia Pacific (Singapore)";
    if (server === "cn") return "China Mainland";
    return server;
}

interface PlaudAccountSectionProps {
    /**
     * Called after a successful reconnect or account switch, in addition
     * to this component's own `fetchConnection()`. Lets the dashboard
     * (`Workstation`) refresh its server-rendered `plaudNeedsReconnect`
     * prop and kick off a fresh sync -- without it, the dashboard's
     * `PlaudReconnectBanner` can stay stale until the next periodic sync
     * since it's driven by separate client state, not this section's.
     */
    onReconnected?: () => void;
}

export function PlaudAccountSection({
    onReconnected,
}: PlaudAccountSectionProps = {}) {
    const [info, setInfo] = useState<ConnectionInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState<
        null | "switch" | "disconnect"
    >(null);
    const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
    const [reconnectDialogOpen, setReconnectDialogOpen] = useState(false);
    const [isMutating, setIsMutating] = useState(false);

    const fetchConnection = useCallback(async () => {
        try {
            const res = await fetch("/api/plaud/connection");
            if (!res.ok) {
                throw new Error(
                    await getApiErrorMessage(
                        res,
                        "Não foi possível carregar a conexão",
                    ),
                );
            }
            const data: ConnectionInfo = await res.json();
            setInfo(data);
        } catch (error) {
            console.error("Failed to load Plaud connection:", error);
            setInfo({ connected: false });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConnection();
    }, [fetchConnection]);

    const disconnect = useCallback(async (): Promise<boolean> => {
        const res = await fetch("/api/plaud/connection", { method: "DELETE" });
        if (!res.ok) {
            const msg = await getApiErrorMessage(res, "Failed to disconnect");
            throw new Error(msg);
        }
        return true;
    }, []);

    const handleDisconnect = async () => {
        setIsMutating(true);
        try {
            await disconnect();
            toast.success("Conta do Plaud desconectada");
            setConfirmOpen(null);
            await fetchConnection();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Não foi possível desconectar",
            );
        } finally {
            setIsMutating(false);
        }
    };

    /**
     * Switch flow: explicitly delete the existing connection (and its
     * associated `plaud_devices` rows) before opening the connect dialog.
     * The verify / connect-token routes both upsert, so this isn't strictly
     * required for the connection row, but it prevents stale device rows
     * from the prior account lingering until the next sync rewrites them.
     * Recordings live in a separate table and are unaffected.
     */
    const handleSwitchConfirmed = async () => {
        setIsMutating(true);
        try {
            await disconnect();
            setConfirmOpen(null);
            setSwitchDialogOpen(true);
            // Reflect the unlinked state in the card while the dialog is open
            await fetchConnection();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Não foi possível desvincular a conta atual",
            );
        } finally {
            setIsMutating(false);
        }
    };

    const handleSwitchSuccess = useCallback(async () => {
        setSwitchDialogOpen(false);
        await fetchConnection();
        onReconnected?.();
    }, [fetchConnection, onReconnected]);

    const handleReconnectSuccess = useCallback(async () => {
        setReconnectDialogOpen(false);
        await fetchConnection();
        onReconnected?.();
    }, [fetchConnection, onReconnected]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    const currentEmail = info?.plaudEmail ?? null;
    const currentEmailDisplay = currentEmail ?? "the current account";
    const connectionState = info?.connected
        ? plaudConnectionBannerState({
              needsReconnect: info.needsReconnect === true,
              sessionExpiresAt: info.sessionExpiresAt,
              now: Date.now(),
          })
        : null;
    const sessionEndsOn = info?.sessionExpiresAt
        ? formatDateTime(info.sessionExpiresAt, "absolute")
        : null;

    return (
        <div className="space-y-6">
            <div>
                <SettingsSectionHeader
                    title="Conta do Plaud"
                    description="A conexão com a nuvem do Plaud de onde vêm as gravações."
                    icon={Mic}
                />
                <p className="text-sm text-muted-foreground mt-1">
                    A conta do Plaud de onde o Brieffado puxa as gravações.
                    Trocar de conta mantém as capturas que já estão aqui; só as
                    próximas sincronizações mudam.
                </p>
            </div>

            {info?.connected ? (
                <Card className="py-4">
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="size-5 text-primary mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                    {currentEmail ? (
                                        <span className="font-mono">
                                            {currentEmail}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Conectado (e-mail desconhecido)
                                        </span>
                                    )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Região:{" "}
                                    {regionLabel(info.server, info.apiBase)}
                                    {!currentEmail && (
                                        <>
                                            {" · "}
                                            <span>
                                                Use "Trocar de conta" abaixo
                                                para ver o e-mail
                                            </span>
                                        </>
                                    )}
                                </p>
                                {sessionEndsOn && connectionState === null && (
                                    <p className="text-sm text-muted-foreground">
                                        Conectado até {sessionEndsOn}
                                    </p>
                                )}
                            </div>
                        </div>

                        {connectionState === "reconnect" && (
                            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-500">
                                O Plaud deixou de aceitar este login, então a
                                sincronização está parada. Reconecte para
                                voltar. Suas capturas ficam.
                            </p>
                        )}
                        {connectionState === "ending-soon" && (
                            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-500">
                                Sua conexão com o Plaud termina em{" "}
                                {sessionEndsOn}. Reconecte para continuar
                                sincronizando.
                            </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {connectionState !== null && (
                                <Button
                                    onClick={() => setReconnectDialogOpen(true)}
                                >
                                    <RefreshCw className="size-4 mr-2" />
                                    Reconectar
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => setConfirmOpen("switch")}
                            >
                                <RefreshCw className="size-4 mr-2" />
                                Trocar de conta
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setConfirmOpen("disconnect")}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Link2Off className="size-4 mr-2" />
                                Desconectar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="py-4">
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Nenhuma conta do Plaud conectada. Entre abaixo para
                            começar a sincronizar.
                        </p>
                        <PlaudConnectTabs
                            onConnected={() => fetchConnection()}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Confirm: switch or disconnect */}
            <Dialog
                open={confirmOpen !== null}
                onOpenChange={(open) => {
                    if (!open && !isMutating) setConfirmOpen(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {confirmOpen === "switch"
                                ? "Trocar a conta do Plaud?"
                                : "Desconectar a conta do Plaud?"}
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-2 pt-2">
                                {confirmOpen === "switch" ? (
                                    <p>
                                        Isso desvincula{" "}
                                        <span className="font-mono text-foreground">
                                            {currentEmailDisplay}
                                        </span>{" "}
                                        e deixa você entrar com outra conta do
                                        Plaud. As capturas atuais ficam; só as
                                        próximas virão da conta nova.
                                    </p>
                                ) : (
                                    <p>
                                        Isso desvincula{" "}
                                        <span className="font-mono text-foreground">
                                            {currentEmailDisplay}
                                        </span>
                                        . As capturas atuais ficam, mas a
                                        sincronização para até você reconectar.
                                    </p>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmOpen(null)}
                            disabled={isMutating}
                        >
                            Cancelar
                        </Button>
                        {confirmOpen === "switch" ? (
                            <Button
                                onClick={handleSwitchConfirmed}
                                disabled={isMutating}
                            >
                                {isMutating ? "Desvinculando…" : "Continuar"}
                            </Button>
                        ) : (
                            <Button
                                variant="destructive"
                                onClick={handleDisconnect}
                                disabled={isMutating}
                            >
                                {isMutating ? "Desconectando…" : "Desconectar"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Switch: connect dialog (full PlaudConnectTabs — connector,
                email-OTP, paste-token) */}
            <Dialog
                open={switchDialogOpen}
                onOpenChange={(open) => setSwitchDialogOpen(open)}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Entrar na nova conta do Plaud</DialogTitle>
                        <DialogDescription>
                            Escolha como conectar a conta do Plaud que vai
                            entrar.
                        </DialogDescription>
                    </DialogHeader>
                    {switchDialogOpen && (
                        <PlaudConnectTabs onConnected={handleSwitchSuccess} />
                    )}
                </DialogContent>
            </Dialog>

            {/* Reconnect: same-account recovery from an invalidated token.
                Unlike "Switch account", this never deletes the existing
                connection/device rows first -- persistPlaudConnection()
                upserts, so re-authenticating with the same (or a new)
                account is safe even if the user backs out of the dialog
                without finishing. */}
            <Dialog
                open={reconnectDialogOpen}
                onOpenChange={(open) => setReconnectDialogOpen(open)}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Reconectar sua conta do Plaud</DialogTitle>
                        <DialogDescription>
                            Entre de novo para voltar a sincronizar. Suas
                            capturas e transcrições não são afetadas.
                        </DialogDescription>
                    </DialogHeader>
                    {reconnectDialogOpen && (
                        <PlaudConnectTabs
                            onConnected={handleReconnectSuccess}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
