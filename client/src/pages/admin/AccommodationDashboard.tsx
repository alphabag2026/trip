import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hotel, Users, Building2, Home, TreePine, BedDouble, UserCheck, UserX, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCOMMODATION_TYPE_LABELS: Record<string, string> = {
  hotel: "호텔", villa: "별장", apartment: "아파트", resort: "리조트", pension: "펜션", other: "기타",
};
const ACCOMMODATION_TYPE_ICONS: Record<string, any> = {
  hotel: Hotel, villa: Home, apartment: Building2, resort: TreePine, pension: Home, other: Hotel,
};
const ROOM_TYPE_LABELS: Record<string, string> = {
  single: "싱글", double: "더블", twin: "트윈", suite: "스위트", family: "패밀리", dormitory: "도미토리",
};

export default function AccommodationDashboard() {
  const { data: meetups = [] } = trpc.meetup.list.useQuery();
  const [selectedMeetup, setSelectedMeetup] = useState<number | undefined>();
  const { data: accommodations = [] } = trpc.accommodation.list.useQuery({ meetupId: selectedMeetup });
  const { data: registrations = [] } = trpc.registration.list.useQuery({ meetupId: selectedMeetup });
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);

  // Build a map of registration ID -> name
  const regMap = useMemo(() => {
    const map: Record<number, { name: string; phone?: string; nationality?: string }> = {};
    for (const r of registrations as any[]) {
      map[r.id] = { name: r.name || r.englishName || `#${r.id}`, phone: r.phone, nationality: r.nationality };
    }
    return map;
  }, [registrations]);

  // Group accommodations by hotel name
  const grouped = useMemo(() => {
    const groups: Record<string, { type: string; rooms: any[]; totalAssigned: number; totalCapacity: number }> = {};
    for (const a of accommodations as any[]) {
      const key = a.hotelName || "미정";
      if (!groups[key]) groups[key] = { type: a.accommodationType || "hotel", rooms: [], totalAssigned: 0, totalCapacity: 0 };
      const assigned = Array.isArray(a.assignedRegistrationIds) ? a.assignedRegistrationIds.length : 0;
      const capacity = a.roomType === "single" ? 1 : a.roomType === "family" || a.roomType === "dormitory" ? 6 : 2;
      groups[key].rooms.push({ ...a, assignedCount: assigned, capacity });
      groups[key].totalAssigned += assigned;
      groups[key].totalCapacity += capacity;
    }
    return groups;
  }, [accommodations]);

  // Stats
  const stats = useMemo(() => {
    const totalRooms = (accommodations as any[]).length;
    const totalAssigned = (accommodations as any[]).reduce((sum, a) => sum + (Array.isArray(a.assignedRegistrationIds) ? a.assignedRegistrationIds.length : 0), 0);
    const totalRegistrations = (registrations as any[]).length;
    const unassigned = totalRegistrations - totalAssigned;
    const hotelCount = Object.keys(grouped).length;
    return { totalRooms, totalAssigned, totalRegistrations, unassigned, hotelCount };
  }, [accommodations, registrations, grouped]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BedDouble className="h-6 w-6 text-primary" /> 숙소 배정 현황
        </h1>
        <select value={selectedMeetup || ""} onChange={e => setSelectedMeetup(e.target.value ? Number(e.target.value) : undefined)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">전체 밋업</option>
          {meetups.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.hotelCount}</p>
            <p className="text-xs text-muted-foreground">숙소</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.totalRooms}</p>
            <p className="text-xs text-muted-foreground">총 방</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.totalAssigned}</p>
            <p className="text-xs text-muted-foreground">배정 완료</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{stats.unassigned}</p>
            <p className="text-xs text-muted-foreground">미배정</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">
              {stats.totalRegistrations > 0 ? Math.round((stats.totalAssigned / stats.totalRegistrations) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">배정률</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Map by Hotel */}
      {Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Hotel className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>등록된 숙소가 없습니다</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([hotelName, data]) => {
            const TypeIcon = ACCOMMODATION_TYPE_ICONS[data.type] || Hotel;
            const isExpanded = expandedHotel === hotelName;
            const occupancyRate = data.totalCapacity > 0 ? Math.round((data.totalAssigned / data.totalCapacity) * 100) : 0;

            return (
              <Card key={hotelName} className="overflow-hidden">
                <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpandedHotel(isExpanded ? null : hotelName)}>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TypeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold">{hotelName}</p>
                        <p className="text-xs text-muted-foreground font-normal">
                          {ACCOMMODATION_TYPE_LABELS[data.type]} · {data.rooms.length}개 방 · {data.totalAssigned}명 배정
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Occupancy bar */}
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${occupancyRate >= 80 ? "bg-green-500" : occupancyRate >= 50 ? "bg-yellow-500" : "bg-orange-500"}`}
                            style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">{occupancyRate}%</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {data.rooms.map((room: any) => {
                        const assignedIds: number[] = Array.isArray(room.assignedRegistrationIds) ? room.assignedRegistrationIds : [];
                        const isFull = assignedIds.length >= room.capacity;
                        const isEmpty = assignedIds.length === 0;

                        return (
                          <div
                            key={room.id}
                            className={`p-3 rounded-lg border transition-all ${
                              isFull ? "border-green-500/30 bg-green-500/5" :
                              isEmpty ? "border-muted bg-muted/20" :
                              "border-yellow-500/30 bg-yellow-500/5"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-sm">
                                {room.roomNumber ? `${room.roomNumber}호` : `방 #${room.id}`}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                isFull ? "bg-green-500/20 text-green-600" :
                                isEmpty ? "bg-muted text-muted-foreground" :
                                "bg-yellow-500/20 text-yellow-600"
                              }`}>
                                {ROOM_TYPE_LABELS[room.roomType] || room.roomType}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <Users className="h-3 w-3" />
                              <span>{assignedIds.length}/{room.capacity}명</span>
                            </div>
                            {/* Assigned people */}
                            <div className="space-y-1">
                              {assignedIds.map((regId: number) => {
                                const person = regMap[regId];
                                return (
                                  <div key={regId} className="flex items-center gap-1.5 text-xs">
                                    <UserCheck className="h-3 w-3 text-green-500 shrink-0" />
                                    <span className="truncate">{person?.name || `ID:${regId}`}</span>
                                  </div>
                                );
                              })}
                              {/* Empty slots */}
                              {Array.from({ length: Math.max(0, room.capacity - assignedIds.length) }).map((_, i) => (
                                <div key={`empty-${i}`} className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                                  <UserX className="h-3 w-3 shrink-0" />
                                  <span className="italic">빈 자리</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Unassigned People List */}
      {stats.unassigned > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserX className="h-4 w-4 text-orange-500" />
              미배정 참가자 ({stats.unassigned}명)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {(registrations as any[])
                .filter(r => {
                  // Check if this registration is assigned to any accommodation
                  return !(accommodations as any[]).some(a =>
                    Array.isArray(a.assignedRegistrationIds) && a.assignedRegistrationIds.includes(r.id)
                  );
                })
                .slice(0, 30)
                .map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50">
                    <UserX className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    <span className="truncate">{r.name || r.englishName}</span>
                    {r.nationality && <span className="text-xs text-muted-foreground">({r.nationality})</span>}
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
