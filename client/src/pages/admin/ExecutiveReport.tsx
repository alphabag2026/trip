import { useState, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileText, Download, Users, DollarSign, Globe, BarChart3, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
  PieChart, Pie, Legend,
} from "recharts";

const REPORT_SECTIONS = [
  { id: "attendance", label: "참석 현황", icon: Users, description: "전체/승인/완료 참석자 통계" },
  { id: "budget", label: "예산 현황", icon: DollarSign, description: "총 예산, 지출, 잔액, 소진율" },
  { id: "expenses", label: "비용 상세", icon: BarChart3, description: "카테고리별 비용 분석" },
  { id: "countries", label: "국가별 분포", icon: Globe, description: "참석자 국적 분포" },
  { id: "roi", label: "ROI 분석", icon: TrendingUp, description: "참석자당 비용, 투자 대비 효과" },
];

const CATEGORY_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6"];
const ATTENDANCE_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b"];

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

  // Chart data transformations
  const expenseChartData = useMemo(() => {
    if (!data?.expenses?.byCategory) return [];
    return Object.entries(data.expenses.byCategory)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([category, amount]) => ({
        name: category,
        amount: amount as number,
        pct: data.expenses.total > 0 ? Math.round(((amount as number) / data.expenses.total) * 100) : 0,
      }));
  }, [data]);

  const attendanceChartData = useMemo(() => {
    if (!data?.attendance) return [];
    const { total, approved, completed } = data.attendance;
    const pending = total - approved;
    const approvedNotCompleted = approved - completed;
    return [
      { name: "완료", value: completed, fill: "#22c55e" },
      { name: "승인(미완료)", value: Math.max(approvedNotCompleted, 0), fill: "#3b82f6" },
      { name: "대기", value: Math.max(pending, 0), fill: "#f59e0b" },
    ].filter(d => d.value > 0);
  }, [data]);

  const budgetChartData = useMemo(() => {
    if (!data?.budget) return [];
    return [
      { name: "지출", value: data.budget.spent, fill: "#ef4444" },
      { name: "잔액", value: Math.max(data.budget.remaining, 0), fill: "#22c55e" },
    ];
  }, [data]);

  const countryChartData = useMemo(() => {
    if (!data?.countryDistribution) return [];
    return data.countryDistribution
      .slice(0, 8)
      .map((c: any, i: number) => ({
        name: c.country,
        count: c.count,
        fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }));
  }, [data]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
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
        <div ref={reportRef} className="space-y-6 bg-white p-6 rounded-lg" style={{ color: "#1f2937" }}>
          {/* Header */}
          <div className="border-b pb-4" style={{ borderColor: "#e5e7eb" }}>
            <h2 className="text-xl font-bold" style={{ color: "#111827" }}>
              {data.meetup?.title || "Meetup"} - Executive Report
            </h2>
            <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
              Generated: {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          {/* ========== ATTENDANCE SECTION ========== */}
          {selectedSections.includes("attendance") && (
            <div className="rounded-lg border p-5" style={{ borderColor: "#e5e7eb" }}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4" style={{ color: "#111827" }}>
                <Users className="w-5 h-5" style={{ color: "#3b82f6" }} />
                참석 현황
              </h3>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "#eff6ff" }}>
                  <p className="text-2xl font-bold" style={{ color: "#2563eb" }}>{data.attendance.total.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>전체 등록</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "#f0fdf4" }}>
                  <p className="text-2xl font-bold" style={{ color: "#16a34a" }}>{data.attendance.approved.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>승인됨</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "#faf5ff" }}>
                  <p className="text-2xl font-bold" style={{ color: "#9333ea" }}>{data.attendance.completed.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>완료</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "#fffbeb" }}>
                  <p className="text-2xl font-bold" style={{ color: "#d97706" }}>{data.attendance.attendanceRate}%</p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>참석률</p>
                </div>
              </div>
              {/* Attendance Pie Chart */}
              {attendanceChartData.length > 0 && (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={{ stroke: "#9ca3af" }}
                      >
                        {attendanceChartData.map((entry, i) => (
                          <Cell key={`att-${i}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value.toLocaleString(), "명"]} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ========== BUDGET SECTION ========== */}
          {selectedSections.includes("budget") && data.budget && (
            <div className="rounded-lg border p-5" style={{ borderColor: "#e5e7eb" }}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4" style={{ color: "#111827" }}>
                <DollarSign className="w-5 h-5" style={{ color: "#16a34a" }} />
                예산 현황
              </h3>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "#f3f4f6" }}>
                  <p className="text-2xl font-bold" style={{ color: "#111827" }}>${data.budget.total.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>총 예산</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "#f3f4f6" }}>
                  <p className="text-2xl font-bold" style={{ color: "#ef4444" }}>${data.budget.spent.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>지출</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "#f3f4f6" }}>
                  <p className="text-2xl font-bold" style={{ color: "#16a34a" }}>${data.budget.remaining.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>잔액</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "#f3f4f6" }}>
                  <p className={`text-2xl font-bold`} style={{ color: data.budget.utilization > 90 ? "#ef4444" : "#2563eb" }}>
                    {data.budget.utilization}%
                  </p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>소진율</p>
                </div>
              </div>
              {/* Budget Donut Chart */}
              {budgetChartData.length > 0 && (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={budgetChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                        labelLine={{ stroke: "#9ca3af" }}
                      >
                        {budgetChartData.map((entry, i) => (
                          <Cell key={`bud-${i}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, ""]} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Budget Progress Bar */}
              <div className="mt-4">
                <div className="w-full rounded-full h-4 overflow-hidden" style={{ backgroundColor: "#e5e7eb" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(data.budget.utilization, 100)}%`,
                      backgroundColor: data.budget.utilization > 90 ? "#ef4444" : data.budget.utilization > 70 ? "#f59e0b" : "#22c55e",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========== EXPENSES SECTION ========== */}
          {selectedSections.includes("expenses") && expenseChartData.length > 0 && (
            <div className="rounded-lg border p-5" style={{ borderColor: "#e5e7eb" }}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4" style={{ color: "#111827" }}>
                <BarChart3 className="w-5 h-5" style={{ color: "#9333ea" }} />
                카테고리별 비용
              </h3>
              {/* Expense Bar Chart */}
              <div className="h-[300px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={expenseChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString()}`} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fill: "#374151" }} />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "비용"]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    />
                    <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={28}>
                      {expenseChartData.map((_, i) => (
                        <Cell key={`exp-${i}`} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                      <LabelList
                        dataKey="amount"
                        position="right"
                        formatter={(v: number) => `$${v.toLocaleString()}`}
                        style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Total */}
              <div className="flex justify-between pt-4" style={{ borderTop: "1px solid #e5e7eb" }}>
                <span className="font-semibold" style={{ color: "#111827" }}>합계</span>
                <span className="font-bold text-lg" style={{ color: "#111827" }}>${data.expenses.total.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* ========== COUNTRY DISTRIBUTION SECTION ========== */}
          {selectedSections.includes("countries") && data.countryDistribution.length > 0 && (
            <div className="rounded-lg border p-5" style={{ borderColor: "#e5e7eb" }}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4" style={{ color: "#111827" }}>
                <Globe className="w-5 h-5" style={{ color: "#0d9488" }} />
                국가별 참석자 분포
              </h3>
              {/* Country Bar Chart */}
              {countryChartData.length > 0 && (
                <div className="h-[280px] w-full mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={countryChartData}
                      margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <Tooltip
                        formatter={(value: number) => [value.toLocaleString(), "명"]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                        {countryChartData.map((entry, i) => (
                          <Cell key={`country-${i}`} fill={entry.fill} />
                        ))}
                        <LabelList
                          dataKey="count"
                          position="top"
                          style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Country Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.countryDistribution.map((c: any) => (
                  <div key={c.country} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#f3f4f6" }}>
                    <span className="text-sm" style={{ color: "#374151" }}>{c.country}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#e5e7eb", color: "#374151" }}>
                      {c.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========== ROI SECTION ========== */}
          {selectedSections.includes("roi") && data.roi && (
            <div className="rounded-lg border p-5" style={{ borderColor: "#e5e7eb" }}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4" style={{ color: "#111827" }}>
                <TrendingUp className="w-5 h-5" style={{ color: "#d97706" }} />
                ROI 분석
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-6 rounded-lg" style={{ backgroundColor: "#fffbeb" }}>
                  <p className="text-3xl font-bold" style={{ color: "#d97706" }}>${data.roi.costPerAttendee.toLocaleString()}</p>
                  <p className="text-sm mt-1" style={{ color: "#6b7280" }}>참석자당 비용</p>
                </div>
                <div className="text-center p-6 rounded-lg" style={{ backgroundColor: "#eff6ff" }}>
                  <p className="text-3xl font-bold" style={{ color: "#2563eb" }}>${data.roi.totalInvestment.toLocaleString()}</p>
                  <p className="text-sm mt-1" style={{ color: "#6b7280" }}>총 투자 비용</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-4" style={{ borderTop: "1px solid #e5e7eb" }}>
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              Alpha Trip - Executive Report | Confidential
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
