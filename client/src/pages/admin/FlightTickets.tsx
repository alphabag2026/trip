import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Eye, Trash2, Plane, ArrowRight, Ticket, Wand2, Users, Calendar, Building2, CheckSquare, Square, XCircle, Image as ImageIcon } from "lucide-react";
import CsvBulkUpload from "@/components/CsvBulkUpload";
import AIUploader from "@/components/AIUploader";
import { useTranslation } from "react-i18next";

const TICKET_CSV_COLUMNS = [
  { key: "passengerName", label: "승객 이름 (영문)", required: true },
  { key: "passportNumber", label: "여권번호" },
  { key: "nationality", label: "국적" },
  { key: "outboundAirline", label: "출발편 항공사" },
  { key: "outboundFlightNo", label: "출발편 편명" },
  { key: "outboundDepartureAirport", label: "출발 공항" },
  { key: "outboundDepartureCode", label: "출발 공항코드" },
  { key: "outboundArrivalAirport", label: "도착 공항" },
  { key: "outboundArrivalCode", label: "도착 공항코드" },
  { key: "outboundDepartureDate", label: "출발일 (YYYY-MM-DD)" },
  { key: "outboundDepartureTime", label: "출발시간 (HH:MM)" },
  { key: "outboundArrivalDate", label: "도착일" },
  { key: "outboundArrivalTime", label: "도착시간" },
  { key: "returnAirline", label: "귀국편 항공사" },
  { key: "returnFlightNo", label: "귀국편 편명" },
  { key: "returnDepartureAirport", label: "귀국 출발 공항" },
  { key: "returnDepartureCode", label: "귀국 출발 공항코드" },
  { key: "returnArrivalAirport", label: "귀국 도착 공항" },
  { key: "returnArrivalCode", label: "귀국 도착 공항코드" },
  { key: "returnDepartureDate", label: "귀국 출발일" },
  { key: "returnDepartureTime", label: "귀국 출발시간" },
  { key: "returnArrivalDate", label: "귀국 도착일" },
  { key: "returnArrivalTime", label: "귀국 도착시간" },
  { key: "bookingReference", label: "예약번호 (PNR)" },
  { key: "ticketNumber", label: "티켓번호" },
];

type ViewMode = "individual" | "group" | "schedule" | "airline";

function generateBookingRef() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
function generateTicketNo() {
  return "180-" + Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
}

export default function FlightTickets() {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const { data: tickets, isLoading } = trpc.flightTicket.listAll.useQuery();
  const createMutation = trpc.flightTicket.create.useMutation({
    onSuccess: () => { utils.flightTicket.listAll.invalidate(); setCreateOpen(false); resetForm(); toast.success("항공권이 생성되었습니다"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.flightTicket.delete.useMutation({
    onSuccess: () => { utils.flightTicket.listAll.invalidate(); toast.success("삭제되었습니다"); },
    onError: (e) => toast.error(e.message),
  });
  const bulkDeleteMutation = trpc.flightTicket.bulkDelete.useMutation({
    onSuccess: (data) => { utils.flightTicket.listAll.invalidate(); setSelectedIds([]); toast.success(`${data.deletedCount}개 항공권이 삭제되었습니다`); },
    onError: (e) => toast.error(e.message),
  });
  const deleteAllMutation = trpc.flightTicket.deleteAll.useMutation({
    onSuccess: (data) => { utils.flightTicket.listAll.invalidate(); setSelectedIds([]); toast.success(`${data.deletedCount}개 항공권이 전체 삭제되었습니다`); },
    onError: (e) => toast.error(e.message),
  });
  const bulkAssignMutation = trpc.flightTicket.bulkAssign.useMutation({
    onSuccess: () => { utils.flightTicket.listAll.invalidate(); },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("individual");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showAiUploader, setShowAiUploader] = useState(false);

  const [form, setForm] = useState({
    passengerName: "", passportNumber: "", nationality: "",
    outboundAirline: "", outboundFlightNo: "",
    outboundDepartureAirport: "", outboundDepartureCode: "",
    outboundArrivalAirport: "", outboundArrivalCode: "",
    outboundDepartureDate: "", outboundDepartureTime: "",
    outboundArrivalDate: "", outboundArrivalTime: "",
    outboundSeatClass: "Economy", outboundSeatNumber: "",
    returnAirline: "", returnFlightNo: "",
    returnDepartureAirport: "", returnDepartureCode: "",
    returnArrivalAirport: "", returnArrivalCode: "",
    returnDepartureDate: "", returnDepartureTime: "",
    returnArrivalDate: "", returnArrivalTime: "",
    returnSeatClass: "Economy", returnSeatNumber: "",
    bookingReference: "", ticketNumber: "",
    isGenerated: false,
  });

  const resetForm = () => setForm({
    passengerName: "", passportNumber: "", nationality: "",
    outboundAirline: "", outboundFlightNo: "",
    outboundDepartureAirport: "", outboundDepartureCode: "",
    outboundArrivalAirport: "", outboundArrivalCode: "",
    outboundDepartureDate: "", outboundDepartureTime: "",
    outboundArrivalDate: "", outboundArrivalTime: "",
    outboundSeatClass: "Economy", outboundSeatNumber: "",
    returnAirline: "", returnFlightNo: "",
    returnDepartureAirport: "", returnDepartureCode: "",
    returnArrivalAirport: "", returnArrivalCode: "",
    returnDepartureDate: "", returnDepartureTime: "",
    returnArrivalDate: "", returnArrivalTime: "",
    returnSeatClass: "Economy", returnSeatNumber: "",
    bookingReference: "", ticketNumber: "",
    isGenerated: false,
  });

  const handleAutoGenerate = () => {
    setForm(f => ({ ...f, bookingReference: generateBookingRef(), ticketNumber: generateTicketNo(), isGenerated: true }));
    toast.success("예약번호와 티켓번호가 자동 생성되었습니다");
  };

  const handleCreate = () => {
    if (!form.passengerName) { toast.error("승객 이름은 필수입니다"); return; }
    createMutation.mutate({ ...form, ticketFileType: "generated" });
  };

  const handleAiExtracted = (data: any) => {
    if (data) {
      setForm(f => ({
        ...f,
        passengerName: data.passengerName || f.passengerName,
        passportNumber: data.passportNumber || f.passportNumber,
        nationality: data.nationality || f.nationality,
        outboundAirline: data.outboundAirline || f.outboundAirline,
        outboundFlightNo: data.outboundFlightNo || f.outboundFlightNo,
        outboundDepartureAirport: data.outboundDepartureAirport || f.outboundDepartureAirport,
        outboundDepartureCode: data.outboundDepartureCode || f.outboundDepartureCode,
        outboundArrivalAirport: data.outboundArrivalAirport || f.outboundArrivalAirport,
        outboundArrivalCode: data.outboundArrivalCode || f.outboundArrivalCode,
        outboundDepartureDate: data.outboundDepartureDate || f.outboundDepartureDate,
        outboundDepartureTime: data.outboundDepartureTime || f.outboundDepartureTime,
        outboundArrivalDate: data.outboundArrivalDate || f.outboundArrivalDate,
        outboundArrivalTime: data.outboundArrivalTime || f.outboundArrivalTime,
        returnAirline: data.returnAirline || f.returnAirline,
        returnFlightNo: data.returnFlightNo || f.returnFlightNo,
        returnDepartureAirport: data.returnDepartureAirport || f.returnDepartureAirport,
        returnDepartureCode: data.returnDepartureCode || f.returnDepartureCode,
        returnArrivalAirport: data.returnArrivalAirport || f.returnArrivalAirport,
        returnArrivalCode: data.returnArrivalCode || f.returnArrivalCode,
        returnDepartureDate: data.returnDepartureDate || f.returnDepartureDate,
        returnDepartureTime: data.returnDepartureTime || f.returnDepartureTime,
        returnArrivalDate: data.returnArrivalDate || f.returnArrivalDate,
        returnArrivalTime: data.returnArrivalTime || f.returnArrivalTime,
        bookingReference: data.bookingReference || f.bookingReference,
        ticketNumber: data.ticketNumber || f.ticketNumber,
      }));
      setShowAiUploader(false);
      toast.success("AI가 항공권 정보를 추출했습니다. 확인 후 생성하세요.");
    }
  };

  const handleCsvBulkUpload = async (rows: Record<string, any>[]) => {
    const result = await bulkAssignMutation.mutateAsync({
      rows: rows.map(r => ({
        passengerName: r.passengerName || "",
        passportNumber: r.passportNumber || undefined,
        nationality: r.nationality || undefined,
        outboundAirline: r.outboundAirline || undefined,
        outboundFlightNo: r.outboundFlightNo || undefined,
        outboundDepartureAirport: r.outboundDepartureAirport || undefined,
        outboundDepartureCode: r.outboundDepartureCode || undefined,
        outboundArrivalAirport: r.outboundArrivalAirport || undefined,
        outboundArrivalCode: r.outboundArrivalCode || undefined,
        outboundDepartureDate: r.outboundDepartureDate || undefined,
        outboundDepartureTime: r.outboundDepartureTime || undefined,
        outboundArrivalDate: r.outboundArrivalDate || undefined,
        outboundArrivalTime: r.outboundArrivalTime || undefined,
        returnAirline: r.returnAirline || undefined,
        returnFlightNo: r.returnFlightNo || undefined,
        returnDepartureAirport: r.returnDepartureAirport || undefined,
        returnDepartureCode: r.returnDepartureCode || undefined,
        returnArrivalAirport: r.returnArrivalAirport || undefined,
        returnArrivalCode: r.returnArrivalCode || undefined,
        returnDepartureDate: r.returnDepartureDate || undefined,
        returnDepartureTime: r.returnDepartureTime || undefined,
        returnArrivalDate: r.returnArrivalDate || undefined,
        returnArrivalTime: r.returnArrivalTime || undefined,
        bookingReference: r.bookingReference || undefined,
        ticketNumber: r.ticketNumber || undefined,
        isGenerated: r.isGenerated === "true" || r.isGenerated === true || undefined,
        userId: r.userId ? Number(r.userId) : undefined,
        meetupId: r.meetupId ? Number(r.meetupId) : undefined,
      })),
    });
    return result;
  };

  // Toggle selection
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (!tickets) return;
    setSelectedIds(prev => prev.length === tickets.length ? [] : tickets.map(t => t.id));
  };

  // Grouped data
  const groupedByTeam = useMemo(() => {
    if (!tickets) return {};
    const groups: Record<string, typeof tickets> = {};
    tickets.forEach(tk => {
      const group = (tk as any).teamName || "미배정";
      if (!groups[group]) groups[group] = [];
      groups[group].push(tk);
    });
    return groups;
  }, [tickets]);

  const groupedByDate = useMemo(() => {
    if (!tickets) return {};
    const groups: Record<string, typeof tickets> = {};
    tickets.forEach(tk => {
      const date = tk.outboundDepartureDate || "미정";
      if (!groups[date]) groups[date] = [];
      groups[date].push(tk);
    });
    return groups;
  }, [tickets]);

  const groupedByAirline = useMemo(() => {
    if (!tickets) return {};
    const groups: Record<string, typeof tickets> = {};
    tickets.forEach(tk => {
      const airline = tk.outboundAirline || "미정";
      if (!groups[airline]) groups[airline] = [];
      groups[airline].push(tk);
    });
    return groups;
  }, [tickets]);

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) { toast.error("삭제할 항공권을 선택하세요"); return; }
    if (confirm(`${selectedIds.length}개 항공권을 삭제하시겠습니까?`)) {
      bulkDeleteMutation.mutate({ ids: selectedIds });
    }
  };

  const handleDeleteAll = () => {
    if (confirm("정말 전체 항공권을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      if (confirm("한번 더 확인합니다. 모든 항공권이 삭제됩니다.")) {
        deleteAllMutation.mutate({ confirm: true });
      }
    }
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">로딩 중...</div>;

  const renderTicketCard = (tk: any) => (
    <Card key={tk.id} className={`hover:shadow-md transition-shadow ${selectedIds.includes(tk.id) ? "ring-2 ring-primary" : ""}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <button onClick={() => toggleSelect(tk.id)} className="mt-1">
              {selectedIds.includes(tk.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground" />}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Ticket className="w-5 h-5 text-primary" />
                <h3 className="font-bold">{tk.passengerName}</h3>
                <Badge variant={tk.status === "active" ? "default" : "secondary"}>{tk.status}</Badge>
                {tk.isGenerated && <Badge variant="outline" className="text-orange-600 border-orange-600">자동생성</Badge>}
              </div>
              {tk.outboundFlightNo && (
                <div className="flex items-center gap-2 text-sm mb-1">
                  <Plane className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-medium">{tk.outboundAirline} {tk.outboundFlightNo}</span>
                  <span>{tk.outboundDepartureCode}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{tk.outboundArrivalCode}</span>
                  <span className="text-muted-foreground">{tk.outboundDepartureDate} {tk.outboundDepartureTime}</span>
                </div>
              )}
              {tk.returnFlightNo && (
                <div className="flex items-center gap-2 text-sm">
                  <Plane className="w-3.5 h-3.5 text-green-600 rotate-180" />
                  <span className="font-medium">{tk.returnAirline} {tk.returnFlightNo}</span>
                  <span>{tk.returnDepartureCode}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{tk.returnArrivalCode}</span>
                  <span className="text-muted-foreground">{tk.returnDepartureDate} {tk.returnDepartureTime}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {tk.bookingReference && <span>PNR: {tk.bookingReference} | </span>}
                {tk.ticketNumber && <span>Ticket: {tk.ticketNumber}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewTicket(tk)}><Eye className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" className="text-red-600" onClick={() => { if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: tk.id }); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">항공권 관리</h1>
          <p className="text-muted-foreground">이미지/텍스트 AI 프롬프트로 자동 생성 가능</p>
        </div>
        <div className="flex gap-2">
          <CsvBulkUpload
            title="항공권 CSV 일괄 배정"
            description="CSV 파일을 업로드하여 항공권을 일괄 생성합니다."
            columns={TICKET_CSV_COLUMNS}
            onUpload={handleCsvBulkUpload}
            templateFileName="flight_ticket_template.csv"
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />항공권 생성</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>항공권 생성</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                {/* AI Image Prompt */}
                <div className="border rounded-lg p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-sm">AI 자동 입력</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowAiUploader(!showAiUploader)}>
                      {showAiUploader ? "접기" : "이미지/텍스트로 자동 입력"}
                    </Button>
                  </div>
                  {showAiUploader && (
                    <AIUploader context="flightTicket" onExtracted={handleAiExtracted} compact />
                  )}
                </div>
                {/* 승객 정보 */}
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>승객 이름 (영문) *</Label><Input value={form.passengerName} onChange={e => setForm(f => ({ ...f, passengerName: e.target.value }))} placeholder="HONG GILDONG" /></div>
                  <div><Label>여권번호</Label><Input value={form.passportNumber} onChange={e => setForm(f => ({ ...f, passportNumber: e.target.value }))} placeholder="M12345678" /></div>
                  <div><Label>국적</Label><Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="KOREAN" /></div>
                </div>
                {/* 예약번호/티켓번호 */}
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div><Label>예약번호 (PNR)</Label><Input value={form.bookingReference} onChange={e => setForm(f => ({ ...f, bookingReference: e.target.value }))} placeholder="ABC123" /></div>
                  <div><Label>티켓번호</Label><Input value={form.ticketNumber} onChange={e => setForm(f => ({ ...f, ticketNumber: e.target.value }))} placeholder="180-1234567890" /></div>
                  <Button variant="outline" onClick={handleAutoGenerate}><Wand2 className="w-4 h-4 mr-2" />자동생성</Button>
                </div>
                {/* 출발편 */}
                <div className="border-t pt-3">
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><Plane className="w-4 h-4" /> 출발편 (Outbound)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>항공사</Label><Input value={form.outboundAirline} onChange={e => setForm(f => ({ ...f, outboundAirline: e.target.value }))} placeholder="Korean Air" /></div>
                    <div><Label>편명</Label><Input value={form.outboundFlightNo} onChange={e => setForm(f => ({ ...f, outboundFlightNo: e.target.value }))} placeholder="KE659" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div><Label>출발 공항</Label><Input value={form.outboundDepartureAirport} onChange={e => setForm(f => ({ ...f, outboundDepartureAirport: e.target.value }))} placeholder="Incheon International Airport" /></div>
                    <div><Label>출발 코드</Label><Input value={form.outboundDepartureCode} onChange={e => setForm(f => ({ ...f, outboundDepartureCode: e.target.value }))} placeholder="ICN" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div><Label>도착 공항</Label><Input value={form.outboundArrivalAirport} onChange={e => setForm(f => ({ ...f, outboundArrivalAirport: e.target.value }))} placeholder="Tan Son Nhat International" /></div>
                    <div><Label>도착 코드</Label><Input value={form.outboundArrivalCode} onChange={e => setForm(f => ({ ...f, outboundArrivalCode: e.target.value }))} placeholder="SGN" /></div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    <div><Label>출발일</Label><Input type="date" value={form.outboundDepartureDate} onChange={e => setForm(f => ({ ...f, outboundDepartureDate: e.target.value }))} /></div>
                    <div><Label>출발시간</Label><Input type="time" value={form.outboundDepartureTime} onChange={e => setForm(f => ({ ...f, outboundDepartureTime: e.target.value }))} /></div>
                    <div><Label>도착일</Label><Input type="date" value={form.outboundArrivalDate} onChange={e => setForm(f => ({ ...f, outboundArrivalDate: e.target.value }))} /></div>
                    <div><Label>도착시간</Label><Input type="time" value={form.outboundArrivalTime} onChange={e => setForm(f => ({ ...f, outboundArrivalTime: e.target.value }))} /></div>
                  </div>
                </div>
                {/* 귀국편 */}
                <div className="border-t pt-3">
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><Plane className="w-4 h-4 rotate-180" /> 귀국편 (Return)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>항공사</Label><Input value={form.returnAirline} onChange={e => setForm(f => ({ ...f, returnAirline: e.target.value }))} placeholder="Korean Air" /></div>
                    <div><Label>편명</Label><Input value={form.returnFlightNo} onChange={e => setForm(f => ({ ...f, returnFlightNo: e.target.value }))} placeholder="KE660" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div><Label>출발 공항</Label><Input value={form.returnDepartureAirport} onChange={e => setForm(f => ({ ...f, returnDepartureAirport: e.target.value }))} placeholder="Tan Son Nhat International" /></div>
                    <div><Label>출발 코드</Label><Input value={form.returnDepartureCode} onChange={e => setForm(f => ({ ...f, returnDepartureCode: e.target.value }))} placeholder="SGN" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div><Label>도착 공항</Label><Input value={form.returnArrivalAirport} onChange={e => setForm(f => ({ ...f, returnArrivalAirport: e.target.value }))} placeholder="Incheon International Airport" /></div>
                    <div><Label>도착 코드</Label><Input value={form.returnArrivalCode} onChange={e => setForm(f => ({ ...f, returnArrivalCode: e.target.value }))} placeholder="ICN" /></div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    <div><Label>출발일</Label><Input type="date" value={form.returnDepartureDate} onChange={e => setForm(f => ({ ...f, returnDepartureDate: e.target.value }))} /></div>
                    <div><Label>출발시간</Label><Input type="time" value={form.returnDepartureTime} onChange={e => setForm(f => ({ ...f, returnDepartureTime: e.target.value }))} /></div>
                    <div><Label>도착일</Label><Input type="date" value={form.returnArrivalDate} onChange={e => setForm(f => ({ ...f, returnArrivalDate: e.target.value }))} /></div>
                    <div><Label>도착시간</Label><Input type="time" value={form.returnArrivalTime} onChange={e => setForm(f => ({ ...f, returnArrivalTime: e.target.value }))} /></div>
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "생성 중..." : "항공권 생성"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{tickets?.length ?? 0}</div><div className="text-sm text-muted-foreground">전체 항공권</div></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold text-blue-600">{tickets?.filter(t => t.isGenerated).length ?? 0}</div><div className="text-sm text-muted-foreground">자동 생성 (입국용)</div></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold text-green-600">{tickets?.filter(t => t.status === "active").length ?? 0}</div><div className="text-sm text-muted-foreground">활성</div></CardContent></Card>
      </div>

      {/* 보기 모드 + 삭제 도구 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <Button variant={viewMode === "individual" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("individual")}>
            <Ticket className="w-4 h-4 mr-1" />개별
          </Button>
          <Button variant={viewMode === "group" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("group")}>
            <Users className="w-4 h-4 mr-1" />그룹별
          </Button>
          <Button variant={viewMode === "schedule" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("schedule")}>
            <Calendar className="w-4 h-4 mr-1" />일정별
          </Button>
          <Button variant={viewMode === "airline" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("airline")}>
            <Building2 className="w-4 h-4 mr-1" />항공사별
          </Button>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending}>
              <Trash2 className="w-4 h-4 mr-1" />{selectedIds.length}개 삭제
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
            {selectedIds.length === (tickets?.length ?? 0) ? <XCircle className="w-4 h-4 mr-1" /> : <CheckSquare className="w-4 h-4 mr-1" />}
            {selectedIds.length === (tickets?.length ?? 0) ? "선택 해제" : "전체 선택"}
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={handleDeleteAll} disabled={deleteAllMutation.isPending}>
            <Trash2 className="w-4 h-4 mr-1" />전체 삭제
          </Button>
        </div>
      </div>

      {/* 항공권 목록 - 보기 모드별 */}
      {(!tickets || tickets.length === 0) ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">아직 등록된 항공권이 없습니다</CardContent></Card>
      ) : viewMode === "individual" ? (
        <div className="grid gap-3">{tickets.map(tk => renderTicketCard(tk))}</div>
      ) : viewMode === "group" ? (
        <div className="space-y-6">
          {Object.entries(groupedByTeam).map(([group, tks]) => (
            <div key={group}>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />{group} <Badge variant="secondary">{tks.length}명</Badge>
              </h3>
              <div className="grid gap-3 pl-4 border-l-2 border-primary/20">{tks.map(tk => renderTicketCard(tk))}</div>
            </div>
          ))}
        </div>
      ) : viewMode === "schedule" ? (
        <div className="space-y-6">
          {Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, tks]) => (
            <div key={date}>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />{date} <Badge variant="secondary">{tks.length}명</Badge>
              </h3>
              <div className="grid gap-3 pl-4 border-l-2 border-blue-200">{tks.map(tk => renderTicketCard(tk))}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByAirline).map(([airline, tks]) => (
            <div key={airline}>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-600" />{airline} <Badge variant="secondary">{tks.length}명</Badge>
              </h3>
              <div className="grid gap-3 pl-4 border-l-2 border-green-200">{tks.map(tk => renderTicketCard(tk))}</div>
            </div>
          ))}
        </div>
      )}

      {/* 항공권 상세 보기 */}
      <Dialog open={!!viewTicket} onOpenChange={() => setViewTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ticket className="w-5 h-5" /> E-TICKET / 전자항공권</DialogTitle>
          </DialogHeader>
          {viewTicket && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="text-lg font-bold">{viewTicket.passengerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {viewTicket.bookingReference && `PNR: ${viewTicket.bookingReference}`}
                    {viewTicket.ticketNumber && ` | Ticket: ${viewTicket.ticketNumber}`}
                  </p>
                </div>
                <Badge variant={viewTicket.status === "active" ? "default" : "secondary"}>{viewTicket.status}</Badge>
              </div>
              {viewTicket.passportNumber && (
                <div className="text-sm"><span className="text-gray-500">Passport: </span><span className="font-medium">{viewTicket.passportNumber}</span>{viewTicket.nationality && <span className="ml-2 text-gray-500">({viewTicket.nationality})</span>}</div>
              )}
              {viewTicket.outboundFlightNo && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3"><Plane className="w-4 h-4 text-blue-600" /><span className="font-semibold">Outbound / 출발편</span></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-gray-500">Flight</p><p className="font-bold">{viewTicket.outboundAirline} {viewTicket.outboundFlightNo}</p></div>
                    <div><p className="text-xs text-gray-500">Class</p><p>{viewTicket.outboundSeatClass || "Economy"}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="border-l-4 border-blue-500 pl-3">
                      <p className="text-xs text-gray-500">Departure</p><p className="font-bold">{viewTicket.outboundDepartureCode}</p>
                      <p className="text-sm">{viewTicket.outboundDepartureAirport}</p><p className="text-sm">{viewTicket.outboundDepartureDate} {viewTicket.outboundDepartureTime}</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-3">
                      <p className="text-xs text-gray-500">Arrival</p><p className="font-bold">{viewTicket.outboundArrivalCode}</p>
                      <p className="text-sm">{viewTicket.outboundArrivalAirport}</p><p className="text-sm">{viewTicket.outboundArrivalDate} {viewTicket.outboundArrivalTime}</p>
                    </div>
                  </div>
                </div>
              )}
              {viewTicket.returnFlightNo && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3"><Plane className="w-4 h-4 text-green-600 rotate-180" /><span className="font-semibold">Return / 귀국편</span></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-gray-500">Flight</p><p className="font-bold">{viewTicket.returnAirline} {viewTicket.returnFlightNo}</p></div>
                    <div><p className="text-xs text-gray-500">Class</p><p>{viewTicket.returnSeatClass || "Economy"}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="border-l-4 border-blue-500 pl-3">
                      <p className="text-xs text-gray-500">Departure</p><p className="font-bold">{viewTicket.returnDepartureCode}</p>
                      <p className="text-sm">{viewTicket.returnDepartureAirport}</p><p className="text-sm">{viewTicket.returnDepartureDate} {viewTicket.returnDepartureTime}</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-3">
                      <p className="text-xs text-gray-500">Arrival</p><p className="font-bold">{viewTicket.returnArrivalCode}</p>
                      <p className="text-sm">{viewTicket.returnArrivalAirport}</p><p className="text-sm">{viewTicket.returnArrivalDate} {viewTicket.returnArrivalTime}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-400 border-t pt-3">전자 항공권입니다. 종이 티켓은 발행되지 않습니다.</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
