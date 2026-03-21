import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Eye, Users, ShieldCheck, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function AdminPassportList() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [meetupFilter, setMeetupFilter] = useState("all");
  const [selectedPerson, setSelectedPerson] = useState<any>(null);

  const { data: meetups } = trpc.meetup.list.useQuery({});
  const { data: passportList, isLoading } = trpc.passportList.getByMeetup.useQuery(
    { meetupId: meetupFilter !== "all" ? Number(meetupFilter) : undefined },
  );

  const filtered = useMemo(() => {
    if (!passportList) return [];
    if (!search) return passportList;
    const q = search.toLowerCase();
    return passportList.filter((p: any) =>
      (p.regName || "").toLowerCase().includes(q) ||
      (p.passportFullName || "").toLowerCase().includes(q) ||
      (p.passportNumber || "").toLowerCase().includes(q) ||
      (p.regTeamName || "").toLowerCase().includes(q) ||
      (p.regPhone || "").includes(q)
    );
  }, [passportList, search]);

  const stats = useMemo(() => {
    if (!passportList) return { total: 0, withPassport: 0, verified: 0, expired: 0 };
    const total = passportList.length;
    const withPassport = passportList.filter((p: any) => p.passportNumber).length;
    const verified = passportList.filter((p: any) => p.passportVerified).length;
    const today = new Date().toISOString().slice(0, 10);
    const expired = passportList.filter((p: any) => p.passportExpiryDate && p.passportExpiryDate < today).length;
    return { total, withPassport, verified, expired };
  }, [passportList]);

  const handleExportCSV = () => {
    if (!filtered.length) return toast.error("내보낼 데이터가 없습니다");
    const headers = ["이름", "팀", "전화번호", "여권 영문명", "여권번호", "국적", "생년월일", "성별", "만료일", "발급국", "상태"];
    const rows = filtered.map((p: any) => [
      p.regName, p.regTeamName || "", p.regPhone, p.passportFullName || "", p.passportNumber || "",
      p.passportNationality || "", p.passportBirthDate || "", p.passportGender || "",
      p.passportExpiryDate || "", p.passportIssuingCountry || "", p.regStatus,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map((v: string) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `passport-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV 다운로드 완료");
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const exp = new Date(date);
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    return exp < sixMonths;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">출장자 여권 명단</h1>
        <Button onClick={handleExportCSV} variant="outline" size="sm">
          <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV 내보내기
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">전체 출장자</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{stats.withPassport}</div>
              <div className="text-sm text-muted-foreground">여권 등록</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
            <div>
              <div className="text-2xl font-bold">{stats.verified}</div>
              <div className="text-sm text-muted-foreground">인증 완료</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{stats.expired}</div>
              <div className="text-sm text-muted-foreground">만료됨</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="이름, 여권번호, 팀명, 전화번호 검색..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={meetupFilter} onValueChange={setMeetupFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="밋업 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 밋업</SelectItem>
            {meetups?.map((m: any) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">이름</th>
                  <th className="text-left p-3 font-medium">팀</th>
                  <th className="text-left p-3 font-medium">여권 영문명</th>
                  <th className="text-left p-3 font-medium">여권번호</th>
                  <th className="text-left p-3 font-medium">국적</th>
                  <th className="text-left p-3 font-medium">만료일</th>
                  <th className="text-left p-3 font-medium">상태</th>
                  <th className="text-center p-3 font-medium">상세</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">데이터가 없습니다</td></tr>
                ) : filtered.map((p: any) => (
                  <tr key={p.regId} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{p.regName}</td>
                    <td className="p-3 text-muted-foreground">{p.regTeamName || "-"}</td>
                    <td className="p-3">{p.passportFullName || <span className="text-muted-foreground">미등록</span>}</td>
                    <td className="p-3 font-mono text-xs">{p.passportNumber || <span className="text-muted-foreground">-</span>}</td>
                    <td className="p-3">{p.passportNationality || "-"}</td>
                    <td className="p-3">
                      {p.passportExpiryDate ? (
                        <span className={isExpiringSoon(p.passportExpiryDate) ? "text-red-500 font-medium" : ""}>
                          {p.passportExpiryDate}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="p-3">
                      {p.passportVerified ? (
                        <Badge variant="default" className="bg-emerald-600">인증</Badge>
                      ) : p.passportNumber ? (
                        <Badge variant="secondary">미인증</Badge>
                      ) : (
                        <Badge variant="outline">미등록</Badge>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPerson(p)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 상세 다이얼로그 */}
      <Dialog open={!!selectedPerson} onOpenChange={() => setSelectedPerson(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>출장자 상세 정보</DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">신청자명</div>
                  <div className="font-medium">{selectedPerson.regName}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">팀</div>
                  <div className="font-medium">{selectedPerson.regTeamName || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">전화번호</div>
                  <div className="font-medium">{selectedPerson.regPhone}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">메신저 ID</div>
                  <div className="font-medium">{selectedPerson.regMessengerId}</div>
                </div>
              </div>

              <hr />
              <h3 className="font-semibold">여권 정보</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">영문 이름</div>
                  <div className="font-medium">{selectedPerson.passportFullName || "미등록"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">여권번호</div>
                  <div className="font-mono font-medium">{selectedPerson.passportNumber || "미등록"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">국적</div>
                  <div className="font-medium">{selectedPerson.passportNationality || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">발급국</div>
                  <div className="font-medium">{selectedPerson.passportIssuingCountry || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">생년월일</div>
                  <div className="font-medium">{selectedPerson.passportBirthDate || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">성별</div>
                  <div className="font-medium">{selectedPerson.passportGender === "M" ? "남성" : selectedPerson.passportGender === "F" ? "여성" : "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">만료일</div>
                  <div className={`font-medium ${isExpiringSoon(selectedPerson.passportExpiryDate) ? "text-red-500" : ""}`}>
                    {selectedPerson.passportExpiryDate || "-"}
                    {isExpiringSoon(selectedPerson.passportExpiryDate) && " (만료 임박)"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">인증 상태</div>
                  <div>{selectedPerson.passportVerified ? <Badge className="bg-emerald-600">인증 완료</Badge> : <Badge variant="secondary">미인증</Badge>}</div>
                </div>
              </div>

              {selectedPerson.passportImageUrl && (
                <div>
                  <div className="text-muted-foreground mb-2 text-sm">여권 이미지</div>
                  <img src={selectedPerson.passportImageUrl} alt="Passport" className="w-full rounded-lg border" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">소속</div>
                  <div className="font-medium">{selectedPerson.profileOrganization || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">텔레그램 ID</div>
                  <div className="font-medium">{selectedPerson.profileTelegramId || "-"}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
