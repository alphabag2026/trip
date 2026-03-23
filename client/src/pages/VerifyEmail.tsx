import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const { t } = useTranslation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">(
    token ? "loading" : "no-token"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setStatus("success");
    },
    onError: (err) => {
      setStatus("error");
      setErrorMessage(err.message || t("verifyEmail.genericError"));
    },
  });

  useEffect(() => {
    if (token && status === "loading") {
      verifyMutation.mutate({ token });
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
          {status === "loading" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/10 mb-6">
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {t("verifyEmail.verifying")}
              </h1>
              <p className="text-muted-foreground">
                {t("verifyEmail.pleaseWait")}
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {t("verifyEmail.successTitle")}
              </h1>
              <p className="text-muted-foreground mb-6">
                {t("verifyEmail.successDesc")}
              </p>
              <div className="space-y-2">
                <Link href="/my-page">
                  <Button className="w-full">
                    {t("verifyEmail.goToMyPage")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost" className="w-full">
                    {t("verifyEmail.goHome")}
                  </Button>
                </Link>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 mb-6">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {t("verifyEmail.errorTitle")}
              </h1>
              <p className="text-muted-foreground mb-6">
                {errorMessage}
              </p>
              <div className="space-y-2">
                <Link href="/my-page">
                  <Button className="w-full">
                    {t("verifyEmail.resendFromMyPage")}
                    <Mail className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost" className="w-full">
                    {t("verifyEmail.goHome")}
                  </Button>
                </Link>
              </div>
            </>
          )}

          {status === "no-token" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-500/10 mb-6">
                <Mail className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {t("verifyEmail.noTokenTitle")}
              </h1>
              <p className="text-muted-foreground mb-6">
                {t("verifyEmail.noTokenDesc")}
              </p>
              <Link href="/login">
                <Button className="w-full">
                  {t("verifyEmail.goLogin")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
