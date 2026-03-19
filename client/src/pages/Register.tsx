import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plane, ArrowLeft, CheckCircle, Upload, Info, Luggage, AlertTriangle, Clock } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function Register() {
  const params = useParams<{ meetupId?: string }>();
  const meetupId = params.meetupId ? parseInt(params.meetupId) : undefined;

  const [locationType, setLocationType] = useState<"domestic" | "overseas">("domestic");
  const [submitted, setSubmitted] = useState(false);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [checkedBagRequest, setCheckedBagRequest] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", messengerId: "",
    scheduleStart: "", scheduleEnd: "",
    walletAddress: "", referrerName: "", teamName: "",
    teamIntro: "", notes: "", roommatePreference: "",
    category: "meetup" as const,
    checkedBagCount: "1",
    checkedBagWeight: "23kg",
    checkedBagNotes: "",
    preferredDepartureTime: "",
  });

  // 밋업 목록 조회 (수화물 공지 포함)
  const { data: meetups } = trpc.meetup.list.useQuery({ status: "open" });
  const { data: selectedMeetup } = trpc.meetup.getById.useQuery(
    { id: meetupId! },
    { enabled: !!meetupId }
  );

  const createMutation = trpc.registration.create.useMutation();
  const uploadPassportMutation = trpc.registration.uploadPassport.useMutation();

  const handleChange = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // 수화물 공지 가져오기 (선택된 밋업 또는 기본값)
  const baggageNotice = selectedMeetup?.baggageNotice || "초과화물은 직접부담할 수 있습니다.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.messengerId) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        ...form,
        meetupId,
        locationType,
        scheduleStart: form.scheduleStart || undefined,
        scheduleEnd: form.scheduleEnd || undefined,
        walletAddress: form.walletAddress || undefined,
        referrerName: form.referrerName || undefined,
        teamName: form.teamName || undefined,
        teamIntro: form.teamIntro || undefined,
        notes: form.notes || undefined,
        roommatePreference: form.roommatePreference || undefined,
        checkedBagRequest,
        checkedBagCount: checkedBagRequest ? parseInt(form.checkedBagCount) || 1 : 0,
        checkedBagWeight: checkedBagRequest ? form.checkedBagWeight : undefined,
        checkedBagNotes: checkedBagRequest ? form.checkedBagNotes || undefined : undefined,
        preferredDepartureTime: form.preferredDepartureTime || undefined,
      });

      // Upload passport if exists
      if (passportFile && result.id) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          try {
            await uploadPassportMutation.mutateAsync({
              registrationId: result.id,
              imageBase64: base64,
              mimeType: passportFile.type,
            });
          } catch { toast.error("여권 이미지 업로드에 실패했습니다."); }
        };
        reader.readAsDataURL(passportFile);
      }
      setSubmitted(true);
      toast.success("밋업 신청이 완료되었습니다!");
    } catch (err: any) {
      toast.error(err.message || "신청 중 오류가 발생했습니다.");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">신청 완료!</h2>
            <p className="text-muted-foreground mb-6">밋업 신청이 성공적으로 접수되었습니다. 확인 후 여정표가 발송됩니다.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/"><Button variant="outline">홈으로</Button></Link>
              <Link href="/lookup"><Button>여정표 조회</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center h-14">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <Plane className="h-5 w-5 text-primary" />
            <span className="font-semibold">밋업 신청</span>
          </Link>
        </div>
      </header>

      <div className="container max-w-2xl py-8">
        {/* Location Type Toggle */}
        <div className="flex gap-3 mb-6">
          <Button
            variant={locationType === "domestic" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setLocationType("domestic")}
          >
            내륙
          </Button>
          <Button
            variant={locationType === "overseas" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setLocationType("overseas")}
          >
            해외
          </Button>
        </div>

        {locationType === "overseas" && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-primary">해외 밋업 시 프로젝트는 기본적으로 2인 1실을 제공합니다. 같이 숙박을 희망하는 팀원의 이름을 비고란에 작성해주세요.</p>
          </div>
        )}

        {/* 수화물 공지 */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Luggage className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-500 mb-1">수화물 안내</p>
            <p className="text-sm text-amber-400/90">{baggageNotice}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 필수 입력 */}
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-lg">필수 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input id="name" value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder="홍길동" required />
              </div>
              <div>
                <Label htmlFor="scheduleStart">일시 {locationType === "overseas" ? "(출발일) *" : "*"}</Label>
                <Input id="scheduleStart" type="date" value={form.scheduleStart} onChange={e => handleChange("scheduleStart", e.target.value)} />
              </div>
              {locationType === "overseas" && (
                <div>
                  <Label htmlFor="scheduleEnd">귀국일 *</Label>
                  <Input id="scheduleEnd" type="date" value={form.scheduleEnd} onChange={e => handleChange("scheduleEnd", e.target.value)} />
                </div>
              )}
              <div>
                <Label htmlFor="preferredDepartureTime" className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  출발 희망시간대
                </Label>
                <Select value={form.preferredDepartureTime} onValueChange={v => handleChange("preferredDepartureTime", v)}>
                  <SelectTrigger><SelectValue placeholder="희망시간대를 선택해주세요" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="새벽 (05:00~08:00)">새벽 (05:00~08:00)</SelectItem>
                    <SelectItem value="오전 (08:00~12:00)">오전 (08:00~12:00)</SelectItem>
                    <SelectItem value="오후 (12:00~17:00)">오후 (12:00~17:00)</SelectItem>
                    <SelectItem value="저녁 (17:00~21:00)">저녁 (17:00~21:00)</SelectItem>
                    <SelectItem value="심야 (21:00~05:00)">심야 (21:00~05:00)</SelectItem>
                    <SelectItem value="상관없음">상관없음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="phone">전화번호 *</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="010-1234-5678" required />
              </div>
              <div>
                <Label htmlFor="messengerId">메신저 ID *</Label>
                <Input id="messengerId" value={form.messengerId} onChange={e => handleChange("messengerId", e.target.value)} placeholder="텔레그램/카카오톡 ID" required />
              </div>
            </CardContent>
          </Card>

          {/* 위탁수화물 신청서 */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Luggage className="h-5 w-5 text-primary" />
                  위탁수화물 신청
                </CardTitle>
                <Switch
                  checked={checkedBagRequest}
                  onCheckedChange={setCheckedBagRequest}
                />
              </div>
            </CardHeader>
            {checkedBagRequest && (
              <CardContent className="space-y-4">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-400/80">{baggageNotice}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkedBagCount">수화물 개수</Label>
                    <Select value={form.checkedBagCount} onValueChange={v => handleChange("checkedBagCount", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1개</SelectItem>
                        <SelectItem value="2">2개</SelectItem>
                        <SelectItem value="3">3개</SelectItem>
                        <SelectItem value="4">4개</SelectItem>
                        <SelectItem value="5">5개 이상</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="checkedBagWeight">무게 (1개당)</Label>
                    <Select value={form.checkedBagWeight} onValueChange={v => handleChange("checkedBagWeight", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="23kg">23kg (일반)</SelectItem>
                        <SelectItem value="32kg">32kg (초과)</SelectItem>
                        <SelectItem value="기타">기타 (메모에 기재)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="checkedBagNotes">수화물 관련 메모</Label>
                  <Textarea
                    id="checkedBagNotes"
                    value={form.checkedBagNotes}
                    onChange={e => handleChange("checkedBagNotes", e.target.value)}
                    placeholder="수화물 관련 특이사항 (골프백, 스키장비, 악기 등 특수 수화물이 있으면 기재해주세요)"
                    rows={3}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* 선택 입력 */}
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-lg">추가 정보 (선택)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="walletAddress">지갑 주소</Label>
                <Input id="walletAddress" value={form.walletAddress} onChange={e => handleChange("walletAddress", e.target.value)} placeholder="0x..." />
              </div>
              <div>
                <Label htmlFor="referrerName">추천자 이름</Label>
                <Input id="referrerName" value={form.referrerName} onChange={e => handleChange("referrerName", e.target.value)} placeholder="추천인 성명" />
              </div>
              <div>
                <Label htmlFor="teamName">팀 이름</Label>
                <Input id="teamName" value={form.teamName} onChange={e => handleChange("teamName", e.target.value)} placeholder="같이 여행하는 팀의 경우 동일한 이름으로 접수" />
              </div>
              <div>
                <Label htmlFor="teamIntro">팀 소개</Label>
                <Textarea id="teamIntro" value={form.teamIntro} onChange={e => handleChange("teamIntro", e.target.value)} placeholder="팀 소개를 입력해주세요" rows={3} />
              </div>
              {locationType === "overseas" && (
                <div>
                  <Label htmlFor="roommatePreference">2인 1실 희망 팀원</Label>
                  <Input id="roommatePreference" value={form.roommatePreference} onChange={e => handleChange("roommatePreference", e.target.value)} placeholder="같이 숙박을 희망하는 팀원 이름" />
                </div>
              )}
              <div>
                <Label htmlFor="notes">비고</Label>
                <Textarea id="notes" value={form.notes} onChange={e => handleChange("notes", e.target.value)} placeholder="추가 요청사항이나 메모" rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* 여권 업로드 (해외) */}
          {locationType === "overseas" && (
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-lg">여권 사진 업로드</CardTitle></CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">여권 사진을 업로드해주세요</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="passport-upload"
                    onChange={e => setPassportFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="passport-upload">
                    <Button type="button" variant="outline" asChild><span>파일 선택</span></Button>
                  </label>
                  {passportFile && <p className="mt-3 text-sm text-primary">{passportFile.name}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "신청 중..." : "밋업 신청하기"}
          </Button>
        </form>
      </div>
    </div>
  );
}
