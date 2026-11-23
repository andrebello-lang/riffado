"use client";

import { Mic, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
    isSyncing: boolean;
    onSync: () => void;
    onUpload: () => void;
}

/**
 * Shown when the user has no recordings yet (and no in-flight upload).
 * Offers the two paths into having content: sync from a Plaud device
 * (the common case) or upload an audio file from disk.
 */
export function WorkstationEmptyState({ isSyncing, onSync, onUpload }: Props) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
                <Mic className="mb-4 size-16 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                    Nenhuma captura ainda
                </h3>
                <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
                    Sincronize seu Plaud para trazer suas gravações, ou envie um
                    áudio do computador.
                </p>
                <div className="flex gap-2">
                    <Button onClick={onSync} disabled={isSyncing}>
                        {isSyncing ? (
                            <>
                                <RefreshCw className="mr-2 size-4 animate-spin" />
                                Sincronizando…
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 size-4" />
                                Sincronizar
                            </>
                        )}
                    </Button>
                    <Button variant="outline" onClick={onUpload}>
                        <Upload className="mr-2 size-4" />
                        Enviar áudio
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
