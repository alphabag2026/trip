import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Route, MapPin, Clock, Gauge, ArrowRight, Calendar, User, Search, Download, Loader2,
} from "lucide-react";

interface HistoryPoint {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude?: number | null;
  heading: number | null;
  speed: number | null;
  createdAt: Date | string;
}

// 두 좌표 간 거리 계산 (미터)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 색상 팔레트 (사용자별)
const USER_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
];

export default function LocationHistoryPage() {
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const { data: meetups } = trpc.meetup.list.useQuery();
  const { data: locations } = trpc.liveLocation.getAllActiveLocations.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // 활성 사용자 목록 (위치 공유 중인)
  const activeUsers = useMemo(() => {
    if (!locations) return [];
    const userMap = new Map<number, any>();
    locations.forEach((loc: any) => {
      if (selectedMeetupId && loc.meetupId !== selectedMeetupId) return;
      if (!userMap.has(loc.userId)) {
        userMap.set(loc.userId, loc);
      }
    });
    return Array.from(userMap.entries()).map(([userId]) => ({ id: userId }));
  }, [locations, selectedMeetupId]);

  // 이력 조회
  const userIdNum = selectedUserId ? parseInt(selectedUserId) : undefined;
  const startTimeMs = startDate ? new Date(startDate).getTime() : undefined;
  const endTimeMs = endDate ? new Date(endDate + "T23:59:59").getTime() : undefined;

  const { data: userHistory, isLoading: isLoadingUser } = trpc.locationHistory.getByUser.useQuery(
    {
      userId: userIdNum!,
      meetupId: selectedMeetupId || undefined,
      startTime: startTimeMs,
      endTime: endTimeMs,
      limit: 2000,
    },
    { enabled: !!userIdNum }
  );

  const { data: meetupHistory, isLoading: isLoadingMeetup } = trpc.locationHistory.getByMeetup.useQuery(
    {
      meetupId: selectedMeetupId!,
      startTime: startTimeMs,
      endTime: endTimeMs,
      limit: 5000,
    },
    { enabled: !!selectedMeetupId && !userIdNum }
  );

  const historyData = userIdNum ? userHistory : meetupHistory;
  const isLoading = userIdNum ? isLoadingUser : isLoadingMeetup;

  // 통계 계산
  const stats = useMemo(() => {
    if (!historyData || historyData.length === 0) return null;

    const userGroups = new Map<number, HistoryPoint[]>();
    historyData.forEach((p: HistoryPoint) => {
      if (!userGroups.has(p.userId)) userGroups.set(p.userId, []);
      userGroups.get(p.userId)!.push(p);
    });

    let totalDistance = 0;
    let totalDuration = 0;
    let maxSpeed = 0;

    userGroups.forEach((points) => {
      for (let i = 1; i < points.length; i++) {
        totalDistance += haversineDistance(
          points[i - 1].latitude, points[i - 1].longitude,
          points[i].latitude, points[i].longitude
        );
      }
      if (points.length >= 2) {
        const start = new Date(points[0].createdAt).getTime();
        const end = new Date(points[points.length - 1].createdAt).getTime();
        totalDuration += (end - start) / 1000;
      }
      points.forEach((p) => {
        if (p.speed && p.speed > maxSpeed) maxSpeed = p.speed;
      });
    });

    return {
      totalPoints: historyData.length,
      uniqueUsers: userGroups.size,
      totalDistance: totalDistance / 1000, // km
      totalDuration,
      maxSpeed: maxSpeed * 3.6, // km/h
      avgSpeed: totalDuration > 0 ? (totalDistance / totalDuration) * 3.6 : 0,
    };
  }, [historyData]);

  // 지도에 폴리라인 표시
  useEffect(() => {
    if (!mapRef.current) return;

    // 기존 정리
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    markersRef.current.forEach((m) => { m.map = null; });
    markersRef.current = [];

    if (!historyData || historyData.length === 0) return;

    // 사용자별 그룹화
    const userGroups = new Map<number, HistoryPoint[]>();
    historyData.forEach((p: HistoryPoint) => {
      if (!userGroups.has(p.userId)) userGroups.set(p.userId, []);
      userGroups.get(p.userId)!.push(p);
    });

    const bounds = new google.maps.LatLngBounds();
    let colorIdx = 0;

    userGroups.forEach((points, userId) => {
      const color = USER_COLORS[colorIdx % USER_COLORS.length];
      colorIdx++;

      const path = points.map((p) => {
        const pos = { lat: p.latitude, lng: p.longitude };
        bounds.extend(pos);
        return pos;
      });

      // 폴리라인
      const polyline = new google.maps.Polyline({
        map: mapRef.current!,
        path,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 3,
        geodesic: true,
      });
      polylinesRef.current.push(polyline);

      // 시작점 마커
      if (points.length > 0) {
        const startEl = document.createElement("div");
        startEl.innerHTML = `<div class="flex flex-col items-center"><div class="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow" style="background:${color}">User #${userId} 시작</div><div class="w-2.5 h-2.5 rounded-full border-2 border-white shadow" style="background:${color}"></div></div>`;
        const startMarker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current!,
          position: path[0],
          content: startEl,
        });
        markersRef.current.push(startMarker);
      }

      // 끝점 마커
      if (points.length > 1) {
        const endEl = document.createElement("div");
        endEl.innerHTML = `<div class="flex flex-col items-center"><div class="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow" style="background:${color}">User #${userId} 현재</div><div class="w-3 h-3 rounded-full border-2 border-white shadow animate-pulse" style="background:${color}"></div></div>`;
        const endMarker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current!,
          position: path[path.length - 1],
          content: endEl,
        });
        markersRef.current.push(endMarker);
      }
    });

    if (historyData.length === 1) {
      mapRef.current.setCenter({ lat: historyData[0].latitude, lng: historyData[0].longitude });
      mapRef.current.setZoom(15);
    } else {
      mapRef.current.fitBounds(bounds, 60);
    }
  }, [historyData]);

  const activeMeetups = useMemo(() => {
    return meetups?.filter((m: any) => ["open", "active", "upcoming", "closed", "completed"].includes(m.status)) || [];
  }, [meetups]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Route className="h-6 w-6 text-purple-500" />
          위치 이동 이력
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          참가자들의 이동 경로를 지도에서 확인합니다
        </p>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs">밋업</Label>
              <Select
                value={selectedMeetupId?.toString() || ""}
                onValueChange={(v) => { setSelectedMeetupId(v ? parseInt(v) : null); setSelectedUserId(""); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="밋업 선택" />
                </SelectTrigger>
                <SelectContent>
                  {activeMeetups.map((m: any) => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">사용자 (선택)</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 참가자" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 참가자</SelectItem>
                  {activeUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>User #{u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">시작일</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">종료일</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          {/* CSV 다운로드 버튼 */}
          {selectedMeetupId && (
            <div className="flex items-end">
              <CsvDownloadButton
                meetupId={selectedMeetupId}
                userId={userIdNum}
                startTime={startTimeMs}
                endTime={endTimeMs}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 통계 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{stats.totalPoints}</p>
              <p className="text-xs text-muted-foreground">위치 기록</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{stats.uniqueUsers}</p>
              <p className="text-xs text-muted-foreground">참가자</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{stats.totalDistance.toFixed(1)} km</p>
              <p className="text-xs text-muted-foreground">총 이동 거리</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{stats.avgSpeed.toFixed(1)} km/h</p>
              <p className="text-xs text-muted-foreground">평균 속도</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{stats.maxSpeed.toFixed(1)} km/h</p>
              <p className="text-xs text-muted-foreground">최고 속도</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 지도 */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-lg">
          <MapView
            className="w-full h-[500px]"
            initialCenter={{ lat: 37.5665, lng: 126.978 }}
            initialZoom={10}
            onMapReady={(map) => { mapRef.current = map; }}
          />
        </CardContent>
      </Card>

      {/* 로딩/빈 상태 */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">이동 이력을 불러오는 중...</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && (!historyData || historyData.length === 0) && selectedMeetupId && (
        <Card>
          <CardContent className="p-8 text-center">
            <Route className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">이동 이력이 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">참가자가 위치 공유를 시작하면 이동 경로가 기록됩니다</p>
          </CardContent>
        </Card>
      )}

      {!selectedMeetupId && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">밋업을 선택하세요</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CsvDownloadButton({ meetupId, userId, startTime, endTime }: {
  meetupId: number;
  userId?: number;
  startTime?: number;
  endTime?: number;
}) {
  const exportMut = trpc.locationExport.exportCsv.useMutation();

  const handleDownload = async () => {
    try {
      const result = await exportMut.mutateAsync({ meetupId, userId, startTime, endTime });
      if (result.count === 0) {
        toast.info("내보낼 이력 데이터가 없습니다.");
        return;
      }
      // CSV 파일 다운로드
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date().toISOString().slice(0, 10);
      a.download = `location-history-meetup${meetupId}${userId ? `-user${userId}` : ""}-${now}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${result.count}건의 이력 데이터를 CSV로 다운로드했습니다.`);
    } catch (err: any) {
      toast.error(err.message || "CSV 내보내기에 실패했습니다.");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={exportMut.isPending}
      className="mt-4"
    >
      {exportMut.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1" />
      ) : (
        <Download className="h-4 w-4 mr-1" />
      )}
      CSV 다운로드
    </Button>
  );
}
