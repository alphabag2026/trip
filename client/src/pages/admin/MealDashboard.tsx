import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed, AlertTriangle, Wine, Cigarette, Users, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const MEAL_LABELS: Record<string, string> = {
  regular: "일반식", vegetarian: "채식", vegan: "비건", halal: "할랄",
  kosher: "코셔", "gluten-free": "글루텐프리", "no-seafood": "해산물제외", other: "기타",
};
const DRINK_LABELS: Record<string, string> = { yes: "음주", no: "비음주", sometimes: "가끔" };
const SMOKE_LABELS: Record<string, string> = { yes: "흡연", no: "비흡연" };

export default function MealDashboard() {
  const { t } = useTranslation();
  const [meetupId, setMeetupId] = useState<number | undefined>(undefined);
  const [allergySearch, setAllergySearch] = useState("");
  const meetups = trpc.meetup.list.useQuery();
  const stats = trpc.mealStats.get.useQuery({ meetupId });
  const registrations = trpc.registration.list.useQuery({ meetupId });

  const data = stats.data;
  const regs = registrations.data || [];

  // 알레르기 필터링
  const filteredRegs = allergySearch
    ? regs.filter(r => r.allergies?.toLowerCase().includes(allergySearch.toLowerCase()))
    : regs.filter(r => r.allergies);

  const exportCSV = () => {
    const rows = regs.map(r => [
      r.name, r.phone, r.mealPreference || "-", r.allergies || "-",
      DRINK_LABELS[r.drinkAlcohol || ""] || "-", SMOKE_LABELS[r.smoking || ""] || "-",
    ]);
    const csv = "\uFEFF이름,전화번호,식사선호,알레르기,음주,흡연\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "meal_stats.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">식사 / 알레르기 대시보드</h1>
          <p className="text-muted-foreground mt-1">참석자 식사 선호도와 알레르기 정보를 한눈에 확인합니다</p>
        </div>
        <div className="flex gap-2">
          <Select value={meetupId?.toString() || "all"} onValueChange={v => setMeetupId(v === "all" ? undefined : Number(v))}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="전체 밋업" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 밋업</SelectItem>
              {(meetups.data || []).map(m => (
                <SelectItem key={m.id} value={m.id.toString()}>{m.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg"><Users className="w-5 h-5 text-blue-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">총 참석자</p>
                <p className="text-2xl font-bold">{data?.total || 0}명</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg"><UtensilsCrossed className="w-5 h-5 text-orange-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t("admin.mealDashboard.mealType")}</p>
                <p className="text-2xl font-bold">{Object.keys(data?.mealPreferences || {}).length}종</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">알레르기 보유</p>
                <p className="text-2xl font-bold">{regs.filter(r => r.allergies).length}명</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg"><Wine className="w-5 h-5 text-purple-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">음주 가능</p>
                <p className="text-2xl font-bold">{(data?.drinkAlcohol?.["yes"] || 0) + (data?.drinkAlcohol?.["sometimes"] || 0)}명</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 식사 선호도 분포 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UtensilsCrossed className="w-5 h-5" />식사 선호도 분포</CardTitle>
            <CardDescription>참석자별 식사 유형 집계</CardDescription>
          </CardHeader>
          <CardContent>
            {data && Object.keys(data.mealPreferences).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.mealPreferences).sort((a, b) => b[1] - a[1]).map(([key, count]) => {
                  const pct = Math.round((count / data.total) * 100);
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{MEAL_LABELS[key] || key}</span>
                        <span className="text-muted-foreground">{count}명 ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">식사 선호도 데이터가 없습니다</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" />알레르기 현황</CardTitle>
            <CardDescription>알레르기 유형별 인원 집계</CardDescription>
          </CardHeader>
          <CardContent>
            {data && Object.keys(data.allergies).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.allergies).sort((a, b) => b[1] - a[1]).map(([key, count]) => (
                  <Badge key={key} variant="destructive" className="text-sm px-3 py-1">
                    {key} <span className="ml-1 opacity-80">({count}명)</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">알레르기 데이터가 없습니다</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 음주/흡연 분포 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wine className="w-5 h-5" />음주 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {data && Object.keys(data.drinkAlcohol).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.drinkAlcohol).sort((a, b) => b[1] - a[1]).map(([key, count]) => {
                  const pct = Math.round((count / data.total) * 100);
                  const colors: Record<string, string> = { yes: "bg-purple-500", sometimes: "bg-yellow-500", no: "bg-green-500" };
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{DRINK_LABELS[key] || key}</span>
                        <span className="text-muted-foreground">{count}명 ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${colors[key] || "bg-gray-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">음주 데이터가 없습니다</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Cigarette className="w-5 h-5" />흡연 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {data && Object.keys(data.smoking).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.smoking).sort((a, b) => b[1] - a[1]).map(([key, count]) => {
                  const pct = Math.round((count / data.total) * 100);
                  const colors: Record<string, string> = { yes: "bg-red-500", no: "bg-green-500" };
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{SMOKE_LABELS[key] || key}</span>
                        <span className="text-muted-foreground">{count}명 ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${colors[key] || "bg-gray-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">흡연 데이터가 없습니다</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 알레르기 보유자 명단 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" />알레르기 보유자 명단</CardTitle>
          <CardDescription>알레르기 정보가 있는 참석자를 검색하고 확인합니다</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="알레르기 검색 (예: 땅콩, 갑각류...)"
              value={allergySearch}
              onChange={e => setAllergySearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredRegs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">이름</th>
                    <th className="text-left py-2 px-3 font-medium">전화번호</th>
                    <th className="text-left py-2 px-3 font-medium">식사 선호</th>
                    <th className="text-left py-2 px-3 font-medium">알레르기</th>
                    <th className="text-left py-2 px-3 font-medium">음주</th>
                    <th className="text-left py-2 px-3 font-medium">흡연</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegs.map(r => (
                    <tr key={r.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{r.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{r.phone}</td>
                      <td className="py-2 px-3">
                        {r.mealPreference ? (
                          <Badge variant="secondary">{MEAL_LABELS[r.mealPreference] || r.mealPreference}</Badge>
                        ) : "-"}
                      </td>
                      <td className="py-2 px-3">
                        {r.allergies ? (
                          <div className="flex flex-wrap gap-1">
                            {r.allergies.split(/[,，、]/).map((a, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">{a.trim()}</Badge>
                            ))}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="py-2 px-3">{DRINK_LABELS[r.drinkAlcohol || ""] || "-"}</td>
                      <td className="py-2 px-3">{SMOKE_LABELS[r.smoking || ""] || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {allergySearch ? "검색 결과가 없습니다" : "알레르기 정보가 있는 참석자가 없습니다"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
