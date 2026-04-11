import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Eye, ScanLine, Trash2, FileSpreadsheet, CheckCircle2, Clock, Luggage, UtensilsCrossed, Wine, Cigarette, User, Phone, MessageSquare, Wallet, MapPin, Plane, Hotel, Car, Calendar, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ExcelDownloadButton, fetchTrpcQuery } from "@/components/ExcelButtons";

export default function AdminRegistrations() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedReg, setSelectedReg] = useState<any>(null);
  // 참가자 상세 프로필 다이얼로그
  const [profileReg, setProfileReg] = useState<any>(null);

  const { data: regs, refetch } = trpc.registration.list.useQuery({
    search: search || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: ocrData } = trpc.registration.exportPassportOcr.useQuery({});

  const updateMutation = trpc.registration.update.useMutation({
    onSuccess: () => { refetch(); toast.success(t("admin.registrations.t31", "상태가 업데이트되었습니다.")); },
  });
  const deleteMutation = trpc.registration.delete.useMutation({
    onSuccess: () => { refetch(); setProfileReg(null); toast.success(t("admin.registrations.t32", "삭제되었습니다.")); },
  });
  const ocrMutation = trpc.registration.ocrPassport.useMutation({
    onSuccess: () => { refetch(); toast.success(t("admin.registrations.t33", "OCR 처리 완료")); },
  });

  const handleExport = () => {
    if (!regs || regs.length === 0) return;
    const headers = ["ID",t("admin.registrations.name"),t("admin.registrations.phone"),"메신저ID",t("admin.registrations.type"),"분류",t("admin.registrations.status"),"추천자","팀","지갑","비고","출발희망시간대","식사선호","알레르기","음주","흡연","항공확정","숙소확정","픽업확정","수화물신청","수화물개수","수화물무게","수화물메모","신청일"];
    const rows = regs.map((r: any) => [
      r.id, r.name, r.phone, r.messengerId,
      r.locationType === "overseas" ? t("admin.registrations.overseas") : t("admin.registrations.domestic"),
      r.category, r.status, r.referrerName || "", r.teamName || "",
      r.walletAddress || "", r.notes || "",
      r.preferredDepartureTime || "",
      r.mealPreference || "",
      r.allergies || "",
      r.drinkAlcohol === "yes" ? "음주" : r.drinkAlcohol === "sometimes" ? "가끔" : r.drinkAlcohol === "no" ? "비음주" : "",
      r.smoking === "yes" ? "흡연" : r.smoking === "no" ? "비흡연" : "",
      r.flightConfirmed ? "Y" : "N",
      r.accommodationConfirmed ? "Y" : "N",
      r.pickupConfirmed ? "Y" : "N",
      r.checkedBagRequest ? "Y" : "N",
      r.checkedBagCount || 0,
      r.checkedBagWeight || "",
      r.checkedBagNotes || "",
      new Date(r.createdAt).toLocaleDateString("ko-KR"),
    ]);
    const bom = "\uFEFF";
    const csv = bom + [headers.join(","), ...rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `registrations_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(t("admin.registrations.t34", "CSV 파일이 다운로드되었습니다."));
  };

  const handleExportPassportOcr = () => {
    if (!ocrData || ocrData.length === 0) { toast.error(t("admin.registrations.t35", "OCR 데이터가 없습니다.")); return; }
    const headers = ["신청ID",t("admin.registrations.name"),t("admin.registrations.phone"),t("admin.registrations.messenger"),"팀","분류",t("admin.registrations.status"),"여권이름","여권번호","국적","생년월일","만료일","성별","발급국"];
    const rows = ocrData.map((r: any) => [
      r.registrationId, r.name, r.phone, r.messengerId, r.teamName,
      r.category, r.status, r.passportFullName, r.passportNumber,
      r.nationality, r.dateOfBirth, r.expiryDate, r.gender, r.issuingCountry,
    ]);
    const bom = "\uFEFF";
    const csv = bom + [headers.join(","), ...rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `passport_ocr_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(t("admin.registrations.t36", "여권 OCR 데이터가 다운로드되었습니다."));
  };

  const categoryLabels: Record<string, string> = {
    meetup: "밋업", pre_visit: "사전방문", event: "이벤트", meeting: "미팅", other: "기타"
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-500",
    approved: "bg-green-500/20 text-green-500",
    rejected: "bg-red-500/20 text-red-500",
    completed: "bg-blue-500/20 text-blue-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("admin.registrations.title")}</h1>
        <div className="flex gap-2 flex-wrap">
          <ExcelDownloadButton
            icon="template"
            fetchData={() => fetchTrpcQuery("excelExport.attendeeTemplate")}
            label={t("admin.excel.attendeeTemplate", "참가자 서식")}
          />
          <ExcelDownloadButton
            icon="export"
            fetchData={() => fetchTrpcQuery("excelExport.exportAttendees")}
            label={t("admin.excel.exportAttendees", "참가자 내보내기")}
          />
          <Button variant="outline" size="sm" onClick={handleExportPassportOcr}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />{t("admin.registrations.t1", "여권 OCR 엑셀")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />{t("admin.registrations.t2", "전체 엑셀")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t("admin.registrations.t37", "이름, 전화번호, 메신저 검색...")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("admin.registrations.t38", "분류")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.registrations.t3", "전체 분류")}</SelectItem>
            <SelectItem value="meetup">{t("admin.registrations.t4", "밋업")}</SelectItem>
            <SelectItem value="pre_visit">{t("admin.registrations.t5", "사전방문")}</SelectItem>
            <SelectItem value="event">{t("admin.registrations.t6", "이벤트")}</SelectItem>
            <SelectItem value="meeting">{t("admin.registrations.t7", "미팅")}</SelectItem>
            <SelectItem value="other">{t("admin.registrations.t8", "기타")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("admin.registrations.status")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.registrations.t9", "전체 상태")}</SelectItem>
            <SelectItem value="pending">{t("admin.registrations.pending")}</SelectItem>
            <SelectItem value="approved">{t("admin.registrations.approve")}</SelectItem>
            <SelectItem value="rejected">{t("admin.registrations.reject")}</SelectItem>
            <SelectItem value="completed">{t("admin.registrations.completed")}</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="w-[160px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder={t("admin.registrations.t39", "시작일")} />
        <Input type="date" className="w-[160px]" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder={t("admin.registrations.t40", "종료일")} />
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-4">{t("admin.registrations.name")}</th>
                  <th className="text-left py-3 px-4">{t("admin.registrations.type")}</th>
                  <th className="text-left py-3 px-4">{t("admin.registrations.t10", "분류")}</th>
                  <th className="text-left py-3 px-4">{t("admin.registrations.phone")}</th>
                  <th className="text-left py-3 px-4">{t("admin.registrations.messenger")}</th>
                  <th className="text-left py-3 px-4">{t("admin.registrations.t11", "추천자")}</th>
                  <th className="text-left py-3 px-4">{t("admin.registrations.status")}</th>
                  <th className="text-left py-3 px-4">{t("admin.registrations.t12", "배치확정")}</th>
                  <th className="text-left py-3 px-4">{t("admin.registrations.t13", "출발시간")}</th>
                  <th className="text-left py-3 px-4">{t("admin.registrations.t14", "수화물")}</th>
                  <th className="text-left py-3 px-4">{t("admin.registrations.t15", "여권")}</th>
                  <th className="text-left py-3 px-4">{t("admin.registrations.t16", "작업")}</th>
                </tr>
              </thead>
              <tbody>
                {regs?.map((r: any) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors"
                    onClick={() => setProfileReg(r)}
                  >
                    <td className="py-3 px-4 font-medium">
                      <span className="text-primary hover:underline">{r.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded ${r.locationType === "overseas" ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400"}`}>
                        {r.locationType === "overseas" ? t("admin.registrations.overseas") : t("admin.registrations.domestic")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{categoryLabels[r.category] || r.category}</td>
                    <td className="py-3 px-4">{r.phone}</td>
                    <td className="py-3 px-4">{r.messengerId}</td>
                    <td className="py-3 px-4 text-muted-foreground">{r.referrerName || "-"}</td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      <Select value={r.status} onValueChange={v => updateMutation.mutate({ id: r.id, status: v as any })}>
                        <SelectTrigger className="h-7 w-[90px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t("admin.registrations.pending")}</SelectItem>
                          <SelectItem value="approved">{t("admin.registrations.approve")}</SelectItem>
                          <SelectItem value="rejected">{t("admin.registrations.reject")}</SelectItem>
                          <SelectItem value="completed">{t("admin.registrations.completed")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <span title={t("admin.registrations.t41", "항공")}>{r.flightConfirmed ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Clock className="h-4 w-4 text-muted-foreground" />}</span>
                        <span title={t("admin.registrations.t42", "숙소")}>{r.accommodationConfirmed ? <CheckCircle2 className="h-4 w-4 text-blue-400" /> : <Clock className="h-4 w-4 text-muted-foreground" />}</span>
                        <span title={t("admin.registrations.t43", "픽업")}>{r.pickupConfirmed ? <CheckCircle2 className="h-4 w-4 text-amber-400" /> : <Clock className="h-4 w-4 text-muted-foreground" />}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {r.preferredDepartureTime ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 flex items-center gap-1 w-fit">
                          <Clock className="h-3 w-3" />{r.preferredDepartureTime.replace(/ \(.*\)/, "")}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      {r.checkedBagRequest ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1 w-fit">
                          <Luggage className="h-3 w-3" />{r.checkedBagCount || 0}개
                        </span>
                      ) : <span className="text-xs text-muted-foreground">-</span>}
                    </td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      {r.passportImageUrl ? (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedReg(r)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => ocrMutation.mutate({ registrationId: r.id })} disabled={ocrMutation.isPending}>
                            <ScanLine className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">-</span>}
                    </td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                        if (confirm("정말 삭제하시겠습니까?")) deleteMutation.mutate({ id: r.id });
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!regs || regs.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">{t("admin.registrations.t17", "등록된 신청이 없습니다.")}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Participant Detail Profile Dialog */}
      <Dialog open={!!profileReg} onOpenChange={open => { if (!open) setProfileReg(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            참가자 상세 프로필
          </DialogTitle></DialogHeader>
          {profileReg && (
            <div className="space-y-4">
              {/* 기본 정보 */}
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold">{profileReg.name}</h3>
                  <Badge className={statusColors[profileReg.status] || "bg-gray-500/20 text-gray-500"}>
                    {profileReg.status === "pending" ? "대기" : profileReg.status === "approved" ? "승인" : profileReg.status === "rejected" ? "거절" : "완료"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground w-20">전화번호</span>
                    <span className="font-medium">{profileReg.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground w-20">메신저</span>
                    <span className="font-medium">{profileReg.messengerId}</span>
                  </div>
                  {profileReg.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground w-20">이메일</span>
                      <span className="font-medium">{profileReg.email}</span>
                    </div>
                  )}
                  {profileReg.walletAddress && (
                    <div className="flex items-center gap-2">
                      <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground w-20">지갑</span>
                      <span className="font-medium text-xs font-mono truncate">{profileReg.walletAddress}</span>
                    </div>
                  )}
                  {profileReg.referrerName && (
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground w-20">추천자</span>
                      <span className="font-medium">{profileReg.referrerName}</span>
                    </div>
                  )}
                  {profileReg.teamName && (
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground w-20">팀</span>
                      <span className="font-medium">{profileReg.teamName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 일정 정보 */}
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-500" />일정 및 유형
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">유형</span>
                    <p className="font-medium">
                      <span className={`text-xs px-2 py-0.5 rounded ${profileReg.locationType === "overseas" ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400"}`}>
                        {profileReg.locationType === "overseas" ? "해외" : "내륙"}
                      </span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">{categoryLabels[profileReg.category] || profileReg.category}</span>
                    </p>
                  </div>
                  {profileReg.scheduleStart && (
                    <div>
                      <span className="text-muted-foreground text-xs">일정</span>
                      <p className="font-medium text-xs">
                        {new Date(profileReg.scheduleStart).toLocaleDateString("ko-KR")}
                        {profileReg.scheduleEnd && ` ~ ${new Date(profileReg.scheduleEnd).toLocaleDateString("ko-KR")}`}
                      </p>
                    </div>
                  )}
                  {profileReg.preferredDepartureTime && (
                    <div>
                      <span className="text-muted-foreground text-xs">출발 희망</span>
                      <p className="font-medium text-xs">{profileReg.preferredDepartureTime}</p>
                    </div>
                  )}
                  {profileReg.roommatePreference && (
                    <div>
                      <span className="text-muted-foreground text-xs">룸메이트</span>
                      <p className="font-medium text-xs">{profileReg.roommatePreference}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 배치 확정 상태 */}
              <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />배치 확정 상태
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Plane className={`h-4 w-4 ${profileReg.flightConfirmed ? "text-green-500" : "text-muted-foreground"}`} />
                    <span className={profileReg.flightConfirmed ? "text-green-500 font-medium" : "text-muted-foreground"}>
                      항공 {profileReg.flightConfirmed ? "확정" : "미확정"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Hotel className={`h-4 w-4 ${profileReg.accommodationConfirmed ? "text-blue-500" : "text-muted-foreground"}`} />
                    <span className={profileReg.accommodationConfirmed ? "text-blue-500 font-medium" : "text-muted-foreground"}>
                      숙소 {profileReg.accommodationConfirmed ? "확정" : "미확정"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Car className={`h-4 w-4 ${profileReg.pickupConfirmed ? "text-amber-500" : "text-muted-foreground"}`} />
                    <span className={profileReg.pickupConfirmed ? "text-amber-500 font-medium" : "text-muted-foreground"}>
                      픽업 {profileReg.pickupConfirmed ? "확정" : "미확정"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 교통수단 정보 */}
              {profileReg.transportType && (
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <Plane className="h-4 w-4 text-indigo-500" />교통수단
                  </h4>
                  <div className="text-sm">
                    <span className="text-muted-foreground">교통수단: </span>
                    <span className="font-medium">
                      {profileReg.transportType === "flight" ? "비행기" : profileReg.transportType === "ktx" ? "고속철도" : profileReg.transportType === "none" ? "없음" : "기타"}
                    </span>
                    {profileReg.transportNotes && (
                      <p className="text-xs text-muted-foreground mt-1">{profileReg.transportNotes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 식사 및 생활 정보 */}
              {(profileReg.mealPreference || profileReg.allergies || profileReg.drinkAlcohol || profileReg.smoking) && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <UtensilsCrossed className="h-4 w-4 text-emerald-500" />식사 및 생활 정보
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {profileReg.mealPreference && (
                      <div>
                        <span className="text-muted-foreground text-xs">식사 선호</span>
                        <p className="font-medium">{profileReg.mealPreference}</p>
                      </div>
                    )}
                    {profileReg.allergies && (
                      <div>
                        <span className="text-muted-foreground text-xs">알레르기</span>
                        <p className="font-medium text-red-400">{profileReg.allergies}</p>
                      </div>
                    )}
                    {profileReg.drinkAlcohol && (
                      <div className="flex items-center gap-1">
                        <Wine className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{profileReg.drinkAlcohol === "yes" ? "음주" : profileReg.drinkAlcohol === "sometimes" ? "가끔 음주" : "비음주"}</span>
                      </div>
                    )}
                    {profileReg.smoking && (
                      <div className="flex items-center gap-1">
                        <Cigarette className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{profileReg.smoking === "yes" ? "흡연" : "비흡연"}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 수화물 정보 */}
              {profileReg.checkedBagRequest && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <Luggage className="h-4 w-4 text-amber-500" />위탁수화물
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">수량</span>
                      <p className="font-medium">{profileReg.checkedBagCount || 0}개</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">무게</span>
                      <p className="font-medium">{profileReg.checkedBagWeight || "-"}</p>
                    </div>
                    {profileReg.checkedBagNotes && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground text-xs">메모</span>
                        <p className="font-medium text-xs">{profileReg.checkedBagNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 숙소 정보 */}
              {(profileReg.hotelRoomNumber || profileReg.hotelFloor || profileReg.hotelNotes) && (
                <div className="bg-violet-500/5 border border-violet-500/10 rounded-lg p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <Hotel className="h-4 w-4 text-violet-500" />숙소 배정
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {profileReg.hotelRoomNumber && (
                      <div>
                        <span className="text-muted-foreground text-xs">방번호</span>
                        <p className="font-medium">{profileReg.hotelRoomNumber}</p>
                      </div>
                    )}
                    {profileReg.hotelFloor && (
                      <div>
                        <span className="text-muted-foreground text-xs">층</span>
                        <p className="font-medium">{profileReg.hotelFloor}층</p>
                      </div>
                    )}
                    {profileReg.hotelNotes && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground text-xs">메모</span>
                        <p className="font-medium text-xs">{profileReg.hotelNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 여권 OCR 정보 */}
              {profileReg.passportOcrData && (
                <div className="bg-secondary/50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2">여권 OCR 정보</h4>
                  <div className="grid grid-cols-2 gap-1.5 text-sm">
                    {Object.entries(profileReg.passportOcrData).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted-foreground text-xs">{k}</span>
                        <span className="text-xs font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 비고 */}
              {(profileReg.notes || profileReg.teamIntro) && (
                <div className="bg-secondary/30 rounded-lg p-4">
                  {profileReg.teamIntro && (
                    <div className="mb-2">
                      <span className="text-xs text-muted-foreground">팀 소개</span>
                      <p className="text-sm">{profileReg.teamIntro}</p>
                    </div>
                  )}
                  {profileReg.notes && (
                    <div>
                      <span className="text-xs text-muted-foreground">비고</span>
                      <p className="text-sm">{profileReg.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 신청일 */}
              <div className="text-xs text-muted-foreground text-right">
                신청일: {new Date(profileReg.createdAt).toLocaleDateString("ko-KR")} {new Date(profileReg.createdAt).toLocaleTimeString("ko-KR")}
              </div>

              {/* 하단 액션 버튼 */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Select
                  value={profileReg.status}
                  onValueChange={v => {
                    updateMutation.mutate({ id: profileReg.id, status: v as any });
                    setProfileReg({ ...profileReg, status: v });
                  }}
                >
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">대기</SelectItem>
                    <SelectItem value="approved">승인</SelectItem>
                    <SelectItem value="rejected">거절</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                  </SelectContent>
                </Select>
                {profileReg.passportImageUrl && (
                  <Button variant="outline" size="sm" onClick={() => { setSelectedReg(profileReg); setProfileReg(null); }}>
                    <Eye className="h-4 w-4 mr-1" />여권
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                  if (confirm("정말 삭제하시겠습니까?")) deleteMutation.mutate({ id: profileReg.id });
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Passport Detail Dialog */}
      {selectedReg && (
        <Dialog open={!!selectedReg} onOpenChange={() => setSelectedReg(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selectedReg.name} - 여권 정보</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {selectedReg.passportImageUrl && (
                <img src={selectedReg.passportImageUrl} alt="여권" className="w-full rounded-lg" />
              )}
              {selectedReg.preferredDepartureTime && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t("admin.registrations.t18", "출발 희망시간대")}</span><span className="font-medium">{selectedReg.preferredDepartureTime}</span></div>
                </div>
              )}
              {(selectedReg.mealPreference || selectedReg.allergies || selectedReg.drinkAlcohol || selectedReg.smoking) && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm space-y-1">
                  <h4 className="font-semibold flex items-center gap-2 mb-2"><UtensilsCrossed className="h-4 w-4 text-green-500" />{t("admin.registrations.t19", "식사 및 생활 정보")}</h4>
                  {selectedReg.mealPreference && <div className="flex justify-between"><span className="text-muted-foreground">{t("admin.registrations.t20", "식사 선호")}</span><span>{selectedReg.mealPreference}</span></div>}
                  {selectedReg.allergies && <div className="flex justify-between"><span className="text-muted-foreground">{t("admin.registrations.t21", "알레르기")}</span><span>{selectedReg.allergies}</span></div>}
                  {selectedReg.drinkAlcohol && <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Wine className="h-3 w-3" />{t("admin.registrations.t22", "음주")}</span><span>{selectedReg.drinkAlcohol === "yes" ? "음주" : selectedReg.drinkAlcohol === "sometimes" ? "가끔" : "비음주"}</span></div>}
                  {selectedReg.smoking && <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Cigarette className="h-3 w-3" />{t("admin.registrations.t23", "흡연")}</span><span>{selectedReg.smoking === "yes" ? "흡연" : "비흡연"}</span></div>}
                </div>
              )}
              {selectedReg.checkedBagRequest && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm space-y-1">
                  <h4 className="font-semibold flex items-center gap-2 mb-2"><Luggage className="h-4 w-4 text-amber-500" />{t("admin.registrations.t24", "위탁수화물 정보")}</h4>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("admin.registrations.t25", "수량")}</span><span>{selectedReg.checkedBagCount || 0}개</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("admin.registrations.t26", "무게")}</span><span>{selectedReg.checkedBagWeight || "-"}</span></div>
                  {selectedReg.checkedBagNotes && <div className="flex justify-between"><span className="text-muted-foreground">{t("admin.registrations.t27", "메모")}</span><span>{selectedReg.checkedBagNotes}</span></div>}
                </div>
              )}
              {selectedReg.passportOcrData && (
                <div className="bg-secondary/50 rounded-lg p-4 text-sm space-y-1">
                  <h4 className="font-semibold mb-2">{t("admin.registrations.t28", "OCR 추출 결과")}</h4>
                  {Object.entries(selectedReg.passportOcrData).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span>{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
              {!selectedReg.passportOcrData && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-3">{t("admin.registrations.t29", "OCR 데이터가 없습니다.")}</p>
                  <Button onClick={() => { ocrMutation.mutate({ registrationId: selectedReg.id }); setSelectedReg(null); }} disabled={ocrMutation.isPending}>
                    <ScanLine className="h-4 w-4 mr-2" />{t("admin.registrations.t30", "OCR 실행")}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
