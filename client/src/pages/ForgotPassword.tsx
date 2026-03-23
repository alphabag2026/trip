import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Mail, ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setSent(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    requestReset.mutate({ email, origin: window.location.origin });
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t("forgotPassword.sentTitle")}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t("forgotPassword.sentDesc", { email })}
            </p>



            <div className="space-y-2">
              <Link href="/login">
                <Button className="w-full">
                  {t("forgotPassword.backToLogin")}
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                {t("forgotPassword.sendAgain")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/10 mb-4">
              <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t("forgotPassword.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("forgotPassword.description")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("forgotPassword.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("forgotPassword.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={requestReset.isPending || !email.trim()}
            >
              {requestReset.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("forgotPassword.sending")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {t("forgotPassword.sendLink")}
                </span>
              )}
            </Button>

            {requestReset.isError && (
              <p className="text-sm text-red-500 text-center">
                {requestReset.error.message}
              </p>
            )}
          </form>

          {/* Back to login */}
          <div className="mt-6 text-center">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t("forgotPassword.backToLogin")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
