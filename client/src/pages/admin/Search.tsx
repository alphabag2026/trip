import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Users, Link2, Network } from "lucide-react";

export default function AdminSearch() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const { data: results, refetch, isLoading } = trpc.registration.list.useQuery(
    { search: query },
    { enabled: false }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearched(true);
    refetch();
  };

  // Build relationship graph from results
  const relationships = useMemo(() => {
    if (!results || results.length === 0) return [];
    const links: { from: string; to: string; type: string }[] = [];
    const byTeam = new Map<string, any[]>();
    const byReferrer = new Map<string, any[]>();

    results.forEach((r: any) => {
      if (r.teamName) {
        if (!byTeam.has(r.teamName)) byTeam.set(r.teamName, []);
        byTeam.get(r.teamName)!.push(r);
      }
      if (r.referrerName) {
        if (!byReferrer.has(r.referrerName)) byReferrer.set(r.referrerName, []);
        byReferrer.get(r.referrerName)!.push(r);
      }
    });

    byTeam.forEach((members, team) => {
      if (members.length > 1) {
        for (let i = 0; i < members.length; i++) {
          for (let j = i + 1; j < members.length; j++) {
            links.push({ from: members[i].name, to: members[j].name, type: `같은 팀: ${team}` });
          }
        }
      }
    });

    byReferrer.forEach((referred, referrer) => {
      referred.forEach(r => {
        links.push({ from: referrer, to: r.name, type: "추천" });
      });
    });

    return links;
  }, [results]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">검색 및 연관성 분석</h1>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="이름, 전화번호, 메신저, 팀명, 추천자, 지갑주소, 비고 검색..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <Button type="submit" disabled={isLoading}>
          <SearchIcon className="h-4 w-4 mr-2" />검색
        </Button>
      </form>

      {searched && results && (
        <>
          <div className="text-sm text-muted-foreground">{results.length}건의 결과</div>

          {/* Relationship Graph */}
          {relationships.length > 0 && (
            <Card className="bg-card border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Network className="h-5 w-5 text-primary" />
                  연관성 분석 ({relationships.length}건)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relationships.map((rel, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm bg-secondary/50 rounded-lg p-3">
                      <span className="font-medium text-primary">{rel.from}</span>
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-primary">{rel.to}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary ml-auto">{rel.type}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Table */}
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-4">이름</th>
                      <th className="text-left py-3 px-4">구분</th>
                      <th className="text-left py-3 px-4">전화번호</th>
                      <th className="text-left py-3 px-4">메신저</th>
                      <th className="text-left py-3 px-4">팀</th>
                      <th className="text-left py-3 px-4">추천자</th>
                      <th className="text-left py-3 px-4">지갑</th>
                      <th className="text-left py-3 px-4">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r: any) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-3 px-4 font-medium">{r.name}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded ${r.locationType === "overseas" ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400"}`}>
                            {r.locationType === "overseas" ? "해외" : "내륙"}
                          </span>
                        </td>
                        <td className="py-3 px-4">{r.phone}</td>
                        <td className="py-3 px-4">{r.messengerId}</td>
                        <td className="py-3 px-4">{r.teamName || "-"}</td>
                        <td className="py-3 px-4">{r.referrerName || "-"}</td>
                        <td className="py-3 px-4 max-w-[120px] truncate" title={r.walletAddress}>{r.walletAddress || "-"}</td>
                        <td className="py-3 px-4 max-w-[150px] truncate" title={r.notes}>{r.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {searched && (!results || results.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">검색 결과가 없습니다.</div>
      )}
    </div>
  );
}
