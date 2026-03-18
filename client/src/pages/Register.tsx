import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, ArrowLeft, CheckCircle, Upload, Info } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Register() {
  const [locationType, setLocationType] = useState<"domestic" | "overseas">("domestic");
  const [submitted, setSubmitted] = useState(false);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "", phone: "", messengerId: "",
    scheduleStart: "", scheduleEnd: "",
    walletAddress: "", referrerName: "", teamName: "",
    teamIntro: "", notes: "", roommatePreference: "",
    category: "meetup" as const,
  });

  const createMutation = trpc.registration.create.useMutation();
  const uploadPassportMutation = trpc.registration.uploadPassport.useMutation();

  const handleChange = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.messengerId) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        ...form,
        locationType,
        scheduleStart: form.scheduleStart || undefined,
        scheduleEnd: form.scheduleEnd || undefined,
        walletAddress: form.walletAddress || undefined,
        referrerName: form.referrerName || undefined,
        teamName: form.teamName || undefined,
        teamIntro: form.teamIntro || undefined,
        notes: form.notes || undefined,
        roommatePreference: form.roommatePreference || undefined,
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
                <Label htmlFor="phone">전화번호 *</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="010-1234-5678" required />
              </div>
              <div>
                <Label htmlFor="messengerId">메신저 ID *</Label>
                <Input id="messengerId" value={form.messengerId} onChange={e => handleChange("messengerId", e.target.value)} placeholder="텔레그램/카카오톡 ID" required />
              </div>
            </CardContent>
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
