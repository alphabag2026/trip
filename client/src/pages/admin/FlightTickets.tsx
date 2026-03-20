import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Eye, Trash2, Plane, ArrowRight, Ticket, Wand2 } from "lucide-react";

function generateBookingRef() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
function generateTicketNo() {
  return "180-" + Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
}

export default function FlightTickets() {
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

  const [createOpen, setCreateOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState<any>(null);
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
    setForm(f => ({
      ...f,
      bookingReference: generateBookingRef(),
      ticketNumber: generateTicketNo(),
      isGenerated: true,
    }));
    toast.success("예약번호와 티켓번호가 자동 생성되었습니다");
  };

  const handleCreate = () => {
    if (!form.passengerName) {
      toast.error("승객 이름은 필수입니다");
      return;
    }
    createMutation.mutate({
      ...form,
      ticketFileType: "generated",
    });
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">항공권 관리</h1>
          <p className="text-muted-foreground">왕복 항공권을 등록하거나 임의 티켓을 생성합니다 (이미그레이션 통과용)</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />항공권 생성</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>항공권 생성</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              {/* 승객 정보 */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>승객 이름 (영문) *</Label>
                  <Input value={form.passengerName} onChange={e => setForm(f => ({ ...f, passengerName: e.target.value }))} placeholder="HONG GILDONG" />
                </div>
                <div>
                  <Label>여권번호</Label>
                  <Input value={form.passportNumber} onChange={e => setForm(f => ({ ...f, passportNumber: e.target.value }))} placeholder="M12345678" />
                </div>
                <div>
                  <Label>국적</Label>
                  <Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="KOREAN" />
                </div>
              </div>

              {/* 자동 생성 버튼 */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>예약번호 (PNR)</Label>
                  <Input value={form.bookingReference} onChange={e => setForm(f => ({ ...f, bookingReference: e.target.value }))} placeholder="ABC123" />
                </div>
                <div className="flex-1">
                  <Label>티켓번호</Label>
                  <Input value={form.ticketNumber} onChange={e => setForm(f => ({ ...f, ticketNumber: e.target.value }))} placeholder="180-1234567890" />
                </div>
                <Button variant="outline" onClick={handleAutoGenerate} type="button">
                  <Wand2 className="w-4 h-4 mr-1" />자동생성
                </Button>
              </div>

              {/* 출발편 */}
              <div className="border-t pt-3">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Plane className="w-4 h-4" /> 출발편 (Outbound)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>항공사</Label>
                    <Input value={form.outboundAirline} onChange={e => setForm(f => ({ ...f, outboundAirline: e.target.value }))} placeholder="Korean Air" />
                  </div>
                  <div>
                    <Label>편명</Label>
                    <Input value={form.outboundFlightNo} onChange={e => setForm(f => ({ ...f, outboundFlightNo: e.target.value }))} placeholder="KE659" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label>출발 공항</Label>
                    <Input value={form.outboundDepartureAirport} onChange={e => setForm(f => ({ ...f, outboundDepartureAirport: e.target.value }))} placeholder="Incheon International Airport" />
                  </div>
                  <div>
                    <Label>출발 코드</Label>
                    <Input value={form.outboundDepartureCode} onChange={e => setForm(f => ({ ...f, outboundDepartureCode: e.target.value }))} placeholder="ICN" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label>도착 공항</Label>
                    <Input value={form.outboundArrivalAirport} onChange={e => setForm(f => ({ ...f, outboundArrivalAirport: e.target.value }))} placeholder="Tan Son Nhat International" />
                  </div>
                  <div>
                    <Label>도착 코드</Label>
                    <Input value={form.outboundArrivalCode} onChange={e => setForm(f => ({ ...f, outboundArrivalCode: e.target.value }))} placeholder="SGN" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  <div>
                    <Label>출발일</Label>
                    <Input type="date" value={form.outboundDepartureDate} onChange={e => setForm(f => ({ ...f, outboundDepartureDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>출발시간</Label>
                    <Input type="time" value={form.outboundDepartureTime} onChange={e => setForm(f => ({ ...f, outboundDepartureTime: e.target.value }))} />
                  </div>
                  <div>
                    <Label>도착일</Label>
                    <Input type="date" value={form.outboundArrivalDate} onChange={e => setForm(f => ({ ...f, outboundArrivalDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>도착시간</Label>
                    <Input type="time" value={form.outboundArrivalTime} onChange={e => setForm(f => ({ ...f, outboundArrivalTime: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* 귀국편 */}
              <div className="border-t pt-3">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Plane className="w-4 h-4 rotate-180" /> 귀국편 (Return)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>항공사</Label>
                    <Input value={form.returnAirline} onChange={e => setForm(f => ({ ...f, returnAirline: e.target.value }))} placeholder="Korean Air" />
                  </div>
                  <div>
                    <Label>편명</Label>
                    <Input value={form.returnFlightNo} onChange={e => setForm(f => ({ ...f, returnFlightNo: e.target.value }))} placeholder="KE660" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label>출발 공항</Label>
                    <Input value={form.returnDepartureAirport} onChange={e => setForm(f => ({ ...f, returnDepartureAirport: e.target.value }))} placeholder="Tan Son Nhat International" />
                  </div>
                  <div>
                    <Label>출발 코드</Label>
                    <Input value={form.returnDepartureCode} onChange={e => setForm(f => ({ ...f, returnDepartureCode: e.target.value }))} placeholder="SGN" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label>도착 공항</Label>
                    <Input value={form.returnArrivalAirport} onChange={e => setForm(f => ({ ...f, returnArrivalAirport: e.target.value }))} placeholder="Incheon International Airport" />
                  </div>
                  <div>
                    <Label>도착 코드</Label>
                    <Input value={form.returnArrivalCode} onChange={e => setForm(f => ({ ...f, returnArrivalCode: e.target.value }))} placeholder="ICN" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  <div>
                    <Label>출발일</Label>
                    <Input type="date" value={form.returnDepartureDate} onChange={e => setForm(f => ({ ...f, returnDepartureDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>출발시간</Label>
                    <Input type="time" value={form.returnDepartureTime} onChange={e => setForm(f => ({ ...f, returnDepartureTime: e.target.value }))} />
                  </div>
                  <div>
                    <Label>도착일</Label>
                    <Input type="date" value={form.returnArrivalDate} onChange={e => setForm(f => ({ ...f, returnArrivalDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>도착시간</Label>
                    <Input type="time" value={form.returnArrivalTime} onChange={e => setForm(f => ({ ...f, returnArrivalTime: e.target.value }))} />
                  </div>
                </div>
              </div>

              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "생성 중..." : "항공권 생성"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{tickets?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">전체 항공권</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{tickets?.filter(t => t.isGenerated).length ?? 0}</div>
            <div className="text-sm text-muted-foreground">자동 생성 (입국용)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{tickets?.filter(t => t.status === "active").length ?? 0}</div>
            <div className="text-sm text-muted-foreground">활성</div>
          </CardContent>
        </Card>
      </div>

      {/* 항공권 목록 */}
      <div className="grid gap-4">
        {(!tickets || tickets.length === 0) ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">아직 등록된 항공권이 없습니다</CardContent></Card>
        ) : tickets.map(t => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="w-5 h-5 text-primary" />
                    <h3 className="font-bold">{t.passengerName}</h3>
                    <Badge variant={t.status === "active" ? "default" : "secondary"}>{t.status}</Badge>
                    {t.isGenerated && <Badge variant="outline" className="text-orange-600 border-orange-600">자동생성</Badge>}
                  </div>
                  {/* 출발편 */}
                  {t.outboundFlightNo && (
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <Plane className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-medium">{t.outboundAirline} {t.outboundFlightNo}</span>
                      <span>{t.outboundDepartureCode}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>{t.outboundArrivalCode}</span>
                      <span className="text-muted-foreground">{t.outboundDepartureDate} {t.outboundDepartureTime}</span>
                    </div>
                  )}
                  {/* 귀국편 */}
                  {t.returnFlightNo && (
                    <div className="flex items-center gap-2 text-sm">
                      <Plane className="w-3.5 h-3.5 text-green-600 rotate-180" />
                      <span className="font-medium">{t.returnAirline} {t.returnFlightNo}</span>
                      <span>{t.returnDepartureCode}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>{t.returnArrivalCode}</span>
                      <span className="text-muted-foreground">{t.returnDepartureDate} {t.returnDepartureTime}</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {t.bookingReference && <span>PNR: {t.bookingReference} | </span>}
                    {t.ticketNumber && <span>Ticket: {t.ticketNumber}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewTicket(t)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => {
                    if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: t.id });
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 항공권 상세 보기 - E-Ticket 스타일 */}
      <Dialog open={!!viewTicket} onOpenChange={() => setViewTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>E-Ticket / 전자 항공권</DialogTitle>
          </DialogHeader>
          {viewTicket && (
            <div className="bg-white text-black p-6 rounded-lg border space-y-4">
              <div className="border-b pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">Electronic Ticket Receipt</h2>
                  <p className="text-sm text-gray-500">전자 항공권 영수증</p>
                </div>
                {viewTicket.isGenerated && (
                  <Badge className="bg-orange-100 text-orange-700">입국 편의용</Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Passenger Name / 승객명</p>
                  <p className="font-bold">{viewTicket.passengerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Booking Reference / 예약번호</p>
                  <p className="font-bold">{viewTicket.bookingReference || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ticket Number / 티켓번호</p>
                  <p className="font-bold">{viewTicket.ticketNumber || "-"}</p>
                </div>
              </div>
              {viewTicket.passportNumber && (
                <div className="text-sm">
                  <span className="text-gray-500">Passport: </span>
                  <span className="font-medium">{viewTicket.passportNumber}</span>
                  {viewTicket.nationality && <span className="ml-2 text-gray-500">({viewTicket.nationality})</span>}
                </div>
              )}
              {/* 출발편 */}
              {viewTicket.outboundFlightNo && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Plane className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">Outbound Flight / 출발편</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Flight / 편명</p>
                      <p className="font-bold">{viewTicket.outboundAirline} {viewTicket.outboundFlightNo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Class / 좌석등급</p>
                      <p>{viewTicket.outboundSeatClass || "Economy"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="border-l-4 border-blue-500 pl-3">
                      <p className="text-xs text-gray-500">Departure / 출발</p>
                      <p className="font-bold">{viewTicket.outboundDepartureCode}</p>
                      <p className="text-sm">{viewTicket.outboundDepartureAirport}</p>
                      <p className="text-sm">{viewTicket.outboundDepartureDate} {viewTicket.outboundDepartureTime}</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-3">
                      <p className="text-xs text-gray-500">Arrival / 도착</p>
                      <p className="font-bold">{viewTicket.outboundArrivalCode}</p>
                      <p className="text-sm">{viewTicket.outboundArrivalAirport}</p>
                      <p className="text-sm">{viewTicket.outboundArrivalDate} {viewTicket.outboundArrivalTime}</p>
                    </div>
                  </div>
                </div>
              )}
              {/* 귀국편 */}
              {viewTicket.returnFlightNo && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Plane className="w-4 h-4 text-green-600 rotate-180" />
                    <span className="font-semibold">Return Flight / 귀국편</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Flight / 편명</p>
                      <p className="font-bold">{viewTicket.returnAirline} {viewTicket.returnFlightNo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Class / 좌석등급</p>
                      <p>{viewTicket.returnSeatClass || "Economy"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="border-l-4 border-blue-500 pl-3">
                      <p className="text-xs text-gray-500">Departure / 출발</p>
                      <p className="font-bold">{viewTicket.returnDepartureCode}</p>
                      <p className="text-sm">{viewTicket.returnDepartureAirport}</p>
                      <p className="text-sm">{viewTicket.returnDepartureDate} {viewTicket.returnDepartureTime}</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-3">
                      <p className="text-xs text-gray-500">Arrival / 도착</p>
                      <p className="font-bold">{viewTicket.returnArrivalCode}</p>
                      <p className="text-sm">{viewTicket.returnArrivalAirport}</p>
                      <p className="text-sm">{viewTicket.returnArrivalDate} {viewTicket.returnArrivalTime}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-400 border-t pt-3">
                This is an electronic ticket. No paper ticket will be issued. / 전자 항공권입니다. 종이 티켓은 발행되지 않습니다.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
