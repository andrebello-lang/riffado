"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MetalButton } from "@/components/metal-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordMode } from "@/lib/auth/reset-password-mode";
import { resetPassword } from "@/lib/auth-client";

interface ResetPasswordFormProps {
    /**
     * Reset token from the email link. better-auth's GET `/reset-password/:token`
     * endpoint validates the verification token, then redirects the browser to
     * the `callbackURL` passed via `requestPasswordReset({ redirectTo })` with
     * either `?token=VALID_TOKEN` (success) or `?error=INVALID_TOKEN` (expired
     * or already-consumed). See better-auth `requestPasswordReset` source.
     */
    token?: string;
    error?: string;
}

/**
 * Renders only the form body. Page chrome (logo, headings, panel,
 * background) is owned by the route, which uses `resetPasswordMode()`
 * (from `@/lib/auth/reset-password-mode`) to decide the appropriate
 * title/subtitle.
 */
export function ResetPasswordForm({ token, error }: ResetPasswordFormProps) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { push, refresh } = useRouter();

    // No token in URL, or better-auth signaled an error on the callback --
    // either the user navigated here directly, the token expired, or the
    // link was tampered with (e.g. crafted URL with both `token` and `error`).
    if (resetPasswordMode(token, error) === "invalid") {
        return (
            <div className="space-y-6">
                <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    {error?.toUpperCase() === "INVALID_TOKEN" ? (
                        <p>
                            O link expirou ou já foi usado. Peça um novo para
                            continuar.
                        </p>
                    ) : (
                        <p>
                            Abra o e-mail mais recente e clique no link de lá,
                            ou peça um novo e-mail.
                        </p>
                    )}
                </div>

                <div className="text-center text-sm">
                    <Link
                        href="/forgot-password"
                        className="text-accent-cyan hover:underline"
                    >
                        Pedir um novo link
                    </Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("As senhas não são iguais");
            return;
        }

        if (password.length < 8) {
            toast.error("A senha precisa ter pelo menos 8 caracteres");
            return;
        }

        setIsLoading(true);

        try {
            const result = await resetPassword({
                newPassword: password,
                token,
            });

            if (result.error) {
                toast.error(
                    result.error.message ||
                        "Não foi possível trocar a senha. O link pode ter expirado.",
                );
                return;
            }

            toast.success("Senha trocada. Já pode entrar.");
            push("/login");
            refresh();
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Não foi possível trocar a senha. O link pode ter expirado.";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">Nova senha</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        minLength={8}
                        autoComplete="new-password"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar senha</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                    />
                </div>

                <MetalButton
                    type="submit"
                    className="w-full"
                    variant="cyan"
                    disabled={isLoading}
                >
                    {isLoading ? "Trocando..." : "Trocar senha"}
                </MetalButton>
            </form>

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
