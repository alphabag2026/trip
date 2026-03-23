import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, CheckCircle2, XCircle, Clock, Loader2, ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";

import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function InviteAccept() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: invite, isLoading, error } = trpc.invitation.getByToken.useQuery(
    { token: token || "" },
    { enabled: !!token, retry: false }
  );

  const acceptMutation = trpc.invitation.accept.useMutation({
    onSuccess: () => {
      toast.success(t("invite.acceptSuccess"));
      setTimeout(() => setLocation("/dashboard"), 1500);
    },
    onError: (err) => {
      toast.error(err.message || t("invite.acceptFailed"));
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t("invite.loadingInvite")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>{t("invite.orgInvite")}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{t("invite.loginRequired")}</p>
            <Button className="w-full" onClick={() => { window.location.href = `/login?returnPath=${encodeURIComponent(`/invite/${token}`)}`; }}>
              {t("invite.loginAndAccept")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">{t("invite.invalidInvite")}</h2>
            <p className="text-muted-foreground">{t("invite.invalidDescription")}</p>
            <Button variant="outline" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> {t("invite.goHome")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(invite.expiresAt) < new Date();
  const isAlreadyProcessed = invite.status !== "pending";

  const roleLabels: Record<string, string> = {
    owner: t("invite.roleOwner"),
    manager: t("invite.roleManager"),
    staff: t("invite.roleStaff"),
    viewer: t("invite.roleViewer"),
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            {isAlreadyProcessed ? (
              invite.status === "accepted" ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <XCircle className="h-8 w-8 text-muted-foreground" />
              )
            ) : isExpired ? (
              <Clock className="h-8 w-8 text-amber-500" />
            ) : (
              <Building2 className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle>
            {isAlreadyProcessed
              ? invite.status === "accepted" ? t("invite.alreadyAccepted") : t("invite.alreadyProcessed")
              : isExpired ? t("invite.expired") : t("invite.orgInvite")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t("invite.organization")}:</span>
              <span className="font-medium">{invite.organization?.name || t("invite.unknown")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t("invite.role")}:</span>
              <Badge variant="outline">{roleLabels[invite.memberRole] || invite.memberRole}</Badge>
            </div>
            {invite.message && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground italic">"{invite.message}"</p>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {t("invite.expiresAt")}: {new Date(invite.expiresAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          {isAlreadyProcessed ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {invite.status === "accepted" ? t("invite.alreadyAcceptedDesc") : t("invite.alreadyProcessedDesc")}
              </p>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/dashboard")}>
                {t("invite.goToDashboard")}
              </Button>
            </div>
          ) : isExpired ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-destructive">{t("invite.expiredDescription")}</p>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
                {t("invite.goHome")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => acceptMutation.mutate({ token: token || "" })}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("invite.processing")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t("invite.acceptInvite")}
                  </>
                )}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
                {t("invite.later")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
