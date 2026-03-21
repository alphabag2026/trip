import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Handshake, MapPin, Phone, Mail, Globe, Star,
  Plus, Search, Filter, Trash2, Edit, ExternalLink,
  Utensils, Hotel, Music, Sparkles, Map, Ship, Car, Languages, Activity, MoreHorizontal,
  Clock, Users, ToggleLeft, ArrowUpDown, ArrowDown, ArrowUp
} from "lucide-react";
import { useTranslation } from "react-i18next";

const categoryIcons: Record<string, any> = {
  utensils: Utensils, hotel: Hotel, music: Music, spa: Sparkles,
  map: Map, ship: Ship, car: Car, languages: Languages,
  activity: Activity, "more-horizontal": MoreHorizontal,
};

const emptyForm = {
  name: "", categoryId: 0, region: "", country: "", address: "",
  contactName: "", contactPhone: "", contactEmail: "", website: "",
  description: "", capacity: 0, priceRange: "", operatingHours: "",
  languages: "", notes: "",
};

export default function PartnersPage() {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterRegion, setFilterRegion] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [sortBy, setSortBy] = useState<"name" | "rating" | "capacity">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const utils = trpc.useUtils();
  const categoriesQuery = trpc.partnerCategory.list.useQuery();
  const partnersQuery = trpc.partner.list.useQuery({
    categoryId: filterCategory !== "all" ? Number(filterCategory) : undefined,
    region: filterRegion || undefined,
  });

  const createMutation = trpc.partner.create.useMutation({
    onSuccess: () => {
      toast.success("파트너가 등록되었습니다");
      utils.partner.list.invalidate();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.partner.update.useMutation({
    onSuccess: () => {
      toast.success("파트너 정보가 수정되었습니다");
      utils.partner.list.invalidate();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.partner.delete.useMutation({
    onSuccess: () => {
      toast.success("파트너가 삭제되었습니다");
      utils.partner.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function closeDialog() {
    setShowDialog(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(partner: any) {
    setForm({
      name: partner.name || "", categoryId: partner.categoryId || 0,
      region: partner.region || "", country: partner.country || "",
      address: partner.address || "", contactName: partner.contactName || "",
      contactPhone: partner.contactPhone || "", contactEmail: partner.contactEmail || "",
      website: partner.website || "", description: partner.description || "",
      capacity: partner.capacity || 0, priceRange: partner.priceRange || "",
      operatingHours: partner.operatingHours || "", languages: partner.languages || "",
      notes: partner.notes || "",
    });
    setEditingId(partner.id);
    setShowDialog(true);
  }

  function handleSubmit() {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form, categoryId: form.categoryId || undefined });
    } else {
      createMutation.mutate({ ...form, categoryId: form.categoryId || undefined });
    }
  }

  function toggleActive(partner: any) {
    updateMutation.mutate({ id: partner.id, isActive: !partner.isActive });
  }

  const categories = categoriesQuery.data || [];
  const partners = useMemo(() => {
    const filtered = (partnersQuery.data || []).filter((p: any) =>
      !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.region?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return [...filtered].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortBy === "rating") cmp = (a.rating || 0) - (b.rating || 0);
      else if (sortBy === "capacity") cmp = (a.capacity || 0) - (b.capacity || 0);
      else cmp = (a.name || "").localeCompare(b.name || "");
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [partnersQuery.data, searchTerm, sortBy, sortDir]);

  // 지역 목록 추출
  const regions = Array.from(new Set((partnersQuery.data || []).map((p: any) => p.region).filter(Boolean)));

  function getCategoryName(catId: number) {
    const cat = categories.find((c: any) => c.id === catId);
    return cat ? (cat.nameKo || cat.name) : "미분류";
  }

  function getCategoryIcon(catId: number) {
    const cat = categories.find((c: any) => c.id === catId);
    const IconComp = cat?.icon ? categoryIcons[cat.icon] : Handshake;
    return IconComp || Handshake;
  }

  // 통계
  const totalPartners = partnersQuery.data?.length || 0;
  const activePartners = (partnersQuery.data || []).filter((p: any) => p.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Handshake className="h-7 w-7 text-orange-600" />
            파트너 업체 관리
          </h1>
          <p className="text-muted-foreground mt-1">식당, 호텔, 클럽, 마사지, 여행, 크루즈, 차량, 통역 등 파트너 업체를 관리합니다</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" /> 파트너 등록
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10"><Handshake className="h-5 w-5 text-orange-500" /></div>
              <div>
                <p className="text-2xl font-bold">{totalPartners}</p>
                <p className="text-xs text-muted-foreground">전체 파트너</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><ToggleLeft className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">{activePartners}</p>
                <p className="text-xs text-muted-foreground">활성 파트너</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Filter className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-xs text-muted-foreground">카테고리</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10"><MapPin className="h-5 w-5 text-purple-500" /></div>
              <div>
                <p className="text-2xl font-bold">{regions.length}</p>
                <p className="text-xs text-muted-foreground">지역</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="업체명, 담당자, 지역 검색..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {categories.map((cat: any) => (
              <SelectItem key={cat.id} value={String(cat.id)}>{cat.nameKo || cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {regions.length > 0 && (
          <Select value={filterRegion || "all"} onValueChange={v => setFilterRegion(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px]"><MapPin className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 지역</SelectItem>
              {regions.map(r => <SelectItem key={r} value={r as string}>{r as string}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={`${sortBy}-${sortDir}`} onValueChange={v => {
          const [field, dir] = v.split("-") as ["name" | "rating" | "capacity", "asc" | "desc"];
          setSortBy(field); setSortDir(dir);
        }}>
          <SelectTrigger className="w-[170px]">
            <ArrowUpDown className="h-4 w-4 mr-1" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating-desc"><span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" />평점 높은 순</span></SelectItem>
            <SelectItem value="rating-asc"><span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" />평점 낮은 순</span></SelectItem>
            <SelectItem value="name-asc"><span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" />이름순 (ㄱ-ㅎ)</span></SelectItem>
            <SelectItem value="name-desc"><span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" />이름순 (ㅎ-ㄱ)</span></SelectItem>
            <SelectItem value="capacity-desc"><span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" />수용인원 많은 순</span></SelectItem>
            <SelectItem value="capacity-asc"><span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" />수용인원 적은 순</span></SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Partner Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map((partner: any) => {
          const IconComp = getCategoryIcon(partner.categoryId);
          return (
            <Card key={partner.id} className={`hover:shadow-md transition-shadow ${!partner.isActive ? "opacity-60" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <IconComp className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{partner.name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {getCategoryName(partner.categoryId)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(partner)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => { if (confirm(`"${partner.name}" 파트너를 삭제하시겠습니까?`)) deleteMutation.mutate({ id: partner.id }); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(partner.region || partner.country) && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {[partner.region, partner.country].filter(Boolean).join(", ")}
                  </div>
                )}
                {partner.contactName && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {partner.contactName} {partner.contactPhone && `(${partner.contactPhone})`}
                  </div>
                )}
                {partner.contactEmail && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{partner.contactEmail}</span>
                  </div>
                )}
                {partner.website && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <a href={partner.website} target="_blank" rel="noopener" className="text-blue-500 hover:underline truncate">{partner.website}</a>
                  </div>
                )}
                {partner.operatingHours && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {partner.operatingHours}
                  </div>
                )}
                {partner.capacity && partner.capacity > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    수용 {partner.capacity}명
                  </div>
                )}
                {partner.languages && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Languages className="h-3.5 w-3.5 shrink-0" />
                    {partner.languages}
                  </div>
                )}
                {partner.priceRange && (
                  <Badge variant="secondary" className="text-xs">{partner.priceRange}</Badge>
                )}
                {partner.rating && partner.rating > 0 && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < partner.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                    ))}
                  </div>
                )}
                {partner.description && (
                  <p className="text-muted-foreground text-xs line-clamp-2 mt-1">{partner.description}</p>
                )}
                <div className="flex items-center justify-between pt-1 border-t mt-2">
                  <Badge variant={partner.isActive ? "default" : "destructive"} className="text-xs">
                    {partner.isActive ? "활성" : "비활성"}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => toggleActive(partner)}>
                    {partner.isActive ? "비활성화" : "활성화"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {partners.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchTerm || filterCategory !== "all" || filterRegion ? "검색 결과가 없습니다" : "등록된 파트너가 없습니다"}
            </p>
            {!searchTerm && filterCategory === "all" && !filterRegion && (
              <Button className="mt-3" onClick={() => { setForm(emptyForm); setEditingId(null); setShowDialog(true); }}>
                첫 파트너 등록하기
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════════════════ Partner Create/Edit Dialog ════════════════════ */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); else setShowDialog(true); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "파트너 수정" : "새 파트너 등록"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>업체명 *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="파트너 업체명" />
            </div>
            <div>
              <Label>카테고리</Label>
              <Select value={String(form.categoryId || "0")} onValueChange={v => setForm({ ...form, categoryId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="카테고리 선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">미분류</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.nameKo || cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>지역</Label><Input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="예: 방콕" /></div>
              <div><Label>국가</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="예: 태국" /></div>
            </div>
            <div><Label>주소</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>담당자명</Label><Input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} /></div>
              <div><Label>{t("admin.partners.contact")}</Label><Input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} /></div>
            </div>
            <div><Label>{t("admin.partners.email")}</Label><Input value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} /></div>
            <div><Label>웹사이트</Label><Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>수용 인원</Label><Input type="number" value={form.capacity || ""} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
              <div><Label>가격대</Label><Input value={form.priceRange} onChange={e => setForm({ ...form, priceRange: e.target.value })} placeholder="예: $$" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>영업시간</Label><Input value={form.operatingHours} onChange={e => setForm({ ...form, operatingHours: e.target.value })} placeholder="예: 10:00-22:00" /></div>
              <div><Label>지원 언어</Label><Input value={form.languages} onChange={e => setForm({ ...form, languages: e.target.value })} placeholder="예: 한국어, 영어" /></div>
            </div>
            <div><Label>설명</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><Label>{t("admin.partners.notes")}</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>취소</Button>
            <Button
              disabled={!form.name || createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}
            >
              {createMutation.isPending || updateMutation.isPending ? "처리 중..." : editingId ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
