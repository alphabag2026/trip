import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MapPin, Calendar, Luggage, Edit, Sparkles, Loader2, Wand2, CheckCircle2, Globe, Copy, Link2, Share2, ExternalLink, QrCode, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function AdminMeetups() {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [editBaggageId, setEditBaggageId] = useState<number | null>(null);
  const [editBaggageText, setEditBaggageText] = useState("");
  const { data: meetups, refetch } = trpc.meetup.list.useQuery();
  const createMutation = trpc.meetup.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); toast.success(t("admin.meetups.created")); }});
  const deleteMutation = trpc.meetup.delete.useMutation({ onSuccess: () => { refetch(); toast.success(t("admin.meetups.deleted")); }});
  const updateMutation = trpc.meetup.update.useMutation({ onSuccess: () => { refetch(); toast.success(t("admin.meetups.t38", "업데이트되었습니다.")); }});

  // QR 코드 다이얼로그 상태
  const [qrMeetup, setQrMeetup] = useState<any>(null);

  // AI 프롬프트 상태
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiMode, setShowAiMode] = useState(false);
  const [aiParsedData, setAiParsedData] = useState<any>(null);
  const aiParseMutation = trpc.aiMeetup.parsePrompt.useMutation({
    onSuccess: (result) => {
      if (result.success && result.data) {
        setAiParsedData(result.data);
        // 폼에 자동 채우기
        setForm({
          title: result.data.title || "",
          type: (result.data.type || "meetup") as any,
          locationType: (result.data.locationType || "domestic") as any,
          destinationCountry: result.data.destinationCountry || "",
          location: result.data.location || "",
          description: result.data.description || "",
          scheduleStart: result.data.scheduleStart || "",
          scheduleEnd: result.data.scheduleEnd || "",
          maxParticipants: result.data.maxParticipants || 0,
          baggageNotice: result.data.suggestedBaggageNotice || "초과화물은 직접부담할 수 있습니다.",
        });
        setShowAiMode(false);
        toast.success(t("admin.meetups.t39", "AI가 밋업 정보를 자동으로 채웠습니다!"));
      } else {
        toast.error(result.error || "AI 파싱에 실패했습니다.");
      }
    },
    onError: () => {
      toast.error(t("admin.meetups.t40", "AI 처리 중 오류가 발생했습니다."));
    },
  });

  const [form, setForm] = useState({
    title: "", type: "meetup" as const, locationType: "domestic" as const,
    destinationCountry: "", location: "", description: "",
    scheduleStart: "", scheduleEnd: "", maxParticipants: 0,
    baggageNotice: "초과화물은 직접부담할 수 있습니다.",
  });

  const typeLabels: Record<string, string> = {
    meetup: "밋업", pre_visit: "사전방문", event: "이벤트", meeting: "미팅", other: "기타"
  };

  const COUNTRY_FLAGS: Record<string, string> = {
    KR: "🇰🇷", CN: "🇨🇳", JP: "🇯🇵", TH: "🇹🇭", VN: "🇻🇳", SG: "🇸🇬", MY: "🇲🇾",
    ID: "🇮🇩", PH: "🇵🇭", US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", AU: "🇦🇺",
    IN: "🇮🇳", TW: "🇹🇼", HK: "🇭🇰", AE: "🇦🇪", TR: "🇹🇷", RU: "🇷🇺", BR: "🇧🇷",
    CA: "🇨🇦", MX: "🇲🇽", IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", CH: "🇨🇭", SE: "🇸🇪",
    PL: "🇵🇱", UA: "🇺🇦", NZ: "🇳🇿", KH: "🇰🇭", LA: "🇱🇦", MM: "🇲🇲", MN: "🇲🇳",
  };

  const handleAiParse = () => {
    if (!aiPrompt.trim()) {
      toast.error(t("admin.meetups.t41", "밋업 정보를 입력해주세요."));
      return;
    }
    aiParseMutation.mutate({ prompt: aiPrompt });
  };

  const handleOpenCreate = () => {
    setForm({
      title: "", type: "meetup" as const, locationType: "domestic" as const,
      destinationCountry: "", location: "", description: "",
      scheduleStart: "", scheduleEnd: "", maxParticipants: 0,
      baggageNotice: "초과화물은 직접부담할 수 있습니다.",
    });
    setAiParsedData(null);
    setAiPrompt("");
    setShowAiMode(false);
    setShowCreate(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.meetups.title")}</h1>
        <Button onClick={handleOpenCreate}><Plus className="h-4 w-4 mr-2" />{t("admin.meetups.t1", "새 밋업")}</Button>
      </div>

      <div className="grid gap-4">
        {meetups?.map((m: any) => (
          <Card key={m.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{m.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location || "미정"}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">{typeLabels[m.type]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${m.locationType === "overseas" ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400"}`}>
                      {m.locationType === "overseas" ? "해외" : "내륙"}
                    </span>
                  </div>
                  {m.scheduleStart && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(m.scheduleStart).toLocaleDateString("ko-KR")}
                      {m.scheduleEnd && ` ~ ${new Date(m.scheduleEnd).toLocaleDateString("ko-KR")}`}
                    </p>
                  )}
                  {/* 프로젝트 코드 & 초청국가 */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {m.projectCode && (
                      <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                        <Link2 className="h-2.5 w-2.5" />#{m.projectCode}
                      </Badge>
                    )}
                    {m.invitedCountries && Array.isArray(m.invitedCountries) && (m.invitedCountries as string[]).length > 0 && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-blue-500" />
                        {(m.invitedCountries as string[]).map((code: string) => (
                          <span key={code} className="text-xs">{COUNTRY_FLAGS[code] || code}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 공유 URL 복사 */}
                  {m.shareToken && (
                    <div className="flex items-center gap-2 mt-1">
                      <Share2 className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-[11px] text-muted-foreground font-mono truncate">
                        {window.location.origin}/m/{m.shareToken}
                      </span>
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/m/${m.shareToken}`);
                          toast.success(t("admin.meetups.t42", "공유 URL이 복사되었습니다"));
                        }}
                      ><Copy className="h-3 w-3" /></Button>
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5 shrink-0"
                        onClick={() => window.open(`/m/${m.shareToken}`, "_blank")}
                      ><ExternalLink className="h-3 w-3" /></Button>
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5 shrink-0"
                        onClick={() => setQrMeetup(m)}
                        title="QR 코드"
                      ><QrCode className="h-3 w-3" /></Button>
                    </div>
                  )}
                  {/* 수화물 공지 표시 */}
                  <div className="flex items-center gap-2 mt-2">
                    <Luggage className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-400/80 truncate">{m.baggageNotice || "초과화물은 직접부담할 수 있습니다."}</span>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                      onClick={() => { setEditBaggageId(m.id); setEditBaggageText(m.baggageNotice || "초과화물은 직접부담할 수 있습니다."); }}
                    ><Edit className="h-3 w-3" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Select value={m.status} onValueChange={v => updateMutation.mutate({ id: m.id, status: v as any })}>
                    <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t("admin.meetups.t2", "초안")}</SelectItem>
                      <SelectItem value="open">{t("admin.meetups.t3", "모집중")}</SelectItem>
                      <SelectItem value="closed">{t("admin.meetups.t4", "마감")}</SelectItem>
                      <SelectItem value="completed">{t("admin.meetups.t5", "완료")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                    if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: m.id });
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!meetups || meetups.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">{t("admin.meetups.empty")}</div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("admin.meetups.t6", "새 밋업 생성")}
          </DialogTitle></DialogHeader>

          {/* AI 프롬프트 입력 영역 */}
          <div className="space-y-3">
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="h-4 w-4 text-violet-500" />
                <Label className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                  {t("admin.meetups.t7", "AI 자동 입력")}
                </Label>
                <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-500">BETA</Badge>
              </div>
              <div className="relative">
                <Textarea
                  placeholder={`예시:\n• 프로젝트 밋업 태국 방콕, 4월1일~4월25일, 초청국가 한국 중국\n• 사전방문 일본 도쿄, 5월10일~15일, 50명\n• 내륙 밋업 서울 강남, 3월20일~22일`}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={3}
                  className="pr-20 bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 focus:border-violet-400"
                />
                <Button
                  size="sm"
                  onClick={handleAiParse}
                  disabled={aiParseMutation.isPending || !aiPrompt.trim()}
                  className="absolute right-2 bottom-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-sm"
                >
                  {aiParseMutation.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />{t("admin.meetups.t8", "분석중")}</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1" />{t("admin.meetups.t9", "자동입력")}</>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {t("admin.meetups.t10", "자연어로 밋업 정보를 입력하면 AI가 자동으로 모든 필드를 채워줍니다")}
              </p>
            </div>

            {/* AI 파싱 결과 미리보기 */}
            {aiParsedData && (
              <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{t("admin.meetups.t11", "AI 분석 완료")}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <span className="text-muted-foreground">{t("admin.meetups.t12", "제목:")}</span>
                  <span className="font-medium truncate">{aiParsedData.title}</span>
                  <span className="text-muted-foreground">{t("admin.meetups.t13", "장소:")}</span>
                  <span className="font-medium">{aiParsedData.location}</span>
                  <span className="text-muted-foreground">{t("admin.meetups.t14", "기간:")}</span>
                  <span className="font-medium">{aiParsedData.scheduleStart} ~ {aiParsedData.scheduleEnd}</span>
                  {aiParsedData.invitedCountries?.length > 0 && (
                    <>
                      <span className="text-muted-foreground">{t("admin.meetups.t15", "초청국:")}</span>
                      <span className="font-medium flex items-center gap-1 flex-wrap">
                        {aiParsedData.invitedCountries.map((code: string) => (
                          <span key={code} className="inline-flex items-center gap-0.5">
                            {COUNTRY_FLAGS[code] || "🏳️"}{code}
                          </span>
                        ))}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-border" />
              <span className="px-3 text-xs text-muted-foreground bg-background">{t("admin.meetups.t16", "또는 직접 입력")}</span>
              <div className="flex-1 border-t border-border" />
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); createMutation.mutate({
            ...form,
            maxParticipants: form.maxParticipants || undefined,
            scheduleStart: form.scheduleStart || undefined,
            scheduleEnd: form.scheduleEnd || undefined,
            destinationCountry: form.destinationCountry || undefined,
            location: form.location || undefined,
            description: form.description || undefined,
            baggageNotice: form.baggageNotice || undefined,
          }); }} className="space-y-4">
            <div><Label>{t("admin.meetups.meetupTitle")}</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("admin.meetups.t17", "유형")}</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({...p, type: v as any}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meetup">{t("admin.meetups.t18", "밋업")}</SelectItem>
                    <SelectItem value="pre_visit">{t("admin.meetups.t19", "사전방문")}</SelectItem>
                    <SelectItem value="event">{t("admin.meetups.t20", "이벤트")}</SelectItem>
                    <SelectItem value="meeting">{t("admin.meetups.t21", "미팅")}</SelectItem>
                    <SelectItem value="other">{t("admin.meetups.t22", "기타")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("admin.meetups.t23", "구분")}</Label>
                <Select value={form.locationType} onValueChange={v => setForm(p => ({...p, locationType: v as any}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domestic">{t("admin.meetups.t24", "내륙")}</SelectItem>
                    <SelectItem value="overseas">{t("admin.meetups.t25", "해외")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("admin.meetups.t26", "목적지 국가")}</Label>
                <Input
                  value={form.destinationCountry}
                  onChange={e => setForm(p => ({...p, destinationCountry: e.target.value}))}
                  placeholder={t("admin.meetups.t45", "예: TH, JP, CN")}
                />
              </div>
              <div>
                <Label>{t("admin.meetups.t27", "장소")}</Label>
                <Input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} placeholder={t("admin.meetups.t46", "예: Bangkok, Thailand")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("admin.meetups.startDate")}</Label><Input type="date" value={form.scheduleStart} onChange={e => setForm(p => ({...p, scheduleStart: e.target.value}))} /></div>
              <div><Label>{t("admin.meetups.endDate")}</Label><Input type="date" value={form.scheduleEnd} onChange={e => setForm(p => ({...p, scheduleEnd: e.target.value}))} /></div>
            </div>
            <div>
              <Label>{t("admin.meetups.t28", "최대 참석자 수")}</Label>
              <Input type="number" value={form.maxParticipants || ""} onChange={e => setForm(p => ({...p, maxParticipants: parseInt(e.target.value) || 0}))} placeholder={t("admin.meetups.t47", "0 = 제한없음")} />
            </div>
            <div><Label>{t("admin.meetups.description")}</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3} /></div>
            {/* 수화물 공지 */}
            <div>
              <Label className="flex items-center gap-2"><Luggage className="h-4 w-4 text-amber-500" />{t("admin.meetups.t29", "수화물 공지")}</Label>
              <Textarea
                value={form.baggageNotice}
                onChange={e => setForm(p => ({...p, baggageNotice: e.target.value}))}
                placeholder={t("admin.meetups.t48", "초과화물은 직접부담할 수 있습니다.")}
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">{t("admin.meetups.t30", "신청 페이지에 표시될 수화물 안내 문구입니다.")}</p>
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              밋업 생성
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!qrMeetup} onOpenChange={open => { if (!open) setQrMeetup(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            {t("admin.meetups.t31", "QR 코드 - 밋업 초대장")}
          </DialogTitle></DialogHeader>
          {qrMeetup && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-2xl shadow-lg" id="qr-container">
                <QRCodeSVG
                  value={`${window.location.origin}/m/${qrMeetup.shareToken}`}
                  size={220}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#1a1a2e"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-sm">{qrMeetup.title}</p>
                {qrMeetup.projectCode && (
                  <Badge variant="secondary" className="text-[10px] font-mono">#{qrMeetup.projectCode}</Badge>
                )}
                <p className="text-[11px] text-muted-foreground font-mono">
                  {window.location.origin}/m/{qrMeetup.shareToken}
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/m/${qrMeetup.shareToken}`);
                    toast.success(t("admin.meetups.t43", "URL이 복사되었습니다"));
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t("admin.meetups.t32", "URL 복사")}
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    const svg = document.querySelector('#qr-container svg');
                    if (!svg) return;
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const canvas = document.createElement('canvas');
                    canvas.width = 440; canvas.height = 440;
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    img.onload = () => {
                      ctx?.drawImage(img, 0, 0, 440, 440);
                      const a = document.createElement('a');
                      a.download = `meetup-qr-${qrMeetup.projectCode || qrMeetup.id}.png`;
                      a.href = canvas.toDataURL('image/png');
                      a.click();
                      toast.success(t("admin.meetups.t44", "QR 코드 다운로드 완료"));
                    };
                    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("admin.meetups.t33", "PNG 다운로드")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Baggage Notice Dialog */}
      <Dialog open={editBaggageId !== null} onOpenChange={open => { if (!open) setEditBaggageId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Luggage className="h-5 w-5 text-amber-500" />{t("admin.meetups.t34", "수화물 공지 수정")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editBaggageText}
              onChange={e => setEditBaggageText(e.target.value)}
              placeholder={t("admin.meetups.t49", "수화물 관련 공지사항을 입력하세요")}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{t("admin.meetups.t35", "참석자 신청 페이지에 표시되는 수화물 안내 문구입니다.")}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditBaggageId(null)}>{t("admin.meetups.t36", "취소")}</Button>
              <Button className="flex-1" onClick={() => {
                if (editBaggageId) {
                  updateMutation.mutate({ id: editBaggageId, baggageNotice: editBaggageText });
                  setEditBaggageId(null);
                }
              }}>{t("admin.meetups.t37", "저장")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
