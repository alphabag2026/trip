import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, Edit2, DollarSign, Plane, Hotel, Car, UtensilsCrossed,
  Gift, FileSpreadsheet, ShieldCheck, Receipt, Users, PieChart
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  flight: { label: "항공", icon: Plane, color: "bg-blue-500" },
  hotel: { label: "숙박", icon: Hotel, color: "bg-purple-500" },
  transport: { label: "교통", icon: Car, color: "bg-cyan-500" },
  meal: { label: "식사", icon: UtensilsCrossed, color: "bg-orange-500" },
  venue: { label: "장소", icon: ShieldCheck, color: "bg-green-500" },
  gift: { label: "선물", icon: Gift, color: "bg-pink-500" },
  visa: { label: "비자", icon: FileSpreadsheet, color: "bg-indigo-500" },
  insurance: { label: "보험", icon: ShieldCheck, color: "bg-teal-500" },
  misc: { label: "기타", icon: Receipt, color: "bg-gray-500" },
};

const CURRENCIES = ["KRW", "USD", "THB", "VND", "JPY", "PHP", "IDR", "SGD", "CNY", "EUR"];

export default function AdminExpenses() {
  const { t } = useTranslation();
  const [meetupFilter, setMeetupFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [form, setForm] = useState({
    meetupId: 0, category: "misc" as string, title: "", description: "",
    amount: 0, currency: "KRW", paidBy: "", paidFor: "", expenseDate: "",
    receiptUrl: "", receiptKey: "", registeredVia: "web" as string,
  });

  const { data: meetups } = trpc.meetup.list.useQuery({});
  const selectedMeetupId = meetupFilter !== "all" ? Number(meetupFilter) : null;

  const { data: expenses, refetch } = trpc.expense.list.useQuery(
    { meetupId: selectedMeetupId || 0 },
    { enabled: !!selectedMeetupId }
  );
  const { data: allExpenses, refetch: refetchAll } = trpc.expense.listAll.useQuery(
    undefined,
    { enabled: !selectedMeetupId }
  );
  const { data: summary } = trpc.expense.summary.useQuery(
    { meetupId: selectedMeetupId || 0 },
    { enabled: !!selectedMeetupId }
  );

  const createMut = trpc.expense.create.useMutation({
    onSuccess: () => { toast.success(t("admin.expenses.t33", "비용 등록 완료")); setShowAddDialog(false); refetch(); refetchAll(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.expense.update.useMutation({
    onSuccess: () => { toast.success(t("admin.expenses.t34", "비용 수정 완료")); setEditingExpense(null); refetch(); refetchAll(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.expense.delete.useMutation({
    onSuccess: () => { toast.success(t("admin.expenses.t35", "비용 삭제 완료")); refetch(); refetchAll(); },
    onError: (e) => toast.error(e.message),
  });

  const displayExpenses = selectedMeetupId ? expenses : allExpenses;

  const filtered = useMemo(() => {
    if (!displayExpenses) return [];
    if (categoryFilter === "all") return displayExpenses;
    return displayExpenses.filter((e: any) => e.category === categoryFilter);
  }, [displayExpenses, categoryFilter]);

  const resetForm = () => setForm({
    meetupId: selectedMeetupId || 0, category: "misc", title: "", description: "",
    amount: 0, currency: "KRW", paidBy: "", paidFor: "", expenseDate: "",
    receiptUrl: "", receiptKey: "", registeredVia: "web",
  });

  const handleAdd = () => {
    if (!form.meetupId) return toast.error(t("admin.expenses.t36", "밋업을 선택해주세요"));
    if (!form.title) return toast.error(t("admin.expenses.t37", "항목명을 입력해주세요"));
    if (form.amount <= 0) return toast.error(t("admin.expenses.t38", "금액을 입력해주세요"));
    createMut.mutate(form as any);
  };

  const handleUpdate = () => {
    if (!editingExpense) return;
    const { meetupId, registeredVia, ...updateData } = form;
    updateMut.mutate({ id: editingExpense.id, ...updateData } as any);
  };

  const openEdit = (exp: any) => {
    setForm({
      meetupId: exp.meetupId, category: exp.category, title: exp.title,
      description: exp.description || "", amount: exp.amount, currency: exp.currency,
      paidBy: exp.paidBy || "", paidFor: exp.paidFor || "", expenseDate: exp.expenseDate || "",
      receiptUrl: exp.receiptUrl || "", receiptKey: exp.receiptKey || "", registeredVia: exp.registeredVia,
    });
    setEditingExpense(exp);
  };

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("ko-KR", { style: "currency", currency }).format(amount);
    } catch {
      return `${amount.toLocaleString()} ${currency}`;
    }
  };

  const totalAmount = useMemo(() => {
    if (!filtered) return 0;
    return filtered.reduce((sum: number, e: any) => sum + e.amount, 0);
  }, [filtered]);

  const handleExportCSV = () => {
    if (!filtered.length) return toast.error(t("admin.expenses.t39", "내보낼 데이터가 없습니다"));
    const headers = ["날짜", "카테고리", "항목", "설명", "금액", "통화", "지출자", "대상", "등록경로"];
    const rows = filtered.map((e: any) => [
      e.expenseDate || "", CATEGORY_CONFIG[e.category]?.label || e.category,
      e.title, e.description || "", e.amount, e.currency,
      e.paidBy || "", e.paidFor || "", e.registeredVia,
    ]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.map((v: any) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(t("admin.expenses.t40", "CSV 다운로드 완료"));
  };

  const ExpenseForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("admin.expenses.t1", "밋업 *")}</Label>
          <Select value={String(form.meetupId || "")} onValueChange={v => setForm(f => ({ ...f, meetupId: Number(v) }))}>
            <SelectTrigger><SelectValue placeholder={t("admin.expenses.t41", "밋업 선택")} /></SelectTrigger>
            <SelectContent>
              {meetups?.map((m: any) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("admin.expenses.t2", "카테고리 *")}</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>{t("admin.expenses.t3", "항목명 *")}</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t("admin.expenses.t42", "예: 방콕행 항공권")} />
      </div>
      <div>
        <Label>{t("admin.expenses.t4", "설명")}</Label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t("admin.expenses.t43", "상세 내용")} rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("admin.expenses.t5", "금액 *")}</Label>
          <Input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} placeholder="0" />
        </div>
        <div>
          <Label>{t("admin.expenses.t6", "통화")}</Label>
          <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("admin.expenses.t7", "지출자")}</Label>
          <Input value={form.paidBy} onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))} placeholder={t("admin.expenses.t44", "주최측 담당자명")} />
        </div>
        <div>
          <Label>{t("admin.expenses.t8", "대상 (팀/개인)")}</Label>
          <Input value={form.paidFor} onChange={e => setForm(f => ({ ...f, paidFor: e.target.value }))} placeholder={t("admin.expenses.t45", "팀A, 홍길동")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("admin.expenses.t9", "지출일")}</Label>
          <Input type="date" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} />
        </div>
        <div>
          <Label>{t("admin.expenses.t10", "등록 경로")}</Label>
          <Select value={form.registeredVia} onValueChange={v => setForm(f => ({ ...f, registeredVia: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="web">{t("admin.expenses.t11", "웹")}</SelectItem>
              <SelectItem value="telegram">{t("admin.expenses.t12", "텔레그램")}</SelectItem>
              <SelectItem value="qr_scan">{t("admin.expenses.t13", "QR 스캔")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onSubmit} disabled={createMut.isPending || updateMut.isPending}>
          {(createMut.isPending || updateMut.isPending) ? "처리 중..." : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t("admin.expenses.t14", "비용 사용 내역")}</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button onClick={() => { resetForm(); setShowAddDialog(true); }} size="sm">
            <Plus className="w-4 h-4 mr-2" /> {t("admin.expenses.t15", "비용 등록")}
          </Button>
        </div>
      </div>

      {/* 요약 카드 */}
      {summary && selectedMeetupId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-xl font-bold">{formatAmount(summary.total, "KRW")}</div>
                <div className="text-sm text-muted-foreground">{t("admin.expenses.t16", "총 지출")}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Receipt className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-xl font-bold">{summary.count}건</div>
                <div className="text-sm text-muted-foreground">{t("admin.expenses.t17", "지출 건수")}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-xl font-bold">{summary.participantCount}명</div>
                <div className="text-sm text-muted-foreground">{t("admin.expenses.t18", "참가자")}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <PieChart className="w-8 h-8 text-orange-500" />
              <div>
                <div className="text-xl font-bold">{formatAmount(summary.perPerson, "KRW")}</div>
                <div className="text-sm text-muted-foreground">{t("admin.expenses.t19", "1인당 비용")}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 카테고리별 분석 */}
      {summary && selectedMeetupId && summary.byCategory.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("admin.expenses.t20", "카테고리별 지출")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.byCategory.sort((a: any, b: any) => b.amount - a.amount).map((cat: any) => {
                const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.misc;
                const percent = summary.total > 0 ? Math.round((cat.amount / summary.total) * 100) : 0;
                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white`}>
                      <config.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{config.label}</span>
                        <span>{formatAmount(cat.amount, "KRW")} ({percent}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${config.color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={meetupFilter} onValueChange={setMeetupFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t("admin.expenses.t46", "밋업 선택")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.expenses.t21", "전체 밋업")}</SelectItem>
            {meetups?.map((m: any) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder={t("admin.expenses.t47", "카테고리")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.expenses.t22", "전체 카테고리")}</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 비용 목록 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">{t("admin.expenses.t23", "날짜")}</th>
                  <th className="text-left p-3 font-medium">{t("admin.expenses.t24", "카테고리")}</th>
                  <th className="text-left p-3 font-medium">{t("admin.expenses.t25", "항목")}</th>
                  <th className="text-left p-3 font-medium">{t("admin.expenses.t26", "대상")}</th>
                  <th className="text-right p-3 font-medium">{t("admin.expenses.t27", "금액")}</th>
                  <th className="text-center p-3 font-medium">{t("admin.expenses.t28", "경로")}</th>
                  <th className="text-center p-3 font-medium">{t("admin.expenses.t29", "관리")}</th>
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">
                    {!selectedMeetupId ? "밋업을 선택하거나 전체 내역을 확인하세요" : "등록된 비용이 없습니다"}
                  </td></tr>
                ) : filtered.map((e: any) => {
                  const config = CATEGORY_CONFIG[e.category] || CATEGORY_CONFIG.misc;
                  return (
                    <tr key={e.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground">{e.expenseDate || "-"}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="gap-1">
                          <config.icon className="w-3 h-3" /> {config.label}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{e.title}</td>
                      <td className="p-3 text-muted-foreground">{e.paidFor || "-"}</td>
                      <td className="p-3 text-right font-mono font-medium">{formatAmount(e.amount, e.currency)}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {e.registeredVia === "telegram" ? "TG" : e.registeredVia === "qr_scan" ? "QR" : "웹"}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                            if (confirm("이 비용을 삭제하시겠습니까?")) deleteMut.mutate({ id: e.id });
                          }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 bg-muted/30">
                    <td colSpan={4} className="p-3 font-semibold text-right">{t("admin.expenses.t30", "합계")}</td>
                    <td className="p-3 text-right font-mono font-bold">{formatAmount(totalAmount, "KRW")}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 비용 등록 다이얼로그 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.expenses.t31", "비용 등록")}</DialogTitle>
          </DialogHeader>
          <ExpenseForm onSubmit={handleAdd} submitLabel="등록" />
        </DialogContent>
      </Dialog>

      {/* 비용 수정 다이얼로그 */}
      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.expenses.t32", "비용 수정")}</DialogTitle>
          </DialogHeader>
          <ExpenseForm onSubmit={handleUpdate} submitLabel="수정" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
