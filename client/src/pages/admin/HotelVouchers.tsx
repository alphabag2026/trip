import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Upload, Eye, Trash2, MapPin, Phone, Calendar, Hotel, Globe, FileText, Image } from "lucide-react";
import CsvBulkUpload from "@/components/CsvBulkUpload";
import { useTranslation } from "react-i18next";

const VOUCHER_CSV_COLUMNS = [
  { key: "hotelName", label: "호텔명 (영문)", required: true },
  { key: "hotelAddress", label: "호텔 주소 (영문)", required: true },
  { key: "hotelNameLocal", label: "호텔명 (현지어)" },
  { key: "hotelAddressLocal", label: "호텔 주소 (현지어)" },
  { key: "hotelPhone", label: "전화번호" },
  { key: "hotelLatitude", label: "위도" },
  { key: "hotelLongitude", label: "경도" },
  { key: "guestName", label: "투숙객 이름" },
  { key: "roomType", label: "객실 유형" },
  { key: "checkInDate", label: "체크인 날짜 (YYYY-MM-DD)" },
  { key: "checkOutDate", label: "체크아웃 날짜 (YYYY-MM-DD)" },
  { key: "bookingId", label: "예약 ID" },
  { key: "specialRequests", label: "특별 요청" },
  { key: "localLanguage", label: "현지 언어 코드 (vi/th/ja 등)" },
];

export default function HotelVouchers() {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const { data: vouchers, isLoading } = trpc.hotelVoucher.listAll.useQuery();
  const createMutation = trpc.hotelVoucher.create.useMutation({
    onSuccess: () => { utils.hotelVoucher.listAll.invalidate(); setCreateOpen(false); resetForm(); toast.success(t("admin.hotelVouchers.t58", "호텔 바우처가 생성되었습니다")); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.hotelVoucher.delete.useMutation({
    onSuccess: () => { utils.hotelVoucher.listAll.invalidate(); toast.success(t("admin.hotelVouchers.t59", "삭제되었습니다")); },
    onError: (e) => toast.error(e.message),
  });
  const bulkAssignMutation = trpc.hotelVoucher.bulkAssign.useMutation({
    onSuccess: () => { utils.hotelVoucher.listAll.invalidate(); },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [viewVoucher, setViewVoucher] = useState<any>(null);
  const [form, setForm] = useState({
    hotelName: "", hotelNameLocal: "", hotelAddress: "", hotelAddressLocal: "",
    hotelPhone: "", hotelLatitude: "", hotelLongitude: "",
    bookingId: "", guestName: "", roomType: "", roomCount: 1, guestsPerRoom: 1,
    checkInDate: "", checkInTime: "14:00", checkOutDate: "", checkOutTime: "12:00",
    includeMeals: false, specialRequests: "", includes: "", cancellationPolicy: "",
    checkInInstructions: "", voucherFileUrl: "", localLanguage: "", localCurrency: "",
  });

  const resetForm = () => setForm({
    hotelName: "", hotelNameLocal: "", hotelAddress: "", hotelAddressLocal: "",
    hotelPhone: "", hotelLatitude: "", hotelLongitude: "",
    bookingId: "", guestName: "", roomType: "", roomCount: 1, guestsPerRoom: 1,
    checkInDate: "", checkInTime: "14:00", checkOutDate: "", checkOutTime: "12:00",
    includeMeals: false, specialRequests: "", includes: "", cancellationPolicy: "",
    checkInInstructions: "", voucherFileUrl: "", localLanguage: "", localCurrency: "",
  });

  const handleCreate = () => {
    if (!form.hotelName || !form.hotelAddress) {
      toast.error(t("admin.hotelVouchers.t60", "호텔명과 주소는 필수입니다"));
      return;
    }
    createMutation.mutate({
      ...form,
      roomCount: Number(form.roomCount),
      guestsPerRoom: Number(form.guestsPerRoom),
      voucherFileType: form.voucherFileUrl?.endsWith(".pdf") ? "pdf" : "image",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch("/api/trpc/upload", { method: "POST", body: formData });
      if (resp.ok) {
        const data = await resp.json();
        setForm(f => ({ ...f, voucherFileUrl: data.url }));
        toast.success(t("admin.hotelVouchers.t61", "파일이 업로드되었습니다"));
      }
    } catch {
      toast.error(t("admin.hotelVouchers.t62", "업로드 실패"));
    }
  };

  const handleCsvBulkUpload = async (rows: Record<string, any>[]) => {
    const result = await bulkAssignMutation.mutateAsync({
      rows: rows.map(r => ({
        hotelName: r.hotelName || "",
        hotelAddress: r.hotelAddress || "",
        hotelNameLocal: r.hotelNameLocal || undefined,
        hotelAddressLocal: r.hotelAddressLocal || undefined,
        hotelPhone: r.hotelPhone || undefined,
        hotelLatitude: r.hotelLatitude || undefined,
        hotelLongitude: r.hotelLongitude || undefined,
        guestName: r.guestName || undefined,
        roomType: r.roomType || undefined,
        checkInDate: r.checkInDate || undefined,
        checkOutDate: r.checkOutDate || undefined,
        bookingId: r.bookingId || undefined,
        specialRequests: r.specialRequests || undefined,
        localLanguage: r.localLanguage || undefined,
        userId: r.userId ? Number(r.userId) : undefined,
        meetupId: r.meetupId ? Number(r.meetupId) : undefined,
      })),
    });
    return result;
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">{t("admin.hotelVouchers.t1", "로딩 중...")}</div>;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.hotelVouchers.t2", "호텔 바우처 관리")}</h1>
          <p className="text-muted-foreground">{t("admin.hotelVouchers.t3", "호텔 예약확인서를 업로드하고 참석자에게 배포합니다")}</p>
        </div>
        <div className="flex gap-2">
          <CsvBulkUpload
            title="호텔 바우처 CSV 일괄 배정"
            description="CSV 파일을 업로드하여 호텔 바우처를 일괄 생성합니다. 각 행이 하나의 바우처로 생성됩니다."
            columns={VOUCHER_CSV_COLUMNS}
            onUpload={handleCsvBulkUpload}
            templateFileName="hotel_voucher_template.csv"
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />{t("admin.hotelVouchers.t4", "바우처 생성")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("admin.hotelVouchers.t5", "호텔 바우처 생성")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                {/* 호텔 기본 정보 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("admin.hotelVouchers.t6", "호텔명 (영문) *")}</Label>
                    <Input value={form.hotelName} onChange={e => setForm(f => ({ ...f, hotelName: e.target.value }))} placeholder="Yen Nam Hotel" />
                  </div>
                  <div>
                    <Label>{t("admin.hotelVouchers.t7", "호텔명 (현지어)")}</Label>
                    <Input value={form.hotelNameLocal} onChange={e => setForm(f => ({ ...f, hotelNameLocal: e.target.value }))} placeholder="Khách sạn Yên Nam" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("admin.hotelVouchers.t8", "주소 (영문) *")}</Label>
                    <Input value={form.hotelAddress} onChange={e => setForm(f => ({ ...f, hotelAddress: e.target.value }))} placeholder="219 Nguyen Trong Tuyen..." />
                  </div>
                  <div>
                    <Label>{t("admin.hotelVouchers.t9", "주소 (현지어)")}</Label>
                    <Input value={form.hotelAddressLocal} onChange={e => setForm(f => ({ ...f, hotelAddressLocal: e.target.value }))} placeholder="219 Nguyễn Trọng Tuyển..." />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>{t("admin.hotelVouchers.t10", "전화번호")}</Label>
                    <Input value={form.hotelPhone} onChange={e => setForm(f => ({ ...f, hotelPhone: e.target.value }))} placeholder="+84-909036229" />
                  </div>
                  <div>
                    <Label>{t("admin.hotelVouchers.t11", "위도")}</Label>
                    <Input value={form.hotelLatitude} onChange={e => setForm(f => ({ ...f, hotelLatitude: e.target.value }))} placeholder="10.7956" />
                  </div>
                  <div>
                    <Label>{t("admin.hotelVouchers.t12", "경도")}</Label>
                    <Input value={form.hotelLongitude} onChange={e => setForm(f => ({ ...f, hotelLongitude: e.target.value }))} placeholder="106.6722" />
                  </div>
                </div>
                {/* 예약 정보 */}
                <div className="border-t pt-3">
                  <h3 className="font-semibold mb-2">{t("admin.hotelVouchers.t13", "예약 정보")}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>{t("admin.hotelVouchers.t14", "예약 ID")}</Label>
                      <Input value={form.bookingId} onChange={e => setForm(f => ({ ...f, bookingId: e.target.value }))} placeholder="1339932759" />
                    </div>
                    <div>
                      <Label>{t("admin.hotelVouchers.t15", "투숙객 이름")}</Label>
                      <Input value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{t("admin.hotelVouchers.t16", "객실 유형")}</Label>
                      <Input value={form.roomType} onChange={e => setForm(f => ({ ...f, roomType: e.target.value }))} placeholder="Deluxe Double Room" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    <div>
                      <Label>{t("admin.hotelVouchers.t17", "체크인 날짜")}</Label>
                      <Input type="date" value={form.checkInDate} onChange={e => setForm(f => ({ ...f, checkInDate: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{t("admin.hotelVouchers.t18", "체크인 시간")}</Label>
                      <Input type="time" value={form.checkInTime} onChange={e => setForm(f => ({ ...f, checkInTime: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{t("admin.hotelVouchers.t19", "체크아웃 날짜")}</Label>
                      <Input type="date" value={form.checkOutDate} onChange={e => setForm(f => ({ ...f, checkOutDate: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{t("admin.hotelVouchers.t20", "체크아웃 시간")}</Label>
                      <Input type="time" value={form.checkOutTime} onChange={e => setForm(f => ({ ...f, checkOutTime: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <Label>{t("admin.hotelVouchers.t21", "객실 수")}</Label>
                      <Input type="number" value={form.roomCount} onChange={e => setForm(f => ({ ...f, roomCount: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>{t("admin.hotelVouchers.t22", "객실당 인원")}</Label>
                      <Input type="number" value={form.guestsPerRoom} onChange={e => setForm(f => ({ ...f, guestsPerRoom: Number(e.target.value) }))} />
                    </div>
                  </div>
                </div>
                {/* 추가 정보 */}
                <div className="border-t pt-3">
                  <h3 className="font-semibold mb-2">{t("admin.hotelVouchers.t23", "추가 정보")}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{t("admin.hotelVouchers.t24", "포함 사항")}</Label>
                      <Input value={form.includes} onChange={e => setForm(f => ({ ...f, includes: e.target.value }))} placeholder={t("admin.hotelVouchers.t63", "Free WiFi, 조식 포함")} />
                    </div>
                    <div>
                      <Label>{t("admin.hotelVouchers.t25", "특별 요청")}</Label>
                      <Input value={form.specialRequests} onChange={e => setForm(f => ({ ...f, specialRequests: e.target.value }))} placeholder="1 king + 2 single bed" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label>{t("admin.hotelVouchers.t26", "취소 정책")}</Label>
                    <Textarea value={form.cancellationPolicy} onChange={e => setForm(f => ({ ...f, cancellationPolicy: e.target.value }))} placeholder={t("admin.hotelVouchers.t64", "환불 불가 / Non-refundable")} rows={2} />
                  </div>
                  <div className="mt-3">
                    <Label>{t("admin.hotelVouchers.t27", "체크인 안내")}</Label>
                    <Textarea value={form.checkInInstructions} onChange={e => setForm(f => ({ ...f, checkInInstructions: e.target.value }))} rows={2} />
                  </div>
                </div>
                {/* 현지어 & 파일 */}
                <div className="border-t pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{t("admin.hotelVouchers.t28", "현지 언어 코드")}</Label>
                      <Select value={form.localLanguage} onValueChange={v => setForm(f => ({ ...f, localLanguage: v }))}>
                        <SelectTrigger><SelectValue placeholder={t("admin.hotelVouchers.t65", "선택")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vi">{t("admin.hotelVouchers.t29", "베트남어 (vi)")}</SelectItem>
                          <SelectItem value="th">{t("admin.hotelVouchers.t30", "태국어 (th)")}</SelectItem>
                          <SelectItem value="ja">{t("admin.hotelVouchers.t31", "일본어 (ja)")}</SelectItem>
                          <SelectItem value="zh">{t("admin.hotelVouchers.t32", "중국어 (zh)")}</SelectItem>
                          <SelectItem value="ko">{t("admin.hotelVouchers.t33", "한국어 (ko)")}</SelectItem>
                          <SelectItem value="en">{t("admin.hotelVouchers.t34", "영어 (en)")}</SelectItem>
                          <SelectItem value="id">{t("admin.hotelVouchers.t35", "인도네시아어 (id)")}</SelectItem>
                          <SelectItem value="ms">{t("admin.hotelVouchers.t36", "말레이어 (ms)")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("admin.hotelVouchers.t37", "현지 통화")}</Label>
                      <Input value={form.localCurrency} onChange={e => setForm(f => ({ ...f, localCurrency: e.target.value }))} placeholder="VND / THB / JPY" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label>{t("admin.hotelVouchers.t38", "바우처 파일 (이미지/PDF)")}</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={form.voucherFileUrl} onChange={e => setForm(f => ({ ...f, voucherFileUrl: e.target.value }))} placeholder={t("admin.hotelVouchers.t66", "URL 직접 입력 또는 파일 업로드")} className="flex-1" />
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                        <Button variant="outline" type="button" asChild><span><Upload className="w-4 h-4 mr-1" />{t("admin.hotelVouchers.t39", "업로드")}</span></Button>
                      </label>
                    </div>
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "생성 중..." : "바우처 생성"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{vouchers?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">{t("admin.hotelVouchers.t40", "전체 바우처")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{vouchers?.filter(v => v.status === "active").length ?? 0}</div>
            <div className="text-sm text-muted-foreground">{t("admin.hotelVouchers.t41", "활성")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-orange-600">{vouchers?.filter(v => v.voucherFileUrl).length ?? 0}</div>
            <div className="text-sm text-muted-foreground">{t("admin.hotelVouchers.t42", "파일 첨부")}</div>
          </CardContent>
        </Card>
      </div>

      {/* 바우처 목록 */}
      <div className="grid gap-4">
        {(!vouchers || vouchers.length === 0) ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">{t("admin.hotelVouchers.t43", "아직 등록된 호텔 바우처가 없습니다")}</CardContent></Card>
        ) : vouchers.map(v => (
          <Card key={v.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Hotel className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg">{v.hotelName}</h3>
                    {v.hotelNameLocal && <span className="text-sm text-muted-foreground">/ {v.hotelNameLocal}</span>}
                    <Badge variant={v.status === "active" ? "default" : "secondary"}>{v.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{v.hotelAddress}</span>
                  </div>
                  {v.hotelAddressLocal && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <Globe className="w-3.5 h-3.5" />
                      <span>{v.hotelAddressLocal}</span>
                    </div>
                  )}
                  <div className="flex gap-4 text-sm mt-2">
                    {v.guestName && <span><strong>{t("admin.hotelVouchers.t44", "투숙객:")}</strong> {v.guestName}</span>}
                    {v.bookingId && <span><strong>{t("admin.hotelVouchers.t45", "예약ID:")}</strong> {v.bookingId}</span>}
                    {v.roomType && <span><strong>{t("admin.hotelVouchers.t46", "객실:")}</strong> {v.roomType}</span>}
                  </div>
                  <div className="flex gap-4 text-sm mt-1">
                    {v.checkInDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-green-600" />
                        체크인: {v.checkInDate} {v.checkInTime}
                      </span>
                    )}
                    {v.checkOutDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-red-600" />
                        체크아웃: {v.checkOutDate} {v.checkOutTime}
                      </span>
                    )}
                  </div>
                  {v.voucherFileUrl && (
                    <div className="flex items-center gap-1 text-sm mt-2 text-blue-600">
                      {v.voucherFileType === "pdf" ? <FileText className="w-3.5 h-3.5" /> : <Image className="w-3.5 h-3.5" />}
                      <span>{t("admin.hotelVouchers.t47", "파일 첨부됨")}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewVoucher(v)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => {
                    if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: v.id });
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 바우처 상세 보기 다이얼로그 */}
      <Dialog open={!!viewVoucher} onOpenChange={() => setViewVoucher(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.hotelVouchers.t48", "Hotel Voucher / 호텔 예약확인서")}</DialogTitle>
          </DialogHeader>
          {viewVoucher && (
            <div className="space-y-4 bg-white text-black p-6 rounded-lg border">
              {/* Traveloka 스타일 바우처 */}
              <div className="border-b pb-4">
                <h2 className="text-xl font-bold">Hotel Voucher</h2>
                {viewVoucher.localLanguage && <p className="text-sm text-gray-500">Phiếu thanh toán khách sạn</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Booking ID</p>
                  <p className="font-bold text-lg">{viewVoucher.bookingId || "-"}</p>
                </div>
                <div>
                  <p className="font-bold text-lg">{viewVoucher.hotelName}</p>
                  {viewVoucher.hotelNameLocal && <p className="text-sm text-gray-500">{viewVoucher.hotelNameLocal}</p>}
                  <p className="text-sm">{viewVoucher.hotelAddress}</p>
                  {viewVoucher.hotelAddressLocal && <p className="text-sm text-gray-500">{viewVoucher.hotelAddressLocal}</p>}
                  {viewVoucher.hotelPhone && (
                    <p className="text-sm flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" /> {viewVoucher.hotelPhone}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-3">
                <div>
                  <p className="text-xs text-gray-500">{t("admin.hotelVouchers.t49", "Check-in / 체크인")}</p>
                  <p className="font-semibold">{viewVoucher.checkInDate}</p>
                  <p className="text-sm text-green-600">{viewVoucher.checkInTime}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t("admin.hotelVouchers.t50", "Check-out / 체크아웃")}</p>
                  <p className="font-semibold">{viewVoucher.checkOutDate}</p>
                  <p className="text-sm text-blue-600">{viewVoucher.checkOutTime}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">{t("admin.hotelVouchers.t51", "Booking Details / 예약 상세")}</h3>
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left border">Room</th>
                      <th className="p-2 text-left border">Guest</th>
                      <th className="p-2 text-left border">Guests/Room</th>
                      <th className="p-2 text-left border">Meals</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border">{viewVoucher.roomType || "-"}</td>
                      <td className="p-2 border">{viewVoucher.guestName || "-"}</td>
                      <td className="p-2 border">{viewVoucher.guestsPerRoom} Adult(s)</td>
                      <td className="p-2 border">{viewVoucher.includeMeals ? "Yes" : "No"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {(viewVoucher.includes || viewVoucher.specialRequests) && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {viewVoucher.includes && <div><strong>Includes:</strong> {viewVoucher.includes}</div>}
                  {viewVoucher.specialRequests && <div><strong>Special request:</strong> {viewVoucher.specialRequests}</div>}
                </div>
              )}
              {viewVoucher.cancellationPolicy && (
                <div className="text-sm border-t pt-3">
                  <strong>{t("admin.hotelVouchers.t52", "Cancellation Policy / 취소 정책:")}</strong>
                  <p className="text-gray-600 mt-1">{viewVoucher.cancellationPolicy}</p>
                </div>
              )}
              {viewVoucher.checkInInstructions && (
                <div className="text-sm border-t pt-3">
                  <strong>{t("admin.hotelVouchers.t53", "Check-in Instructions / 체크인 안내:")}</strong>
                  <p className="text-gray-600 mt-1">{viewVoucher.checkInInstructions}</p>
                </div>
              )}
              {viewVoucher.voucherFileUrl && (
                <div className="border-t pt-3">
                  <strong className="text-sm">{t("admin.hotelVouchers.t54", "첨부 파일:")}</strong>
                  {viewVoucher.voucherFileType === "pdf" ? (
                    <a href={viewVoucher.voucherFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm ml-2">{t("admin.hotelVouchers.t55", "PDF 보기")}</a>
                  ) : (
                    <img src={viewVoucher.voucherFileUrl} alt="Voucher" className="mt-2 max-w-full rounded border" />
                  )}
                </div>
              )}
              {/* 구글맵 / 그랩 연동 */}
              {(viewVoucher.hotelLatitude && viewVoucher.hotelLongitude) && (
                <div className="flex gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps?q=${viewVoucher.hotelLatitude},${viewVoucher.hotelLongitude}`, "_blank")}>
                    <MapPin className="w-4 h-4 mr-1" />{t("admin.hotelVouchers.t56", "구글맵")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(`https://grab.onelink.me/2695613898?af_dp=grab://open?screenType=BOOKING&dropOffLatitude=${viewVoucher.hotelLatitude}&dropOffLongitude=${viewVoucher.hotelLongitude}`, "_blank")}>
                    {t("admin.hotelVouchers.t57", "그랩")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
