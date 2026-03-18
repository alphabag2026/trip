import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, ArrowLeft, Search, Calendar, MapPin, Hotel, Clock } from "lucide-react";
import { Link } from "wouter";

export default function Lookup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);

  const { data: regs, isLoading, refetch } = trpc.registration.lookup.useQuery(
    { name, phone },
    { enabled: false }
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setSearched(true);
    refetch();
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center h-14">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <Plane className="h-5 w-5 text-primary" />
            <span className="font-semibold">여정표 조회</span>
          </Link>
        </div>
      </header>

      <div className="container max-w-2xl py-8">
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              본인 확인
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Label htmlFor="lookup-name">이름</Label>
                <Input id="lookup-name" value={name} onChange={e => setName(e.target.value)} placeholder="신청 시 입력한 이름" required />
              </div>
              <div>
                <Label htmlFor="lookup-phone">전화번호</Label>
                <Input id="lookup-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="신청 시 입력한 전화번호" required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "조회 중..." : "조회하기"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {searched && regs && regs.length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>등록된 신청 정보가 없습니다.</p>
              <p className="text-sm mt-2">이름과 전화번호를 다시 확인해주세요.</p>
            </CardContent>
          </Card>
        )}

        {regs && regs.length > 0 && (
          <div className="space-y-4">
            {regs.map(reg => (
              <RegistrationCard key={reg.id} reg={reg} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RegistrationCard({ reg }: { reg: any }) {
  const { data: itineraryList } = trpc.itinerary.getByRegistration.useQuery({ registrationId: reg.id });
  const { data: travelInfoData } = trpc.travelInfo.list.useQuery();

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            {reg.name} - {reg.locationType === "overseas" ? "해외" : "내륙"}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            reg.status === "approved" ? "bg-green-500/20 text-green-400" :
            reg.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
            "bg-muted text-muted-foreground"
          }`}>
            {reg.status === "approved" ? "승인" : reg.status === "pending" ? "대기중" : reg.status === "rejected" ? "거절" : "완료"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">전화번호:</span> {reg.phone}</div>
          <div><span className="text-muted-foreground">메신저:</span> {reg.messengerId}</div>
          {reg.scheduleStart && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{new Date(reg.scheduleStart).toLocaleDateString("ko-KR")}</span>
              {reg.scheduleEnd && <span>~ {new Date(reg.scheduleEnd).toLocaleDateString("ko-KR")}</span>}
            </div>
          )}
          {reg.teamName && <div><span className="text-muted-foreground">팀:</span> {reg.teamName}</div>}
        </div>

        {/* Itineraries */}
        {itineraryList && itineraryList.length > 0 && (
          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              여정표
            </h4>
            {itineraryList.map((it: any) => (
              <div key={it.id} className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium">{it.title}</p>
                {it.departureFlightNo && (
                  <div className="flex items-center gap-2">
                    <Plane className="h-3 w-3" />
                    <span>출발: {it.departureFlightNo} ({it.departureAirport})</span>
                    {it.departureTime && <span className="text-muted-foreground">{new Date(it.departureTime).toLocaleString("ko-KR")}</span>}
                  </div>
                )}
                {it.returnFlightNo && (
                  <div className="flex items-center gap-2">
                    <Plane className="h-3 w-3 rotate-180" />
                    <span>귀국: {it.returnFlightNo} ({it.returnDepartureAirport})</span>
                    {it.returnDepartureTime && <span className="text-muted-foreground">{new Date(it.returnDepartureTime).toLocaleString("ko-KR")}</span>}
                  </div>
                )}
                {it.hotelName && (
                  <div className="flex items-center gap-2">
                    <Hotel className="h-3 w-3" />
                    <span>{it.hotelName}</span>
                  </div>
                )}
                {it.scheduleDetails && Array.isArray(it.scheduleDetails) && (
                  <div className="mt-2 space-y-1">
                    {(it.scheduleDetails as any[]).map((day: any, i: number) => (
                      <div key={i} className="pl-4 border-l-2 border-primary/30">
                        <p className="font-medium text-xs text-primary">Day {day.day}</p>
                        {day.items?.map((item: any, j: number) => (
                          <div key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{item.time} - {item.activity}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
