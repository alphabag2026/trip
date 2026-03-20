import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Handshake, CalendarDays, ArrowLeft, MapPin, CheckCircle2, Clock, Star } from "lucide-react";
import { useLocation } from "wouter";

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.roleDashboard.partner.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const partner = data?.partner;
  const partners = data?.partners || [];
  const meetupPartners = data?.meetupPartners || [];
  const totalServices = data?.totalServices || 0;
  const completedServices = data?.completedServices || 0;

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    pending: { label: "대기", variant: "outline" },
    confirmed: { label: "확정", variant: "default" },
    completed: { label: "완료", variant: "secondary" },
    cancelled: { label: "취소", variant: "destructive" },
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" className="mb-2" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> 홈으로
            </Button>
            <h1 className="text-2xl font-bold">파트너 대시보드</h1>
            <p className="text-muted-foreground mt-1">
              {partner ? (
                <span><span className="font-medium text-foreground">{partner.name}</span> · {partner.region || "-"}</span>
              ) : (
                <span>소속 파트너 업체가 없습니다.</span>
              )}
            </p>
          </div>
        </div>

        {!partner && partners.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Handshake className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-lg font-semibold mb-2">소속 파트너 업체가 없습니다</h2>
              <p className="text-muted-foreground">
                에이전시 또는 플랫폼 관리자에게 문의하세요.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">전체 서비스</p>
                      <p className="text-2xl font-bold">{totalServices}</p>
                    </div>
                    <CalendarDays className="h-8 w-8 text-blue-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">완료 서비스</p>
                      <p className="text-2xl font-bold">{completedServices}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">진행 중</p>
                      <p className="text-2xl font-bold">{totalServices - completedServices}</p>
                    </div>
                    <Clock className="h-8 w-8 text-amber-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Partner Info */}
            {partners.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">파트너 업체 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {partners.map((p: any) => (
                      <div key={p.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Handshake className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <MapPin className="h-3 w-3" />
                                <span>{p.region || "-"}</span>
                                {p.rating > 0 && (
                                  <>
                                    <span>·</span>
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    <span>{p.rating}/5</span>
                                  </>
                                )}
                                {p.capacity && (
                                  <>
                                    <span>·</span>
                                    <span>수용 {p.capacity}명</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge variant={p.isActive ? "default" : "secondary"}>
                            {p.isActive ? "활성" : "비활성"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Meetup Services */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">밋업 서비스 내역</CardTitle>
              </CardHeader>
              <CardContent>
                {meetupPartners.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>참여한 밋업 서비스가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meetupPartners.map((mp: any) => {
                      const st = statusMap[mp.status] || { label: mp.status, variant: "outline" as const };
                      return (
                        <div key={mp.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div>
                            <p className="font-medium">{mp.meetup?.title || "밋업 정보 없음"}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {mp.serviceType && <span>{mp.serviceType}</span>}
                              {mp.serviceDate && (
                                <>
                                  <span>·</span>
                                  <span>{new Date(mp.serviceDate).toLocaleDateString("ko-KR")}</span>
                                </>
                              )}
                              {mp.cost && (
                                <>
                                  <span>·</span>
                                  <span>{mp.cost}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
