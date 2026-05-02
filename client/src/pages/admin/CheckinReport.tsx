import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import {
  Users, UserCheck, UserX, Clock, FileText, Send, Download,
  Mail, MessageSquare, Printer, QrCode, TrendingUp, Target,
} from "lucide-react";
import jsPDF from "jspdf";

const COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6"];

export default function CheckinReport() {
  const { t } = useTranslation();

  const [selectedMeetupId, setSelectedMeetupId] = useState<string>("");
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderSubject, setReminderSubject] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [nametagOpen, setNametagOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const meetupId = selectedMeetupId ? Number(selectedMeetupId) : undefined;

  // 밋업 목록
  const { data: meetups } = trpc.meetup.list.useQuery();

  // 시간대별 통계
  const { data: hourlyStats, isLoading: hourlyLoading } = trpc.eventCheckin.getHourlyStats.useQuery(
    { meetupId: meetupId! },
    { enabled: !!meetupId }
  );

  // 체크인 목록
  const { data: checkins } = trpc.eventCheckin.listByMeetup.useQuery(
    { meetupId: meetupId! },
    { enabled: !!meetupId }
  );

  // 리마인더 발송
  const sendReminderMut = trpc.eventCheckin.sendReminder.useMutation({
    onSuccess: (data) => {
      toast.success(`리마인더 발송 완료: ${data.sent}명 발송 / ${data.failed}명 실패`);
      setReminderOpen(false);
    },
    onError: () => toast.error("발송 실패"),
  });

  const sendReminderTgMut = trpc.eventCheckin.sendReminderTelegram.useMutation({
    onSuccess: (data) => {
      toast.success(`텔레그램 리마인더 발송 완료: ${data.sent}명 발송 / ${data.failed}명 실패`);
    },
    onError: () => toast.error("발송 실패"),
  });

  // 일괄 네임택 데이터
  const bulkNametagMut = trpc.eventCheckin.bulkNametagData.useMutation({
    onSuccess: (data) => {
      if (data.total === 0) {
        toast.error("네임택 생성 대상 없음: 체크인 완료된 참가자가 없습니다.");
        return;
      }
      generateNametagPdf(data.nametags);
    },
    onError: () => toast.error("네임택 데이터 로드 실패"),
  });

  // 파이 차트 데이터
  const pieData = useMemo(() => {
    if (!hourlyStats) return [];
    return [
      { name: "체크인 완료", value: hourlyStats.checkedInCount, color: "#10b981" },
      { name: "미체크인", value: hourlyStats.total - hourlyStats.checkedInCount, color: "#ef4444" },
    ];
  }, [hourlyStats]);

  // 누적 체크인 차트 데이터
  const cumulativeData = useMemo(() => {
    if (!hourlyStats) return [];
    let cumulative = 0;
    return hourlyStats.hourly.map((h) => {
      cumulative += h.count;
      return { hour: h.hour, count: h.count, cumulative };
    });
  }, [hourlyStats]);

  // 피크 시간대
  const peakHour = useMemo(() => {
    if (!hourlyStats) return null;
    const max = Math.max(...hourlyStats.hourly.map(h => h.count));
    return hourlyStats.hourly.find(h => h.count === max);
  }, [hourlyStats]);

  // 네임택 PDF 생성
  function generateNametagPdf(nametags: Array<{ name: string; organization: string; email: string; qrDataUrl: string }>) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [90, 55] });
    const meetup = meetups?.find(m => m.id === meetupId);

    nametags.forEach((tag, i) => {
      if (i > 0) doc.addPage([90, 55], "landscape");

      // 배경
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, 90, 12, "F");

      // 행사명
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text(meetup?.title || "Alpha Trip Meetup", 45, 8, { align: "center" });

      // 이름
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(14);
      doc.text(tag.name, 45, 24, { align: "center" });

      // 소속
      if (tag.organization) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(tag.organization, 45, 30, { align: "center" });
      }

      // QR 코드
      if (tag.qrDataUrl) {
        doc.addImage(tag.qrDataUrl, "PNG", 33, 34, 18, 18);
      }

      // 하단 라인
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.5);
      doc.line(5, 53, 85, 53);
    });

    doc.save(`nametags-${meetupId}.pdf`);
    toast.success(`네임택 PDF 생성 완료: ${nametags.length}개 네임택이 생성되었습니다.`);
    setNametagOpen(false);
  }

  const selectedMeetup = meetups?.find(m => m.id === meetupId);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">체크인 통계 리포트</h1>
          <p className="text-muted-foreground text-sm mt-1">시간대별 체크인 추이와 전체 진행률을 확인합니다</p>
        </div>
        <Select value={selectedMeetupId} onValueChange={setSelectedMeetupId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="밋업 선택" />
          </SelectTrigger>
          <SelectContent>
            {meetups?.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!meetupId ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Target className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>밋업을 선택하면 체크인 통계를 확인할 수 있습니다.</p>
          </CardContent>
        </Card>
      ) : hourlyLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i}><CardContent className="py-8"><div className="h-8 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {/* KPI 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <Users className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">전체 참가자</p>
                    <p className="text-2xl font-bold">{hourlyStats?.total || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">체크인 완료</p>
                    <p className="text-2xl font-bold text-green-600">{hourlyStats?.checkedInCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <UserX className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">미체크인</p>
                    <p className="text-2xl font-bold text-red-600">{(hourlyStats?.total || 0) - (hourlyStats?.checkedInCount || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <TrendingUp className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">체크인율</p>
                    <p className="text-2xl font-bold text-amber-600">{hourlyStats?.rate || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 진행률 바 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">체크인 진행률</span>
                <span className="text-sm text-muted-foreground">{hourlyStats?.checkedInCount || 0} / {hourlyStats?.total || 0}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-green-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${hourlyStats?.rate || 0}%` }}
                />
              </div>
              {peakHour && peakHour.count > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  <Clock className="inline h-3 w-3 mr-1" />
                  피크 시간대: <strong>{peakHour.hour}</strong> ({peakHour.count}명 체크인)
                </p>
              )}
            </CardContent>
          </Card>

          {/* 차트 탭 */}
          <Tabs defaultValue="hourly" className="space-y-4">
            <TabsList>
              <TabsTrigger value="hourly">시간대별 체크인</TabsTrigger>
              <TabsTrigger value="cumulative">누적 체크인</TabsTrigger>
              <TabsTrigger value="ratio">체크인 비율</TabsTrigger>
            </TabsList>

            <TabsContent value="hourly">
              <Card ref={chartRef}>
                <CardHeader>
                  <CardTitle className="text-base">시간대별 체크인 현황</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={hourlyStats?.hourly || []}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={1} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                        formatter={(value: number) => [`${value}명`, "체크인"]}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cumulative">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">누적 체크인 추이</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={cumulativeData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={1} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                        formatter={(value: number, name: string) => [
                          `${value}명`,
                          name === "cumulative" ? "누적" : "시간대별"
                        ]}
                      />
                      <Area type="monotone" dataKey="cumulative" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ratio">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">체크인 비율</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={130}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}명`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}명`]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* 액션 버튼 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 네임택 PDF */}
            <Dialog open={nametagOpen} onOpenChange={setNametagOpen}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <Printer className="mx-auto h-8 w-8 text-indigo-600 mb-2" />
                    <p className="font-medium">네임택 PDF 생성</p>
                    <p className="text-xs text-muted-foreground mt-1">체크인 완료 참가자 네임택</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>네임택 PDF 일괄 생성</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    체크인 완료된 참가자의 네임택(이름, 소속, QR코드)을 PDF로 생성합니다.
                    {selectedMeetup && <span className="block mt-1 font-medium text-foreground">{selectedMeetup.title}</span>}
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <QrCode className="h-5 w-5 text-indigo-600" />
                    <span className="text-sm">네임택에 QR 코드가 포함됩니다 (90mm x 55mm 카드 사이즈)</span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => meetupId && bulkNametagMut.mutate({ meetupId })}
                    disabled={bulkNametagMut.isPending}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {bulkNametagMut.isPending ? "생성 중..." : "PDF 다운로드"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* 이메일 리마인더 */}
            <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <Mail className="mx-auto h-8 w-8 text-green-600 mb-2" />
                    <p className="font-medium">리마인더 발송</p>
                    <p className="text-xs text-muted-foreground mt-1">QR코드 + 행사 안내 이메일</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>리마인더 이메일 발송</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>제목 (선택)</Label>
                    <Input
                      placeholder="[Alpha Trip] 밋업 리마인더 - 내일 행사가 시작됩니다!"
                      value={reminderSubject}
                      onChange={(e) => setReminderSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>메시지 (선택)</Label>
                    <Textarea
                      placeholder="내일 행사에서 만나요! 아래 QR 코드를 현장에서 제시해 주세요."
                      value={reminderMessage}
                      onChange={(e) => setReminderMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Send className="h-4 w-4 text-green-600" />
                    <span className="text-sm">모든 참가자에게 QR코드가 포함된 리마인더 이메일이 발송됩니다.</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => meetupId && sendReminderMut.mutate({
                        meetupId,
                        subject: reminderSubject || undefined,
                        message: reminderMessage || undefined,
                      })}
                      disabled={sendReminderMut.isPending}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {sendReminderMut.isPending ? "발송 중..." : "이메일 발송"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => meetupId && sendReminderTgMut.mutate({
                        meetupId,
                        message: reminderMessage || undefined,
                      })}
                      disabled={sendReminderTgMut.isPending}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {sendReminderTgMut.isPending ? "발송 중..." : "텔레그램 발송"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* 체크인 목록 */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.open(`/admin/checkin-dashboard`, "_self")}>
              <CardContent className="pt-6 text-center">
                <FileText className="mx-auto h-8 w-8 text-amber-600 mb-2" />
                <p className="font-medium">체크인 관리</p>
                <p className="text-xs text-muted-foreground mt-1">체크인 대시보드로 이동</p>
              </CardContent>
            </Card>
          </div>

          {/* 체크인 목록 테이블 */}
          {checkins && checkins.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  참가자 체크인 현황 ({checkins.length}명)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">#</th>
                        <th className="text-left py-2 px-3">참가자</th>
                        <th className="text-left py-2 px-3">QR 토큰</th>
                        <th className="text-left py-2 px-3">상태</th>
                        <th className="text-left py-2 px-3">체크인 시간</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkins.map((c: any, i: number) => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                          <td className="py-2 px-3 font-medium">ID #{c.registrationId}</td>
                          <td className="py-2 px-3 font-mono text-xs">{c.qrToken}</td>
                          <td className="py-2 px-3">
                            <Badge variant={c.checkedIn ? "default" : "secondary"}>
                              {c.checkedIn ? "체크인 완료" : "미체크인"}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">
                            {c.checkedInAt ? new Date(c.checkedInAt).toLocaleString("ko-KR") : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
