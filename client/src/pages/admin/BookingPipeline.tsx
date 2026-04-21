import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, UserCheck, Ticket, MapPin, CheckCircle2, ArrowRight, AlertTriangle, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";

const STAGE_ICONS = [Users, UserCheck, Ticket, MapPin, CheckCircle2];
const STAGE_COLORS = ["bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-amber-500", "bg-green-500"];
const STAGE_BG = ["bg-blue-50 dark:bg-blue-950/30", "bg-indigo-50 dark:bg-indigo-950/30", "bg-purple-50 dark:bg-purple-950/30", "bg-amber-50 dark:bg-amber-950/30", "bg-green-50 dark:bg-green-950/30"];

export default function BookingPipeline() {
  const { t } = useTranslation();
  const meetupsQuery = trpc.meetup.list.useQuery({});
  const [selectedMeetup, setSelectedMeetup] = useState<string>("");
  const meetupId = selectedMeetup ? Number(selectedMeetup) : undefined;

  const pipelineQuery = trpc.bookingPipeline.stats.useQuery(
    { meetupId: meetupId! },
    { enabled: !!meetupId }
  );

  const data = pipelineQuery.data;
  const maxCount = useMemo(() => {
    if (!data?.stages) return 1;
    return Math.max(...data.stages.map(s => s.count), 1);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Booking Pipeline</h1>
          <p className="text-muted-foreground">참석자 예약 상태를 단계별로 추적합니다</p>
        </div>
        <Select value={selectedMeetup} onValueChange={setSelectedMeetup}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="밋업 선택..." />
          </SelectTrigger>
          <SelectContent>
            {meetupsQuery.data?.map((m: any) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!meetupId && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>밋업을 선택하면 예약 파이프라인을 확인할 수 있습니다</p>
          </CardContent>
        </Card>
      )}

      {meetupId && pipelineQuery.isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {data && (
        <>
          {/* Funnel Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Conversion Funnel
              </CardTitle>
              <CardDescription>초대부터 완료까지 단계별 전환율</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.stages.map((stage, i) => {
                  const Icon = STAGE_ICONS[i] || Users;
                  const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 8) : 8;
                  const conversionKeys = Object.keys(data.conversionRates);
                  const rate = i > 0 ? Object.values(data.conversionRates)[i - 1] : 100;

                  return (
                    <div key={stage.name}>
                      {i > 0 && (
                        <div className="flex items-center gap-2 py-1 pl-8">
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className={`text-xs font-medium ${rate < 50 ? 'text-red-500' : rate < 75 ? 'text-amber-500' : 'text-green-500'}`}>
                            {rate}% 전환
                          </span>
                          {rate < 50 && <AlertTriangle className="w-3 h-3 text-red-500" />}
                        </div>
                      )}
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${STAGE_BG[i]} transition-all`}>
                        <div className={`w-10 h-10 rounded-full ${STAGE_COLORS[i]} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold">{stage.label}</span>
                            <span className="text-lg font-bold">{stage.count.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${STAGE_COLORS[i]} transition-all duration-700`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rate Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "초대→RSVP", rate: data.conversionRates.inviteToRsvp },
              { label: "RSVP→승인", rate: data.conversionRates.rsvpToApproved },
              { label: "승인→체크인", rate: data.conversionRates.approvedToCheckin },
              { label: "체크인→완료", rate: data.conversionRates.checkinToCompleted },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-6 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className={`text-3xl font-bold ${item.rate >= 75 ? 'text-green-500' : item.rate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                    {item.rate}%
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottleneck Alert */}
          {data.bottleneck && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-700 dark:text-red-400">병목 구간 감지</h3>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                      <strong>{data.bottleneck.stage}</strong> 단계에서 전환율이 <strong>{data.bottleneck.rate}%</strong>로 가장 낮습니다.
                      이 구간의 개선이 전체 참석률 향상에 가장 큰 영향을 줄 수 있습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
