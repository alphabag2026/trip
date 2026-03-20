import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, CheckCircle2, XCircle, Clock, Loader2, ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: invite, isLoading, error } = trpc.invitation.getByToken.useQuery(
    { token: token || "" },
    { enabled: !!token, retry: false }
  );

  const acceptMutation = trpc.invitation.accept.useMutation({
    onSuccess: () => {
      toast.success("초대를 수락했습니다! 조직에 가입되었습니다.");
      setTimeout(() => setLocation("/dashboard"), 1500);
    },
    onError: (err) => {
      toast.error(err.message || "초대 수락에 실패했습니다.");
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">초대 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 로그인 필요
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>조직 초대</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              초대를 수락하려면 먼저 로그인해 주세요.
            </p>
            <Button className="w-full" onClick={() => { window.location.href = getLoginUrl(`/invite/${token}`); }}>
              로그인하고 초대 수락
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 에러 (초대 없음)
  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">유효하지 않은 초대</h2>
            <p className="text-muted-foreground">
              초대 링크가 잘못되었거나 만료되었습니다.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> 홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(invite.expiresAt) < new Date();
  const isAlreadyProcessed = invite.status !== "pending";

  const roleLabels: Record<string, string> = {
    owner: "소유자",
    manager: "매니저",
    staff: "스태프",
    viewer: "뷰어",
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
              ? invite.status === "accepted" ? "이미 수락된 초대" : "처리된 초대"
              : isExpired ? "만료된 초대" : "조직 초대"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 조직 정보 */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">조직:</span>
              <span className="font-medium">{invite.organization?.name || "알 수 없음"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">역할:</span>
              <Badge variant="outline">{roleLabels[invite.memberRole] || invite.memberRole}</Badge>
            </div>
            {invite.message && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground italic">"{invite.message}"</p>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              만료: {new Date(invite.expiresAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          {/* 액션 */}
          {isAlreadyProcessed ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {invite.status === "accepted" ? "이 초대는 이미 수락되었습니다." : "이 초대는 이미 처리되었습니다."}
              </p>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/dashboard")}>
                대시보드로 이동
              </Button>
            </div>
          ) : isExpired ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-destructive">이 초대는 만료되었습니다. 관리자에게 새 초대를 요청하세요.</p>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
                홈으로 돌아가기
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
                    처리 중...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    초대 수락
                  </>
                )}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
                나중에 하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
