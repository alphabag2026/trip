import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Globe, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const defaultForm = {
  countryCode: "", countryName: "", countryNameKo: "",
  requiredItems: [] as string[], immigrationUrl: "", immigrationNotes: "",
  visaRequired: false, visaNotes: "", emergencyContact: "",
  timezone: "", currency: "", language: "", plugType: "", additionalNotes: "",
};

export default function AdminTravelInfo() {
  const [showCreate, setShowCreate] = useState(false);
  const [itemInput, setItemInput] = useState("");
  const { data: countries, refetch } = trpc.travelInfo.list.useQuery();
  const upsertMutation = trpc.travelInfo.upsert.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); toast.success("저장되었습니다."); },
  });
  const deleteMutation = trpc.travelInfo.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("삭제되었습니다."); },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">국가별 여행 정보</h1>
        <Button onClick={() => { setForm(defaultForm); setShowCreate(true); }}><Plus className="h-4 w-4 mr-2" />국가 추가</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {countries?.map((c: any) => (
          <Card key={c.id} className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openEdit(c)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    {c.countryNameKo || c.countryName} ({c.countryCode})
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.visaRequired && <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">비자 필요</span>}
                    {c.currency && <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{c.currency}</span>}
                    {c.timezone && <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{c.timezone}</span>}
                  </div>
                  {c.immigrationUrl && (
                    <a href={c.immigrationUrl} target="_blank" rel="noopener" className="text-xs text-primary flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="h-3 w-3" />출입국 신청
                    </a>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={e => {
                  e.stopPropagation();
                  if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: c.id });
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!countries || countries.length === 0) && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">등록된 국가 정보가 없습니다.</div>
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
    </div>
  );
}
