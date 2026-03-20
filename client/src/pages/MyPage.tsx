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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, BookOpen, History, ArrowLeft, Save, Loader2, Shield, Globe, Phone,
  Building2, Briefcase, Heart, Upload, CheckCircle, MapPin, Calendar, Plane,
  Hotel, AlertTriangle, Edit2, Eye, EyeOff, CreditCard, Ticket, Copy, ExternalLink,
  ArrowRight, Navigation
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import LanguageSelector from "@/components/LanguageSelector";

const NATIONALITIES = [
  "한국", "미국", "일본", "중국", "영국", "독일", "프랑스", "캐나다", "호주",
  "싱가포르", "태국", "베트남", "필리핀", "인도네시아", "말레이시아", "인도", "기타"
];

const LANGUAGES = [
  { value: "ko", label: "한국어" }, { value: "en", label: "English" },
  { value: "ja", label: "日本語" }, { value: "zh", label: "中文" },
  { value: "th", label: "ไทย" }, { value: "vi", label: "Tiếng Việt" },
];

export default function MyPage() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassport, setEditingPassport] = useState(false);
  const [showPassportNumber, setShowPassportNumber] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Queries
  const profileQuery = trpc.userProfile.get.useQuery(undefined, { enabled: !!user });
  const passportQuery = trpc.passport.get.useQuery(undefined, { enabled: !!user });
  const tripQuery = trpc.tripHistory.list.useQuery(undefined, { enabled: !!user });
  const onboardingQuery = trpc.userProfile.onboardingStatus.useQuery(undefined, { enabled: !!user });
  const vouchersQuery = trpc.hotelVoucher.listMy.useQuery(undefined, { enabled: !!user });
  const ticketsQuery = trpc.flightTicket.listMy.useQuery(undefined, { enabled: !!user });

  // Profile form
  const [profileForm, setProfileForm] = useState<any>(null);
  const [passportForm, setPassportForm] = useState<any>(null);

  const profileMut = trpc.userProfile.upsert.useMutation({
    onSuccess: () => {
      toast.success("프로필이 수정되었습니다");
      setEditingProfile(false);
      profileQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const passportMut = trpc.passport.save.useMutation({
    onSuccess: () => {
      toast.success("여권 정보가 수정되었습니다");
      setEditingPassport(false);
      passportQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const startEditProfile = () => {
    const p = profileQuery.data;
    setProfileForm({
      phone: p?.phone || "", nationality: p?.nationality || "",
      birthDate: p?.birthDate || "", gender: p?.gender || "",
      organization: p?.organization || "", position: p?.position || "",
      department: p?.department || "", bio: p?.bio || "",
      emergencyContact: p?.emergencyContact || "", emergencyPhone: p?.emergencyPhone || "",
      dietaryRestrictions: p?.dietaryRestrictions || "", allergies: p?.allergies || "",
      medicalNotes: p?.medicalNotes || "", preferredLanguage: p?.preferredLanguage || "ko",
      telegramId: p?.telegramId || "",
    });
    setEditingProfile(true);
  };

  const startEditPassport = () => {
    const p = passportQuery.data;
    setPassportForm({
      passportNumber: p?.passportNumber || "", issuingCountry: p?.issuingCountry || "",
      nationality: p?.nationality || "", fullName: p?.fullName || "",
      birthDate: p?.birthDate || "", gender: p?.gender || "",
      issueDate: p?.issueDate || "", expiryDate: p?.expiryDate || "",
      passportImageUrl: p?.passportImageUrl || "", passportImageKey: p?.passportImageKey || "",
    });
    setEditingPassport(true);
  };

  const handleSaveProfile = () => {
    const data: any = { ...profileForm };
    if (!data.gender) delete data.gender;
    profileMut.mutate(data);
  };

  const handleSavePassport = () => {
    const data: any = { ...passportForm };
    if (!data.gender) delete data.gender;
    Object.keys(data).forEach(k => { if (data[k] === "") delete data[k]; });
    passportMut.mutate(data);
  };

  const handlePassportImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("파일 크기는 5MB 이하여야 합니다"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        setPassportForm((p: any) => ({ ...p, passportImageUrl: reader.result as string }));
        toast.success("이미지가 준비되었습니다");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("이미지 처리에 실패했습니다");
      setUploading(false);
    }
  };

  const maskPassportNumber = (num: string) => {
    if (!num) return "-";
    if (showPassportNumber) return num;
    return num.slice(0, 2) + "***" + num.slice(-2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const profile = profileQuery.data;
  const passport = passportQuery.data;
  const trips = tripQuery.data || [];
  const onboarding = onboardingQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-primary">Meetup Travel</Link>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <div className="container max-w-3xl py-8 space-y-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />홈으로 돌아가기
        </Link>

        {/* User Summary Card */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{user?.name || "사용자"}</h1>
                <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={onboarding?.onboardingCompleted ? "default" : "secondary"}>
                    {onboarding?.onboardingCompleted ? "온보딩 완료" : "온보딩 미완료"}
                  </Badge>
                  <Badge variant={passport?.passportNumber ? "default" : "outline"}>
                    {passport?.passportNumber ? "여권 등록" : "여권 미등록"}
                  </Badge>
                  <Badge variant="outline">{trips.length}회 출장</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-1.5">
              <User className="w-4 h-4" />개인정보
            </TabsTrigger>
            <TabsTrigger value="passport" className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />여권정보
            </TabsTrigger>
            <TabsTrigger value="trips" className="flex items-center gap-1.5">
              <History className="w-4 h-4" />출장이력
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />호텔
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-1.5">
              <Ticket className="w-4 h-4" />항공권
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            {!editingProfile ? (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5" />기본 정보</CardTitle>
                    <Button variant="outline" size="sm" onClick={startEditProfile}>
                      <Edit2 className="w-4 h-4 mr-1" />수정
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">전화번호</span><p className="font-medium">{profile?.phone || "-"}</p></div>
                      <div><span className="text-muted-foreground">국적</span><p className="font-medium">{profile?.nationality || "-"}</p></div>
                      <div><span className="text-muted-foreground">생년월일</span><p className="font-medium">{profile?.birthDate || "-"}</p></div>
                      <div><span className="text-muted-foreground">성별</span><p className="font-medium">{profile?.gender === "male" ? "남성" : profile?.gender === "female" ? "여성" : profile?.gender === "other" ? "기타" : "-"}</p></div>
                      <div><span className="text-muted-foreground">선호 언어</span><p className="font-medium">{LANGUAGES.find(l => l.value === profile?.preferredLanguage)?.label || "-"}</p></div>
                      <div><span className="text-muted-foreground">텔레그램</span><p className="font-medium">{profile?.telegramId || "-"}</p></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />소속 정보</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">소속</span><p className="font-medium">{profile?.organization || "-"}</p></div>
                      <div><span className="text-muted-foreground">직책</span><p className="font-medium">{profile?.position || "-"}</p></div>
                      <div><span className="text-muted-foreground">부서</span><p className="font-medium">{profile?.department || "-"}</p></div>
                    </div>
                    {profile?.bio && <div className="mt-3 text-sm"><span className="text-muted-foreground">자기소개</span><p className="mt-1">{profile.bio}</p></div>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5" />건강 및 비상연락처</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">비상연락처</span><p className="font-medium">{profile?.emergencyContact || "-"} {profile?.emergencyPhone ? `(${profile.emergencyPhone})` : ""}</p></div>
                      <div><span className="text-muted-foreground">식이제한</span><p className="font-medium">{profile?.dietaryRestrictions || "-"}</p></div>
                      <div><span className="text-muted-foreground">알레르기</span><p className="font-medium">{profile?.allergies || "-"}</p></div>
                      <div><span className="text-muted-foreground">건강 특이사항</span><p className="font-medium">{profile?.medicalNotes || "-"}</p></div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />프로필 수정</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>전화번호 *</Label><Input value={profileForm.phone} onChange={e => setProfileForm((p: any) => ({ ...p, phone: e.target.value }))} /></div>
                      <div>
                        <Label>국적</Label>
                        <Select value={profileForm.nationality} onValueChange={v => setProfileForm((p: any) => ({ ...p, nationality: v }))}>
                          <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                          <SelectContent>{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>생년월일</Label><Input type="date" value={profileForm.birthDate} onChange={e => setProfileForm((p: any) => ({ ...p, birthDate: e.target.value }))} /></div>
                      <div>
                        <Label>성별</Label>
                        <Select value={profileForm.gender} onValueChange={v => setProfileForm((p: any) => ({ ...p, gender: v }))}>
                          <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">남성</SelectItem>
                            <SelectItem value="female">여성</SelectItem>
                            <SelectItem value="other">기타</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>소속</Label><Input value={profileForm.organization} onChange={e => setProfileForm((p: any) => ({ ...p, organization: e.target.value }))} /></div>
                      <div><Label>직책</Label><Input value={profileForm.position} onChange={e => setProfileForm((p: any) => ({ ...p, position: e.target.value }))} /></div>
                      <div><Label>부서</Label><Input value={profileForm.department} onChange={e => setProfileForm((p: any) => ({ ...p, department: e.target.value }))} /></div>
                      <div><Label>텔레그램 ID</Label><Input value={profileForm.telegramId} onChange={e => setProfileForm((p: any) => ({ ...p, telegramId: e.target.value }))} /></div>
                    </div>
                    <div><Label>자기소개</Label><Textarea value={profileForm.bio} onChange={e => setProfileForm((p: any) => ({ ...p, bio: e.target.value }))} rows={2} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>비상연락처 (이름)</Label><Input value={profileForm.emergencyContact} onChange={e => setProfileForm((p: any) => ({ ...p, emergencyContact: e.target.value }))} /></div>
                      <div><Label>비상연락처 (전화번호)</Label><Input value={profileForm.emergencyPhone} onChange={e => setProfileForm((p: any) => ({ ...p, emergencyPhone: e.target.value }))} /></div>
                    </div>
                    <div><Label>식이제한</Label><Input value={profileForm.dietaryRestrictions} onChange={e => setProfileForm((p: any) => ({ ...p, dietaryRestrictions: e.target.value }))} /></div>
                    <div><Label>알레르기</Label><Input value={profileForm.allergies} onChange={e => setProfileForm((p: any) => ({ ...p, allergies: e.target.value }))} /></div>
                    <div><Label>건강 특이사항</Label><Textarea value={profileForm.medicalNotes} onChange={e => setProfileForm((p: any) => ({ ...p, medicalNotes: e.target.value }))} rows={2} /></div>
                    <div>
                      <Label>선호 언어</Label>
                      <Select value={profileForm.preferredLanguage} onValueChange={v => setProfileForm((p: any) => ({ ...p, preferredLanguage: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setEditingProfile(false)}>취소</Button>
                  <Button className="flex-1" onClick={handleSaveProfile} disabled={profileMut.isPending}>
                    {profileMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}저장
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Passport Tab */}
          <TabsContent value="passport" className="space-y-4">
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-200">여권 정보는 안전하게 암호화되어 보관됩니다</p>
                    <p className="text-sm text-muted-foreground">1회 등록 후 매번 업로드할 필요 없이 자동으로 출입국/호텔 체크인에 활용됩니다.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!editingPassport ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" />여권 정보</CardTitle>
                  <Button variant="outline" size="sm" onClick={startEditPassport}>
                    <Edit2 className="w-4 h-4 mr-1" />{passport?.passportNumber ? "수정" : "등록"}
                  </Button>
                </CardHeader>
                <CardContent>
                  {passport?.passportNumber ? (
                    <div className="space-y-4">
                      {passport.passportImageUrl && (
                        <div className="flex justify-center">
                          <img src={passport.passportImageUrl} alt="여권" className="max-h-40 rounded-lg object-contain border" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">여권 번호</span>
                          <div className="flex items-center gap-2">
                            <p className="font-medium font-mono">{maskPassportNumber(passport.passportNumber)}</p>
                            <button onClick={() => setShowPassportNumber(!showPassportNumber)} className="text-muted-foreground hover:text-primary">
                              {showPassportNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div><span className="text-muted-foreground">영문 성명</span><p className="font-medium">{passport.fullName || "-"}</p></div>
                        <div><span className="text-muted-foreground">발급 국가</span><p className="font-medium">{passport.issuingCountry || "-"}</p></div>
                        <div><span className="text-muted-foreground">국적</span><p className="font-medium">{passport.nationality || "-"}</p></div>
                        <div><span className="text-muted-foreground">생년월일</span><p className="font-medium">{passport.birthDate || "-"}</p></div>
                        <div><span className="text-muted-foreground">성별</span><p className="font-medium">{passport.gender === "M" ? "남성" : passport.gender === "F" ? "여성" : "-"}</p></div>
                        <div><span className="text-muted-foreground">발급일</span><p className="font-medium">{passport.issueDate || "-"}</p></div>
                        <div>
                          <span className="text-muted-foreground">만료일</span>
                          <p className={`font-medium ${passport.expiryDate && new Date(passport.expiryDate) < new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) ? "text-destructive" : ""}`}>
                            {passport.expiryDate || "-"}
                            {passport.expiryDate && new Date(passport.expiryDate) < new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) && (
                              <AlertTriangle className="w-4 h-4 inline ml-1" />
                            )}
                          </p>
                        </div>
                      </div>
                      {passport.isVerified && (
                        <div className="flex items-center gap-2 text-green-500 text-sm">
                          <CheckCircle className="w-4 h-4" />인증 완료
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>등록된 여권 정보가 없습니다</p>
                      <p className="text-sm mt-1">여권을 등록하면 밋업 신청 시 자동으로 정보가 채워집니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />여권 정보 {passport?.passportNumber ? "수정" : "등록"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center">
                      {passportForm.passportImageUrl ? (
                        <div className="space-y-2">
                          <img src={passportForm.passportImageUrl} alt="여권" className="max-h-36 mx-auto rounded-lg object-contain" />
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>다시 업로드</Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                            {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                            이미지 선택
                          </Button>
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePassportImageUpload} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>여권 번호</Label><Input value={passportForm.passportNumber} onChange={e => setPassportForm((p: any) => ({ ...p, passportNumber: e.target.value }))} /></div>
                      <div><Label>영문 성명</Label><Input value={passportForm.fullName} onChange={e => setPassportForm((p: any) => ({ ...p, fullName: e.target.value }))} /></div>
                      <div>
                        <Label>발급 국가</Label>
                        <Select value={passportForm.issuingCountry} onValueChange={v => setPassportForm((p: any) => ({ ...p, issuingCountry: v }))}>
                          <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                          <SelectContent>{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>국적</Label>
                        <Select value={passportForm.nationality} onValueChange={v => setPassportForm((p: any) => ({ ...p, nationality: v }))}>
                          <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                          <SelectContent>{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>생년월일</Label><Input type="date" value={passportForm.birthDate} onChange={e => setPassportForm((p: any) => ({ ...p, birthDate: e.target.value }))} /></div>
                      <div>
                        <Label>성별</Label>
                        <Select value={passportForm.gender} onValueChange={v => setPassportForm((p: any) => ({ ...p, gender: v }))}>
                          <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">남성 (M)</SelectItem>
                            <SelectItem value="F">여성 (F)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>발급일</Label><Input type="date" value={passportForm.issueDate} onChange={e => setPassportForm((p: any) => ({ ...p, issueDate: e.target.value }))} /></div>
                      <div><Label>만료일</Label><Input type="date" value={passportForm.expiryDate} onChange={e => setPassportForm((p: any) => ({ ...p, expiryDate: e.target.value }))} /></div>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setEditingPassport(false)}>취소</Button>
                  <Button className="flex-1" onClick={handleSavePassport} disabled={passportMut.isPending}>
                    {passportMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}저장
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Trip History Tab */}
          <TabsContent value="trips" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />출장 이력</CardTitle>
                <CardDescription>참여한 밋업 및 출장 기록입니다</CardDescription>
              </CardHeader>
              <CardContent>
                {trips.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Plane className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>아직 출장 이력이 없습니다</p>
                    <p className="text-sm mt-1">밋업에 참여하면 이력이 자동으로 기록됩니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trips.map((trip: any) => (
                      <div key={trip.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{trip.meetupTitle}</h3>
                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{trip.destination}</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {trip.scheduleStart ? new Date(trip.scheduleStart).toLocaleDateString("ko-KR") : "-"}
                                {trip.scheduleEnd ? ` ~ ${new Date(trip.scheduleEnd).toLocaleDateString("ko-KR")}` : ""}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-2">
                              {trip.flightConfirmed && <Badge variant="outline" className="text-xs"><Plane className="w-3 h-3 mr-1" />항공 확정</Badge>}
                              {trip.accommodationConfirmed && <Badge variant="outline" className="text-xs"><Hotel className="w-3 h-3 mr-1" />숙소 확정</Badge>}
                              {trip.hotelRoom && <Badge variant="secondary" className="text-xs">{trip.hotelRoom}호</Badge>}
                            </div>
                          </div>
                          <Badge variant={
                            trip.status === "completed" ? "default" :
                            trip.status === "approved" ? "secondary" :
                            trip.status === "pending" ? "outline" : "destructive"
                          }>
                            {trip.status === "completed" ? "완료" :
                             trip.status === "approved" ? "승인" :
                             trip.status === "pending" ? "대기" : "반려"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trip Summary Stats */}
            {trips.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-2xl font-bold text-primary">{trips.length}</p>
                    <p className="text-xs text-muted-foreground">총 출장</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-2xl font-bold text-green-500">{trips.filter((t: any) => t.status === "completed").length}</p>
                    <p className="text-xs text-muted-foreground">완료</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-2xl font-bold text-blue-500">
                      {new Set(trips.map((t: any) => t.destination).filter(Boolean)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">방문 지역</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Hotel Vouchers Tab */}
          <TabsContent value="vouchers" className="space-y-4">
            {vouchersQuery.isLoading ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : !vouchersQuery.data?.length ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">배정된 호텔 바우처가 없습니다</CardContent></Card>
            ) : vouchersQuery.data.map((v: any) => (
              <Card key={v.id} className="overflow-hidden">
                <CardHeader className="bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hotel className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{v.hotelName}</CardTitle>
                    </div>
                    <Badge>{v.status}</Badge>
                  </div>
                  {v.hotelNameLocal && <p className="text-sm text-muted-foreground mt-1">{v.hotelNameLocal}</p>}
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* 주소 & 현지어 주소 */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm">{v.hotelAddress}</p>
                        {v.hotelAddressLocal && <p className="text-sm text-muted-foreground">{v.hotelAddressLocal}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        navigator.clipboard.writeText(v.hotelAddress + (v.hotelAddressLocal ? '\n' + v.hotelAddressLocal : ''));
                        toast.success("주소가 복사되었습니다");
                      }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    {v.hotelPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <a href={`tel:${v.hotelPhone}`} className="text-primary hover:underline">{v.hotelPhone}</a>
                      </div>
                    )}
                  </div>

                  {/* 체크인/체크아웃 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Check-in / 체크인</p>
                      <p className="font-bold">{v.checkInDate || "-"}</p>
                      <p className="text-sm text-green-600">{v.checkInTime || "14:00"}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Check-out / 체크아웃</p>
                      <p className="font-bold">{v.checkOutDate || "-"}</p>
                      <p className="text-sm text-red-600">{v.checkOutTime || "12:00"}</p>
                    </div>
                  </div>

                  {/* 예약 상세 */}
                  <div className="text-sm space-y-1">
                    {v.bookingId && <p><strong>Booking ID:</strong> {v.bookingId}</p>}
                    {v.guestName && <p><strong>Guest:</strong> {v.guestName}</p>}
                    {v.roomType && <p><strong>Room:</strong> {v.roomType} x{v.roomCount}</p>}
                    {v.includes && <p><strong>Includes:</strong> {v.includes}</p>}
                    {v.specialRequests && <p><strong>Special:</strong> {v.specialRequests}</p>}
                  </div>

                  {/* 취소 정책 */}
                  {v.cancellationPolicy && (
                    <div className="text-xs bg-muted/50 rounded p-2">
                      <strong>Cancellation Policy:</strong> {v.cancellationPolicy}
                    </div>
                  )}

                  {/* 체크인 안내 */}
                  {v.checkInInstructions && (
                    <div className="text-xs bg-muted/50 rounded p-2">
                      <strong>Check-in Instructions:</strong> {v.checkInInstructions}
                    </div>
                  )}

                  {/* 첨부 파일 */}
                  {v.voucherFileUrl && (
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-2">첨부 파일 / Attached File</p>
                      {v.voucherFileType === "pdf" ? (
                        <a href={v.voucherFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">PDF 보기</a>
                      ) : (
                        <img src={v.voucherFileUrl} alt="Hotel Voucher" className="max-w-full rounded border" />
                      )}
                    </div>
                  )}

                  {/* 구글맵 / 그랩 / 주소 복사 버튼 */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {(v.hotelLatitude && v.hotelLongitude) ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps?q=${v.hotelLatitude},${v.hotelLongitude}`, "_blank")}>
                          <MapPin className="w-4 h-4 mr-1" />구글맵
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${v.hotelLatitude},${v.hotelLongitude}`, "_blank")}>
                          <Navigation className="w-4 h-4 mr-1" />길찾기
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`https://grab.onelink.me/2695613898?af_dp=grab://open?screenType=BOOKING&dropOffLatitude=${v.hotelLatitude}&dropOffLongitude=${v.hotelLongitude}&dropOffAddress=${encodeURIComponent(v.hotelName)}`, "_blank")}>
                          <ExternalLink className="w-4 h-4 mr-1" />그랩 호출
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(v.hotelAddress)}`, "_blank")}>
                        <MapPin className="w-4 h-4 mr-1" />구글맵 검색
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => {
                      const text = `${v.hotelName}\n${v.hotelAddress}${v.hotelAddressLocal ? '\n' + v.hotelAddressLocal : ''}${v.hotelPhone ? '\nTel: ' + v.hotelPhone : ''}`;
                      navigator.clipboard.writeText(text);
                      toast.success("호텔 정보가 복사되었습니다. 친구나 택시기사에게 보내세요!");
                    }}>
                      <Copy className="w-4 h-4 mr-1" />정보 복사
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Flight Tickets Tab */}
          <TabsContent value="tickets" className="space-y-4">
            {ticketsQuery.isLoading ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : !ticketsQuery.data?.length ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">배정된 항공권이 없습니다</CardContent></Card>
            ) : ticketsQuery.data.map((t: any) => (
              <Card key={t.id} className="overflow-hidden">
                <CardHeader className="bg-blue-50 dark:bg-blue-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-lg">E-Ticket</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Badge>{t.status}</Badge>
                      {t.isGenerated && <Badge variant="outline" className="text-orange-600 border-orange-600">입국용</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* 승객 정보 */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Passenger / 승객</p>
                      <p className="font-bold">{t.passengerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">PNR / 예약번호</p>
                      <p className="font-bold">{t.bookingReference || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ticket No.</p>
                      <p className="font-bold text-xs">{t.ticketNumber || "-"}</p>
                    </div>
                  </div>

                  {/* 출발편 */}
                  {t.outboundFlightNo && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Plane className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-sm">Outbound / 출발편</span>
                        <span className="text-sm font-bold ml-auto">{t.outboundAirline} {t.outboundFlightNo}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{t.outboundDepartureCode}</p>
                          <p className="text-xs text-muted-foreground">{t.outboundDepartureAirport}</p>
                          <p className="text-sm mt-1">{t.outboundDepartureDate}</p>
                          <p className="text-sm font-semibold">{t.outboundDepartureTime}</p>
                        </div>
                        <div className="flex-1 flex items-center justify-center px-4">
                          <div className="w-full border-t border-dashed relative">
                            <Plane className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background text-primary" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{t.outboundArrivalCode}</p>
                          <p className="text-xs text-muted-foreground">{t.outboundArrivalAirport}</p>
                          <p className="text-sm mt-1">{t.outboundArrivalDate}</p>
                          <p className="text-sm font-semibold">{t.outboundArrivalTime}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 귀국편 */}
                  {t.returnFlightNo && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Plane className="w-4 h-4 text-green-600 rotate-180" />
                        <span className="font-semibold text-sm">Return / 귀국편</span>
                        <span className="text-sm font-bold ml-auto">{t.returnAirline} {t.returnFlightNo}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{t.returnDepartureCode}</p>
                          <p className="text-xs text-muted-foreground">{t.returnDepartureAirport}</p>
                          <p className="text-sm mt-1">{t.returnDepartureDate}</p>
                          <p className="text-sm font-semibold">{t.returnDepartureTime}</p>
                        </div>
                        <div className="flex-1 flex items-center justify-center px-4">
                          <div className="w-full border-t border-dashed relative">
                            <Plane className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background text-green-600 rotate-180" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{t.returnArrivalCode}</p>
                          <p className="text-xs text-muted-foreground">{t.returnArrivalAirport}</p>
                          <p className="text-sm mt-1">{t.returnArrivalDate}</p>
                          <p className="text-sm font-semibold">{t.returnArrivalTime}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground border-t pt-2">
                    This is an electronic ticket. Present this at immigration. / 전자 항공권입니다. 이미그레이션에서 제시하세요.
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
