import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Globe, ExternalLink, Sparkles, Send, Loader2, Eye, Clock, DollarSign, Languages, Plug, Phone, Shield, AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const defaultForm = {
  countryCode: "", countryName: "", countryNameKo: "",
  requiredItems: [] as string[], immigrationUrl: "", immigrationNotes: "",
  visaRequired: false, visaNotes: "", emergencyContact: "",
  timezone: "", currency: "", language: "", plugType: "", additionalNotes: "",
};

const POPULAR_COUNTRIES = [
  { code: "TH", name: "Thailand", nameKo: "태국" },
  { code: "AE", name: "United Arab Emirates", nameKo: "아랍에미리트(두바이)" },
  { code: "SG", name: "Singapore", nameKo: "싱가포르" },
  { code: "JP", name: "Japan", nameKo: "일본" },
  { code: "VN", name: "Vietnam", nameKo: "베트남" },
  { code: "PH", name: "Philippines", nameKo: "필리핀" },
  { code: "MY", name: "Malaysia", nameKo: "말레이시아" },
  { code: "ID", name: "Indonesia", nameKo: "인도네시아" },
  { code: "CN", name: "China", nameKo: "중국" },
  { code: "HK", name: "Hong Kong", nameKo: "홍콩" },
  { code: "TW", name: "Taiwan", nameKo: "대만" },
  { code: "US", name: "United States", nameKo: "미국" },
  { code: "GB", name: "United Kingdom", nameKo: "영국" },
  { code: "DE", name: "Germany", nameKo: "독일" },
  { code: "FR", name: "France", nameKo: "프랑스" },
  { code: "AU", name: "Australia", nameKo: "호주" },
  { code: "KH", name: "Cambodia", nameKo: "캄보디아" },
  { code: "IN", name: "India", nameKo: "인도" },
  { code: "TR", name: "Turkey", nameKo: "터키" },
  { code: "ES", name: "Spain", nameKo: "스페인" },
];

export default function AdminTravelInfo() {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [sendCountryCode, setSendCountryCode] = useState("");
  const [sendMeetupId, setSendMeetupId] = useState<string>("");
  const [itemInput, setItemInput] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const { data: countries, refetch } = trpc.travelInfo.list.useQuery();
  const { data: meetups } = trpc.meetup.list.useQuery({});
  const upsertMutation = trpc.travelInfo.upsert.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); toast.success(t("admin.travelInfo.t31", "저장되었습니다.")); },
  });
  const deleteMutation = trpc.travelInfo.delete.useMutation({
    onSuccess: () => { refetch(); toast.success(t("admin.travelInfo.deleted")); },
  });
  const generateMutation = trpc.travelInfo.generateInfo.useMutation({
    onSuccess: () => { refetch(); toast.success(t("admin.travelInfo.t32", "AI가 여행 정보를 자동 생성했습니다!")); },
    onError: (e) => toast.error(`생성 실패: ${e.message}`),
  });
  const sendMutation = trpc.travelInfo.sendToParticipants.useMutation({
    onSuccess: (data) => { setShowSend(false); toast.success(`${data.sentCount}명에게 여행 정보를 전송했습니다.`); },
    onError: (e) => toast.error(`전송 실패: ${e.message}`),
  });
  const [form, setForm] = useState(defaultForm);

  const addItem = () => {
    if (itemInput.trim()) {
      setForm(p => ({ ...p, requiredItems: [...p.requiredItems, itemInput.trim()] }));
      setItemInput("");
    }
  };

  const removeItem = (idx: number) => {
    setForm(p => ({ ...p, requiredItems: p.requiredItems.filter((_, i) => i !== idx) }));
  };

  const openEdit = (c: any) => {
    setForm({
      countryCode: c.countryCode, countryName: c.countryName, countryNameKo: c.countryNameKo || "",
      requiredItems: (c.requiredItems as string[]) || [], immigrationUrl: c.immigrationUrl || "",
      immigrationNotes: c.immigrationNotes || "", visaRequired: c.visaRequired || false,
      visaNotes: c.visaNotes || "", emergencyContact: c.emergencyContact || "",
      timezone: c.timezone || "", currency: c.currency || "", language: c.language || "",
      plugType: c.plugType || "", additionalNotes: c.additionalNotes || "",
    });
    setShowCreate(true);
  };

  const handleAutoGenerate = (country: { code: string; name: string }) => {
    if (confirm(`${country.name} 여행 정보를 AI로 자동 생성하시겠습니까?`)) {
      generateMutation.mutate({ countryCode: country.code, countryName: country.name });
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t("admin.travelInfo.t1", "국가별 여행 정보")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowSend(true); }}>
            <Send className="h-4 w-4 mr-2" />{t("admin.travelInfo.t2", "참석자에게 전송")}
          </Button>
          <Button onClick={() => { setForm(defaultForm); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-2" />{t("admin.travelInfo.t3", "국가 추가")}
          </Button>
        </div>
      </div>

      {/* AI 자동 생성 섹션 */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("admin.travelInfo.t4", "AI 자동 생성 - 국가 선택")}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {t("admin.travelInfo.t5", "국가를 선택하면 AI가 여행 준비물, 출입국 정보, 비자, 통화, 시간대 등을 자동으로 생성합니다.")}
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_COUNTRIES.map(c => {
              const exists = countries?.some((x: any) => x.countryCode === c.code);
              return (
                <Button
                  key={c.code}
                  variant={exists ? "secondary" : "outline"}
                  size="sm"
                  disabled={generateMutation.isPending}
                  onClick={() => handleAutoGenerate({ code: c.code, name: c.name })}
                  className="text-xs"
                >
                  {generateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  {c.nameKo} ({c.code})
                  {exists && " ✓"}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 국가 카드 그리드 - 개선된 레이아웃 */}
      <div className="grid gap-4 md:grid-cols-2">
        {countries?.map((c: any) => {
          const items = (c.requiredItems as string[]) || [];
          const isExpanded = expandedCards.has(c.id);
          return (
            <Card key={c.id} className="bg-card border-border overflow-hidden">
              <CardContent className="p-0">
                {/* 카드 헤더 */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold flex items-center gap-2 text-base">
                        <Globe className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{c.countryNameKo || c.countryName}</span>
                        <span className="text-xs text-muted-foreground shrink-0">({c.countryCode})</span>
                      </h3>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDetail(c)}>
                        <Eye className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setSendCountryCode(c.countryCode); setShowSend(true);
                      }}><Send className="h-3.5 w-3.5 text-primary" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: c.id });
                      }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>

                  {/* 핵심 정보 뱃지 */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.visaRequired && <Badge variant="destructive" className="text-[10px]">비자 필요</Badge>}
                    {c.timezone && <Badge variant="outline" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-0.5" />{c.timezone}</Badge>}
                    {c.currency && <Badge variant="outline" className="text-[10px]"><DollarSign className="h-2.5 w-2.5 mr-0.5" />{c.currency}</Badge>}
                    {c.language && <Badge variant="outline" className="text-[10px]"><Languages className="h-2.5 w-2.5 mr-0.5" />{c.language}</Badge>}
                    {c.plugType && <Badge variant="outline" className="text-[10px]"><Plug className="h-2.5 w-2.5 mr-0.5" />{c.plugType}</Badge>}
                  </div>

                  {/* 준비물 요약 */}
                  {items.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">준비물 ({items.length}건)</p>
                      <div className="flex flex-wrap gap-1">
                        {items.slice(0, isExpanded ? items.length : 4).map((item, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{item}</span>
                        ))}
                        {!isExpanded && items.length > 4 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">+{items.length - 4}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 확장 영역 */}
                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2 border-t border-border pt-3">
                    {c.immigrationNotes && (
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                        <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-0.5">
                          <AlertTriangle className="h-3 w-3" />출입국 안내
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-3">{c.immigrationNotes}</p>
                      </div>
                    )}
                    {c.visaNotes && (
                      <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                        <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 mb-0.5">
                          <Shield className="h-3 w-3" />비자 안내
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-3">{c.visaNotes}</p>
                      </div>
                    )}
                    {c.emergencyContact && (
                      <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                        <Phone className="h-3 w-3 text-red-500 shrink-0" />
                        <span className="text-xs">긴급: {c.emergencyContact}</span>
                      </div>
                    )}
                    {c.additionalNotes && (
                      <div className="p-2 rounded bg-accent/50">
                        <p className="text-[11px] font-medium mb-0.5 flex items-center gap-1"><Info className="h-3 w-3" />추가 정보</p>
                        <p className="text-xs text-muted-foreground line-clamp-4">{c.additionalNotes}</p>
                      </div>
                    )}
                    {c.immigrationUrl && (
                      <a href={c.immigrationUrl} target="_blank" rel="noopener" className="text-xs text-primary flex items-center gap-1 hover:underline" onClick={e => e.stopPropagation()}>
                        <ExternalLink className="h-3 w-3" />출입국 신청 사이트
                      </a>
                    )}
                  </div>
                )}

                {/* 펼치기/접기 버튼 */}
                <button
                  onClick={() => toggleExpand(c.id)}
                  className="w-full py-1.5 text-center text-xs text-muted-foreground hover:bg-accent/50 transition-colors border-t border-border flex items-center justify-center gap-1"
                >
                  {isExpanded ? <><ChevronUp className="h-3 w-3" />접기</> : <><ChevronDown className="h-3 w-3" />상세보기</>}
                </button>
              </CardContent>
            </Card>
          );
        })}
        {(!countries || countries.length === 0) && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">{t("admin.travelInfo.t8", "등록된 국가 정보가 없습니다. 위에서 AI 자동 생성을 사용해보세요.")}</div>
        )}
      </div>

      {/* 상세보기 다이얼로그 */}
      <Dialog open={!!showDetail} onOpenChange={open => { if (!open) setShowDetail(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {showDetail && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  {showDetail.countryNameKo || showDetail.countryName} ({showDetail.countryCode})
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-2">
                {[
                  { icon: Clock, label: "시간대", value: showDetail.timezone },
                  { icon: DollarSign, label: "통화", value: showDetail.currency },
                  { icon: Languages, label: "언어", value: showDetail.language },
                  { icon: Plug, label: "콘센트", value: showDetail.plugType },
                  { icon: Phone, label: "긴급연락처", value: showDetail.emergencyContact },
                ].filter(r => r.value).map((row, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-accent/50">
                    <row.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-muted-foreground w-20 shrink-0">{row.label}</span>
                    <span className="text-sm font-medium flex-1 break-words">{row.value}</span>
                  </div>
                ))}
              </div>

              {showDetail.visaRequired && showDetail.visaNotes && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm font-medium flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1">
                    <Shield className="h-3.5 w-3.5" />비자 안내
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{showDetail.visaNotes}</p>
                </div>
              )}

              {showDetail.immigrationNotes && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm font-medium flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" />출입국 안내
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{showDetail.immigrationNotes}</p>
                </div>
              )}

              {((showDetail.requiredItems as string[]) || []).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">여행 준비물</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(showDetail.requiredItems as string[]).map((item: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {showDetail.additionalNotes && (
                <div className="p-3 rounded-lg bg-accent/50">
                  <p className="text-sm font-medium mb-1">추가 정보</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{showDetail.additionalNotes}</p>
                </div>
              )}

              {showDetail.immigrationUrl && (
                <a href={showDetail.immigrationUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <ExternalLink className="h-4 w-4" />출입국 관리 사이트 바로가기
                </a>
              )}

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => { openEdit(showDetail); setShowDetail(null); }}>
                  <Sparkles className="h-4 w-4 mr-2" />수정
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => {
                  setSendCountryCode(showDetail.countryCode); setShowSend(true); setShowDetail(null);
                }}>
                  <Send className="h-4 w-4 mr-2" />전송
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upsert Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.travelInfo.t9", "국가 여행 정보")}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); upsertMutation.mutate({
            ...form,
            countryNameKo: form.countryNameKo || undefined,
            immigrationUrl: form.immigrationUrl || undefined,
            immigrationNotes: form.immigrationNotes || undefined,
            visaNotes: form.visaNotes || undefined,
            emergencyContact: form.emergencyContact || undefined,
            timezone: form.timezone || undefined,
            currency: form.currency || undefined,
            language: form.language || undefined,
            plugType: form.plugType || undefined,
            additionalNotes: form.additionalNotes || undefined,
          }); }} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t("admin.travelInfo.t10", "국가 코드 *")}</Label><Input value={form.countryCode} onChange={e => setForm(p => ({...p, countryCode: e.target.value.toUpperCase()}))} placeholder="TH" required /></div>
              <div><Label>{t("admin.travelInfo.t11", "영문명 *")}</Label><Input value={form.countryName} onChange={e => setForm(p => ({...p, countryName: e.target.value}))} placeholder="Thailand" required /></div>
              <div><Label>{t("admin.travelInfo.t12", "한글명")}</Label><Input value={form.countryNameKo} onChange={e => setForm(p => ({...p, countryNameKo: e.target.value}))} placeholder="태국" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t("admin.travelInfo.t13", "시간대")}</Label><Input value={form.timezone} onChange={e => setForm(p => ({...p, timezone: e.target.value}))} placeholder="UTC+7" /></div>
              <div><Label>{t("admin.travelInfo.t14", "통화")}</Label><Input value={form.currency} onChange={e => setForm(p => ({...p, currency: e.target.value}))} placeholder="THB" /></div>
              <div><Label>{t("admin.travelInfo.t15", "언어")}</Label><Input value={form.language} onChange={e => setForm(p => ({...p, language: e.target.value}))} placeholder="태국어" /></div>
            </div>
            <div><Label>{t("admin.travelInfo.t16", "콘센트 타입")}</Label><Input value={form.plugType} onChange={e => setForm(p => ({...p, plugType: e.target.value}))} placeholder="A, B, C" /></div>
            <div className="flex items-center gap-3">
              <Switch checked={form.visaRequired} onCheckedChange={v => setForm(p => ({...p, visaRequired: v}))} />
              <Label>{t("admin.travelInfo.t17", "비자 필요")}</Label>
            </div>
            {form.visaRequired && <div><Label>{t("admin.travelInfo.t18", "비자 안내")}</Label><Textarea value={form.visaNotes} onChange={e => setForm(p => ({...p, visaNotes: e.target.value}))} rows={2} /></div>}
            <div><Label>{t("admin.travelInfo.t19", "출입국 신청 URL")}</Label><Input value={form.immigrationUrl} onChange={e => setForm(p => ({...p, immigrationUrl: e.target.value}))} placeholder="https://..." /></div>
            <div><Label>{t("admin.travelInfo.t20", "출입국 안내")}</Label><Textarea value={form.immigrationNotes} onChange={e => setForm(p => ({...p, immigrationNotes: e.target.value}))} rows={2} /></div>
            <div>
              <Label>{t("admin.travelInfo.t21", "여행 준비물")}</Label>
              <div className="flex gap-2 mt-1">
                <Input value={itemInput} onChange={e => setItemInput(e.target.value)} placeholder="항목 추가" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); }}} />
                <Button type="button" variant="outline" onClick={addItem}>{t("admin.travelInfo.t22", "추가")}</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.requiredItems.map((item, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded bg-primary/20 text-primary flex items-center gap-1">
                    {item}
                    <button type="button" onClick={() => removeItem(i)} className="hover:text-destructive">&times;</button>
                  </span>
                ))}
              </div>
            </div>
            <div><Label>{t("admin.travelInfo.t23", "긴급 연락처")}</Label><Input value={form.emergencyContact} onChange={e => setForm(p => ({...p, emergencyContact: e.target.value}))} /></div>
            <div><Label>{t("admin.travelInfo.t24", "추가 안내")}</Label><Textarea value={form.additionalNotes} onChange={e => setForm(p => ({...p, additionalNotes: e.target.value}))} rows={3} /></div>
            <Button type="submit" className="w-full" disabled={upsertMutation.isPending}>{t("admin.travelInfo.t25", "저장")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send to Participants Dialog */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("admin.travelInfo.t26", "참석자에게 여행 정보 전송")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin.travelInfo.t27", "국가 선택 *")}</Label>
              <Select value={sendCountryCode} onValueChange={setSendCountryCode}>
                <SelectTrigger><SelectValue placeholder="국가 선택" /></SelectTrigger>
                <SelectContent>
                  {countries?.map((c: any) => (
                    <SelectItem key={c.countryCode} value={c.countryCode}>
                      {c.countryNameKo || c.countryName} ({c.countryCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("admin.travelInfo.t28", "밋업 선택 (선택사항)")}</Label>
              <Select value={sendMeetupId} onValueChange={setSendMeetupId}>
                <SelectTrigger><SelectValue placeholder="전체 승인된 참석자" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.travelInfo.t29", "전체 승인된 참석자")}</SelectItem>
                  {meetups?.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("admin.travelInfo.t30", "선택한 국가의 여행 준비물, 출입국 정보, 통화, 시간대 등을 텔레그램으로 전송합니다.")}
            </p>
            <Button
              className="w-full"
              disabled={!sendCountryCode || sendMutation.isPending}
              onClick={() => {
                sendMutation.mutate({
                  countryCode: sendCountryCode,
                  meetupId: sendMeetupId && sendMeetupId !== "all" ? Number(sendMeetupId) : undefined,
                  method: "telegram",
                });
              }}
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              텔레그램으로 전송
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
