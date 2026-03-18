import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Globe, ExternalLink, Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [showCreate, setShowCreate] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendCountryCode, setSendCountryCode] = useState("");
  const [sendMeetupId, setSendMeetupId] = useState<string>("");
  const [itemInput, setItemInput] = useState("");
  const { data: countries, refetch } = trpc.travelInfo.list.useQuery();
  const { data: meetups } = trpc.meetup.list.useQuery({});
  const upsertMutation = trpc.travelInfo.upsert.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); toast.success("저장되었습니다."); },
  });
  const deleteMutation = trpc.travelInfo.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("삭제되었습니다."); },
  });
  const generateMutation = trpc.travelInfo.generateInfo.useMutation({
    onSuccess: () => { refetch(); toast.success("AI가 여행 정보를 자동 생성했습니다!"); },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">국가별 여행 정보</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowSend(true); }}>
            <Send className="h-4 w-4 mr-2" />참석자에게 전송
          </Button>
          <Button onClick={() => { setForm(defaultForm); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-2" />국가 추가
          </Button>
        </div>
      </div>

      {/* AI 자동 생성 섹션 */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            AI 자동 생성 - 국가 선택
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            국가를 선택하면 AI가 여행 준비물, 출입국 정보, 비자, 통화, 시간대 등을 자동으로 생성합니다.
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

      <div className="grid gap-4 md:grid-cols-2">
        {countries?.map((c: any) => (
          <Card key={c.id} className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openEdit(c)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    {c.countryNameKo || c.countryName} ({c.countryCode})
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.visaRequired && <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">비자 필요</span>}
                    {c.currency && <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{c.currency}</span>}
                    {c.timezone && <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{c.timezone}</span>}
                    {c.language && <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{c.language}</span>}
                    {c.plugType && <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">🔌 {c.plugType}</span>}
                  </div>
                  {(c.requiredItems as string[])?.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      준비물: {(c.requiredItems as string[]).slice(0, 5).join(", ")}
                      {(c.requiredItems as string[]).length > 5 && ` 외 ${(c.requiredItems as string[]).length - 5}건`}
                    </div>
                  )}
                  {c.immigrationUrl && (
                    <a href={c.immigrationUrl} target="_blank" rel="noopener" className="text-xs text-primary flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="h-3 w-3" />출입국 신청
                    </a>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={e => {
                    e.stopPropagation();
                    setSendCountryCode(c.countryCode);
                    setShowSend(true);
                  }}><Send className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={e => {
                    e.stopPropagation();
                    if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: c.id });
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!countries || countries.length === 0) && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">등록된 국가 정보가 없습니다. 위에서 AI 자동 생성을 사용해보세요.</div>
        )}
      </div>

      {/* Upsert Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>국가 여행 정보</DialogTitle></DialogHeader>
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
              <div><Label>국가 코드 *</Label><Input value={form.countryCode} onChange={e => setForm(p => ({...p, countryCode: e.target.value.toUpperCase()}))} placeholder="TH" required /></div>
              <div><Label>영문명 *</Label><Input value={form.countryName} onChange={e => setForm(p => ({...p, countryName: e.target.value}))} placeholder="Thailand" required /></div>
              <div><Label>한글명</Label><Input value={form.countryNameKo} onChange={e => setForm(p => ({...p, countryNameKo: e.target.value}))} placeholder="태국" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>시간대</Label><Input value={form.timezone} onChange={e => setForm(p => ({...p, timezone: e.target.value}))} placeholder="UTC+7" /></div>
              <div><Label>통화</Label><Input value={form.currency} onChange={e => setForm(p => ({...p, currency: e.target.value}))} placeholder="THB" /></div>
              <div><Label>언어</Label><Input value={form.language} onChange={e => setForm(p => ({...p, language: e.target.value}))} placeholder="태국어" /></div>
            </div>
            <div><Label>콘센트 타입</Label><Input value={form.plugType} onChange={e => setForm(p => ({...p, plugType: e.target.value}))} placeholder="A, B, C" /></div>
            <div className="flex items-center gap-3">
              <Switch checked={form.visaRequired} onCheckedChange={v => setForm(p => ({...p, visaRequired: v}))} />
              <Label>비자 필요</Label>
            </div>
            {form.visaRequired && <div><Label>비자 안내</Label><Textarea value={form.visaNotes} onChange={e => setForm(p => ({...p, visaNotes: e.target.value}))} rows={2} /></div>}
            <div><Label>출입국 신청 URL</Label><Input value={form.immigrationUrl} onChange={e => setForm(p => ({...p, immigrationUrl: e.target.value}))} placeholder="https://..." /></div>
            <div><Label>출입국 안내</Label><Textarea value={form.immigrationNotes} onChange={e => setForm(p => ({...p, immigrationNotes: e.target.value}))} rows={2} /></div>
            <div>
              <Label>여행 준비물</Label>
              <div className="flex gap-2 mt-1">
                <Input value={itemInput} onChange={e => setItemInput(e.target.value)} placeholder="항목 추가" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); }}} />
                <Button type="button" variant="outline" onClick={addItem}>추가</Button>
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
            <div><Label>긴급 연락처</Label><Input value={form.emergencyContact} onChange={e => setForm(p => ({...p, emergencyContact: e.target.value}))} /></div>
            <div><Label>추가 안내</Label><Textarea value={form.additionalNotes} onChange={e => setForm(p => ({...p, additionalNotes: e.target.value}))} rows={3} /></div>
            <Button type="submit" className="w-full" disabled={upsertMutation.isPending}>저장</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send to Participants Dialog */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>참석자에게 여행 정보 전송</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>국가 선택 *</Label>
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
              <Label>밋업 선택 (선택사항)</Label>
              <Select value={sendMeetupId} onValueChange={setSendMeetupId}>
                <SelectTrigger><SelectValue placeholder="전체 승인된 참석자" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 승인된 참석자</SelectItem>
                  {meetups?.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              선택한 국가의 여행 준비물, 출입국 정보, 통화, 시간대 등을 텔레그램으로 전송합니다.
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
