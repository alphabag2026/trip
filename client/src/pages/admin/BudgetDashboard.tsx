import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, PieChart, Plane, Hotel, Users, AlertTriangle, Download } from "lucide-react";

export default function BudgetDashboard() {
  const meetupsQ = trpc.meetup.list.useQuery();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);

  const budgetQ = trpc.budgetDashboard.summary.useQuery(
    { meetupId: selectedMeetupId! },
    { enabled: !!selectedMeetupId }
  );
  const tiersQ = trpc.attendeeTier.list.useQuery(
    { meetupId: selectedMeetupId! },
    { enabled: !!selectedMeetupId }
  );
  const expensesQ = trpc.expense.list.useQuery(
    { meetupId: selectedMeetupId! },
    { enabled: !!selectedMeetupId }
  );

  useEffect(() => {
    if (meetupsQ.data?.length && !selectedMeetupId) setSelectedMeetupId(meetupsQ.data[0].id);
  }, [meetupsQ.data, selectedMeetupId]);

  const budget = budgetQ.data;
  const utilization = budget?.budgetUtilization || 0;

  // Expense breakdown by category
  const expensesByCategory = (expensesQ.data || []).reduce((acc: Record<string, number>, exp: any) => {
    const cat = exp.category || "기타";
    acc[cat] = (acc[cat] || 0) + Number(exp.amount || 0);
    return acc;
  }, {});

  const totalExpenses = Object.values(expensesByCategory).reduce((sum, v) => sum + v, 0);

  const categoryColors: Record<string, string> = {
    "항공": "bg-blue-500", "숙소": "bg-green-500", "교통": "bg-purple-500",
    "식비": "bg-orange-500", "행사장": "bg-pink-500", "인건비": "bg-indigo-500",
    "기타": "bg-gray-500", "flight": "bg-blue-500", "hotel": "bg-green-500",
    "transport": "bg-purple-500", "food": "bg-orange-500", "venue": "bg-pink-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PieChart className="h-6 w-6 text-emerald-500" />
            Budget Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">이벤트 예산 실시간 추적 및 분석</p>
        </div>
        <Button variant="outline" onClick={() => {
          // CSV Export
          const rows = Object.entries(expensesByCategory).map(([cat, amount]) => `${cat},${amount}`);
          const csv = "Category,Amount\n" + rows.join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = "budget-report.csv"; a.click();
        }}>
          <Download className="h-4 w-4 mr-2" /> CSV 내보내기
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

      {selectedMeetupId && budget && (
        <>
          {/* Budget Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">전체 예산</p>
                    <p className="text-2xl font-bold">${budget.totalBudget.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">지출액</p>
                    <p className="text-2xl font-bold text-red-600">${budget.spentAmount.toLocaleString()}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">잔여 예산</p>
                    <p className="text-2xl font-bold text-green-600">${budget.remainingBudget.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={utilization > 90 ? "border-red-300" : utilization > 70 ? "border-yellow-300" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">사용률</p>
                    <p className={`text-2xl font-bold ${utilization > 90 ? "text-red-600" : utilization > 70 ? "text-yellow-600" : "text-emerald-600"}`}>{utilization}%</p>
                  </div>
                  {utilization > 90 ? <AlertTriangle className="h-8 w-8 text-red-500" /> : <PieChart className="h-8 w-8 text-emerald-500" />}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget Progress Bar */}
          <Card>
            <CardHeader>
              <CardTitle>예산 사용 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                <div
                  className={`h-6 rounded-full transition-all flex items-center justify-center text-xs text-white font-medium ${utilization > 90 ? "bg-red-500" : utilization > 70 ? "bg-yellow-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                >
                  {utilization > 15 && `${utilization}%`}
                </div>
              </div>
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>$0</span>
                <span>${budget.totalBudget.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>카테고리별 지출</CardTitle>
              <CardDescription>등록된 비용의 카테고리별 분류</CardDescription>
            </CardHeader>
            <CardContent>
              {totalExpenses > 0 ? (
                <div className="space-y-3">
                  {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
                    const pct = Math.round((amount / totalExpenses) * 100);
                    const colorClass = categoryColors[cat] || "bg-gray-500";
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{cat}</span>
                          <span className="text-sm text-muted-foreground">${amount.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p>아직 등록된 비용이 없습니다</p>
                  <p className="text-sm mt-1">비용 관리 페이지에서 비용을 등록하세요</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tier Budget Allocation */}
          {tiersQ.data && tiersQ.data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  등급별 예산 배분
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tiersQ.data.map((tier) => (
                    <div key={tier.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tier.color || "#6366f1" }} />
                        <div>
                          <p className="font-medium">{tier.tierName}</p>
                          <p className="text-xs text-muted-foreground">Lv.{tier.tierLevel}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-3">
                          {tier.maxFlightBudget && (
                            <Badge variant="outline" className="text-xs">
                              <Plane className="h-3 w-3 mr-1" />${Number(tier.maxFlightBudget).toLocaleString()}
                            </Badge>
                          )}
                          {tier.maxHotelBudgetPerNight && (
                            <Badge variant="outline" className="text-xs">
                              <Hotel className="h-3 w-3 mr-1" />${Number(tier.maxHotelBudgetPerNight).toLocaleString()}/박
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Policy Summary */}
          {budget.policy && (
            <Card>
              <CardHeader>
                <CardTitle>적용 중인 여행 정책</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">항공 클래스</p>
                    <p className="font-medium">{budget.policy.allowedFlightClass || "Economy"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">호텔 등급</p>
                    <p className="font-medium">{budget.policy.allowedHotelStars || 3}성 이상</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">최대 여행 일수</p>
                    <p className="font-medium">{budget.policy.maxTravelDays || "제한 없음"}일</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">승인 필요</p>
                    <p className="font-medium">{budget.policy.requireApproval ? "예" : "아니오"}</p>
                  </div>
                </div>
                {budget.policy.policyNotes && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{budget.policy.policyNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
