import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Image, Plus, Edit, Trash2, ExternalLink, MousePointerClick, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

const positionLabels: Record<string, string> = {
  hero_top: "히어로 상단",
  middle_left: "중간 왼쪽",
  middle_right: "중간 오른쪽",
  bottom: "하단",
  sidebar: "사이드바",
};

const emptyBanner = {
  position: "hero_top" as "hero_top" | "middle_left" | "middle_right" | "bottom" | "sidebar",
  title: "",
  description: "",
  imageUrl: "",
  linkUrl: "",
  linkText: "",
  isActive: true,
  sortOrder: 0,
};

export default function AdBanners() {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyBanner);
  const [filterPosition, setFilterPosition] = useState<string>("all");

  const utils = trpc.useUtils();
  const bannersQuery = trpc.adBanner.list.useQuery({
    position: filterPosition === "all" ? undefined : filterPosition,
  });

  const createMutation = trpc.adBanner.create.useMutation({
    onSuccess: () => {
      toast.success(t("admin.adBanners.t27", "배너가 생성되었습니다"));
      utils.adBanner.list.invalidate();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.adBanner.update.useMutation({
    onSuccess: () => {
      toast.success(t("admin.adBanners.t28", "배너가 수정되었습니다"));
      utils.adBanner.list.invalidate();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.adBanner.delete.useMutation({
    onSuccess: () => {
      toast.success(t("admin.adBanners.t29", "배너가 삭제되었습니다"));
      utils.adBanner.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function closeDialog() {
    setShowDialog(false);
    setEditingId(null);
    setForm(emptyBanner);
  }

  function openEdit(banner: any) {
    setForm({
      position: banner.position,
      title: banner.title || "",
      description: banner.description || "",
      imageUrl: banner.imageUrl || "",
      linkUrl: banner.linkUrl || "",
      linkText: banner.linkText || "",
      isActive: banner.isActive ?? true,
      sortOrder: banner.sortOrder || 0,
    });
    setEditingId(banner.id);
    setShowDialog(true);
  }

  function handleSubmit() {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  const banners = bannersQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Image className="h-7 w-7 text-blue-600" />
            {t("admin.adBanners.t1", "광고 배너 관리")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("admin.adBanners.t2", "홈페이지에 표시되는 광고 배너를 관리합니다")}</p>
        </div>
        <Button onClick={() => { setForm(emptyBanner); setEditingId(null); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          {t("admin.adBanners.t3", "새 배너")}
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterPosition} onValueChange={setFilterPosition}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("admin.adBanners.t30", "위치 필터")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.adBanners.t4", "전체 위치")}</SelectItem>
            <SelectItem value="hero_top">{t("admin.adBanners.t5", "히어로 상단")}</SelectItem>
            <SelectItem value="middle_left">{t("admin.adBanners.t6", "중간 왼쪽")}</SelectItem>
            <SelectItem value="middle_right">{t("admin.adBanners.t7", "중간 오른쪽")}</SelectItem>
            <SelectItem value="bottom">{t("admin.adBanners.t8", "하단")}</SelectItem>
            <SelectItem value="sidebar">{t("admin.adBanners.t9", "사이드바")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          총 {banners.length}개 배너
        </span>
      </div>

      {/* Banner List */}
      <div className="grid gap-4">
        {banners.length > 0 ? (
          banners.map((banner: any) => (
            <Card key={banner.id} className={`hover:shadow-md transition-shadow ${!banner.isActive ? "opacity-60" : ""}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-40 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                    {banner.imageUrl ? (
                      <img loading="lazy" decoding="async"
                        src={banner.imageUrl}
                        alt={banner.title || "배너"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{banner.title || "제목 없음"}</span>
                      <Badge variant="outline">{positionLabels[banner.position] || banner.position}</Badge>
                      {banner.isActive ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          <Eye className="h-3 w-3 mr-1" />{t("admin.adBanners.t10", "활성")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="h-3 w-3 mr-1" />{t("admin.adBanners.t11", "비활성")}
                        </Badge>
                      )}
                    </div>
                    {banner.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{banner.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {banner.linkUrl && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {banner.linkUrl.substring(0, 40)}...
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="h-3 w-3" />
                        클릭: {banner.clickCount || 0}
                      </span>
                      <span>순서: {banner.sortOrder || 0}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(banner)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm("이 배너를 삭제하시겠습니까?")) {
                          deleteMutation.mutate({ id: banner.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Image className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("admin.adBanners.t12", "등록된 배너가 없습니다")}</p>
              <Button className="mt-4" onClick={() => { setForm(emptyBanner); setShowDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                {t("admin.adBanners.t13", "첫 배너 만들기")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "배너 수정" : "새 배너 등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>{t("admin.adBanners.t14", "위치 *")}</Label>
              <Select value={form.position} onValueChange={(v: any) => setForm({ ...form, position: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero_top">{t("admin.adBanners.t15", "히어로 상단")}</SelectItem>
                  <SelectItem value="middle_left">{t("admin.adBanners.t16", "중간 왼쪽")}</SelectItem>
                  <SelectItem value="middle_right">{t("admin.adBanners.t17", "중간 오른쪽")}</SelectItem>
                  <SelectItem value="bottom">{t("admin.adBanners.t18", "하단")}</SelectItem>
                  <SelectItem value="sidebar">{t("admin.adBanners.t19", "사이드바")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("admin.adBanners.t20", "제목")}</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t("admin.adBanners.t31", "배너 제목")} />
            </div>
            <div>
              <Label>{t("admin.adBanners.t21", "설명")}</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder={t("admin.adBanners.t32", "배너 설명 (선택)")} />
            </div>
            <div>
              <Label>{t("admin.adBanners.t22", "이미지 URL *")}</Label>
              <Input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
              {form.imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border">
                  <img loading="lazy" decoding="async" src={form.imageUrl} alt="미리보기" className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>
            <div>
              <Label>{t("admin.adBanners.t23", "링크 URL")}</Label>
              <Input value={form.linkUrl} onChange={e => setForm({ ...form, linkUrl: e.target.value })} placeholder={t("admin.adBanners.t33", "클릭 시 이동할 URL")} />
            </div>
            <div>
              <Label>{t("admin.adBanners.t24", "링크 텍스트")}</Label>
              <Input value={form.linkText} onChange={e => setForm({ ...form, linkText: e.target.value })} placeholder={t("admin.adBanners.t34", "예: 자세히 보기")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("admin.adBanners.t25", "정렬 순서")}</Label>
                <Input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label>{form.isActive ? "활성" : "비활성"}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t("admin.adBanners.t26", "취소")}</Button>
            <Button
              disabled={!form.imageUrl || createMutation.isPending || updateMutation.isPending}
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
