import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Languages, MapPin, Clock, User, RefreshCw, CheckCircle,
  ArrowLeft, AlertCircle, Mic, MessageSquare, Play, Square
} from "lucide-react";
import { Link, useLocation } from "wouter";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  assigned: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const langNames: Record<string, string> = {
  ko: "한국어", en: "English", zh: "中文", ja: "日本語", vi: "Tiếng Việt",
  th: "ไทย", id: "Bahasa", ms: "Malay", ru: "Русский", fr: "Français",
  de: "Deutsch", es: "Español", pt: "Português", it: "Italiano", ar: "العربية",
  hi: "हिन्दी", tr: "Türkçe", pl: "Polski", nl: "Nederlands", sv: "Svenska",
  uk: "Українська", tl: "Filipino", mn: "Монгол",
};

export default function InterpreterDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"pending" | "my" | "completed">("pending");

  const pendingQuery = trpc.translationRequest.pending.useQuery(
    {},
    { refetchInterval: 15000 }
  );

  const myRequestsQuery = trpc.translationRequest.myRequests.useQuery(
    undefined,
    { refetchInterval: 15000 }
  );

  const updateStatusMutation = trpc.translationRequest.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      pendingQuery.refetch();
      myRequestsQuery.refetch();
    },
  });

  const pendingRequests = pendingQuery.data || [];
  const myRequests = myRequestsQuery.data || [];

  const todayRequests = useMemo(() => {
    const today = new Date().toDateString();
    return myRequests.filter((r: any) => {
      if (!r.scheduledTime) return true;
      return new Date(r.scheduledTime).toDateString() === today;
    });
  }, [myRequests]);

  const completedRequests = myRequests.filter((r: any) => r.status === "completed");
  const activeRequests = myRequests.filter((r: any) => r.status === "assigned" || r.status === "in_progress");

  function handleRefresh() {
    pendingQuery.refetch();
    myRequestsQuery.refetch();
    toast.success(t("interpreterDashboard.refreshData"));
  }

  function handleAccept(id: number) {
    updateStatusMutation.mutate({ id, status: "in_progress" });
  }

  function handleComplete(id: number) {
    updateStatusMutation.mutate({ id, status: "completed" });
  }

  function handleCancel(id: number) {
    updateStatusMutation.mutate({ id, status: "cancelled" });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-2xl py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Languages className="h-5 w-5 text-primary" />
                {t("interpreterDashboard.title")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("interpreterDashboard.subtitle")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/translator")}>
              <Mic className="h-4 w-4 mr-1" /> {t("interpreterDashboard.voiceMode")}
            </Button>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
              <div className="text-xs text-muted-foreground">{t("interpreterDashboard.pendingRequests")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{activeRequests.length}</div>
              <div className="text-xs text-muted-foreground">{t("interpreterDashboard.myAssignments")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedRequests.length}</div>
              <div className="text-xs text-muted-foreground">{t("interpreterDashboard.completedSessions")}</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Alert */}
        {activeRequests.length > 0 && (
          <Card className="mb-4 border-purple-300 bg-purple-50 dark:bg-purple-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                {activeRequests.length}건의 통역이 진행중입니다
              </span>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
          {(["pending", "my", "completed"] as const).map((tab) => (
            <Button key={tab} variant={activeTab === tab ? "default" : "ghost"} size="sm" className="flex-1"
              onClick={() => setActiveTab(tab)}>
              {tab === "pending" ? t("interpreterDashboard.pendingRequests") :
               tab === "my" ? t("interpreterDashboard.myAssignments") :
               t("interpreterDashboard.completedSessions")}
              {tab === "pending" && pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-[10px] rounded-full">
                  {pendingRequests.length}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Request List */}
        <div className="space-y-3">
          {activeTab === "pending" && (
            <>
              {pendingRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Languages className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>{t("interpreterDashboard.noRequests")}</p>
                  </CardContent>
                </Card>
              ) : (
                pendingRequests.map((req: any) => (
                  <RequestCard key={req.id} request={req} t={t}
                    onAccept={() => handleAccept(req.id)} />
                ))
              )}
            </>
          )}

          {activeTab === "my" && (
            <>
              {activeRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>{t("interpreterDashboard.noAssignments")}</p>
                  </CardContent>
                </Card>
              ) : (
                activeRequests.map((req: any) => (
                  <RequestCard key={req.id} request={req} t={t} isAssigned
                    onComplete={() => handleComplete(req.id)}
                    onCancel={() => handleCancel(req.id)} />
                ))
              )}
            </>
          )}

          {activeTab === "completed" && (
            <>
              {completedRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>{t("interpreterDashboard.noAssignments")}</p>
                  </CardContent>
                </Card>
              ) : (
                completedRequests.map((req: any) => (
                  <RequestCard key={req.id} request={req} t={t} isCompleted />
                ))
              )}
            </>
          )}
        </div>

        {/* Quick Translate Button */}
        <div className="fixed bottom-20 right-4 z-50">
          <Link href="/translator">
            <Button size="lg" className="rounded-full shadow-lg h-14 w-14 p-0">
              <Languages className="h-6 w-6" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function RequestCard({ request, t, isAssigned, isCompleted, onAccept, onComplete, onCancel }: {
  request: any;
  t: any;
  isAssigned?: boolean;
  isCompleted?: boolean;
  onAccept?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}) {
  const sourceName = langNames[request.sourceLang] || request.sourceLang;
  const targetName = langNames[request.targetLang] || request.targetLang;

  return (
    <Card className={isAssigned ? "border-primary/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={statusColors[request.status] || ""}>
              {t(`interpreterDashboard.${request.status === "in_progress" ? "inProgress" : request.status}`)}
            </Badge>
          </div>
          {request.scheduledTime && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(request.scheduledTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {/* Language Pair */}
        <div className="flex items-center gap-3 mb-3 p-3 bg-muted/30 rounded-lg">
          <div className="text-center flex-1">
            <div className="text-xs text-muted-foreground">{t("interpreterDashboard.sourceLang")}</div>
            <div className="font-semibold">{sourceName}</div>
          </div>
          <div className="text-muted-foreground">→</div>
          <div className="text-center flex-1">
            <div className="text-xs text-muted-foreground">{t("interpreterDashboard.targetLang")}</div>
            <div className="font-semibold">{targetName}</div>
          </div>
        </div>

        {/* Context & Location */}
        {request.context && (
          <div className="flex items-start gap-2 mb-2 text-sm">
            <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span>{request.context}</span>
          </div>
        )}
        {request.location && (
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{request.location}</span>
          </div>
        )}

        {/* Actions */}
        {!isCompleted && (
          <div className="flex gap-2 mt-3">
            {!isAssigned && onAccept && (
              <Button size="sm" className="flex-1" onClick={onAccept}>
                <Play className="h-3.5 w-3.5 mr-1" /> {t("interpreterDashboard.startSession")}
              </Button>
            )}
            {isAssigned && onComplete && (
              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={onComplete}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> {t("interpreterDashboard.endSession")}
              </Button>
            )}
            {isAssigned && onCancel && (
              <Button size="sm" variant="outline" onClick={onCancel}>
                <Square className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
