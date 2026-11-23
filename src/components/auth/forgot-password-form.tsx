"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { MetalButton } from "@/components/metal-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth-client";

interface ForgotPasswordFormProps {
    /**
     * Whether SMTP is configured on this instance. When false the form is
     * replaced with an operator-help block that names the env vars to set,
     * rather than letting the user submit a request that can't be delivered.
     */
    smtpConfigured: boolean;
}

/**
 * Renders only the form body (input + submit / submitted state / SMTP help).
 * Page chrome (logo, headings, panel, background) is owned by the route.
 */
export function ForgotPasswordForm({
    smtpConfigured,
}: ForgotPasswordFormProps) {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!smtpConfigured) return;
        setIsLoading(true);

        try {
            // We intentionally don't surface the better-auth response: we
            // always show the same success message so this endpoint can't
            // be used to enumerate which emails have accounts.
            const result = await requestPasswordReset({
                email,
                redirectTo: "/reset-password",
            });
            // Rate-limit rejections (429) are a request-volume signal, not an
            // account-existence signal, so surfacing them doesn't leak
            // enumeration. Show the limiter's message instead of a false
            // "check your email" when no email was actually sent.
            if (result?.error?.status === 429) {
                toast.error(
                    result.error.message ||
                        "Muitas tentativas. Aguarde um pouco e tente de novo.",
                );
                return;
            }
            setSubmitted(true);
        } catch (error) {
            // Network-level failures still get surfaced -- those aren't an
            // account-existence signal.
            const message =
                error instanceof Error
                    ? error.message
                    : "Não foi possível enviar o e-mail. Tente de novo.";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {!smtpConfigured ? (
                <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4 text-sm">
                    <p className="font-medium">
                        A troca de senha não está disponível neste Brieffado.
                    </p>
                    <p className="text-muted-foreground">
                        O envio de e-mail (SMTP) não foi configurado, então o
                        e-mail de troca não pode ser enviado. Configure{" "}
                        <code className="font-mono text-xs">SMTP_HOST</code>,{" "}
                        <code className="font-mono text-xs">SMTP_USER</code>, e{" "}
                        <code className="font-mono text-xs">SMTP_PASSWORD</code>{" "}
                        no servidor para ativar. Enquanto isso, a senha pode ser
                        trocada direto no banco de dados.
                    </p>
                </div>
            ) : submitted ? (
                <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4 text-sm">
                    <p className="font-medium">Confira seu e-mail.</p>
                    <p className="text-muted-foreground">
                        Se existir uma conta para{" "}
                        <span className="font-mono text-xs">{email}</span>,
                        enviamos um link para trocar a senha. O link vale por 1
                        hora.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="voce@exemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            autoComplete="email"
                        />
                    </div>

                    <MetalButton
                        type="submit"
                        className="w-full"
                        variant="cyan"
                        disabled={isLoading}
                    >
                        {isLoading ? "Enviando..." : "Enviar link"}
                    </MetalButton>
                </form>
            )}

            <div className="text-center text-sm">
                <Link
                    href="/login"
                    className="text-accent-cyan hover:underline"
                >
                    Voltar para entrar
                </Link>
            </div>
        </div>
    );
}
