import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  MapPin, Navigation, Battery, Wifi, WifiOff, Users, RefreshCw, Locate,
} from "lucide-react";

// ── 타입 정의 ──────────────────────────────────────────
interface LocationData {
  userId: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  shareType?: string;
  batteryLevel?: number | null;
  meetupId?: number | null;
  roomId?: number | null;
  updatedAt: Date | string;
}

interface UserInfo {
  id: number;
  name?: string;
  displayName?: string;
}

// ── 채팅방 실시간 위치 지도 ──────────────────────────────
export function ChatRoomLocationMap({
  roomId,
  members,
  onClose,
}: {
  roomId: number;
  members?: UserInfo[];
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [isSharing, setIsSharing] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());

  const updateMutation = trpc.liveLocation.update.useMutation();
  const stopMutation = trpc.liveLocation.stopSharing.useMutation();

  const { data: locations, refetch } = trpc.liveLocation.getChatRoomLocations.useQuery(
    { roomId },
    { refetchInterval: isSharing ? 5000 : 10000 }
  );

  // 위치 공유 시작
  const startSharing = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("이 브라우저는 위치 서비스를 지원하지 않습니다");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        updateMutation.mutate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading || undefined,
          speed: pos.coords.speed || undefined,
          altitude: pos.coords.altitude || undefined,
          roomId,
          shareType: "room",
        });
      },
      (err) => {
        console.error("Geolocation error:", err);
        toast.error("위치를 가져올 수 없습니다: " + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    setWatchId(id);
    setIsSharing(true);
    toast.success("위치 공유를 시작합니다");
  }, [roomId, updateMutation]);

  // 위치 공유 중지
  const stopSharing = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    stopMutation.mutate({ roomId });
    setIsSharing(false);
    toast.success("위치 공유를 중지했습니다");
  }, [watchId, roomId, stopMutation]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // 마커 업데이트
  useEffect(() => {
    if (!mapRef.current || !locations) return;

    const currentIds = new Set(locations.map((l: LocationData) => l.userId));

    // 없어진 마커 제거
    markersRef.current.forEach((marker, userId) => {
      if (!currentIds.has(userId)) {
        marker.map = null;
        markersRef.current.delete(userId);
      }
    });

    // 마커 추가/업데이트
    locations.forEach((loc: LocationData) => {
      const memberInfo = members?.find((m) => m.id === loc.userId);
      const displayName = memberInfo?.displayName || memberInfo?.name || `User ${loc.userId}`;
      const isMe = loc.userId === user?.id;

      const position = { lat: loc.latitude, lng: loc.longitude };

      if (markersRef.current.has(loc.userId)) {
        const marker = markersRef.current.get(loc.userId)!;
        marker.position = position;
      } else {
        // 커스텀 마커 엘리먼트
        const el = document.createElement("div");
        el.className = "flex flex-col items-center";
        el.innerHTML = `
          <div class="px-2 py-1 rounded-full text-xs font-medium shadow-lg ${
            isMe ? "bg-blue-500 text-white" : "bg-white text-gray-800 border border-gray-200"
          }" style="white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;">
            ${isMe ? "나" : displayName}
          </div>
          <div class="w-3 h-3 rounded-full ${isMe ? "bg-blue-500" : "bg-red-500"} border-2 border-white shadow-md mt-1"></div>
        `;

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current!,
          position,
          content: el,
          title: displayName,
        });
        markersRef.current.set(loc.userId, marker);
      }
    });

    // 모든 마커가 보이도록 지도 범위 조정
    if (locations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((loc: LocationData) => {
        bounds.extend({ lat: loc.latitude, lng: loc.longitude });
      });
      if (locations.length === 1) {
        mapRef.current.setCenter({ lat: locations[0].latitude, lng: locations[0].longitude });
        mapRef.current.setZoom(15);
      } else {
        mapRef.current.fitBounds(bounds, 50);
      }
    }
  }, [locations, members, user]);

  const sharingCount = locations?.length || 0;

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-red-400" />
          <span className="font-semibold text-sm">실시간 위치 공유</span>
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {sharingCount}명 공유 중
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isSharing ? "destructive" : "default"}
            size="sm"
            onClick={isSharing ? stopSharing : startSharing}
            className="text-xs"
          >
            {isSharing ? (
              <><WifiOff className="h-3 w-3 mr-1" /> 공유 중지</>
            ) : (
              <><Wifi className="h-3 w-3 mr-1" /> 내 위치 공유</>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            닫기
          </Button>
        </div>
      </div>

      {/* 지도 */}
      <div className="flex-1 relative">
        <MapView
          className="w-full h-full min-h-[300px]"
          initialCenter={{ lat: 37.5665, lng: 126.978 }}
          initialZoom={12}
          onMapReady={(map) => {
            mapRef.current = map;
          }}
        />

        {/* 참여자 목록 오버레이 */}
        {locations && locations.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 max-h-32 overflow-y-auto">
            <Card className="bg-background/90 backdrop-blur border shadow-lg">
              <CardContent className="p-2 space-y-1">
                {locations.map((loc: LocationData) => {
                  const memberInfo = members?.find((m) => m.id === loc.userId);
                  const displayName = memberInfo?.displayName || memberInfo?.name || `User ${loc.userId}`;
                  const isMe = loc.userId === user?.id;
                  const updatedAgo = Math.round((Date.now() - new Date(loc.updatedAt).getTime()) / 1000);

                  return (
                    <div
                      key={loc.userId}
                      className="flex items-center justify-between text-xs cursor-pointer hover:bg-accent/50 rounded px-2 py-1"
                      onClick={() => {
                        mapRef.current?.setCenter({ lat: loc.latitude, lng: loc.longitude });
                        mapRef.current?.setZoom(16);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isMe ? "bg-blue-500" : "bg-red-500"}`} />
                        <span className={isMe ? "font-semibold text-blue-400" : ""}>{isMe ? "나" : displayName}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {updatedAgo < 60 ? `${updatedAgo}초 전` : `${Math.round(updatedAgo / 60)}분 전`}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 새로고침 버튼 */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-4 right-4 shadow-lg"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── 관리자 밋업 위치 추적 대시보드 ──────────────────────────
export function MeetupLocationTracker({
  meetupId,
  meetupTitle,
}: {
  meetupId: number;
  meetupTitle?: string;
}) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const { data: locations, refetch } = trpc.liveLocation.getMeetupLocations.useQuery(
    { meetupId },
    { refetchInterval: 8000 }
  );

  // 마커 업데이트
  useEffect(() => {
    if (!mapRef.current || !locations) return;

    const currentIds = new Set(locations.map((l: LocationData) => l.userId));

    markersRef.current.forEach((marker, userId) => {
      if (!currentIds.has(userId)) {
        marker.map = null;
        markersRef.current.delete(userId);
      }
    });

    locations.forEach((loc: LocationData) => {
      const position = { lat: loc.latitude, lng: loc.longitude };
      const isSelected = loc.userId === selectedUser;

      if (markersRef.current.has(loc.userId)) {
        markersRef.current.get(loc.userId)!.position = position;
      } else {
        const el = document.createElement("div");
        el.className = "flex flex-col items-center cursor-pointer";
        el.innerHTML = `
          <div class="px-2 py-1 rounded-full text-xs font-medium shadow-lg ${
            isSelected ? "bg-blue-500 text-white ring-2 ring-blue-300" : "bg-white text-gray-800 border border-gray-200"
          }" style="white-space:nowrap;">
            User #${loc.userId}
          </div>
          <div class="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-md mt-1 animate-pulse"></div>
        `;

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current!,
          position,
          content: el,
          title: `User #${loc.userId}`,
        });

        marker.addListener("click", () => {
          setSelectedUser(loc.userId);
          mapRef.current?.setCenter(position);
          mapRef.current?.setZoom(16);
        });

        markersRef.current.set(loc.userId, marker);
      }
    });

    if (locations.length > 0 && !selectedUser) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((loc: LocationData) => {
        bounds.extend({ lat: loc.latitude, lng: loc.longitude });
      });
      if (locations.length === 1) {
        mapRef.current.setCenter({ lat: locations[0].latitude, lng: locations[0].longitude });
        mapRef.current.setZoom(15);
      } else {
        mapRef.current.fitBounds(bounds, 50);
      }
    }
  }, [locations, selectedUser]);

  const sharingCount = locations?.length || 0;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Navigation className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">실시간 위치 추적</h3>
            {meetupTitle && <p className="text-xs text-muted-foreground">{meetupTitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Locate className="h-3 w-3 mr-1 text-green-500" />
            {sharingCount}명 활성
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            <RefreshCw className="h-3 w-3 mr-1" /> 새로고침
          </Button>
        </div>
      </div>

      {/* 지도 */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-lg">
          <MapView
            className="w-full h-[400px]"
            initialCenter={{ lat: 37.5665, lng: 126.978 }}
            initialZoom={10}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
          />
        </CardContent>
      </Card>

      {/* 참가자 위치 목록 */}
      {locations && locations.length > 0 ? (
        <Card>
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              위치 공유 중인 참가자
            </h4>
            <div className="space-y-2">
              {locations.map((loc: LocationData) => {
                const updatedAgo = Math.round((Date.now() - new Date(loc.updatedAt).getTime()) / 1000);
                const isActive = updatedAgo < 120;

                return (
                  <div
                    key={loc.userId}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedUser === loc.userId ? "bg-blue-500/10 border border-blue-500/30" : "hover:bg-accent/50"
                    }`}
                    onClick={() => {
                      setSelectedUser(loc.userId);
                      mapRef.current?.setCenter({ lat: loc.latitude, lng: loc.longitude });
                      mapRef.current?.setZoom(16);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
                      <div>
                        <span className="text-sm font-medium">User #{loc.userId}</span>
                        <div className="text-xs text-muted-foreground">
                          {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {updatedAgo < 60 ? `${updatedAgo}초 전` : `${Math.round(updatedAgo / 60)}분 전`}
                      </div>
                      {loc.speed && loc.speed > 0 && (
                        <div className="text-xs text-blue-400">
                          {(loc.speed * 3.6).toFixed(1)} km/h
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">현재 위치를 공유하는 참가자가 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">참가자가 채팅방에서 위치 공유를 시작하면 여기에 표시됩니다</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
