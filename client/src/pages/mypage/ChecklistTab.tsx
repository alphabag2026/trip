import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BookOpen, Shield, Hotel, Plane, Loader2, Globe, CheckCircle, AlertTriangle,
  ClipboardCheck, ListChecks, FileText, Info, Edit2, Plus, Trash2, RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ChecklistTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [customItemTitle, setCustomItemTitle] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);

  const immigrationQuery = trpc.immigration.myStatus.useQuery(undefined, { enabled: !!user });
  const countriesQuery = trpc.checklist.countries.useQuery();
  const checklistQuery = trpc.checklist.myChecklist.useQuery(
    { countryCode: selectedCountry },
    { enabled: !!user && !!selectedCountry }
  );
  const toggleItemMut = trpc.checklist.toggleItem.useMutation({
    onSuccess: () => checklistQuery.refetch(),
  });
  const addCustomMut = trpc.checklist.addCustomItem.useMutation({
    onSuccess: () => { checklistQuery.refetch(); setCustomItemTitle(""); setShowAddCustom(false); toast.success(t("myPage.t21", "항목이 추가되었습니다")); },
  });
  const deleteCustomMut = trpc.checklist.deleteCustomItem.useMutation({
    onSuccess: () => { checklistQuery.refetch(); toast.success(t("myPage.t22", "항목이 삭제되었습니다")); },
  });
  const resetMut = trpc.checklist.reset.useMutation({
    onSuccess: () => { checklistQuery.refetch(); toast.success(t("myPage.t23", "체크리스트가 초기화되었습니다")); },
  });

  return (
    <div className="space-y-4">
      {/* 기본 준비 상태 카드 */}
      {(() => {
        const imm = immigrationQuery.data;
        const hasPassport = !!imm?.passport?.passportNumber;
        const passportExpiry = imm?.passport?.expiryDate;
        const isPassportValid = passportExpiry ? new Date(passportExpiry) > new Date() : false;
        const hasVoucher = (imm?.vouchers?.length || 0) > 0;
        const hasTicket = (imm?.tickets?.length || 0) > 0;
        const hasReturnTicket = imm?.tickets?.some((t: any) => t.returnFlightNo);
        const basicItems = [
          { label: "여권 등록", done: hasPassport, icon: BookOpen },
          { label: "여권 유효", done: isPassportValid, icon: Shield },
          { label: "호텔 바우처", done: hasVoucher, icon: Hotel },
          { label: "항공권", done: hasTicket, icon: Plane },
          { label: "왕복 항공권", done: !!hasReturnTicket, icon: Plane },
        ];
        const doneCount = basicItems.filter(i => i.done).length;
        return (
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  {t("myPage.t16", "기본 준비 상태")}
                </h3>
                <Badge variant={doneCount === 5 ? "default" : "secondary"}>{doneCount}/5</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 mb-3">
                <div className={`h-2.5 rounded-full transition-all duration-500 ${doneCount === 5 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${(doneCount / 5) * 100}%` }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {basicItems.map((item, i) => (
                  <div key={i} className={`flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5 ${item.done ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"}`}>
                    {item.done ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {item.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* 국가별 입국 심사 체크리스트 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              {t("myPage.t17", "국가별 입국 심사 체크리스트")}
            </h3>
          </div>
          <div className="flex gap-2 mb-4">
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("myPage.t30", "목적지 국가를 선택하세요")} />
              </SelectTrigger>
              <SelectContent>
                {(countriesQuery.data || []).map((c: any) => (
                  <SelectItem key={c.countryCode} value={c.countryCode}>
                    {c.countryName} ({c.countryCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCountry && (
              <Button variant="outline" size="icon" onClick={() => resetMut.mutate({ countryCode: selectedCountry })} title={t("myPage.t32", "초기화")}>
                <RotateCw className="w-4 h-4" />
              </Button>
            )}
          </div>

          {!selectedCountry && (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>목적지 국가를 선택하면<br />{t("myPage.t18", "입국 시 필요한 서류와 준비물을 확인할 수 있습니다.")}</p>
            </div>
          )}

          {selectedCountry && checklistQuery.isLoading && (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          )}

          {selectedCountry && checklistQuery.data && (() => {
            const items = checklistQuery.data as any[];
            const totalCount = items.length;
            const checkedCount = items.filter((i: any) => i.isChecked).length;
            const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

            const categoryMap: Record<string, { label: string; icon: any; color: string }> = {
              required_docs: { label: "필수 서류", icon: FileText, color: "text-red-500" },
              recommended_items: { label: "권장 준비물", icon: ClipboardCheck, color: "text-blue-500" },
              tips: { label: "입국 시 주의사항", icon: Info, color: "text-amber-500" },
              custom: { label: "내 항목", icon: Edit2, color: "text-purple-500" },
            };

            const grouped = items.reduce((acc: any, item: any) => {
              const cat = item.category || "custom";
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(item);
              return acc;
            }, {} as Record<string, any[]>);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{checkedCount}/{totalCount} {t("myPage.t19", "완료")}</span>
                  <span className={`text-sm font-bold ${progressPct === 100 ? 'text-green-500' : 'text-primary'}`}>{progressPct}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${progressPct === 100 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${progressPct}%` }} />
                </div>

                {Object.entries(categoryMap).map(([catKey, catInfo]) => {
                  const catItems = grouped[catKey];
                  if (!catItems?.length) return null;
                  const CatIcon = catInfo.icon;
                  return (
                    <div key={catKey}>
                      <h4 className={`font-semibold text-sm mb-2 flex items-center gap-1.5 ${catInfo.color}`}>
                        <CatIcon className="w-4 h-4" />{catInfo.label}
                      </h4>
                      <div className="space-y-1">
                        {catItems.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <button
                              onClick={() => toggleItemMut.mutate({ itemId: item.id })}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${item.isChecked ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/30"}`}
                            >
                              {item.isChecked && <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                            <span className={`text-sm flex-1 ${item.isChecked ? "line-through text-muted-foreground" : ""}`}>
                              {item.title}
                            </span>
                            {item.description && (
                              <span className="text-xs text-muted-foreground hidden sm:inline max-w-[200px] truncate">{item.description}</span>
                            )}
                            {catKey === "custom" && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteCustomMut.mutate({ itemId: item.id })}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* 커스텀 항목 추가 */}
                <div className="pt-2 border-t">
                  {showAddCustom ? (
                    <div className="flex gap-2">
                      <Input
                        value={customItemTitle}
                        onChange={e => setCustomItemTitle(e.target.value)}
                        placeholder={t("myPage.t20", "추가할 항목을 입력하세요")}
                        className="flex-1"
                        onKeyDown={e => {
                          if (e.key === "Enter" && customItemTitle.trim()) {
                            addCustomMut.mutate({ countryCode: selectedCountry, title: customItemTitle.trim() });
                          }
                        }}
                      />
                      <Button size="sm" onClick={() => {
                        if (customItemTitle.trim()) addCustomMut.mutate({ countryCode: selectedCountry, title: customItemTitle.trim() });
                      }} disabled={addCustomMut.isPending}>
                        {addCustomMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setShowAddCustom(false); setCustomItemTitle(""); }}>
                        {t("myPage.cancel")}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowAddCustom(true)} className="gap-1">
                      <Plus className="w-4 h-4" />{t("myPage.t20b", "항목 추가")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
