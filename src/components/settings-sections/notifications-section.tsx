"use client";

import {
    Bell,
    BellRing,
    Mail,
    Megaphone,
    Smartphone,
    Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SettingsSectionHeader } from "@/components/settings/section-header";
import { SettingsCard } from "@/components/settings/settings-card";
import { ToggleRow } from "@/components/settings/toggle-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/use-settings";
import { requestNotificationPermission } from "@/lib/notifications/browser";

export function NotificationsSection() {
    const {
        isLoadingSettings,
        isSavingSettings,
        setIsLoadingSettings,
        debouncedSave,
    } = useSettings();

    const [browserNotifications, setBrowserNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(false);
    const [barkNotifications, setBarkNotifications] = useState(false);
    const [notificationSound, setNotificationSound] = useState(true);
    const [marketingEmailConsent, setMarketingEmailConsent] = useState(false);
    const [notificationEmail, setNotificationEmail] = useState<string>("");
    const [barkPushUrl, setBarkPushUrl] = useState<string>("");
    const [, setBarkPushUrlSet] = useState(false);
    const [userEmail, setUserEmail] = useState<string>("");
    const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
    const [testEmailStatus, setTestEmailStatus] = useState<{
        type: "success" | "error" | null;
        message: string;
    }>({ type: null, message: "" });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch("/api/settings/user");
                if (response.ok) {
                    const data = await response.json();
                    setBrowserNotifications(data.browserNotifications ?? true);
                    setEmailNotifications(data.emailNotifications ?? false);
                    setBarkNotifications(data.barkNotifications ?? false);
                    setNotificationSound(data.notificationSound ?? true);
                    setMarketingEmailConsent(
                        data.marketingEmailConsent ?? false,
                    );
                    setUserEmail(data.userEmail ?? "");
                    setNotificationEmail(
                        data.notificationEmail || data.userEmail || "",
                    );
                    setBarkPushUrl(data.barkPushUrl || "");
                    setBarkPushUrlSet(data.barkPushUrlSet ?? false);
                }
            } catch (err) {
                console.error("Failed to fetch settings:", err);
            } finally {
                setIsLoadingSettings(false);
            }
        };
        fetchSettings();
    }, [setIsLoadingSettings]);

    const handleChange = (updates: Record<string, unknown>) => {
        debouncedSave(updates);
    };

    const handleBrowserNotificationsChange = (checked: boolean) => {
        setBrowserNotifications(checked);
        handleChange({ browserNotifications: checked });

        if (checked) {
            // Best-effort permission request; ignore result here
            void requestNotificationPermission();
        }
    };

    const handleEmailNotificationsChange = (checked: boolean) => {
        setEmailNotifications(checked);
        if (checked && !notificationEmail && userEmail) {
            setNotificationEmail(userEmail);
            handleChange({
                emailNotifications: checked,
                notificationEmail: userEmail,
            });
        } else {
            handleChange({ emailNotifications: checked });
        }
    };

    const handleNotificationEmailChange = (email: string) => {
        setNotificationEmail(email);
        debouncedSave({ notificationEmail: email || undefined });
    };

    const handleBarkNotificationsChange = (checked: boolean) => {
        setBarkNotifications(checked);
        handleChange({ barkNotifications: checked });
    };

    const handleBarkPushUrlChange = (url: string) => {
        setBarkPushUrl(url);
        if (url) {
            setBarkPushUrlSet(true);
        } else {
            // If user clears the input, mark as unset
            setBarkPushUrlSet(false);
        }
        debouncedSave({ barkPushUrl: url || null });
    };

    const handleSendTestEmail = async () => {
        const emailToTest = notificationEmail || userEmail;
        if (!emailToTest) {
            setTestEmailStatus({
                type: "error",
                message: "Informe um e-mail primeiro",
            });
            return;
        }

        setIsSendingTestEmail(true);
        setTestEmailStatus({ type: null, message: "" });

        try {
            const response = await fetch("/api/settings/test-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: emailToTest }),
            });

            const data = await response.json();

            if (response.ok) {
                setTestEmailStatus({
                    type: "success",
                    message: `E-mail de teste enviado para ${emailToTest}`,
                });
            } else {
                setTestEmailStatus({
                    type: "error",
                    message:
                        data.error ||
                        "Não foi possível enviar o e-mail de teste",
                });
            }
        } catch (err) {
            console.error("Error sending test email:", err);
            setTestEmailStatus({
                type: "error",
                message:
                    "Não foi possível enviar o e-mail de teste. Tente de novo.",
            });
        } finally {
            setIsSendingTestEmail(false);
        }
    };

    if (isLoadingSettings) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SettingsSectionHeader
                title="Notificações"
                description="Como e quando o Brieffado avisa sobre capturas novas e sincronizações."
                icon={Bell}
            />

            <div className="space-y-3">
                {/* Browser */}
                <SettingsCard>
                    <ToggleRow
                        id="browser-notifications"
                        label={
                            <span className="inline-flex items-center gap-2">
                                <BellRing
                                    className="size-4 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                Notificações do navegador
                            </span>
                        }
                        description="Mostra notificações do navegador para capturas novas e sincronizações."
                        checked={browserNotifications}
                        onCheckedChange={handleBrowserNotificationsChange}
                        disabled={isSavingSettings}
                    />
                </SettingsCard>

                {/* Email */}
                <SettingsCard>
                    <ToggleRow
                        id="email-notifications"
                        label={
                            <span className="inline-flex items-center gap-2">
                                <Mail
                                    className="size-4 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                Notificações por e-mail
                            </span>
                        }
                        description="Manda e-mail quando chegam capturas novas."
                        checked={emailNotifications}
                        onCheckedChange={handleEmailNotificationsChange}
                        disabled={isSavingSettings}
                    />

                    {emailNotifications && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                            <Label htmlFor="notification-email">
                                Endereço de e-mail
                            </Label>
                            <Input
                                id="notification-email"
                                type="email"
                                value={notificationEmail}
                                onChange={(e) =>
                                    handleNotificationEmailChange(
                                        e.target.value,
                                    )
                                }
                                placeholder={userEmail || "your@email.com"}
                            />
                            <p className="text-xs text-muted-foreground">
                                {userEmail && notificationEmail === userEmail
                                    ? "Usando o e-mail da sua conta. Dá para trocar por outro endereço."
                                    : "E-mail que recebe as notificações."}
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSendTestEmail}
                                    disabled={
                                        isSendingTestEmail ||
                                        !(notificationEmail || userEmail)
                                    }
                                >
                                    <Mail className="size-4" />
                                    {isSendingTestEmail
                                        ? "Enviando…"
                                        : "Enviar e-mail de teste"}
                                </Button>
                                {testEmailStatus.type && (
                                    <p
                                        className={`text-xs ${
                                            testEmailStatus.type === "success"
                                                ? "text-green-600 dark:text-green-400"
                                                : "text-red-600 dark:text-red-400"
                                        }`}
                                    >
                                        {testEmailStatus.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </SettingsCard>

                {/* Bark */}
                <SettingsCard>
                    <ToggleRow
                        id="bark-notifications"
                        label={
                            <span className="inline-flex items-center gap-2">
                                <Smartphone
                                    className="size-4 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                Notificações push pelo Bark
                            </span>
                        }
                        description="Manda push pelo Bark quando chegam capturas novas."
                        checked={barkNotifications}
                        onCheckedChange={handleBarkNotificationsChange}
                        disabled={isSavingSettings}
                    />

                    {barkNotifications && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                            <Label htmlFor="bark-push-url">
                                URL de push do Bark
                            </Label>
                            <Input
                                id="bark-push-url"
                                type="url"
                                value={barkPushUrl}
                                onChange={(e) =>
                                    handleBarkPushUrlChange(e.target.value)
                                }
                                placeholder="https://api.day.app/your_key"
                            />
                            <p className="text-xs text-muted-foreground">
                                Copie a URL de push completa do app Bark (ex.:
                                https://api.day.app/your_key).
                            </p>
                        </div>
                    )}
                </SettingsCard>

                {/* Sound */}
                <SettingsCard>
                    <ToggleRow
                        id="notification-sound"
                        label={
                            <span className="inline-flex items-center gap-2">
                                <Volume2
                                    className="size-4 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                Som de notificação
                            </span>
                        }
                        description="Toca um som quando chega uma notificação."
                        checked={notificationSound}
                        onCheckedChange={(checked) => {
                            setNotificationSound(checked);
                            handleChange({ notificationSound: checked });
                        }}
                        disabled={isSavingSettings}
                    />
                </SettingsCard>

                <SettingsCard>
                    <ToggleRow
                        id="marketing-email-consent"
                        label={
                            <span className="inline-flex items-center gap-2">
                                <Megaphone
                                    className="size-4 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                Novidades do Riffado
                            </span>
                        }
                        description="E-mails ocasionais do projeto Riffado sobre novidades. No máximo algumas vezes por ano."
                        checked={marketingEmailConsent}
                        onCheckedChange={(checked) => {
                            setMarketingEmailConsent(checked);
                            handleChange({ marketingEmailConsent: checked });
                        }}
                        disabled={isSavingSettings}
                    />
                </SettingsCard>
            </div>
        </div>
    );
}
