import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Globe, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

// 기본 필드 옵션
const AVAILABLE_FIELDS = [
  { key: "passport_number", label: "여권번호" },
  { key: "full_name", label: "성명 (Full Name)" },
  { key: "surname", label: "성 (Surname)" },
  { key: "given_name", label: "이름 (Given Name)" },
  { key: "nationality", label: "국적" },
  { key: "date_of_birth", label: "생년월일" },
  { key: "gender", label: "성별" },
  { key: "passport_expiry", label: "여권 만료일" },
  { key: "passport_issue_date", label: "여권 발급일" },
  { key: "issuing_country", label: "발급 국가" },
  { key: "flight_number", label: "항공편명" },
  { key: "hotel_name", label: "호텔명" },
  { key: "hotel_address", label: "호텔 주소" },
  { key: "phone", label: "연락처" },
  { key: "email", label: "이메일" },
  { key: "purpose_of_visit", label: "방문 목적" },
  { key: "length_of_stay", label: "체류 기간" },
  { key: "address_in_country", label: "현지 주소" },
];

export default function ImmigrationCards() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    countryCode: "",
    countryName: "",
    countryNameLocal: "",
    cardUrl: "",
    cardName: "",
    description: "",
    selectedFields: [] as string[],
    isActive: true,
  });

  const cardsQuery = trpc.immigrationCard.listAll.useQuery();
  const upsertMutation = trpc.immigrationCard.upsert.useMutation({
    onSuccess: () => {
      toast.success("저장되었습니다");
      cardsQuery.refetch();
      resetForm();
    },
    onError: (err) => toast.error(err.message || "저장 실패"),
  });
  const deleteMutation = trpc.immigrationCard.delete.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다");
      cardsQuery.refetch();
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ countryCode: "", countryName: "", countryNameLocal: "", cardUrl: "", cardName: "", description: "", selectedFields: [], isActive: true });
  };

  const openEdit = (card: any) => {
    setEditing(card);
    const fields = card.requiredFields ? JSON.parse(card.requiredFields) : [];
    setForm({
      countryCode: card.countryCode,
      countryName: card.countryName,
      countryNameLocal: card.countryNameLocal || "",
      cardUrl: card.cardUrl,
      cardName: card.cardName,
      description: card.description || "",
      selectedFields: fields,
      isActive: card.isActive,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.countryCode || !form.countryName || !form.cardUrl || !form.cardName) {
      toast.error("필수 항목을 입력해주세요");
      return;
    }
    const fieldLabels: Record<string, string> = {};
    form.selectedFields.forEach((f) => {
      const found = AVAILABLE_FIELDS.find((af) => af.key === f);
      fieldLabels[f] = found?.label || f;
    });
    upsertMutation.mutate({
      id: editing?.id,
      countryCode: form.countryCode,
      countryName: form.countryName,
      countryNameLocal: form.countryNameLocal || undefined,
      cardUrl: form.cardUrl,
      cardName: form.cardName,
      description: form.description || undefined,
      requiredFields: JSON.stringify(form.selectedFields),
      fieldLabels: JSON.stringify(fieldLabels),
      isActive: form.isActive,
    });
  };

  const toggleField = (key: string) => {
    setForm((prev) => ({
      ...prev,
      selectedFields: prev.selectedFields.includes(key)
        ? prev.selectedFields.filter((f) => f !== key)
        : [...prev.selectedFields, key],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">입국카드 관리</h2>
          <p className="text-muted-foreground">나라별 전자 입국카드 URL 및 필수 필드를 관리합니다</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> 추가
        </Button>
      </div>

      {cardsQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {(cardsQuery.data || []).map((card: any) => (
            <Card key={card.id} className={!card.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{card.countryName}</span>
                      {card.countryNameLocal && <span className="text-sm text-muted-foreground">({card.countryNameLocal})</span>}
                      <Badge variant="outline">{card.countryCode}</Badge>
                      {!card.isActive && <Badge variant="destructive">비활성</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{card.cardName}</p>
                    <a href={card.cardUrl} target="_blank" rel="noopener" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> {card.cardUrl}
                    </a>
                    {card.requiredFields && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {JSON.parse(card.requiredFields).map((f: string) => (
                          <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(card)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: card.id });
                    }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!cardsQuery.data || cardsQuery.data.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                등록된 입국카드 정보가 없습니다
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 추가/수정 다이얼로그 */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "입국카드 수정" : "입국카드 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">국가 코드 *</label>
                <Input placeholder="TH" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="text-sm font-medium">국가명 *</label>
                <Input placeholder="Thailand" value={form.countryName} onChange={(e) => setForm({ ...form, countryName: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">현지어 국가명</label>
              <Input placeholder="ประเทศไทย" value={form.countryNameLocal} onChange={(e) => setForm({ ...form, countryNameLocal: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">입국카드 이름 *</label>
              <Input placeholder="Thailand Digital Arrival Card" value={form.cardName} onChange={(e) => setForm({ ...form, cardName: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">입국카드 URL *</label>
              <Input placeholder="https://tdac.immigration.go.th" value={form.cardUrl} onChange={(e) => setForm({ ...form, cardUrl: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">설명</label>
              <Textarea placeholder="입국 72시간 전 작성 권장" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">필수 입력 필드 선택</label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_FIELDS.map((field) => (
                  <label key={field.key} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={form.selectedFields.includes(field.key)}
                      onChange={() => toggleField(field.key)}
                      className="rounded"
                    />
                    <span className="text-sm">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <span className="text-sm">활성화</span>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>취소</Button>
              <Button onClick={handleSave} disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
