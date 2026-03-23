import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Lock, CheckCircle2, XCircle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const { t } = useTranslation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Validate token
  const tokenQuery = trpc.auth.validateResetToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setResetDone(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    if (newPassword.length < 8) return;
    resetMutation.mutate({ token, newPassword });
  };

  const passwordsMatch = newPassword === confirmPassword;
  const passwordLongEnough = newPassword.length >= 8;

  // No token
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 mb-6">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t("resetPassword.invalidLink")}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t("resetPassword.invalidLinkDesc")}
            </p>
            <Link href="/forgot-password">
              <Button className="w-full">
                {t("resetPassword.requestNewLink")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading token validation
  if (tokenQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t("resetPassword.validating")}</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid/expired token
  if (!tokenQuery.data?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 mb-6">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t("resetPassword.expiredLink")}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t("resetPassword.expiredLinkDesc")}
            </p>
            <Link href="/forgot-password">
              <Button className="w-full">
                {t("resetPassword.requestNewLink")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset done
  if (resetDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t("resetPassword.successTitle")}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t("resetPassword.successDesc")}
            </p>
            <Link href="/login">
              <Button className="w-full">
                {t("resetPassword.goToLogin")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/10 mb-4">
              <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t("resetPassword.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("resetPassword.description", { email: tokenQuery.data?.email || "" })}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("resetPassword.newPasswordLabel")}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("resetPassword.newPasswordPlaceholder")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && !passwordLongEnough && (
                <p className="text-xs text-red-500">{t("resetPassword.minLength")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("resetPassword.confirmPasswordLabel")}</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder={t("resetPassword.confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500">{t("resetPassword.passwordMismatch")}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={resetMutation.isPending || !passwordsMatch || !passwordLongEnough}
            >
              {resetMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("resetPassword.resetting")}
                </span>
              ) : (
                t("resetPassword.resetButton")
              )}
            </Button>

            {resetMutation.isError && (
              <p className="text-sm text-red-500 text-center">
                {resetMutation.error.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
