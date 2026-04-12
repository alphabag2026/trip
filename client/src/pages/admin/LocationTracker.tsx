import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MeetupLocationTracker } from "@/components/LiveLocationMap";
import { Navigation, MapPin, Users, AlertCircle } from "lucide-react";

export default function AdminLocationTracker() {
  const { user } = useAuth();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);

  const { data: meetups } = trpc.meetup.list.useQuery();
  const { data: allLocations } = trpc.liveLocation.getAllActiveLocations.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const activeMeetups = useMemo(() => {
    return meetups?.filter((m: any) => m.status === "active" || m.status === "upcoming") || [];
  }, [meetups]);

  const totalActive = allLocations?.length || 0;

  // 밋업별 활성 위치 수 집계
  const meetupLocationCounts = useMemo(() => {
    const counts = new Map<number, number>();
    allLocations?.forEach((loc: any) => {
      if (loc.meetupId) {
        counts.set(loc.meetupId, (counts.get(loc.meetupId) || 0) + 1);
      }
    });
    return counts;
  }, [allLocations]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Navigation className="h-6 w-6 text-green-500" />
            실시간 위치 추적
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            밋업 참가자들의 실시간 위치를 모니터링합니다
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
          총 {totalActive}명 활성
        </Badge>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <MapPin className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalActive}</p>
              <p className="text-xs text-muted-foreground">위치 공유 중</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{meetupLocationCounts.size}</p>
              <p className="text-xs text-muted-foreground">활성 밋업</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeMeetups.length}</p>
              <p className="text-xs text-muted-foreground">진행/예정 밋업</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 밋업 선택 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">밋업 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedMeetupId?.toString() || ""}
            onValueChange={(v) => setSelectedMeetupId(v ? parseInt(v) : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="위치를 추적할 밋업을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {activeMeetups.map((m: any) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{m.title}</span>
                    {meetupLocationCounts.has(m.id) && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        {meetupLocationCounts.get(m.id)}명
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
              {activeMeetups.length === 0 && (
                <SelectItem value="none" disabled>
                  진행 중인 밋업이 없습니다
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 위치 추적 지도 */}
      {selectedMeetupId ? (
        <MeetupLocationTracker
          meetupId={selectedMeetupId}
          meetupTitle={activeMeetups.find((m: any) => m.id === selectedMeetupId)?.title}
        />
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Navigation className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
            <h3 className="text-lg font-semibold text-muted-foreground">밋업을 선택하세요</h3>
            <p className="text-sm text-muted-foreground mt-2">
              위에서 밋업을 선택하면 해당 밋업 참가자들의 실시간 위치가 지도에 표시됩니다
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
