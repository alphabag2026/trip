import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, ClipboardList, MapPin, ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.roleDashboard.organizer.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const meetups = data?.meetups || [];
  const totalAttendees = data?.totalAttendees || 0;
  const pendingRegistrations = data?.pendingRegistrations || 0;
  const activeMeetups = meetups.filter((m: any) => m.status === "active" || m.status === "upcoming").length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" className="mb-2" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> 홈으로
            </Button>
            <h1 className="text-2xl font-bold">주최자 대시보드</h1>
            <p className="text-muted-foreground mt-1">
              환영합니다, <span className="font-medium text-foreground">{user?.name}</span>님
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">전체 밋업</p>
                  <p className="text-2xl font-bold">{meetups.length}</p>
                </div>
                <CalendarDays className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">진행 중</p>
                  <p className="text-2xl font-bold">{activeMeetups}</p>
                </div>
                <Clock className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">총 참석자</p>
                  <p className="text-2xl font-bold">{totalAttendees}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">대기 중 신청</p>
                  <p className="text-2xl font-bold">{pendingRegistrations}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-amber-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Meetups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">최근 밋업</CardTitle>
          </CardHeader>
          <CardContent>
            {meetups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>등록된 밋업이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meetups.slice(0, 5).map((meetup: any) => (
                  <div key={meetup.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CalendarDays className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{meetup.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" />
                          <span>{meetup.destinationCountry || meetup.location || "-"}</span>
                          {meetup.scheduleStart && (
                            <>
                              <span className="mx-1">·</span>
                              <span>{new Date(meetup.scheduleStart).toLocaleDateString("ko-KR")}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant={meetup.status === "active" ? "default" : meetup.status === "completed" ? "secondary" : "outline"}>
                      {meetup.status === "active" ? "진행 중" : meetup.status === "completed" ? "완료" : meetup.status === "upcoming" ? "예정" : meetup.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
