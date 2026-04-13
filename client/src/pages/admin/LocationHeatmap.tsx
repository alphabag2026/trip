import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Flame, Calendar, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function LocationHeatmap() {
  const { t } = useTranslation();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<string>("all");
  const mapRef = useRef<google.maps.Map | null>(null);
  const heatmapLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  const { data: meetups, isLoading: meetupsLoading } = trpc.meetup.list.useQuery();

  const timeFilter = useMemo(() => {
    const now = Date.now();
    switch (timeRange) {
      case "1h": return { startTime: now - 3600000 };
      case "6h": return { startTime: now - 21600000 };
      case "24h": return { startTime: now - 86400000 };
      case "7d": return { startTime: now - 604800000 };
      default: return {};
    }
  }, [timeRange]);

  const { data: heatmapData, isLoading: heatmapLoading, refetch } = trpc.locationHeatmap.getData.useQuery(
    { meetupId: selectedMeetupId!, ...timeFilter },
    { enabled: !!selectedMeetupId, refetchInterval: 30000 }
  );

  // 밋업 자동 선택
  useEffect(() => {
    if (meetups && meetups.length > 0 && !selectedMeetupId) {
      setSelectedMeetupId(meetups[0].id);
    }
  }, [meetups, selectedMeetupId]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // 히트맵 레이어 업데이트
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !heatmapData?.points?.length) {
      if (heatmapLayerRef.current) {
        heatmapLayerRef.current.setMap(null);
        heatmapLayerRef.current = null;
      }
      return;
    }

    const points = heatmapData.points.map((p) =>
      new google.maps.LatLng(p.lat, p.lng)
    );

    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setData(points);
    } else {
      heatmapLayerRef.current = new google.maps.visualization.HeatmapLayer({
        data: points,
        map,
        radius: 30,
        opacity: 0.7,
        gradient: [
          "rgba(0, 255, 255, 0)",
          "rgba(0, 255, 255, 1)",
          "rgba(0, 191, 255, 1)",
          "rgba(0, 127, 255, 1)",
          "rgba(0, 63, 255, 1)",
          "rgba(0, 0, 255, 1)",
          "rgba(0, 0, 223, 1)",
          "rgba(0, 0, 191, 1)",
          "rgba(0, 0, 159, 1)",
          "rgba(0, 0, 127, 1)",
          "rgba(63, 0, 91, 1)",
          "rgba(127, 0, 63, 1)",
          "rgba(191, 0, 31, 1)",
          "rgba(255, 0, 0, 1)",
        ],
      });
    }

    // 지도 범위 자동 조정
    if (points.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds);
    }
  }, [heatmapData]);

  // 컴포넌트 언마운트 시 히트맵 레이어 정리
  useEffect(() => {
    return () => {
      if (heatmapLayerRef.current) {
        heatmapLayerRef.current.setMap(null);
        heatmapLayerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            {t("admin.sidebar.locationHeatmap", "위치 히트맵")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            참가자들의 위치 기록을 히트맵으로 시각화하여 밀집 지역을 분석합니다
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={heatmapLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${heatmapLoading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">밋업 선택</label>
              <Select
                value={selectedMeetupId?.toString() || ""}
                onValueChange={(v) => setSelectedMeetupId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={meetupsLoading ? "로딩 중..." : "밋업 선택"} />
                </SelectTrigger>
                <SelectContent>
                  {meetups?.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                시간 범위
              </label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="1h">최근 1시간</SelectItem>
                  <SelectItem value="6h">최근 6시간</SelectItem>
                  <SelectItem value="24h">최근 24시간</SelectItem>
                  <SelectItem value="7d">최근 7일</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {heatmapData && (
                <span className="text-sm text-muted-foreground">
                  데이터 포인트: <strong className="text-foreground">{heatmapData.count.toLocaleString()}</strong>개
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 히트맵 지도 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            히트맵
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedMeetupId ? (
            <div className="h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">밋업을 선택하면 히트맵이 표시됩니다</p>
            </div>
          ) : heatmapLoading ? (
            <div className="h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : heatmapData?.count === 0 ? (
            <div className="h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
              <div className="text-center">
                <Flame className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground">위치 데이터가 없습니다</p>
                <p className="text-xs text-muted-foreground mt-1">참가자들이 위치 공유를 시작하면 히트맵이 표시됩니다</p>
              </div>
            </div>
          ) : (
            <div className="h-[500px] rounded-lg overflow-hidden">
              <MapView
                onMapReady={handleMapReady}
                initialCenter={{ lat: 37.5665, lng: 126.978 }}
                initialZoom={12}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 범례 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">밀집도:</span>
            <div className="flex items-center gap-1">
              <div className="w-20 h-4 rounded" style={{ background: "linear-gradient(to right, rgba(0,255,255,1), rgba(0,127,255,1), rgba(0,0,255,1), rgba(127,0,63,1), rgba(255,0,0,1))" }} />
              <span className="text-xs text-muted-foreground ml-1">낮음 → 높음</span>
            </div>
            <span className="text-xs text-muted-foreground">
              30초마다 자동 새로고침됩니다
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
