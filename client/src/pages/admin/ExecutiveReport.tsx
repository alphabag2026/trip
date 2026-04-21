import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Download, Users, DollarSign, Globe, BarChart3, TrendingUp, PieChart } from "lucide-react";

const REPORT_SECTIONS = [
  { id: "attendance", label: "참석 현황", icon: Users, description: "전체/승인/완료 참석자 통계" },
  { id: "budget", label: "예산 현황", icon: DollarSign, description: "총 예산, 지출, 잔액, 소진율" },
  { id: "expenses", label: "비용 상세", icon: BarChart3, description: "카테고리별 비용 분석" },
  { id: "countries", label: "국가별 분포", icon: Globe, description: "참석자 국적 분포" },
  { id: "roi", label: "ROI 분석", icon: TrendingUp, description: "참석자당 비용, 투자 대비 효과" },
];

export default function ExecutiveReport() {
  const meetupsQuery = trpc.meetup.list.useQuery({});
  const [selectedMeetup, setSelectedMeetup] = useState<string>("");
  const meetupId = selectedMeetup ? Number(selectedMeetup) : undefined;
  const [selectedSections, setSelectedSections] = useState<string[]>(REPORT_SECTIONS.map(s => s.id));
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const reportQuery = trpc.executiveReport.getData.useQuery(
    { meetupId: meetupId! },
    { enabled: !!meetupId }
  );

  const data = reportQuery.data;

  const toggleSection = (id: string) => {
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
      }

      const meetupTitle = data?.meetup?.title || "report";
      const dateStr = new Date().toISOString().split("T")[0];
      pdf.save(`executive-report-${meetupTitle}-${dateStr}.pdf`);
    } catch (e) {
      console.error("PDF generation error:", e);
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Executive Report
          </h1>
          <p className="text-muted-foreground">경영진 보고용 종합 리포트를 생성합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMeetup} onValueChange={setSelectedMeetup}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="밋업 선택..." />
            </SelectTrigger>
            <SelectContent>
              {meetupsQuery.data?.map((m: any) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data && (
            <Button onClick={handleDownloadPDF} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              PDF 다운로드
            </Button>
          )}
        </div>
      </div>

      {/* Section Selector */}
      {meetupId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">리포트 항목 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {REPORT_SECTIONS.map(section => (
                <label key={section.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedSections.includes(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <span className="text-sm">{section.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!meetupId && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>밋업을 선택하면 경영진 리포트를 생성할 수 있습니다</p>
          </CardContent>
        </Card>
      )}

      {meetupId && reportQuery.isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Report Preview */}
      {data && (
        <div ref={reportRef} className="space-y-6 bg-white dark:bg-background p-6 rounded-lg">
          {/* Header */}
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold">{data.meetup?.title || "Meetup"} - Executive Report</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Generated: {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          {/* Attendance */}
          {selectedSections.includes("attendance") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  참석 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <p className="text-2xl font-bold text-blue-600">{data.attendance.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">전체 등록</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <p className="text-2xl font-bold text-green-600">{data.attendance.approved.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">승인됨</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                    <p className="text-2xl font-bold text-purple-600">{data.attendance.completed.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">완료</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                    <p className="text-2xl font-bold text-amber-600">{data.attendance.attendanceRate}%</p>
                    <p className="text-xs text-muted-foreground">참석률</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget */}
          {selectedSections.includes("budget") && data.budget && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  예산 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">${data.budget.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">총 예산</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-red-500">${data.budget.spent.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">지출</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-green-500">${data.budget.remaining.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">잔액</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className={`text-2xl font-bold ${data.budget.utilization > 90 ? 'text-red-500' : 'text-blue-500'}`}>
                      {data.budget.utilization}%
                    </p>
                    <p className="text-xs text-muted-foreground">소진율</p>
                  </div>
                </div>
                {/* Budget Bar */}
                <div className="mt-4">
                  <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${data.budget.utilization > 90 ? 'bg-red-500' : data.budget.utilization > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(data.budget.utilization, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expenses by Category */}
          {selectedSections.includes("expenses") && Object.keys(data.expenses.byCategory).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  카테고리별 비용
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.expenses.byCategory)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([category, amount]) => {
                      const pct = data.expenses.total > 0 ? Math.round(((amount as number) / data.expenses.total) * 100) : 0;
                      return (
                        <div key={category} className="flex items-center gap-3">
                          <span className="text-sm w-24 truncate">{category}</span>
                          <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full flex items-center justify-end pr-2 text-xs text-white font-medium" style={{ width: `${Math.max(pct, 5)}%` }}>
                              {pct}%
                            </div>
                          </div>
                          <span className="text-sm font-medium w-24 text-right">${(amount as number).toLocaleString()}</span>
                        </div>
                      );
                    })}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <span className="font-semibold">합계</span>
                  <span className="font-bold text-lg">${data.expenses.total.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Country Distribution */}
          {selectedSections.includes("countries") && data.countryDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-teal-500" />
                  국가별 참석자 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {data.countryDistribution.map((c: any) => (
                    <div key={c.country} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm">{c.country}</span>
                      <Badge variant="secondary">{c.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ROI */}
          {selectedSections.includes("roi") && data.roi && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  ROI 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-6 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                    <p className="text-3xl font-bold text-amber-600">${data.roi.costPerAttendee.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-1">참석자당 비용</p>
                  </div>
                  <div className="text-center p-6 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <p className="text-3xl font-bold text-blue-600">${data.roi.totalInvestment.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-1">총 투자 비용</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
