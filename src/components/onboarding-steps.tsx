"use client";

import { Bot, CheckCircle2, Mic, Sparkles } from "lucide-react";
import { PlaudConnectTabs } from "@/components/plaud-connect-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OnboardingStepWelcome() {
    return (
        <div className="space-y-4">
            <div className="text-center space-y-2">
                <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mic className="size-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Seu segundo cérebro</h3>
                <p className="text-muted-foreground">
                    O Brieffado captura suas reuniões, aulas e apresentações e
                    devolve tópicos, tarefas e as melhores ideias. Vamos
                    configurar sua conta.
                </p>
            </div>

            <div className="grid gap-4">
                <Card className="gap-0 py-4">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Mic className="size-4" />
                            Conecte sua conta
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Entre com o e-mail do Plaud para sincronizar as
                            gravações sozinho
                        </p>
                    </CardContent>
                </Card>

                <Card className="gap-0 py-4">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Bot className="size-4" />
                            Configure a IA
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Escolha um provedor de IA para transcrever
                            automaticamente
                        </p>
                    </CardContent>
                </Card>

                <Card className="gap-0 py-4">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="size-4" />
                            Comece a capturar
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Tudo pronto. Capture e deixe a IA fazer o resto.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export function OnboardingStepPlaud({
    hasPlaudConnection,
    onReconnect,
    onConnected,
}: {
    hasPlaudConnection: boolean;
    onReconnect: () => void;
    onConnected: () => void;
}) {
    return (
        <div className="space-y-4">
            <div className="text-center space-y-2">
                <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mic className="size-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">
                    Conecte sua conta do Plaud
                </h3>
                <p className="text-muted-foreground">
                    Entre com o e-mail do Plaud para sincronizar as gravações
                    sozinho
                </p>
            </div>

            {hasPlaudConnection ? (
                <Card className="border-primary/50 bg-primary/5 py-3">
                    <CardContent className="px-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="size-5 text-primary" />
                            <div className="flex-1">
                                <p className="font-medium">Plaud conectado</p>
                                <p className="text-sm text-muted-foreground">
                                    Sua conta do Plaud está conectada
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onReconnect}
                            >
                                Reconectar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="gap-0 py-4">
                    <CardContent className="pt-6">
                        <PlaudConnectTabs onConnected={onConnected} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export function OnboardingStepAiProvider({
    hasOwnProvider,
    hasIncludedProvider,
    onGoToSettings,
}: {
    hasOwnProvider: boolean;
    hasIncludedProvider: boolean;
    onGoToSettings: () => void;
}) {
    const includedOnly = hasIncludedProvider && !hasOwnProvider;
    return (
        <div className="space-y-4">
            <div className="text-center space-y-2">
                <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bot className="size-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">
                    {includedOnly ? "Transcrição incluída" : "Configure a IA"}
                </h3>
                <p className="text-muted-foreground">
                    {includedOnly
                        ? "A transcrição Mynah vem no seu plano. Tudo pronto."
                        : "Escolha um provedor de IA para ativar a transcrição automática"}
                </p>
            </div>

            {hasOwnProvider ? (
                <Card className="border-primary/50 bg-primary/5 py-3">
                    <CardContent>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="size-5 text-primary" />
                            <div className="flex-1">
                                <p className="font-medium">
                                    Provedor de IA configurado
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Você já tem um provedor de IA configurado
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : includedOnly ? (
                <Card className="border-primary/50 bg-primary/5 gap-0 py-4">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="size-5 text-primary mt-0.5" />
                            <div className="flex-1">
                                <p className="font-medium">
                                    Mynah transcription is included
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Transcription works out of the box with your
                                    plan. Adding your own AI provider is
                                    optional. Use it for summaries or a
                                    different transcription engine alongside
                                    Mynah.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={onGoToSettings}
                            variant="outline"
                            className="w-full"
                        >
                            Adicionar seu próprio provedor (opcional)
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="gap-0 py-4">
                    <CardContent className="pt-6 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Dá para configurar a IA depois, em Configurações.
                            Ela ativa a transcrição automática das suas
                            capturas.
                        </p>
                        <Button
                            onClick={onGoToSettings}
                            variant="outline"
                            className="w-full"
                        >
                            Ir para Configurações
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export function OnboardingStepComplete({
    hasIncludedProvider,
}: {
    hasIncludedProvider: boolean;
}) {
    return (
        <div className="space-y-4">
            <div className="text-center space-y-2">
                <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="size-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">You're All Set!</h3>
                <p className="text-muted-foreground">
                    Pode capturar: o Brieffado cuida do resto.
                </p>
            </div>

            <Card className="gap-0 py-4">
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="size-5 text-primary mt-0.5" />
                            <div>
                                <p className="font-medium">
                                    As capturas chegam sozinhas
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    O Plaud sincroniza as gravações em segundo
                                    plano
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="size-5 text-primary mt-0.5" />
                            <div>
                                <p className="font-medium">
                                    Transcrição com IA
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {hasIncludedProvider
                                        ? "A transcrição Mynah está pronta no seu plano"
                                        : "Configure um provedor de IA para transcrever automaticamente"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="size-5 text-primary mt-0.5" />
                            <div>
                                <p className="font-medium">
                                    Deixe do seu jeito
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Ajuste o que quiser a qualquer momento em
                                    Configurações
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
