import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { User, BookOpen, CheckCircle, ArrowRight, ArrowLeft, Upload, Loader2, Shield, Globe, Phone, Building2, Briefcase, Heart, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const NATIONALITIES = [
  "한국", "미국", "일본", "중국", "영국", "독일", "프랑스", "캐나다", "호주",
  "싱가포르", "태국", "베트남", "필리핀", "인도네시아", "말레이시아", "인도", "기타"
];

const LANGUAGES = [
  { value: "ko", label: "한국어" }, { value: "en", label: "English" },
  { value: "ja", label: "日本語" }, { value: "zh", label: "中文" },
  { value: "th", label: "ไทย" }, { value: "vi", label: "Tiếng Việt" },
];

export default function Onboarding() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    phone: "", nationality: "", birthDate: "", gender: "" as "" | "male" | "female" | "other",
    organization: "", position: "", department: "", bio: "",
    emergencyContact: "", emergencyPhone: "",
    dietaryRestrictions: "", allergies: "", medicalNotes: "",
    preferredLanguage: "ko", telegramId: "",
  });

  // Passport form state
  const [passportForm, setPassportForm] = useState({
    passportNumber: "", issuingCountry: "", nationality: "",
    fullName: "", birthDate: "", gender: "" as "" | "M" | "F",
    issueDate: "", expiryDate: "",
    passportImageUrl: "", passportImageKey: "",
  });

  const profileMut = trpc.userProfile.upsert.useMutation({
    onSuccess: () => { toast.success("프로필이 저장되었습니다"); setStep(2); },
    onError: (e) => toast.error(e.message),
  });

  const passportMut = trpc.passport.save.useMutation({
    onSuccess: () => { toast.success("여권 정보가 저장되었습니다"); setStep(3); },
    onError: (e) => toast.error(e.message),
  });

  const completeMut = trpc.userProfile.completeOnboarding.useMutation({
    onSuccess: () => { toast.success("온보딩이 완료되었습니다!"); navigate("/"); },
    onError: (e) => toast.error(e.message),
  });

  const handleProfileSubmit = () => {
    if (!profileForm.phone.trim()) { toast.error("전화번호를 입력해주세요"); return; }
    const data: any = { ...profileForm };
    if (!data.gender) delete data.gender;
    profileMut.mutate(data);
  };

  const handlePassportSubmit = () => {
    const data: any = { ...passportForm };
    if (!data.gender) delete data.gender;
    // Remove empty strings
    Object.keys(data).forEach(k => { if (data[k] === "") delete data[k]; });
    passportMut.mutate(data);
  };

  const handlePassportImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("파일 크기는 5MB 이하여야 합니다"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/trpc/upload.file", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const result = await res.json();
        if (result?.result?.data?.url) {
          setPassportForm(p => ({
            ...p,
            passportImageUrl: result.result.data.url,
            passportImageKey: result.result.data.key || "",
          }));
          toast.success("여권 이미지가 업로드되었습니다");
        }
      } else {
        // Fallback: store as data URL for preview
        const reader = new FileReader();
        reader.onload = () => {
          setPassportForm(p => ({ ...p, passportImageUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
        toast.info("이미지가 로컬에 저장되었습니다");
      }
    } catch {
      toast.error("이미지 업로드에 실패했습니다");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <span className="text-lg font-bold text-primary">Meetup Travel</span>
          <span className="text-sm text-muted-foreground">{user?.name}님 환영합니다</span>
        </div>
      </header>

      <div className="container max-w-2xl py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 gap-0">
          {[
            { num: 1, label: "기본 프로필", icon: User },
            { num: 2, label: "여권 정보", icon: BookOpen },
            { num: 3, label: "완료", icon: CheckCircle },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {step > s.num ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs mt-1 ${step >= s.num ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div className={`w-16 sm:w-24 h-0.5 mx-2 mb-4 ${step > s.num ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Profile */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />기본 프로필 정보</CardTitle>
                <CardDescription>밋업/출장 참여에 필요한 기본 정보를 입력해주세요. 한 번 입력하면 매번 다시 입력할 필요가 없습니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />전화번호 *</Label>
                    <Input placeholder="+82-10-1234-5678" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />국적</Label>
                    <Select value={profileForm.nationality} onValueChange={v => setProfileForm(p => ({ ...p, nationality: v }))}>
                      <SelectTrigger><SelectValue placeholder="국적 선택" /></SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>생년월일</Label>
                    <Input type="date" value={profileForm.birthDate} onChange={e => setProfileForm(p => ({ ...p, birthDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>성별</Label>
                    <Select value={profileForm.gender} onValueChange={v => setProfileForm(p => ({ ...p, gender: v as "male" | "female" | "other" }))}>
                      <SelectTrigger><SelectValue placeholder="성별 선택" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">남성</SelectItem>
                        <SelectItem value="female">여성</SelectItem>
                        <SelectItem value="other">기타</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />소속 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>소속 회사/팀</Label>
                    <Input placeholder="소속 조직명" value={profileForm.organization} onChange={e => setProfileForm(p => ({ ...p, organization: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />직책</Label>
                    <Input placeholder="직책 (예: 대표, 매니저)" value={profileForm.position} onChange={e => setProfileForm(p => ({ ...p, position: e.target.value }))} />
                  </div>
                  <div>
                    <Label>부서</Label>
                    <Input placeholder="부서명" value={profileForm.department} onChange={e => setProfileForm(p => ({ ...p, department: e.target.value }))} />
                  </div>
                  <div>
                    <Label>텔레그램 ID</Label>
                    <Input placeholder="@username" value={profileForm.telegramId} onChange={e => setProfileForm(p => ({ ...p, telegramId: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>자기소개</Label>
                  <Textarea placeholder="간단한 자기소개 (선택)" value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} rows={2} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5 text-primary" />건강 및 비상연락처</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>비상연락처 (이름)</Label>
                    <Input placeholder="비상시 연락할 분 이름" value={profileForm.emergencyContact} onChange={e => setProfileForm(p => ({ ...p, emergencyContact: e.target.value }))} />
                  </div>
                  <div>
                    <Label>비상연락처 (전화번호)</Label>
                    <Input placeholder="비상시 연락할 전화번호" value={profileForm.emergencyPhone} onChange={e => setProfileForm(p => ({ ...p, emergencyPhone: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>식이제한</Label>
                  <Input placeholder="채식, 할랄, 알레르기 등" value={profileForm.dietaryRestrictions} onChange={e => setProfileForm(p => ({ ...p, dietaryRestrictions: e.target.value }))} />
                </div>
                <div>
                  <Label>알레르기</Label>
                  <Input placeholder="알레르기 정보 (예: 땅콩, 갑각류)" value={profileForm.allergies} onChange={e => setProfileForm(p => ({ ...p, allergies: e.target.value }))} />
                </div>
                <div>
                  <Label>건강 특이사항</Label>
                  <Textarea placeholder="건강 관련 참고사항 (선택)" value={profileForm.medicalNotes} onChange={e => setProfileForm(p => ({ ...p, medicalNotes: e.target.value }))} rows={2} />
                </div>
                <div>
                  <Label>선호 언어</Label>
                  <Select value={profileForm.preferredLanguage} onValueChange={v => setProfileForm(p => ({ ...p, preferredLanguage: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button size="lg" onClick={handleProfileSubmit} disabled={profileMut.isPending}>
                {profileMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                다음: 여권 정보 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Passport Info */}
        {step === 2 && (
          <div className="space-y-4">
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-200">여권 정보는 안전하게 보호됩니다</p>
                    <p className="text-sm text-muted-foreground">한 번 등록하면 매번 여권을 다시 업로드할 필요가 없습니다. 출입국 및 호텔 체크인에 활용됩니다.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />여권 정보 등록</CardTitle>
                <CardDescription>여권 사진을 업로드하거나 직접 정보를 입력해주세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Passport Image Upload */}
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
                  {passportForm.passportImageUrl ? (
                    <div className="space-y-3">
                      <img src={passportForm.passportImageUrl} alt="여권" className="max-h-48 mx-auto rounded-lg object-contain" />
                      <Badge variant="secondary">여권 이미지 업로드 완료</Badge>
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        다시 업로드
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">여권 사진을 업로드해주세요 (선택)</p>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        {uploading ? "업로드 중..." : "이미지 선택"}
                      </Button>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePassportImageUpload} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>여권 번호</Label>
                    <Input placeholder="M12345678" value={passportForm.passportNumber} onChange={e => setPassportForm(p => ({ ...p, passportNumber: e.target.value }))} />
                  </div>
                  <div>
                    <Label>영문 성명 (여권 기재)</Label>
                    <Input placeholder="HONG GILDONG" value={passportForm.fullName} onChange={e => setPassportForm(p => ({ ...p, fullName: e.target.value }))} />
                  </div>
                  <div>
                    <Label>발급 국가</Label>
                    <Select value={passportForm.issuingCountry} onValueChange={v => setPassportForm(p => ({ ...p, issuingCountry: v }))}>
                      <SelectTrigger><SelectValue placeholder="발급 국가" /></SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>국적</Label>
                    <Select value={passportForm.nationality} onValueChange={v => setPassportForm(p => ({ ...p, nationality: v }))}>
                      <SelectTrigger><SelectValue placeholder="국적" /></SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>생년월일</Label>
                    <Input type="date" value={passportForm.birthDate} onChange={e => setPassportForm(p => ({ ...p, birthDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>성별</Label>
                    <Select value={passportForm.gender} onValueChange={v => setPassportForm(p => ({ ...p, gender: v as "M" | "F" }))}>
                      <SelectTrigger><SelectValue placeholder="성별" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">남성 (M)</SelectItem>
                        <SelectItem value="F">여성 (F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>발급일</Label>
                    <Input type="date" value={passportForm.issueDate} onChange={e => setPassportForm(p => ({ ...p, issueDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>만료일</Label>
                    <Input type="date" value={passportForm.expiryDate} onChange={e => setPassportForm(p => ({ ...p, expiryDate: e.target.value }))} />
                  </div>
                </div>

                {passportForm.expiryDate && new Date(passportForm.expiryDate) < new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">여권 만료일이 6개월 이내입니다. 출국 전 갱신을 권장합니다.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />이전
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="lg" onClick={() => setStep(3)}>
                  건너뛰기
                </Button>
                <Button size="lg" onClick={handlePassportSubmit} disabled={passportMut.isPending}>
                  {passportMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  다음: 완료 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <Card className="border-green-500/30">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">온보딩 완료!</h2>
                <p className="text-muted-foreground">
                  {user?.name}님의 프로필이 성공적으로 등록되었습니다.<br />
                  이제 밋업 신청 시 기본 정보가 자동으로 채워집니다.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="p-3 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">프로필 등록</p>
                  <Badge variant="default" className="mt-1">완료</Badge>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <BookOpen className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">여권 정보</p>
                  <Badge variant={passportForm.passportNumber ? "default" : "secondary"} className="mt-1">
                    {passportForm.passportNumber ? "완료" : "미등록"}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <Shield className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">보안 설정</p>
                  <Badge variant="default" className="mt-1">완료</Badge>
                </div>
              </div>

              <Button size="lg" className="px-8" onClick={() => completeMut.mutate()} disabled={completeMut.isPending}>
                {completeMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                시작하기 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
