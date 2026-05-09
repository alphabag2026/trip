import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Plane, Car, Calendar, Users, BedDouble, UtensilsCrossed, Phone } from "lucide-react";

export default function ScheduleShareView() {
  const params = useParams<{ token: string }>();
  const { data: share, isLoading, error } = trpc.scheduleShares.getByToken.useQuery(
    { token: params.token || "" },
    { enabled: !!params.token }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!share || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">스케줄표를 찾을 수 없습니다</h2>
            <p className="text-sm text-muted-foreground">링크가 만료되었거나 비활성화되었습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  let scheduleData: any = {};
  try {
    scheduleData = typeof share.scheduleData === "string" ? JSON.parse(share.scheduleData) : share.scheduleData;
  } catch { scheduleData = {}; }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">{scheduleData.title || share.title}</h1>
          {scheduleData.period && <p className="text-muted-foreground">{scheduleData.period} | {scheduleData.location}</p>}
          {scheduleData.summary && (
            <div className="flex justify-center gap-3 mt-3 flex-wrap">
              <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> {scheduleData.summary.totalParticipants}명</Badge>
              <Badge variant="secondary" className="gap-1"><Plane className="h-3 w-3" /> {scheduleData.summary.totalFlights}편</Badge>
              <Badge variant="secondary" className="gap-1"><Car className="h-3 w-3" /> {scheduleData.summary.totalVehicles}대</Badge>
              <Badge variant="secondary" className="gap-1"><BedDouble className="h-3 w-3" /> {scheduleData.summary.totalRooms}실</Badge>
            </div>
          )}
        </div>

        {/* Departure Info */}
        {scheduleData.departureInfo?.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Plane className="h-4 w-4 text-blue-500" /> 출발 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-50 dark:bg-blue-500/10">
                      <th className="text-left p-2 border">공항</th>
                      <th className="text-left p-2 border">편명</th>
                      <th className="text-left p-2 border">시간</th>
                      <th className="text-left p-2 border">인원</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleData.departureInfo.map((d: any, i: number) =>
                      (d.flights || [{ flightNo: "-", time: "-" }]).map((f: any, j: number) => (
                        <tr key={`${i}-${j}`} className="border-b">
                          {j === 0 && <td className="p-2 border font-medium" rowSpan={d.flights?.length || 1}>{d.airport}</td>}
                          <td className="p-2 border">{f.flightNo}</td>
                          <td className="p-2 border">{f.time}</td>
                          {j === 0 && <td className="p-2 border" rowSpan={d.flights?.length || 1}>{d.count}명</td>}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Schedule */}
        {scheduleData.dailySchedule?.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-purple-500" /> 일정표</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduleData.dailySchedule.map((day: any, i: number) => (
                <div key={i}>
                  <h4 className="font-medium text-sm bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 rounded-t-lg">
                    {day.dayLabel} - {day.date}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/30">
                          <th className="text-left p-2 border w-24">시간</th>
                          <th className="text-left p-2 border">일정</th>
                          <th className="text-left p-2 border">장소</th>
                          <th className="text-left p-2 border">담당</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(day.events || []).map((e: any, j: number) => (
                          <tr key={j} className="border-b">
                            <td className="p-2 border text-xs font-mono">{e.time}{e.endTime ? `~${e.endTime}` : ""}</td>
                            <td className="p-2 border font-medium">{e.title}</td>
                            <td className="p-2 border">{e.location}</td>
                            <td className="p-2 border text-xs">{e.staff}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Room Assignments */}
        {scheduleData.roomAssignments?.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><BedDouble className="h-4 w-4 text-pink-500" /> 방 배정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {scheduleData.roomAssignments.map((r: any, i: number) => (
                  <div key={i} className="border rounded-lg p-2 text-sm">
                    <div className="font-medium">{r.room}호</div>
                    <div className="text-xs text-muted-foreground">{(r.guests || []).join(", ")}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meal Plan */}
        {scheduleData.mealPlan?.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><UtensilsCrossed className="h-4 w-4 text-orange-500" /> 식사 계획</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-orange-50 dark:bg-orange-500/10">
                      <th className="text-left p-2 border">날짜</th>
                      <th className="text-left p-2 border">구분</th>
                      <th className="text-left p-2 border">장소</th>
                      <th className="text-left p-2 border">시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleData.mealPlan.flatMap((mp: any, i: number) =>
                      (mp.meals || []).map((m: any, j: number) => (
                        <tr key={`${i}-${j}`} className="border-b">
                          {j === 0 && <td className="p-2 border font-medium" rowSpan={mp.meals?.length || 1}>{mp.date}</td>}
                          <td className="p-2 border">{m.type}</td>
                          <td className="p-2 border">{m.location}</td>
                          <td className="p-2 border">{m.time}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Staff & Contacts */}
        {(scheduleData.staffList?.length > 0 || scheduleData.contacts?.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4 text-red-500" /> 담당자 & 연락처</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-red-50 dark:bg-red-500/10">
                      <th className="text-left p-2 border">이름</th>
                      <th className="text-left p-2 border">역할</th>
                      <th className="text-left p-2 border">연락처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(scheduleData.staffList || []).map((s: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 border font-medium">{s.name}</td>
                        <td className="p-2 border">{s.role}</td>
                        <td className="p-2 border">{s.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {scheduleData.notes && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{scheduleData.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">Alpha Trip - Meetup & Travel Automation</p>
      </div>
    </div>
  );
}
