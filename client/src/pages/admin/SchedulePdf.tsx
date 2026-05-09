import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText, Download, Loader2, Plane, Car, Calendar,
  Users, BedDouble, UtensilsCrossed, Phone, ClipboardList,
  Sparkles, RefreshCw, Save, FolderOpen, Share2, Link, Copy, Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// PDF generation via jsPDF (client-side)
async function generatePdfFromData(data: any) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Helper: add page if needed
  const checkPage = (needed: number) => {
    if (y + needed > 270) { doc.addPage(); y = 15; }
  };

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.title || "Schedule Report", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.period || ""} | ${data.location || ""}`, pageWidth / 2, y, { align: "center" });
  y += 10;

  // Summary box
  if (data.summary) {
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(15, y, pageWidth - 30, 18, 3, 3, "F");
    doc.setFontSize(9);
    const summaryText = `Participants: ${data.summary.totalParticipants || 0} | Flights: ${data.summary.totalFlights || 0} | Vehicles: ${data.summary.totalVehicles || 0} | Rooms: ${data.summary.totalRooms || 0}`;
    doc.text(summaryText, pageWidth / 2, y + 10, { align: "center" });
    y += 25;
  }

  // Departure Info
  if (data.departureInfo?.length > 0) {
    checkPage(30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Departure Info", 15, y);
    y += 6;
    const depRows: any[] = [];
    data.departureInfo.forEach((d: any) => {
      d.flights?.forEach((f: any) => {
        depRows.push([d.airport, f.flightNo, f.time, `${d.count}`, (f.passengers || []).join(", ")]);
      });
      if (!d.flights?.length) depRows.push([d.airport, "-", "-", `${d.count}`, "-"]);
    });
    autoTable(doc, {
      startY: y, head: [["Airport", "Flight", "Time", "Pax", "Passengers"]],
      body: depRows, theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Pickup Plan
  if (data.pickupPlan?.length > 0) {
    checkPage(30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Pickup Plan", 15, y);
    y += 6;
    const pickupRows = data.pickupPlan.map((p: any) => [
      p.vehicle, p.driver, p.driverPhone || "-", `${p.capacity || "-"}`,
      p.pickupLocation || "-", p.pickupTime || "-", (p.passengers || []).join(", ")
    ]);
    autoTable(doc, {
      startY: y, head: [["Vehicle", "Driver", "Phone", "Cap", "Location", "Time", "Passengers"]],
      body: pickupRows, theme: "grid", styles: { fontSize: 7 }, headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Daily Schedule
  if (data.dailySchedule?.length > 0) {
    data.dailySchedule.forEach((day: any) => {
      checkPage(30);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${day.dayLabel || ""} - ${day.date || ""}`, 15, y);
      y += 5;
      const eventRows = (day.events || []).map((e: any) => [
        `${e.time || ""}${e.endTime ? " ~ " + e.endTime : ""}`,
        e.title || "", e.location || "", e.description || "", e.staff || ""
      ]);
      if (eventRows.length > 0) {
        autoTable(doc, {
          startY: y, head: [["Time", "Event", "Location", "Description", "Staff"]],
          body: eventRows, theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: [139, 92, 246] },
          margin: { left: 15, right: 15 },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      }
    });
  }

  // Staff List
  if (data.staffList?.length > 0) {
    checkPage(30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Staff List", 15, y);
    y += 6;
    const staffRows = data.staffList.map((s: any) => [s.name, s.role, s.phone || "-", s.responsibility || "-"]);
    autoTable(doc, {
      startY: y, head: [["Name", "Role", "Phone", "Responsibility"]],
      body: staffRows, theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: [245, 158, 11] },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Room Assignments
  if (data.roomAssignments?.length > 0) {
    checkPage(30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Room Assignments", 15, y);
    y += 6;
    const roomRows = data.roomAssignments.map((r: any) => [r.room, r.floor || "-", (r.guests || []).join(", ")]);
    autoTable(doc, {
      startY: y, head: [["Room", "Floor", "Guests"]],
      body: roomRows, theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: [236, 72, 153] },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Meal Plan
  if (data.mealPlan?.length > 0) {
    checkPage(30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Meal Plan", 15, y);
    y += 6;
    const mealRows: any[] = [];
    data.mealPlan.forEach((mp: any) => {
      (mp.meals || []).forEach((m: any) => {
        mealRows.push([mp.date, m.type, m.location || "-", m.time || "-", m.note || "-"]);
      });
    });
    if (mealRows.length > 0) {
      autoTable(doc, {
        startY: y, head: [["Date", "Type", "Location", "Time", "Note"]],
        body: mealRows, theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: [234, 88, 12] },
        margin: { left: 15, right: 15 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // Contacts
  if (data.contacts?.length > 0) {
    checkPage(30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Emergency Contacts", 15, y);
    y += 6;
    const contactRows = data.contacts.map((c: any) => [c.name, c.role, c.phone || "-"]);
    autoTable(doc, {
      startY: y, head: [["Name", "Role", "Phone"]],
      body: contactRows, theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: [220, 38, 38] },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Notes
  if (data.notes) {
    checkPage(20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Notes: ${data.notes}`, 15, y, { maxWidth: pageWidth - 30 });
  }

  return doc;
}

export default function SchedulePdf() {
  const [mode, setMode] = useState<"meetup" | "text">("text");
  const [selectedMeetupId, setSelectedMeetupId] = useState<string>("");
  const [rawText, setRawText] = useState("");
  const [preferences, setPreferences] = useState("");
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showShareDialog, setShowShareDialog] = useState(false);

  const { data: meetups } = trpc.meetup.list.useQuery();
  const generateMutation = trpc.schedulePdf.generate.useMutation();
  const generateFromTextMutation = trpc.schedulePdf.generateFromText.useMutation();
  const { data: templates, refetch: refetchTemplates } = trpc.scheduleTemplates.list.useQuery();
  const createTemplateMutation = trpc.scheduleTemplates.create.useMutation();
  const deleteTemplateMutation = trpc.scheduleTemplates.delete.useMutation();
  const createShareMutation = trpc.scheduleShares.create.useMutation();
  const { data: shares, refetch: refetchShares } = trpc.scheduleShares.list.useQuery();
  const deactivateShareMutation = trpc.scheduleShares.deactivate.useMutation();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let result;
      if (mode === "meetup" && selectedMeetupId) {
        result = await generateMutation.mutateAsync({
          meetupId: parseInt(selectedMeetupId),
          rawText: rawText || undefined,
          preferences: preferences || undefined,
        });
      } else if (rawText) {
        result = await generateFromTextMutation.mutateAsync({ rawText });
      } else {
        toast.error("밋업을 선택하거나 텍스트를 입력해주세요");
        setIsGenerating(false);
        return;
      }
      if (result.success && result.data) {
        setScheduleData(result.data);
        toast.success("스케줄표가 생성되었습니다!");
      } else {
        toast.error(result.error || "생성 실패");
      }
    } catch (e: any) {
      toast.error(e.message || "오류가 발생했습니다");
    }
    setIsGenerating(false);
  };

  const handleDownloadPdf = async () => {
    if (!scheduleData) return;
    try {
      const doc = await generatePdfFromData(scheduleData);
      const filename = `schedule_${scheduleData.title || "report"}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      toast.success("PDF 다운로드 완료!");
    } catch (e: any) {
      toast.error("PDF 생성 중 오류: " + e.message);
    }
  };

  const handleSaveTemplate = async () => {
    if (!scheduleData || !templateName.trim()) {
      toast.error("스케줄표를 먼저 생성하고 템플릿 이름을 입력하세요");
      return;
    }
    try {
      await createTemplateMutation.mutateAsync({
        name: templateName.trim(),
        description: scheduleData.title || "",
        templateData: JSON.stringify(scheduleData),
        category: "meetup",
      });
      toast.success("템플릿이 저장되었습니다!");
      setTemplateName("");
      refetchTemplates();
    } catch (e: any) {
      toast.error(e.message || "저장 실패");
    }
  };

  const handleLoadTemplate = (tpl: any) => {
    try {
      const data = JSON.parse(tpl.templateData);
      setScheduleData(data);
      setShowTemplates(false);
      toast.success(`"${tpl.name}" 템플릿을 불러왔습니다`);
    } catch {
      toast.error("템플릿 데이터 파싱 실패");
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    await deleteTemplateMutation.mutateAsync({ id });
    refetchTemplates();
    toast.success("삭제되었습니다");
  };

  const handleCreateShareLink = async () => {
    if (!scheduleData) return;
    try {
      const result = await createShareMutation.mutateAsync({
        title: scheduleData.title || "스케줄표",
        scheduleData: JSON.stringify(scheduleData),
        meetupId: selectedMeetupId ? parseInt(selectedMeetupId) : undefined,
        expiresInDays: 30,
      });
      if (result.success && result.token) {
        const url = `${window.location.origin}/schedule/share/${result.token}`;
        setShareUrl(url);
        setShowShareDialog(true);
        refetchShares();
        toast.success("공유 링크가 생성되었습니다!");
      }
    } catch (e: any) {
      toast.error(e.message || "공유 링크 생성 실패");
    }
  };

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("링크가 복사되었습니다!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-purple-400" />
            AI 종합 스케줄표
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            내용을 입력하면 AI가 포맷화된 스케줄표를 생성하고 PDF로 다운로드할 수 있습니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)} className="gap-1">
            <FolderOpen className="h-4 w-4" /> 템플릿
          </Button>
          {scheduleData && (
            <>
              <Button variant="outline" size="sm" onClick={handleCreateShareLink} className="gap-1">
                <Share2 className="h-4 w-4" /> 공유
              </Button>
              <Button size="sm" onClick={handleDownloadPdf} className="gap-2">
                <Download className="h-4 w-4" /> PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <Card className="bg-card/50 border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" /> 저장된 템플릿
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!templates || templates.length === 0) ? (
              <p className="text-sm text-muted-foreground">저장된 템플릿이 없습니다. 스케줄표를 생성한 후 저장하세요.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {templates.map((tpl: any) => (
                  <div key={tpl.id} className="border rounded-lg p-3 hover:bg-accent/50 cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm" onClick={() => handleLoadTemplate(tpl)}>{tpl.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTemplate(tpl.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tpl.description || tpl.category}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tpl.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link className="h-5 w-5" /> 스케줄표 공유 링크</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">아래 링크를 참석자에게 공유하면 웹에서 스케줄표를 확인할 수 있습니다. (30일 유효)</p>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-xs" />
              <Button size="sm" onClick={handleCopyShareUrl} className="gap-1 shrink-0">
                <Copy className="h-3 w-3" /> 복사
              </Button>
            </div>
            {shares && shares.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">이전 공유 링크</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {shares.slice(0, 5).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between text-xs border rounded p-2">
                      <div>
                        <span className="font-medium">{s.title}</span>
                        <span className="text-muted-foreground ml-2">조회 {s.viewCount}회</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/schedule/share/${s.shareToken}`); toast.success("복사됨"); }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        {s.isActive && (
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={async () => { await deactivateShareMutation.mutateAsync({ id: s.id }); refetchShares(); toast.success("비활성화됨"); }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Input Section */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">스케줄 정보 입력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "meetup" | "text")}>
            <TabsList>
              <TabsTrigger value="text" className="gap-1">
                <ClipboardList className="h-4 w-4" /> 텍스트 입력
              </TabsTrigger>
              <TabsTrigger value="meetup" className="gap-1">
                <Calendar className="h-4 w-4" /> 밋업 연동
              </TabsTrigger>
            </TabsList>

            <TabsContent value="meetup" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">밋업 선택</label>
                <Select value={selectedMeetupId} onValueChange={setSelectedMeetupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="밋업을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {meetups?.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.title} ({m.location || "장소 미정"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  선택한 밋업의 참가자, 항공편, 픽업, 숙소, 일정 데이터를 자동으로 가져옵니다
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">추가 정보 (선택사항)</label>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="추가로 반영할 내용을 자유롭게 입력하세요...&#10;예: 스탭 배치 정보, 식사 장소, 특별 일정 등"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">스케줄 내용 입력</label>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`밋업/여행 스케줄 정보를 자유롭게 입력하세요. AI가 자동으로 포맷화합니다.

예시:
방콕 밋업 5월 15일~18일
참가자: 홍길동, 김철수, 이영희 (총 15명)
인천공항 출발 TG659 14:30 → 수완나품 18:30
픽업: 15인승 밴 2대, 기사 Mr.Somchai 081-234-5678
호텔: Marriott Bangkok 5층 501~508호
Day1: 18:30 공항픽업 → 20:00 호텔체크인 → 21:00 환영만찬 (담당: 김매니저)
Day2: 09:00 조식 → 10:00 컨퍼런스 → 12:00 중식 → 14:00 네트워킹
스탭: 김매니저 010-1111-2222 (총괄), 박통역 010-3333-4444 (통역)`}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div>
            <label className="text-sm font-medium mb-1 block">선호사항 (선택사항)</label>
            <Textarea
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="예: 식사시간 넉넉히, 자유시간 포함, 관광 일정 추가..."
              rows={2}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (!rawText && !selectedMeetupId)}
            className="w-full gap-2"
            size="lg"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> AI 생성 중...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> 스케줄표 생성</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {scheduleData && (
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              생성된 스케줄표 미리보기
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-1">
                <RefreshCw className="h-3 w-3" /> 재생성
              </Button>
              <Button size="sm" onClick={handleDownloadPdf} className="gap-1">
                <Download className="h-3 w-3" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleCreateShareLink} className="gap-1">
                <Share2 className="h-3 w-3" /> 공유
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title & Summary */}
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold">{scheduleData.title}</h2>
              <p className="text-sm text-muted-foreground">{scheduleData.period} | {scheduleData.location}</p>
              {scheduleData.summary && (
                <div className="flex justify-center gap-4 mt-3 flex-wrap">
                  <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> {scheduleData.summary.totalParticipants}명</Badge>
                  <Badge variant="secondary" className="gap-1"><Plane className="h-3 w-3" /> {scheduleData.summary.totalFlights}편</Badge>
                  <Badge variant="secondary" className="gap-1"><Car className="h-3 w-3" /> {scheduleData.summary.totalVehicles}대</Badge>
                  <Badge variant="secondary" className="gap-1"><BedDouble className="h-3 w-3" /> {scheduleData.summary.totalRooms}실</Badge>
                </div>
              )}
            </div>

            {/* Departure Info */}
            {scheduleData.departureInfo?.length > 0 && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Plane className="h-4 w-4 text-blue-400" /> 출발 정보
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-blue-500/10">
                        <th className="text-left p-2 border">공항</th>
                        <th className="text-left p-2 border">편명</th>
                        <th className="text-left p-2 border">시간</th>
                        <th className="text-left p-2 border">인원</th>
                        <th className="text-left p-2 border">탑승자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleData.departureInfo.map((d: any, i: number) =>
                        (d.flights || [{ flightNo: "-", time: "-", passengers: [] }]).map((f: any, j: number) => (
                          <tr key={`${i}-${j}`} className="border-b">
                            {j === 0 && <td className="p-2 border font-medium" rowSpan={d.flights?.length || 1}>{d.airport}</td>}
                            <td className="p-2 border">{f.flightNo}</td>
                            <td className="p-2 border">{f.time}</td>
                            {j === 0 && <td className="p-2 border" rowSpan={d.flights?.length || 1}>{d.count}명</td>}
                            <td className="p-2 border text-xs">{(f.passengers || []).join(", ")}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pickup Plan */}
            {scheduleData.pickupPlan?.length > 0 && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Car className="h-4 w-4 text-green-400" /> 픽업 배치
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-green-500/10">
                        <th className="text-left p-2 border">차량</th>
                        <th className="text-left p-2 border">기사</th>
                        <th className="text-left p-2 border">연락처</th>
                        <th className="text-left p-2 border">정원</th>
                        <th className="text-left p-2 border">픽업장소</th>
                        <th className="text-left p-2 border">시간</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleData.pickupPlan.map((p: any, i: number) => (
                        <tr key={i} className="border-b">
                          <td className="p-2 border">{p.vehicle}</td>
                          <td className="p-2 border">{p.driver}</td>
                          <td className="p-2 border">{p.driverPhone}</td>
                          <td className="p-2 border">{p.capacity}</td>
                          <td className="p-2 border">{p.pickupLocation}</td>
                          <td className="p-2 border">{p.pickupTime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Daily Schedule */}
            {scheduleData.dailySchedule?.length > 0 && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-purple-400" /> 일정표
                </h3>
                {scheduleData.dailySchedule.map((day: any, i: number) => (
                  <div key={i} className="mb-4">
                    <h4 className="font-medium text-sm bg-purple-500/10 px-3 py-1.5 rounded-t-lg">
                      {day.dayLabel} - {day.date}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted/30">
                            <th className="text-left p-2 border w-24">시간</th>
                            <th className="text-left p-2 border">일정</th>
                            <th className="text-left p-2 border">장소</th>
                            <th className="text-left p-2 border">설명</th>
                            <th className="text-left p-2 border w-20">담당</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(day.events || []).map((e: any, j: number) => (
                            <tr key={j} className="border-b">
                              <td className="p-2 border text-xs font-mono">{e.time}{e.endTime ? `~${e.endTime}` : ""}</td>
                              <td className="p-2 border font-medium">{e.title}</td>
                              <td className="p-2 border">{e.location}</td>
                              <td className="p-2 border text-xs">{e.description}</td>
                              <td className="p-2 border text-xs">{e.staff}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Room Assignments */}
            {scheduleData.roomAssignments?.length > 0 && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <BedDouble className="h-4 w-4 text-pink-400" /> 방 배정
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {scheduleData.roomAssignments.map((r: any, i: number) => (
                    <div key={i} className="bg-pink-500/5 border border-pink-500/20 rounded-lg p-2 text-sm">
                      <div className="font-medium">{r.room}호 {r.floor && `(${r.floor}층)`}</div>
                      <div className="text-xs text-muted-foreground">{(r.guests || []).join(", ")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meal Plan */}
            {scheduleData.mealPlan?.length > 0 && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <UtensilsCrossed className="h-4 w-4 text-orange-400" /> 식사 계획
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-orange-500/10">
                        <th className="text-left p-2 border">날짜</th>
                        <th className="text-left p-2 border">구분</th>
                        <th className="text-left p-2 border">장소</th>
                        <th className="text-left p-2 border">시간</th>
                        <th className="text-left p-2 border">비고</th>
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
                            <td className="p-2 border text-xs">{m.note}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Staff & Contacts */}
            {(scheduleData.staffList?.length > 0 || scheduleData.contacts?.length > 0) && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-red-400" /> 담당자 & 연락처
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-red-500/10">
                        <th className="text-left p-2 border">이름</th>
                        <th className="text-left p-2 border">역할</th>
                        <th className="text-left p-2 border">연락처</th>
                        <th className="text-left p-2 border">담당업무</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(scheduleData.staffList || []).map((s: any, i: number) => (
                        <tr key={`s-${i}`} className="border-b">
                          <td className="p-2 border font-medium">{s.name}</td>
                          <td className="p-2 border">{s.role}</td>
                          <td className="p-2 border">{s.phone}</td>
                          <td className="p-2 border text-xs">{s.responsibility}</td>
                        </tr>
                      ))}
                      {(scheduleData.contacts || []).map((c: any, i: number) => (
                        <tr key={`c-${i}`} className="border-b bg-red-500/5">
                          <td className="p-2 border font-medium">{c.name}</td>
                          <td className="p-2 border">{c.role}</td>
                          <td className="p-2 border">{c.phone}</td>
                          <td className="p-2 border text-xs">-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes */}
            {scheduleData.notes && (
              <div className="bg-yellow-500/10 rounded-lg p-4 text-sm">
                <h4 className="font-semibold mb-1">참고사항</h4>
                <p className="text-muted-foreground">{scheduleData.notes}</p>
              </div>
            )}

            {/* Save as Template */}
            <div className="border-t pt-4 flex gap-2 items-center">
              <Save className="h-4 w-4 text-muted-foreground" />
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="템플릿 이름 입력..."
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleSaveTemplate} disabled={!templateName.trim()} className="gap-1 shrink-0">
                <Save className="h-3 w-3" /> 템플릿 저장
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
