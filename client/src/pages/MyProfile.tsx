import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { User, UtensilsCrossed, Luggage, Clock, Save, ArrowLeft, CheckCircle, AlertTriangle, Hotel, Wine, Cigarette } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";

const MEAL_OPTIONS = [
  { value: "regular", label: "일반식" }, { value: "vegetarian", label: "채식" },
  { value: "vegan", label: "비건" }, { value: "halal", label: "할랄" },
  { value: "kosher", label: "코셔" }, { value: "gluten-free", label: "글루텐프리" },
  { value: "no-seafood", label: "해산물 제외" }, { value: "other", label: "기타" },
];

const TIME_SLOTS = [
  { value: "00-03", label: "00:00~03:00 (새벽)" }, { value: "03-06", label: "03:00~06:00 (새벽)" },
  { value: "06-09", label: "06:00~09:00 (오전)" }, { value: "09-12", label: "09:00~12:00 (오전)" },
  { value: "12-15", label: "12:00~15:00 (오후)" }, { value: "15-18", label: "15:00~18:00 (오후)" },
  { value: "18-21", label: "18:00~21:00 (저녁)" }, { value: "21-24", label: "21:00~24:00 (심야)" },
  { value: "any", label: "상관없음" },
];

const WEIGHT_OPTIONS = ["15kg", "20kg", "23kg", "25kg", "30kg", "32kg", "기타"];

export default function MyProfile() {
  const { t } = useTranslation();
  const [step, setStep] = useState<"verify" | "edit" | "success">("verify");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileData, setProfileData] = useState<any>(null);

  // 프로필 조회
  const profileQuery = trpc.profile.get.useQuery(
    { name, phone },
    { enabled: false }
  );

  // 프로필 수정
  const updateMut = trpc.profile.update.useMutation({
    onSuccess: () => { toast.success(t("myProfile.t29", "프로필이 수정되었습니다")); setStep("success"); },
    onError: (e) => toast.error(e.message),
  });

  const handleVerify = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error(t("myProfile.t30", "이름과 전화번호를 입력해주세요"));
      return;
    }
    const result = await profileQuery.refetch();
    if (result.data) {
      setProfileData(result.data);
      setStep("edit");
    } else {
      toast.error(t("myProfile.t31", "등록된 정보를 찾을 수 없습니다. 이름과 전화번호를 확인해주세요."));
    }
  };

  const handleSave = () => {
    if (!profileData) return;
    updateMut.mutate({
      registrationId: profileData.id,
      name,
      phone,
      mealPreference: profileData.mealPreference || undefined,
      allergies: profileData.allergies || undefined,
      drinkAlcohol: profileData.drinkAlcohol || undefined,
      smoking: profileData.smoking || undefined,
      preferredDepartureTime: profileData.preferredDepartureTime || undefined,
      checkedBagRequest: profileData.checkedBagRequest || false,
      checkedBagCount: profileData.checkedBagCount || undefined,
      checkedBagWeight: profileData.checkedBagWeight || undefined,
      checkedBagNotes: profileData.checkedBagNotes || undefined,
      roommatePreference: profileData.roommatePreference || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* 헤더 */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary"><img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-7 w-7 rounded-md" />Alpha Trip</Link>
          </div>
          <ThemeToggle />
          <LanguageSelector />
        </div>
      </header>

      <div className="container max-w-2xl py-8 space-y-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />{t("myProfile.t1", "홈으로 돌아가기")}
        </Link>

        {step === "verify" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />{t("myProfile.t2", "마이페이지 - 본인 확인")}</CardTitle>
              <CardDescription>{t("myProfile.t3", "신청 시 입력한 이름과 전화번호로 본인 확인 후 정보를 수정할 수 있습니다")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("myProfile.t4", "이름 *")}</Label>
                <Input placeholder={t("myProfile.t32", "신청 시 입력한 이름")} value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <Label>{t("myProfile.t5", "전화번호 *")}</Label>
                <Input placeholder={t("myProfile.t33", "신청 시 입력한 전화번호")} value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleVerify} disabled={profileQuery.isFetching}>
                {profileQuery.isFetching ? "확인 중..." : "본인 확인"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "edit" && profileData && (
          <>
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium">{profileData.name}님 확인 완료</p>
                    <p className="text-sm text-muted-foreground">{profileData.phone} · {profileData.category === "overseas" ? "해외" : "내륙"} 밋업</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 호텔 방 정보 (읽기 전용) */}
            {profileData.hotelRoomNumber && (
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Hotel className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{t("myProfile.t6", "호텔 방 배정 정보")}</p>
                      <p className="text-sm">
                        <Badge variant="default" className="mr-2">{profileData.hotelRoomNumber}호</Badge>
                        {profileData.hotelFloor && <Badge variant="outline">{profileData.hotelFloor}층</Badge>}
                      </p>
                      {profileData.hotelNotes && <p className="text-xs text-muted-foreground mt-1">{profileData.hotelNotes}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 식사/알레르기 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UtensilsCrossed className="w-5 h-5" />{t("myProfile.t7", "식사 / 건강 정보")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t("myProfile.t8", "식사 선호도")}</Label>
                  <Select value={profileData.mealPreference || "regular"} onValueChange={v => setProfileData((p: any) => ({ ...p, mealPreference: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("myProfile.t9", "알레르기 정보")}</Label>
                  <Textarea
                    placeholder={t("myProfile.t34", "알레르기가 있으면 입력해주세요 (예: 땅콩, 갑각류, 유제품)")}
                    value={profileData.allergies || ""}
                    onChange={e => setProfileData((p: any) => ({ ...p, allergies: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1"><Wine className="w-4 h-4" />{t("myProfile.t10", "음주")}</Label>
                    <Select value={profileData.drinkAlcohol || "no"} onValueChange={v => setProfileData((p: any) => ({ ...p, drinkAlcohol: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">{t("myProfile.t11", "음주")}</SelectItem>
                        <SelectItem value="sometimes">{t("myProfile.t12", "가끔")}</SelectItem>
                        <SelectItem value="no">{t("myProfile.t13", "비음주")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Cigarette className="w-4 h-4" />{t("myProfile.t14", "흡연")}</Label>
                    <Select value={profileData.smoking || "no"} onValueChange={v => setProfileData((p: any) => ({ ...p, smoking: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">{t("myProfile.t15", "흡연")}</SelectItem>
                        <SelectItem value="no">{t("myProfile.t16", "비흡연")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 출발 희망시간대 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />{t("myProfile.t17", "출발 희망시간대")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={profileData.preferredDepartureTime || "any"} onValueChange={v => setProfileData((p: any) => ({ ...p, preferredDepartureTime: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* 위탁수화물 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Luggage className="w-5 h-5" />{t("myProfile.t18", "위탁수화물 신청")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t("myProfile.t19", "위탁수화물 신청")}</Label>
                  <Switch
                    checked={profileData.checkedBagRequest || false}
                    onCheckedChange={v => setProfileData((p: any) => ({ ...p, checkedBagRequest: v }))}
                  />
                </div>
                {profileData.checkedBagRequest && (
                  <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{t("myProfile.t20", "수화물 개수")}</Label>
                        <Select value={String(profileData.checkedBagCount || 1)} onValueChange={v => setProfileData((p: any) => ({ ...p, checkedBagCount: Number(v) }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}개</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t("myProfile.t21", "무게")}</Label>
                        <Select value={profileData.checkedBagWeight || "23kg"} onValueChange={v => setProfileData((p: any) => ({ ...p, checkedBagWeight: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {WEIGHT_OPTIONS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>{t("myProfile.t22", "수화물 메모")}</Label>
                      <Textarea
                        placeholder={t("myProfile.t35", "특수 수화물 정보 (예: 골프백, 스키 장비 등)")}
                        value={profileData.checkedBagNotes || ""}
                        onChange={e => setProfileData((p: any) => ({ ...p, checkedBagNotes: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 룸메이트 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Hotel className="w-5 h-5" />{t("myProfile.t23", "룸메이트 희망")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder={t("myProfile.t36", "함께 방을 쓰고 싶은 참석자 이름")}
                  value={profileData.roommatePreference || ""}
                  onChange={e => setProfileData((p: any) => ({ ...p, roommatePreference: e.target.value }))}
                />
              </CardContent>
            </Card>

            {/* 저장 버튼 */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setStep("verify"); setProfileData(null); }}>
                <ArrowLeft className="w-4 h-4 mr-1" />{t("myProfile.t24", "뒤로")}
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={updateMut.isPending}>
                <Save className="w-4 h-4 mr-1" />{updateMut.isPending ? "저장 중..." : "변경사항 저장"}
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <Card className="border-green-500/30">
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold">{t("myProfile.t25", "프로필 수정 완료")}</h2>
              <p className="text-muted-foreground">{t("myProfile.t26", "변경사항이 성공적으로 저장되었습니다.")}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => { setStep("verify"); setProfileData(null); }}>{t("myProfile.t27", "다시 수정하기")}</Button>
                <Link href="/"><Button>{t("myProfile.t28", "홈으로")}</Button></Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
