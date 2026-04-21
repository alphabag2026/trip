import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Crown, Plus, Pencil, Trash2, Plane, Hotel, Utensils, Car, Star, Gift, Users } from "lucide-react";

const TIER_PRESETS = [
  { name: "VIP / Speaker", level: 100, color: "#f59e0b", flight: "business" as const, hotel: 5, pickup: true, lounge: true, vip: true, interpreter: true },
  { name: "Gold / Partner", level: 70, color: "#8b5cf6", flight: "premium_economy" as const, hotel: 4, pickup: true, lounge: true, vip: false, interpreter: false },
  { name: "Standard", level: 30, color: "#6366f1", flight: "economy" as const, hotel: 3, pickup: true, lounge: false, vip: false, interpreter: false },
  { name: "Basic / Self-funded", level: 10, color: "#94a3b8", flight: "economy" as const, hotel: 2, pickup: false, lounge: false, vip: false, interpreter: false },
];

export default function AttendeeTiers() {
  const meetupsQ = trpc.meetup.list.useQuery();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);
  const tiersQ = trpc.attendeeTier.list.useQuery({ meetupId: selectedMeetupId! }, { enabled: !!selectedMeetupId });
  const createMutation = trpc.attendeeTier.create.useMutation({ onSuccess: () => { tiersQ.refetch(); toast.success("등급이 생성되었습니다"); setDialogOpen(false); } });
  const updateMutation = trpc.attendeeTier.update.useMutation({ onSuccess: () => { tiersQ.refetch(); toast.success("등급이 수정되었습니다"); setDialogOpen(false); } });
  const deleteMutation = trpc.attendeeTier.delete.useMutation({ onSuccess: () => { tiersQ.refetch(); toast.success("등급이 삭제되었습니다"); } });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    tierName: "", tierLevel: 0, color: "#6366f1",
    flightClass: "economy" as string, maxFlightBudget: "", hotelStars: 3,
    maxHotelBudgetPerNight: "", mealAllowance: "", transportAllowance: "",
    airportPickup: false, loungeAccess: false, prioritySeating: false,
    giftBag: false, vipDinner: false, dedicatedInterpreter: false,
    description: "", isDefault: false,
  });

  useEffect(() => {
    if (meetupsQ.data?.length && !selectedMeetupId) setSelectedMeetupId(meetupsQ.data[0].id);
  }, [meetupsQ.data, selectedMeetupId]);

  const resetForm = () => setForm({
    tierName: "", tierLevel: 0, color: "#6366f1",
    flightClass: "economy", maxFlightBudget: "", hotelStars: 3,
    maxHotelBudgetPerNight: "", mealAllowance: "", transportAllowance: "",
    airportPickup: false, loungeAccess: false, prioritySeating: false,
    giftBag: false, vipDinner: false, dedicatedInterpreter: false,
    description: "", isDefault: false,
  });

  const openCreate = () => { resetForm(); setEditingId(null); setDialogOpen(true); };

  const openEdit = (tier: any) => {
    setEditingId(tier.id);
    setForm({
      tierName: tier.tierName, tierLevel: tier.tierLevel, color: tier.color || "#6366f1",
      flightClass: tier.flightClass || "economy",
      maxFlightBudget: tier.maxFlightBudget ? String(tier.maxFlightBudget) : "",
      hotelStars: tier.hotelStars ?? 3,
      maxHotelBudgetPerNight: tier.maxHotelBudgetPerNight ? String(tier.maxHotelBudgetPerNight) : "",
      mealAllowance: tier.mealAllowance ? String(tier.mealAllowance) : "",
      transportAllowance: tier.transportAllowance ? String(tier.transportAllowance) : "",
      airportPickup: tier.airportPickup ?? false, loungeAccess: tier.loungeAccess ?? false,
      prioritySeating: tier.prioritySeating ?? false, giftBag: tier.giftBag ?? false,
      vipDinner: tier.vipDinner ?? false, dedicatedInterpreter: tier.dedicatedInterpreter ?? false,
      description: tier.description || "", isDefault: tier.isDefault ?? false,
    });
    setDialogOpen(true);
  };

  const applyPreset = (preset: typeof TIER_PRESETS[0]) => {
    setForm(f => ({
      ...f,
      tierName: preset.name,
      tierLevel: preset.level,
      color: preset.color,
      flightClass: preset.flight,
      hotelStars: preset.hotel,
      airportPickup: preset.pickup,
      loungeAccess: preset.lounge,
      vipDinner: preset.vip,
      dedicatedInterpreter: preset.interpreter,
    }));
  };

  const handleSave = () => {
    if (!selectedMeetupId || !form.tierName) return;
    const payload: any = {
      meetupId: selectedMeetupId,
      tierName: form.tierName,
      tierLevel: form.tierLevel,
      color: form.color,
      flightClass: form.flightClass as any,
      hotelStars: form.hotelStars,
      airportPickup: form.airportPickup,
      loungeAccess: form.loungeAccess,
      prioritySeating: form.prioritySeating,
      giftBag: form.giftBag,
      vipDinner: form.vipDinner,
      dedicatedInterpreter: form.dedicatedInterpreter,
      description: form.description || undefined,
      isDefault: form.isDefault,
    };
    if (form.maxFlightBudget) payload.maxFlightBudget = Number(form.maxFlightBudget);
    if (form.maxHotelBudgetPerNight) payload.maxHotelBudgetPerNight = Number(form.maxHotelBudgetPerNight);
    if (form.mealAllowance) payload.mealAllowance = Number(form.mealAllowance);
    if (form.transportAllowance) payload.transportAllowance = Number(form.transportAllowance);

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            Attendee Tiers
          </h1>
          <p className="text-muted-foreground mt-1">참석자 등급별 혜택 및 정책 관리</p>
        </div>
        <Button onClick={openCreate} disabled={!selectedMeetupId}>
          <Plus className="h-4 w-4 mr-2" /> 등급 추가
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Label>이벤트 선택</Label>
          <Select value={selectedMeetupId ? String(selectedMeetupId) : ""} onValueChange={(v) => setSelectedMeetupId(Number(v))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="이벤트를 선택하세요" /></SelectTrigger>
            <SelectContent>
              {meetupsQ.data?.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tier Cards */}
      {tiersQ.data && tiersQ.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiersQ.data.map((tier) => (
            <Card key={tier.id} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: tier.color || "#6366f1" }} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: tier.color || "#6366f1" }} className="text-white">Lv.{tier.tierLevel}</Badge>
                    <CardTitle className="text-lg">{tier.tierName}</CardTitle>
                    {tier.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(tier)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { if (confirm("이 등급을 삭제하시겠습니까?")) deleteMutation.mutate({ id: tier.id }); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {tier.description && <CardDescription>{tier.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5"><Plane className="h-3.5 w-3.5 text-blue-500" /> {tier.flightClass || "Economy"}</div>
                  <div className="flex items-center gap-1.5"><Hotel className="h-3.5 w-3.5 text-green-500" /> {tier.hotelStars || 3}성</div>
                  {tier.maxFlightBudget && <div className="flex items-center gap-1.5 text-muted-foreground">항공 ${Number(tier.maxFlightBudget).toLocaleString()}</div>}
                  {tier.maxHotelBudgetPerNight && <div className="flex items-center gap-1.5 text-muted-foreground">숙소 ${Number(tier.maxHotelBudgetPerNight).toLocaleString()}/박</div>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tier.airportPickup && <Badge variant="secondary" className="text-xs"><Car className="h-3 w-3 mr-1" />공항픽업</Badge>}
                  {tier.loungeAccess && <Badge variant="secondary" className="text-xs"><Star className="h-3 w-3 mr-1" />라운지</Badge>}
                  {tier.prioritySeating && <Badge variant="secondary" className="text-xs">우선좌석</Badge>}
                  {tier.giftBag && <Badge variant="secondary" className="text-xs"><Gift className="h-3 w-3 mr-1" />기프트백</Badge>}
                  {tier.vipDinner && <Badge variant="secondary" className="text-xs"><Utensils className="h-3 w-3 mr-1" />VIP디너</Badge>}
                  {tier.dedicatedInterpreter && <Badge variant="secondary" className="text-xs"><Users className="h-3 w-3 mr-1" />전담통역</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : selectedMeetupId ? (
        <Card className="p-8 text-center">
          <Crown className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">아직 등급이 없습니다</p>
          <p className="text-sm text-muted-foreground mt-1">프리셋을 사용하여 빠르게 등급을 생성하세요</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {TIER_PRESETS.map((p) => (
              <Button key={p.name} variant="outline" size="sm" onClick={() => { applyPreset(p); setEditingId(null); setDialogOpen(true); }}>
                <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
                {p.name}
              </Button>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "등급 수정" : "등급 추가"}</DialogTitle>
          </DialogHeader>

          {/* Presets */}
          {!editingId && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-xs text-muted-foreground mr-1">프리셋:</span>
              {TIER_PRESETS.map((p) => (
                <Button key={p.name} variant="outline" size="sm" className="h-6 text-xs" onClick={() => applyPreset(p)}>
                  <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: p.color }} />
                  {p.name}
                </Button>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>등급 이름</Label>
                <Input className="mt-1" value={form.tierName} onChange={(e) => setForm(f => ({ ...f, tierName: e.target.value }))} placeholder="예: VIP Speaker" />
              </div>
              <div>
                <Label>레벨</Label>
                <Input className="mt-1" type="number" value={form.tierLevel} onChange={(e) => setForm(f => ({ ...f, tierLevel: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>색상</Label>
                <div className="flex gap-2 mt-1">
                  <input type="color" value={form.color} onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={form.color} onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>항공 클래스</Label>
                <Select value={form.flightClass} onValueChange={(v) => setForm(f => ({ ...f, flightClass: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy</SelectItem>
                    <SelectItem value="premium_economy">Premium Economy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="first">First</SelectItem>
                    <SelectItem value="any">제한 없음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>호텔 등급</Label>
                <Select value={String(form.hotelStars)} onValueChange={(v) => setForm(f => ({ ...f, hotelStars: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2성</SelectItem>
                    <SelectItem value="3">3성</SelectItem>
                    <SelectItem value="4">4성</SelectItem>
                    <SelectItem value="5">5성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>항공 예산 상한 ($)</Label>
                <Input className="mt-1" type="number" placeholder="예: 2000" value={form.maxFlightBudget} onChange={(e) => setForm(f => ({ ...f, maxFlightBudget: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>숙소 예산/박 ($)</Label>
                <Input className="mt-1" type="number" placeholder="예: 200" value={form.maxHotelBudgetPerNight} onChange={(e) => setForm(f => ({ ...f, maxHotelBudgetPerNight: e.target.value }))} />
              </div>
              <div>
                <Label>식비 수당 ($)</Label>
                <Input className="mt-1" type="number" placeholder="예: 50" value={form.mealAllowance} onChange={(e) => setForm(f => ({ ...f, mealAllowance: e.target.value }))} />
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <Label className="text-sm font-semibold">혜택</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "airportPickup", label: "공항 픽업", icon: Car },
                  { key: "loungeAccess", label: "라운지 이용", icon: Star },
                  { key: "prioritySeating", label: "우선 좌석", icon: Users },
                  { key: "giftBag", label: "기프트백", icon: Gift },
                  { key: "vipDinner", label: "VIP 디너", icon: Utensils },
                  { key: "dedicatedInterpreter", label: "전담 통역", icon: Users },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-1.5 text-sm"><Icon className="h-3.5 w-3.5" />{label}</div>
                    <Switch checked={(form as any)[key]} onCheckedChange={(v) => setForm(f => ({ ...f, [key]: v }))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-muted/50">
              <Label>기본 등급으로 설정</Label>
              <Switch checked={form.isDefault} onCheckedChange={(v) => setForm(f => ({ ...f, isDefault: v }))} />
            </div>

            <Button onClick={handleSave} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "수정" : "생성"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
