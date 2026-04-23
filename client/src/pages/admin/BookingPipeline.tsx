import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, UserCheck, Ticket, MapPin, CheckCircle2, ArrowRight, ArrowDown, AlertTriangle, TrendingDown, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";

const STAGE_ICONS = [Users, UserCheck, Ticket, MapPin, CheckCircle2];
const STAGE_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#f59e0b", "#22c55e"];
const STAGE_BG = ["bg-blue-50 dark:bg-blue-950/30", "bg-indigo-50 dark:bg-indigo-950/30", "bg-purple-50 dark:bg-purple-950/30", "bg-amber-50 dark:bg-amber-950/30", "bg-green-50 dark:bg-green-950/30"];

export default function BookingPipeline() {
  const { t } = useTranslation();
  const meetupsQuery = trpc.meetup.list.useQuery({});
  const [selectedMeetup, setSelectedMeetup] = useState<string>("");
  const meetupId = selectedMeetup ? Number(selectedMeetup) : undefined;
  const chartRef = useRef<HTMLDivElement>(null);

  const pipelineQuery = trpc.bookingPipeline.stats.useQuery(
    { meetupId: meetupId! },
    { enabled: !!meetupId }
  );

  const data = pipelineQuery.data;
  const maxCount = useMemo(() => {
    if (!data?.stages) return 1;
    return Math.max(...data.stages.map(s => s.count), 1);
  }, [data]);

  const chartData = useMemo(() => {
    if (!data?.stages) return [];
    return data.stages.map((stage, i) => ({
      name: stage.label,
      count: stage.count,
      fill: STAGE_COLORS[i],
      pct: maxCount > 0 ? Math.round((stage.count / maxCount) * 100) : 0,
    }));
  }, [data, maxCount]);

  const handleExportChart = async () => {
    if (!chartRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(chartRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `funnel-chart-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Chart export error:", e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Booking Pipeline</h1>
          <p className="text-muted-foreground">참석자 예약 상태를 단계별로 추적합니다</p>
        </div>
        <div className="flex items-center gap-3">
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
          {data && (
            <Button variant="outline" size="sm" onClick={handleExportChart}>
              <Download className="w-4 h-4 mr-1" />
              PNG
            </Button>
          )}
        </div>
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
          {/* Visual Funnel Chart with Recharts */}
          <div ref={chartRef}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Conversion Funnel
                </CardTitle>
                <CardDescription>초대부터 완료까지 단계별 전환율</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Bar Chart - Horizontal Funnel */}
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 60, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, "dataMax"]} tickFormatter={(v) => v.toLocaleString()} />
                      <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 13, fontWeight: 600 }} />
                      <Tooltip
                        formatter={(value: number) => [value.toLocaleString(), "참석자"]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={40}>
                        {chartData.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.fill} />
                        ))}
                        <LabelList
                          dataKey="count"
                          position="right"
                          formatter={(v: number) => v.toLocaleString()}
                          style={{ fontSize: 13, fontWeight: 700, fill: "#374151" }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Funnel Flow Visual */}
                <div className="mt-6 space-y-2">
                  {data.stages.map((stage, i) => {
                    const Icon = STAGE_ICONS[i] || Users;
                    const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 12) : 12;
                    const rate = i > 0 ? Object.values(data.conversionRates)[i - 1] : 100;

                    return (
                      <div key={stage.name}>
                        {i > 0 && (
                          <div className="flex items-center justify-center gap-2 py-1">
                            <ArrowDown className="w-4 h-4 text-muted-foreground" />
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              rate < 50 ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                              rate < 75 ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                              'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400'
                            }`}>
                              {rate}% 전환
                            </span>
                            {rate < 50 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                        )}
                        <div
                          className={`mx-auto flex items-center gap-3 p-3 rounded-xl transition-all ${STAGE_BG[i]}`}
                          style={{ width: `${widthPct}%`, minWidth: "200px" }}
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: STAGE_COLORS[i] }}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">{stage.label}</span>
                              <span className="text-lg font-bold">{stage.count.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Rate Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "초대→RSVP", rate: data.conversionRates.inviteToRsvp, icon: "📨" },
              { label: "RSVP→승인", rate: data.conversionRates.rsvpToApproved, icon: "✅" },
              { label: "승인→체크인", rate: data.conversionRates.approvedToCheckin, icon: "📍" },
              { label: "체크인→완료", rate: data.conversionRates.checkinToCompleted, icon: "🎉" },
            ].map((item) => (
              <Card key={item.label} className="relative overflow-hidden">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className={`text-3xl font-bold ${item.rate >= 75 ? 'text-green-500' : item.rate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                    {item.rate}%
                  </p>
                  {/* Progress ring background */}
                  <div className="mt-3 mx-auto w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        item.rate >= 75 ? 'bg-green-500' : item.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
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
