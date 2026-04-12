import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  MapPin, Plus, Trash2, Edit2, Bell, BellOff, Shield, LogIn, LogOut,
  Target, CircleDot, Hotel, Plane, UtensilsCrossed, Building, Crosshair,
} from "lucide-react";

const GEOFENCE_TYPES = [
  { value: "hotel", label: "호텔", icon: Hotel },
  { value: "airport", label: "공항", icon: Plane },
  { value: "restaurant", label: "식당", icon: UtensilsCrossed },
  { value: "venue", label: "행사장", icon: Building },
  { value: "poi", label: "관심지점", icon: MapPin },
  { value: "custom", label: "커스텀", icon: CircleDot },
] as const;

const TYPE_COLORS: Record<string, string> = {
  hotel: "#3B82F6",
  airport: "#8B5CF6",
  restaurant: "#F59E0B",
  venue: "#10B981",
  poi: "#EF4444",
  custom: "#6B7280",
};

export default function GeofenceManager() {
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFence, setEditingFence] = useState<any>(null);
  const [clickedPosition, setClickedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState("map");
  const mapRef = useRef<google.maps.Map | null>(null);
  const circlesRef = useRef<Map<number, google.maps.Circle>>(new Map());
  const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formRadius, setFormRadius] = useState("200");
  const [formType, setFormType] = useState<string>("custom");
  const [formNotifyEnter, setFormNotifyEnter] = useState(true);
  const [formNotifyExit, setFormNotifyExit] = useState(true);

  const { data: meetups } = trpc.meetup.list.useQuery();
  const { data: geofences, refetch: refetchGeofences } = trpc.geofence.list.useQuery(
    { meetupId: selectedMeetupId! },
    { enabled: !!selectedMeetupId }
  );
  const { data: events, refetch: refetchEvents } = trpc.geofence.events.useQuery(
    { meetupId: selectedMeetupId!, limit: 100 },
    { enabled: !!selectedMeetupId }
  );

  const createMutation = trpc.geofence.create.useMutation({
    onSuccess: () => {
      toast.success("지오펜스가 생성되었습니다");
      refetchGeofences();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (e) => toast.error("생성 실패: " + e.message),
  });

  const updateMutation = trpc.geofence.update.useMutation({
    onSuccess: () => {
      toast.success("지오펜스가 수정되었습니다");
      refetchGeofences();
      setEditingFence(null);
      resetForm();
    },
    onError: (e) => toast.error("수정 실패: " + e.message),
  });

  const deleteMutation = trpc.geofence.delete.useMutation({
    onSuccess: () => {
      toast.success("지오펜스가 삭제되었습니다");
      refetchGeofences();
    },
    onError: (e) => toast.error("삭제 실패: " + e.message),
  });

  const activeMeetups = useMemo(() => {
    return meetups?.filter((m: any) => ["open", "active", "upcoming", "closed"].includes(m.status)) || [];
  }, [meetups]);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormLat("");
    setFormLng("");
    setFormRadius("200");
    setFormType("custom");
    setFormNotifyEnter(true);
    setFormNotifyExit(true);
    setClickedPosition(null);
  };

  const openCreateDialog = (lat?: number, lng?: number) => {
    resetForm();
    if (lat !== undefined && lng !== undefined) {
      setFormLat(lat.toFixed(7));
      setFormLng(lng.toFixed(7));
    }
    setShowCreateDialog(true);
  };

  const openEditDialog = (fence: any) => {
    setEditingFence(fence);
    setFormName(fence.name);
    setFormDescription(fence.description || "");
    setFormLat(String(fence.latitude));
    setFormLng(String(fence.longitude));
    setFormRadius(String(fence.radius));
    setFormType(fence.type);
    setFormNotifyEnter(fence.notifyOnEnter);
    setFormNotifyExit(fence.notifyOnExit);
  };

  const handleSubmit = () => {
    if (!formName || !formLat || !formLng || !formRadius) {
      toast.error("필수 항목을 입력해주세요");
      return;
    }

    const data = {
      name: formName,
      description: formDescription || undefined,
      latitude: parseFloat(formLat),
      longitude: parseFloat(formLng),
      radius: parseInt(formRadius),
      type: formType as any,
      notifyOnEnter: formNotifyEnter,
      notifyOnExit: formNotifyExit,
    };

    if (editingFence) {
      updateMutation.mutate({ id: editingFence.id, ...data });
    } else if (selectedMeetupId) {
      createMutation.mutate({ meetupId: selectedMeetupId, ...data });
    }
  };

  // 지도에 지오펜스 원형 오버레이 표시
  useEffect(() => {
    if (!mapRef.current) return;

    // 기존 원형 제거
    circlesRef.current.forEach((circle) => circle.setMap(null));
    circlesRef.current.clear();
    markersRef.current.forEach((marker) => { marker.map = null; });
    markersRef.current.clear();

    if (!geofences) return;

    const bounds = new google.maps.LatLngBounds();

    geofences.forEach((fence: any) => {
      const center = { lat: fence.latitude, lng: fence.longitude };
      const color = TYPE_COLORS[fence.type] || "#6B7280";

      // 원형 오버레이
      const circle = new google.maps.Circle({
        map: mapRef.current!,
        center,
        radius: fence.radius,
        fillColor: color,
        fillOpacity: fence.isActive ? 0.15 : 0.05,
        strokeColor: color,
        strokeOpacity: fence.isActive ? 0.6 : 0.2,
        strokeWeight: 2,
        clickable: true,
      });

      circle.addListener("click", () => {
        openEditDialog(fence);
      });

      circlesRef.current.set(fence.id, circle);

      // 중심 마커
      const el = document.createElement("div");
      el.className = "flex flex-col items-center cursor-pointer";
      el.innerHTML = `
        <div class="px-2 py-1 rounded-lg text-xs font-bold shadow-lg text-white" style="background:${color};white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;">
          ${fence.name}
        </div>
        <div class="text-[10px] text-gray-500 mt-0.5">${fence.radius}m</div>
      `;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: center,
        content: el,
        title: fence.name,
      });

      marker.addListener("click", () => openEditDialog(fence));
      markersRef.current.set(fence.id, marker);

      bounds.extend(center);
    });

    if (geofences.length > 0) {
      if (geofences.length === 1) {
        mapRef.current.setCenter({ lat: geofences[0].latitude, lng: geofences[0].longitude });
        mapRef.current.setZoom(14);
      } else {
        mapRef.current.fitBounds(bounds, 80);
      }
    }
  }, [geofences]);

  // 지도 클릭 이벤트
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setClickedPosition({ lat, lng });
        openCreateDialog(lat, lng);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-500" />
            지오펜싱 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            특정 장소에 참가자가 도착/이탈 시 자동으로 알림을 보냅니다
          </p>
        </div>
        {selectedMeetupId && (
          <Button onClick={() => openCreateDialog()} className="gap-2">
            <Plus className="h-4 w-4" /> 지오펜스 추가
          </Button>
        )}
      </div>

      {/* 밋업 선택 */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-sm font-medium mb-2 block">밋업 선택</Label>
          <Select
            value={selectedMeetupId?.toString() || ""}
            onValueChange={(v) => setSelectedMeetupId(v ? parseInt(v) : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="지오펜스를 설정할 밋업을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {activeMeetups.map((m: any) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedMeetupId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="map">지도</TabsTrigger>
            <TabsTrigger value="list">
              목록 {geofences && <Badge variant="secondary" className="ml-1 text-xs">{geofences.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="events">
              이벤트 로그 {events && <Badge variant="secondary" className="ml-1 text-xs">{events.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* 지도 탭 */}
          <TabsContent value="map">
            <Card>
              <CardContent className="p-0 overflow-hidden rounded-lg">
                <div className="relative">
                  <MapView
                    className="w-full h-[500px]"
                    initialCenter={{ lat: 37.5665, lng: 126.978 }}
                    initialZoom={10}
                    onMapReady={handleMapReady}
                  />
                  <div className="absolute top-4 left-4 bg-background/90 backdrop-blur rounded-lg px-3 py-2 text-xs text-muted-foreground shadow">
                    <Crosshair className="h-3 w-3 inline mr-1" />
                    지도를 클릭하여 지오펜스를 추가하세요
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 목록 탭 */}
          <TabsContent value="list">
            <div className="space-y-3">
              {geofences && geofences.length > 0 ? (
                geofences.map((fence: any) => {
                  const typeInfo = GEOFENCE_TYPES.find(t => t.value === fence.type);
                  const TypeIcon = typeInfo?.icon || CircleDot;
                  const color = TYPE_COLORS[fence.type] || "#6B7280";

                  return (
                    <Card key={fence.id} className={!fence.isActive ? "opacity-50" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: color + "20" }}>
                              <TypeIcon className="h-5 w-5" style={{ color }} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm flex items-center gap-2">
                                {fence.name}
                                {!fence.isActive && <Badge variant="secondary" className="text-xs">비활성</Badge>}
                              </h3>
                              {fence.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{fence.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span>반경: {fence.radius}m</span>
                                <span>위치: {fence.latitude.toFixed(5)}, {fence.longitude.toFixed(5)}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                {fence.notifyOnEnter && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <LogIn className="h-3 w-3" /> 진입 알림
                                  </Badge>
                                )}
                                {fence.notifyOnExit && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <LogOut className="h-3 w-3" /> 이탈 알림
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(fence)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-500"
                              onClick={() => {
                                if (confirm(`"${fence.name}" 지오펜스를 삭제하시겠습니까?`)) {
                                  deleteMutation.mutate({ id: fence.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">등록된 지오펜스가 없습니다</p>
                    <p className="text-xs text-muted-foreground mt-1">지도 탭에서 클릭하여 지오펜스를 추가하세요</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 이벤트 로그 탭 */}
          <TabsContent value="events">
            <Card>
              <CardContent className="p-4">
                {events && events.length > 0 ? (
                  <div className="space-y-2">
                    {events.map((evt: any) => {
                      const isEnter = evt.eventType === "enter";
                      return (
                        <div key={evt.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-full ${isEnter ? "bg-green-500/10" : "bg-red-500/10"}`}>
                              {isEnter ? (
                                <LogIn className="h-4 w-4 text-green-500" />
                              ) : (
                                <LogOut className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                User #{evt.userId}
                                <span className={`ml-2 ${isEnter ? "text-green-500" : "text-red-500"}`}>
                                  {isEnter ? "진입" : "이탈"}
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {evt.geofenceName} ({evt.geofenceType})
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {new Date(evt.createdAt).toLocaleString("ko-KR")}
                            </p>
                            {evt.notified && (
                              <Badge variant="outline" className="text-xs mt-1">
                                <Bell className="h-3 w-3 mr-1" /> 알림 전송됨
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">아직 이벤트가 없습니다</p>
                    <p className="text-xs text-muted-foreground mt-1">참가자가 지오펜스 영역에 진입/이탈하면 여기에 기록됩니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={showCreateDialog || !!editingFence} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingFence(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFence ? "지오펜스 수정" : "새 지오펜스 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>이름 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="예: 호텔 로비, 공항 도착 게이트" />
            </div>
            <div>
              <Label>설명</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="선택사항" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>위도 *</Label>
                <Input value={formLat} onChange={(e) => setFormLat(e.target.value)} placeholder="37.5665" />
              </div>
              <div>
                <Label>경도 *</Label>
                <Input value={formLng} onChange={(e) => setFormLng(e.target.value)} placeholder="126.978" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>반경 (미터) *</Label>
                <Input type="number" value={formRadius} onChange={(e) => setFormRadius(e.target.value)} min="10" max="50000" />
              </div>
              <div>
                <Label>유형</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEOFENCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={formNotifyEnter} onCheckedChange={setFormNotifyEnter} />
                <Label className="text-sm">진입 시 알림</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formNotifyExit} onCheckedChange={setFormNotifyExit} />
                <Label className="text-sm">이탈 시 알림</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingFence(null); resetForm(); }}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingFence ? "수정" : "생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
