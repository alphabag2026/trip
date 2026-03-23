import { useState, useRef, useEffect } from "react";
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
  ArrowRight, Navigation, ClipboardCheck, FileCheck, FileWarning, LogOut,
  ScanLine, RefreshCw, RotateCcw, Camera, Plus, Trash2, RotateCw, ListChecks,
  FileText, Info,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";
import { useTranslation } from "react-i18next";

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
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { t } = useTranslation();
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassport, setEditingPassport] = useState(false);
  const [showPassportNumber, setShowPassportNumber] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [originalPassportForm, setOriginalPassportForm] = useState<any>(null);

  // Queries
  const profileQuery = trpc.userProfile.get.useQuery(undefined, { enabled: !!user });
  const passportQuery = trpc.passport.get.useQuery(undefined, { enabled: !!user });
  const tripQuery = trpc.tripHistory.list.useQuery(undefined, { enabled: !!user });
  const onboardingQuery = trpc.userProfile.onboardingStatus.useQuery(undefined, { enabled: !!user });
  const vouchersQuery = trpc.hotelVoucher.listMy.useQuery(undefined, { enabled: !!user });
  const ticketsQuery = trpc.flightTicket.listMy.useQuery(undefined, { enabled: !!user });
  const immigrationQuery = trpc.immigration.myStatus.useQuery(undefined, { enabled: !!user });

  // Checklist state
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [customItemTitle, setCustomItemTitle] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const countriesQuery = trpc.checklist.countries.useQuery();
  const checklistQuery = trpc.checklist.myChecklist.useQuery(
    { countryCode: selectedCountry },
    { enabled: !!user && !!selectedCountry }
  );
  const toggleItemMut = trpc.checklist.toggleItem.useMutation({
    onSuccess: () => checklistQuery.refetch(),
  });
  const addCustomMut = trpc.checklist.addCustomItem.useMutation({
    onSuccess: () => { checklistQuery.refetch(); setCustomItemTitle(""); setShowAddCustom(false); toast.success("항목이 추가되었습니다"); },
  });
  const deleteCustomMut = trpc.checklist.deleteCustomItem.useMutation({
    onSuccess: () => { checklistQuery.refetch(); toast.success("항목이 삭제되었습니다"); },
  });
  const resetMut = trpc.checklist.reset.useMutation({
    onSuccess: () => { checklistQuery.refetch(); toast.success("체크리스트가 초기화되었습니다"); },
  });

  // Profile form
  const [profileForm, setProfileForm] = useState<any>(null);
  const [passportForm, setPassportForm] = useState<any>(null);

  const profileMut = trpc.userProfile.upsert.useMutation({
    onSuccess: () => {
      toast.success(t("myPage.profileSaved"));
      setEditingProfile(false);
      profileQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const passportMut = trpc.passport.save.useMutation({
    onSuccess: () => {
      toast.success(t("myPage.passportSaved"));
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
    if (file.size > 5 * 1024 * 1024) { toast.error(t("myPage.fileSizeError")); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        setPassportForm((p: any) => ({ ...p, passportImageUrl: reader.result as string }));
        toast.success(t("myPage.imageReady"));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error(t("myPage.imageError"));
      setUploading(false);
    }
  };

  const maskPassportNumber = (num: string) => {
    if (!num) return "-";
    if (showPassportNumber) return num;
    return num.slice(0, 2) + "***" + num.slice(-2);
  };

  // 여권 스캔 OCR
  const scanMut = trpc.passport.scan.useMutation();
  const handlePassportScanInMyPage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("파일 크기는 10MB 이하만 가능합니다"); return; }
    setScanning(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const result = await scanMut.mutateAsync({
        imageBase64: base64,
        mimeType: file.type || "image/jpeg",
      });
      if (result.success && result.ocrData) {
        const ocr = result.ocrData;
        const newForm = {
          passportNumber: ocr.passportNumber || passportForm?.passportNumber || "",
          issuingCountry: ocr.issuingCountry || passportForm?.issuingCountry || "",
          nationality: ocr.nationality || passportForm?.nationality || "",
          fullName: ocr.fullName || passportForm?.fullName || "",
          birthDate: ocr.dateOfBirth || passportForm?.birthDate || "",
          gender: (ocr.gender === "M" || ocr.gender === "F") ? ocr.gender : (passportForm?.gender || ""),
          issueDate: ocr.issueDate || passportForm?.issueDate || "",
          expiryDate: ocr.expiryDate || passportForm?.expiryDate || "",
          passportImageUrl: result.imageUrl || passportForm?.passportImageUrl || "",
          passportImageKey: result.imageKey || passportForm?.passportImageKey || "",
        };
        setPassportForm(newForm);
        setOriginalPassportForm(newForm);
        if (!editingPassport) setEditingPassport(true);
        toast.success("여권 정보가 자동으로 인식되었습니다! 확인 후 저장해주세요.");
      } else {
        toast.error("여권 인식에 실패했습니다. 사진을 다시 촬영해주세요.");
      }
    } catch {
      toast.error("여권 스캔 중 오류가 발생했습니다.");
    } finally {
      setScanning(false);
      if (e.target) e.target.value = "";
    }
  };

  // 필드별 되돌리기
  const resetPassportField = (field: string) => {
    if (originalPassportForm) {
      setPassportForm((p: any) => ({ ...p, [field]: originalPassportForm[field] }));
      toast.info("원래 OCR 값으로 복원되었습니다.");
    }
  };
  const resetAllPassportFields = () => {
    if (originalPassportForm) {
      setPassportForm(originalPassportForm);
      toast.info("모든 필드가 OCR 원래 값으로 복원되었습니다.");
    }
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
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary"><img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-7 w-7 rounded-md" />Alpha Trip</Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ThemeToggle />
          <LanguageSelector />
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1" onClick={() => { logout(); window.location.href = "/"; }}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav.logout", "로그아웃")}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-3xl py-8 space-y-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />{t("myPage.backHome")}
        </Link>

        {/* User Summary Card */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{user?.name || t("myPage.user")}</h1>
                <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={onboarding?.onboardingCompleted ? "default" : "secondary"}>
                    {onboarding?.onboardingCompleted ? t("myPage.onboardingDone") : t("myPage.onboardingPending")}
                  </Badge>
                  <Badge variant={passport?.passportNumber ? "default" : "outline"}>
                    {passport?.passportNumber ? t("myPage.passportRegistered") : t("myPage.passportNotRegistered")}
                  </Badge>
                  <Badge variant="outline">{t("myPage.tripCount", { count: trips.length })}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto no-scrollbar gap-1 h-auto flex-wrap sm:flex-nowrap">
            <TabsTrigger value="profile" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabProfile")}</span><span className="sm:hidden">프로필</span>
            </TabsTrigger>
            <TabsTrigger value="passport" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabPassport")}</span><span className="sm:hidden">여권</span>
            </TabsTrigger>
            <TabsTrigger value="trips" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabTrips")}</span><span className="sm:hidden">이력</span>
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabHotel")}</span><span className="sm:hidden">호텔</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabFlight")}</span><span className="sm:hidden">항공</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabChecklist")}</span><span className="sm:hidden">체크</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            {/* Email Verification Status Card */}
            <EmailVerificationCard user={user} />

            {!editingProfile ? (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5" />{t("myPage.basicInfo")}</CardTitle>
                    <Button variant="outline" size="sm" onClick={startEditProfile}>
                      <Edit2 className="w-4 h-4 mr-1" />{t("myPage.edit")}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">{t("myPage.phone")}</span><p className="font-medium">{profile?.phone || "-"}</p></div>
                      <div><span className="text-muted-foreground">{t("myPage.nationality")}</span><p className="font-medium">{profile?.nationality || "-"}</p></div>
                      <div><span className="text-muted-foreground">{t("myPage.birthDate")}</span><p className="font-medium">{profile?.birthDate || "-"}</p></div>
                      <div><span className="text-muted-foreground">{t("myPage.gender")}</span><p className="font-medium">{profile?.gender === "male" ? t("myPage.male") : profile?.gender === "female" ? t("myPage.female") : profile?.gender === "other" ? t("myPage.other") : "-"}</p></div>
                      <div><span className="text-muted-foreground">{t("myPage.preferredLang")}</span><p className="font-medium">{LANGUAGES.find(l => l.value === profile?.preferredLanguage)?.label || "-"}</p></div>
                      <div><span className="text-muted-foreground">{t("myPage.telegram")}</span><p className="font-medium">{profile?.telegramId || "-"}</p></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />{t("myPage.orgInfo")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">{t("myPage.organization")}</span><p className="font-medium">{profile?.organization || "-"}</p></div>
                      <div><span className="text-muted-foreground">{t("myPage.position")}</span><p className="font-medium">{profile?.position || "-"}</p></div>
                      <div><span className="text-muted-foreground">{t("myPage.department")}</span><p className="font-medium">{profile?.department || "-"}</p></div>
                    </div>
                    {profile?.bio && <div className="mt-3 text-sm"><span className="text-muted-foreground">{t("myPage.bio")}</span><p className="mt-1">{profile.bio}</p></div>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5" />{t("myPage.healthEmergency")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">{t("myPage.emergencyContact")}</span><p className="font-medium">{profile?.emergencyContact || "-"} {profile?.emergencyPhone ? `(${profile.emergencyPhone})` : ""}</p></div>
                      <div><span className="text-muted-foreground">{t("myPage.dietary")}</span><p className="font-medium">{profile?.dietaryRestrictions || "-"}</p></div>
                      <div><span className="text-muted-foreground">{t("myPage.allergies")}</span><p className="font-medium">{profile?.allergies || "-"}</p></div>
                      <div><span className="text-muted-foreground">{t("myPage.medicalNotes")}</span><p className="font-medium">{profile?.medicalNotes || "-"}</p></div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />{t("myPage.editProfile")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>{t("myPage.phone")} *</Label><Input value={profileForm.phone} onChange={e => setProfileForm((p: any) => ({ ...p, phone: e.target.value }))} /></div>
                      <div>
                        <Label>{t("myPage.nationality")}</Label>
                        <Select value={profileForm.nationality} onValueChange={v => setProfileForm((p: any) => ({ ...p, nationality: v }))}>
                          <SelectTrigger><SelectValue placeholder={t("myPage.select")} /></SelectTrigger>
                          <SelectContent>{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>{t("myPage.birthDate")}</Label><Input type="date" value={profileForm.birthDate} onChange={e => setProfileForm((p: any) => ({ ...p, birthDate: e.target.value }))} /></div>
                      <div>
                        <Label>{t("myPage.gender")}</Label>
                        <Select value={profileForm.gender} onValueChange={v => setProfileForm((p: any) => ({ ...p, gender: v }))}>
                          <SelectTrigger><SelectValue placeholder={t("myPage.select")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t("myPage.male")}</SelectItem>
                            <SelectItem value="female">{t("myPage.female")}</SelectItem>
                            <SelectItem value="other">{t("myPage.other")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>{t("myPage.organization")}</Label><Input value={profileForm.organization} onChange={e => setProfileForm((p: any) => ({ ...p, organization: e.target.value }))} /></div>
                      <div><Label>{t("myPage.position")}</Label><Input value={profileForm.position} onChange={e => setProfileForm((p: any) => ({ ...p, position: e.target.value }))} /></div>
                      <div><Label>{t("myPage.department")}</Label><Input value={profileForm.department} onChange={e => setProfileForm((p: any) => ({ ...p, department: e.target.value }))} /></div>
                      <div><Label>{t("myPage.telegramId")}</Label><Input value={profileForm.telegramId} onChange={e => setProfileForm((p: any) => ({ ...p, telegramId: e.target.value }))} /></div>
                    </div>
                    <div><Label>{t("myPage.bio")}</Label><Textarea value={profileForm.bio} onChange={e => setProfileForm((p: any) => ({ ...p, bio: e.target.value }))} rows={2} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>{t("myPage.emergencyContactName")}</Label><Input value={profileForm.emergencyContact} onChange={e => setProfileForm((p: any) => ({ ...p, emergencyContact: e.target.value }))} /></div>
                      <div><Label>{t("myPage.emergencyContactPhone")}</Label><Input value={profileForm.emergencyPhone} onChange={e => setProfileForm((p: any) => ({ ...p, emergencyPhone: e.target.value }))} /></div>
                    </div>
                    <div><Label>{t("myPage.dietary")}</Label><Input value={profileForm.dietaryRestrictions} onChange={e => setProfileForm((p: any) => ({ ...p, dietaryRestrictions: e.target.value }))} /></div>
                    <div><Label>{t("myPage.allergies")}</Label><Input value={profileForm.allergies} onChange={e => setProfileForm((p: any) => ({ ...p, allergies: e.target.value }))} /></div>
                    <div><Label>{t("myPage.medicalNotes")}</Label><Textarea value={profileForm.medicalNotes} onChange={e => setProfileForm((p: any) => ({ ...p, medicalNotes: e.target.value }))} rows={2} /></div>
                    <div>
                      <Label>{t("myPage.preferredLang")}</Label>
                      <Select value={profileForm.preferredLanguage} onValueChange={v => setProfileForm((p: any) => ({ ...p, preferredLanguage: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setEditingProfile(false)}>{t("myPage.cancel")}</Button>
                  <Button className="flex-1" onClick={handleSaveProfile} disabled={profileMut.isPending}>
                    {profileMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}{t("myPage.save")}
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
                    <p className="font-medium text-amber-200">{t("myPage.passportSecure")}</p>
                    <p className="text-sm text-muted-foreground">{t("myPage.passportSecureDesc")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!editingPassport ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" />{t("myPage.passportInfo")}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => scanInputRef.current?.click()} disabled={scanning} className="gap-1">
                      {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
                      {scanning ? "스캔 중..." : "여권 스캔"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={startEditPassport}>
                      <Edit2 className="w-4 h-4 mr-1" />{passport?.passportNumber ? t("myPage.edit") : t("myPage.register")}
                    </Button>
                    <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePassportScanInMyPage} />
                  </div>
                </CardHeader>
                <CardContent>
                  {passport?.passportNumber ? (
                    <div className="space-y-4">
                      {passport.passportImageUrl && (
                        <div className="flex justify-center">
                          <img src={passport.passportImageUrl} alt={t("myPage.passportInfo")} className="max-h-40 rounded-lg object-contain border" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t("myPage.passportNumber")}</span>
                          <div className="flex items-center gap-2">
                            <p className="font-medium font-mono">{maskPassportNumber(passport.passportNumber)}</p>
                            <button onClick={() => setShowPassportNumber(!showPassportNumber)} className="text-muted-foreground hover:text-primary">
                              {showPassportNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div><span className="text-muted-foreground">{t("myPage.fullNameEn")}</span><p className="font-medium">{passport.fullName || "-"}</p></div>
                        <div><span className="text-muted-foreground">{t("myPage.issuingCountry")}</span><p className="font-medium">{passport.issuingCountry || "-"}</p></div>
                        <div><span className="text-muted-foreground">{t("myPage.nationality")}</span><p className="font-medium">{passport.nationality || "-"}</p></div>
                        <div><span className="text-muted-foreground">{t("myPage.birthDate")}</span><p className="font-medium">{passport.birthDate || "-"}</p></div>
                        <div><span className="text-muted-foreground">{t("myPage.gender")}</span><p className="font-medium">{passport.gender === "M" ? t("myPage.male") : passport.gender === "F" ? t("myPage.female") : "-"}</p></div>
                        <div><span className="text-muted-foreground">{t("myPage.issueDate")}</span><p className="font-medium">{passport.issueDate || "-"}</p></div>
                        <div>
                          <span className="text-muted-foreground">{t("myPage.expiryDate")}</span>
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
                          <CheckCircle className="w-4 h-4" />{t("myPage.verified")}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>{t("myPage.noPassport")}</p>
                      <p className="text-sm mt-1">{t("myPage.noPassportDesc")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />{t("myPage.passportInfo")} {passport?.passportNumber ? t("myPage.edit") : t("myPage.register")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 이미지 업로드 + 스캔 버튼 */}
                    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center">
                      {passportForm.passportImageUrl ? (
                        <div className="space-y-2">
                          <img src={passportForm.passportImageUrl} alt={t("myPage.passportInfo")} className="max-h-36 mx-auto rounded-lg object-contain" />
                          <div className="flex justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>{t("myPage.reupload")}</Button>
                            <Button variant="outline" size="sm" onClick={() => scanInputRef.current?.click()} disabled={scanning} className="gap-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10">
                              {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              {scanning ? "스캔 중..." : "여권 다시 스캔"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <div className="flex justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                              {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                              {t("myPage.selectImage")}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => scanInputRef.current?.click()} disabled={scanning} className="gap-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10">
                              {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
                              {scanning ? "스캔 중..." : "여권 스캔으로 자동 입력"}
                            </Button>
                          </div>
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePassportImageUpload} />
                      <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePassportScanInMyPage} />
                    </div>

                    {/* 전체 되돌리기 버튼 */}
                    {originalPassportForm && (
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7" onClick={resetAllPassportFields}>
                          <RotateCcw className="h-3 w-3" /> 전체 OCR 원래 값으로 되돌리기
                        </Button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-1">
                          {t("myPage.passportNumber")}
                          {originalPassportForm && passportForm.passportNumber !== originalPassportForm.passportNumber && (
                            <button onClick={() => resetPassportField('passportNumber')} className="inline-flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 ml-1"><RotateCcw className="h-2.5 w-2.5" />되돌리기</button>
                          )}
                        </Label>
                        <Input value={passportForm.passportNumber} onChange={e => setPassportForm((p: any) => ({ ...p, passportNumber: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1">
                          {t("myPage.fullNameEn")}
                          {originalPassportForm && passportForm.fullName !== originalPassportForm.fullName && (
                            <button onClick={() => resetPassportField('fullName')} className="inline-flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 ml-1"><RotateCcw className="h-2.5 w-2.5" />되돌리기</button>
                          )}
                        </Label>
                        <Input value={passportForm.fullName} onChange={e => setPassportForm((p: any) => ({ ...p, fullName: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1">
                          {t("myPage.issuingCountry")}
                          {originalPassportForm && passportForm.issuingCountry !== originalPassportForm.issuingCountry && (
                            <button onClick={() => resetPassportField('issuingCountry')} className="inline-flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 ml-1"><RotateCcw className="h-2.5 w-2.5" />되돌리기</button>
                          )}
                        </Label>
                        <Select value={passportForm.issuingCountry} onValueChange={v => setPassportForm((p: any) => ({ ...p, issuingCountry: v }))}>
                          <SelectTrigger><SelectValue placeholder={t("myPage.select")} /></SelectTrigger>
                          <SelectContent>{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1">
                          {t("myPage.nationality")}
                          {originalPassportForm && passportForm.nationality !== originalPassportForm.nationality && (
                            <button onClick={() => resetPassportField('nationality')} className="inline-flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 ml-1"><RotateCcw className="h-2.5 w-2.5" />되돌리기</button>
                          )}
                        </Label>
                        <Select value={passportForm.nationality} onValueChange={v => setPassportForm((p: any) => ({ ...p, nationality: v }))}>
                          <SelectTrigger><SelectValue placeholder={t("myPage.select")} /></SelectTrigger>
                          <SelectContent>{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1">
                          {t("myPage.birthDate")}
                          {originalPassportForm && passportForm.birthDate !== originalPassportForm.birthDate && (
                            <button onClick={() => resetPassportField('birthDate')} className="inline-flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 ml-1"><RotateCcw className="h-2.5 w-2.5" />되돌리기</button>
                          )}
                        </Label>
                        <Input type="date" value={passportForm.birthDate} onChange={e => setPassportForm((p: any) => ({ ...p, birthDate: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1">
                          {t("myPage.gender")}
                          {originalPassportForm && passportForm.gender !== originalPassportForm.gender && (
                            <button onClick={() => resetPassportField('gender')} className="inline-flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 ml-1"><RotateCcw className="h-2.5 w-2.5" />되돌리기</button>
                          )}
                        </Label>
                        <Select value={passportForm.gender} onValueChange={v => setPassportForm((p: any) => ({ ...p, gender: v }))}>
                          <SelectTrigger><SelectValue placeholder={t("myPage.select")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">{t("myPage.male")} (M)</SelectItem>
                            <SelectItem value="F">{t("myPage.female")} (F)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1">
                          {t("myPage.issueDate")}
                          {originalPassportForm && passportForm.issueDate !== originalPassportForm.issueDate && (
                            <button onClick={() => resetPassportField('issueDate')} className="inline-flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 ml-1"><RotateCcw className="h-2.5 w-2.5" />되돌리기</button>
                          )}
                        </Label>
                        <Input type="date" value={passportForm.issueDate} onChange={e => setPassportForm((p: any) => ({ ...p, issueDate: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1">
                          {t("myPage.expiryDate")}
                          {originalPassportForm && passportForm.expiryDate !== originalPassportForm.expiryDate && (
                            <button onClick={() => resetPassportField('expiryDate')} className="inline-flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 ml-1"><RotateCcw className="h-2.5 w-2.5" />되돌리기</button>
                          )}
                        </Label>
                        <Input type="date" value={passportForm.expiryDate} onChange={e => setPassportForm((p: any) => ({ ...p, expiryDate: e.target.value }))} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setEditingPassport(false)}>{t("myPage.cancel")}</Button>
                  <Button className="flex-1" onClick={handleSavePassport} disabled={passportMut.isPending}>
                    {passportMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}{t("myPage.save")}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Trip History Tab */}
          <TabsContent value="trips" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />{t("myPage.tripHistory")}</CardTitle>
                <CardDescription>{t("myPage.tripHistoryDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {trips.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Plane className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{t("myPage.noTrips")}</p>
                    <p className="text-sm mt-1">{t("myPage.noTripsDesc")}</p>
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
                                {trip.scheduleStart ? new Date(trip.scheduleStart).toLocaleDateString() : "-"}
                                {trip.scheduleEnd ? ` ~ ${new Date(trip.scheduleEnd).toLocaleDateString()}` : ""}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-2">
                              {trip.flightConfirmed && <Badge variant="outline" className="text-xs"><Plane className="w-3 h-3 mr-1" />{t("myPage.flightConfirmed")}</Badge>}
                              {trip.accommodationConfirmed && <Badge variant="outline" className="text-xs"><Hotel className="w-3 h-3 mr-1" />{t("myPage.hotelConfirmed")}</Badge>}
                              {trip.hotelRoom && <Badge variant="secondary" className="text-xs">{t("myPage.room", { room: trip.hotelRoom })}</Badge>}
                            </div>
                          </div>
                          <Badge variant={
                            trip.status === "completed" ? "default" :
                            trip.status === "approved" ? "secondary" :
                            trip.status === "pending" ? "outline" : "destructive"
                          }>
                            {trip.status === "completed" ? t("myPage.statusCompleted") :
                             trip.status === "approved" ? t("myPage.statusApproved") :
                             trip.status === "pending" ? t("myPage.statusPending") : t("myPage.statusRejected")}
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
                    <p className="text-xs text-muted-foreground">{t("myPage.totalTrips")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-2xl font-bold text-green-500">{trips.filter((t: any) => t.status === "completed").length}</p>
                    <p className="text-xs text-muted-foreground">{t("myPage.statusCompleted")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-2xl font-bold text-blue-500">
                      {new Set(trips.map((t: any) => t.destination).filter(Boolean)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("myPage.visitedRegions")}</p>
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
              <Card><CardContent className="py-12 text-center text-muted-foreground">{t("myPage.noVouchers")}</CardContent></Card>
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
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm">{v.hotelAddress}</p>
                        {v.hotelAddressLocal && <p className="text-sm text-muted-foreground">{v.hotelAddressLocal}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        navigator.clipboard.writeText(v.hotelAddress + (v.hotelAddressLocal ? '\n' + v.hotelAddressLocal : ''));
                        toast.success(t("myPage.addressCopied"));
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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{t("myPage.checkIn")}</p>
                      <p className="font-bold">{v.checkInDate || "-"}</p>
                      <p className="text-sm text-green-600">{v.checkInTime || "14:00"}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{t("myPage.checkOut")}</p>
                      <p className="font-bold">{v.checkOutDate || "-"}</p>
                      <p className="text-sm text-red-600">{v.checkOutTime || "12:00"}</p>
                    </div>
                  </div>

                  <div className="text-sm space-y-1">
                    {v.bookingId && <p><strong>Booking ID:</strong> {v.bookingId}</p>}
                    {v.guestName && <p><strong>{t("myPage.guestName")}:</strong> {v.guestName}</p>}
                    {v.roomType && <p><strong>{t("myPage.roomType")}:</strong> {v.roomType} x{v.roomCount}</p>}
                    {v.includes && <p><strong>{t("myPage.includes")}:</strong> {v.includes}</p>}
                    {v.specialRequests && <p><strong>{t("myPage.specialRequests")}:</strong> {v.specialRequests}</p>}
                  </div>

                  {v.cancellationPolicy && (
                    <div className="text-xs bg-muted/50 rounded p-2">
                      <strong>{t("myPage.cancellationPolicy")}:</strong> {v.cancellationPolicy}
                    </div>
                  )}

                  {v.checkInInstructions && (
                    <div className="text-xs bg-muted/50 rounded p-2">
                      <strong>{t("myPage.checkInInstructions")}:</strong> {v.checkInInstructions}
                    </div>
                  )}

                  {v.voucherFileUrl && (
                    <div className="border rounded-lg p-3">
                      {v.voucherFileType === "pdf" ? (
                        <a href={v.voucherFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">{t("myPage.viewPdf")}</a>
                      ) : (
                        <img src={v.voucherFileUrl} alt="Hotel Voucher" className="max-w-full rounded border" />
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {(v.hotelLatitude && v.hotelLongitude) ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps?q=${v.hotelLatitude},${v.hotelLongitude}`, "_blank")}>
                          <MapPin className="w-4 h-4 mr-1" />{t("myPage.googleMap")}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${v.hotelLatitude},${v.hotelLongitude}`, "_blank")}>
                          <Navigation className="w-4 h-4 mr-1" />{t("myPage.directions")}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`https://grab.onelink.me/2695613898?af_dp=grab://open?screenType=BOOKING&dropOffLatitude=${v.hotelLatitude}&dropOffLongitude=${v.hotelLongitude}&dropOffAddress=${encodeURIComponent(v.hotelName)}`, "_blank")}>
                          <ExternalLink className="w-4 h-4 mr-1" />{t("myPage.callGrab")}
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(v.hotelAddress)}`, "_blank")}>
                        <MapPin className="w-4 h-4 mr-1" />{t("myPage.searchGoogleMap")}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => {
                      const text = `${v.hotelName}\n${v.hotelAddress}${v.hotelAddressLocal ? '\n' + v.hotelAddressLocal : ''}${v.hotelPhone ? '\nTel: ' + v.hotelPhone : ''}`;
                      navigator.clipboard.writeText(text);
                      toast.success(t("myPage.hotelInfoCopied"));
                    }}>
                      <Copy className="w-4 h-4 mr-1" />{t("myPage.copyInfo")}
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
              <Card><CardContent className="py-12 text-center text-muted-foreground">{t("myPage.noTickets")}</CardContent></Card>
            ) : ticketsQuery.data.map((t_ticket: any) => (
              <Card key={t_ticket.id} className="overflow-hidden">
                <CardHeader className="bg-blue-50 dark:bg-blue-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-lg">E-Ticket</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Badge>{t_ticket.status}</Badge>
                      {t_ticket.isGenerated && <Badge variant="outline" className="text-orange-600 border-orange-600">{t("myPage.forImmigration")}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("myPage.passenger")}</p>
                      <p className="font-bold">{t_ticket.passengerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("myPage.bookingRef")}</p>
                      <p className="font-bold">{t_ticket.bookingReference || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("myPage.ticketNo")}</p>
                      <p className="font-bold text-xs">{t_ticket.ticketNumber || "-"}</p>
                    </div>
                  </div>

                  {t_ticket.outboundFlightNo && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Plane className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-sm">{t("myPage.outbound")}</span>
                        <span className="text-sm font-bold ml-auto">{t_ticket.outboundAirline} {t_ticket.outboundFlightNo}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{t_ticket.outboundDepartureCode}</p>
                          <p className="text-xs text-muted-foreground">{t_ticket.outboundDepartureAirport}</p>
                          <p className="text-sm mt-1">{t_ticket.outboundDepartureDate}</p>
                          <p className="text-sm font-semibold">{t_ticket.outboundDepartureTime}</p>
                        </div>
                        <div className="flex-1 flex items-center justify-center px-4">
                          <div className="w-full border-t border-dashed relative">
                            <Plane className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background text-primary" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{t_ticket.outboundArrivalCode}</p>
                          <p className="text-xs text-muted-foreground">{t_ticket.outboundArrivalAirport}</p>
                          <p className="text-sm mt-1">{t_ticket.outboundArrivalDate}</p>
                          <p className="text-sm font-semibold">{t_ticket.outboundArrivalTime}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {t_ticket.returnFlightNo && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Plane className="w-4 h-4 text-green-600 rotate-180" />
                        <span className="font-semibold text-sm">{t("myPage.returnFlight")}</span>
                        <span className="text-sm font-bold ml-auto">{t_ticket.returnAirline} {t_ticket.returnFlightNo}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{t_ticket.returnDepartureCode}</p>
                          <p className="text-xs text-muted-foreground">{t_ticket.returnDepartureAirport}</p>
                          <p className="text-sm mt-1">{t_ticket.returnDepartureDate}</p>
                          <p className="text-sm font-semibold">{t_ticket.returnDepartureTime}</p>
                        </div>
                        <div className="flex-1 flex items-center justify-center px-4">
                          <div className="w-full border-t border-dashed relative">
                            <Plane className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background text-green-600 rotate-180" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{t_ticket.returnArrivalCode}</p>
                          <p className="text-xs text-muted-foreground">{t_ticket.returnArrivalAirport}</p>
                          <p className="text-sm mt-1">{t_ticket.returnArrivalDate}</p>
                          <p className="text-sm font-semibold">{t_ticket.returnArrivalTime}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground border-t pt-2">
                    {t("myPage.eTicketNote")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          {/* Immigration Checklist Tab */}
          <TabsContent value="checklist" className="space-y-4">
            {/* 기본 준비 상태 카드 */}
            {(() => {
              const imm = immigrationQuery.data;
              const hasPassport = !!imm?.passport?.passportNumber;
              const passportExpiry = imm?.passport?.expiryDate;
              const isPassportValid = passportExpiry ? new Date(passportExpiry) > new Date() : false;
              const hasVoucher = (imm?.vouchers?.length || 0) > 0;
              const hasTicket = (imm?.tickets?.length || 0) > 0;
              const hasReturnTicket = imm?.tickets?.some((t: any) => t.returnFlightNo);
              const basicItems = [
                { label: "여권 등록", done: hasPassport, icon: BookOpen },
                { label: "여권 유효", done: isPassportValid, icon: Shield },
                { label: "호텔 바우처", done: hasVoucher, icon: Hotel },
                { label: "항공권", done: hasTicket, icon: Plane },
                { label: "왕복 항공권", done: !!hasReturnTicket, icon: Plane },
              ];
              const doneCount = basicItems.filter(i => i.done).length;
              return (
                <Card className="border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-primary" />
                        기본 준비 상태
                      </h3>
                      <Badge variant={doneCount === 5 ? "default" : "secondary"}>{doneCount}/5</Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 mb-3">
                      <div className={`h-2.5 rounded-full transition-all duration-500 ${doneCount === 5 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${(doneCount / 5) * 100}%` }} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {basicItems.map((item, i) => (
                        <div key={i} className={`flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5 ${item.done ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"}`}>
                          {item.done ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* 국가별 입국 심사 체크리스트 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-primary" />
                    국가별 입국 심사 체크리스트
                  </h3>
                </div>
                <div className="flex gap-2 mb-4">
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="목적지 국가를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {(countriesQuery.data || []).map((c: any) => (
                        <SelectItem key={c.countryCode} value={c.countryCode}>
                          {c.countryName} ({c.countryCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCountry && (
                    <Button variant="outline" size="icon" onClick={() => resetMut.mutate({ countryCode: selectedCountry })} title="초기화">
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {!selectedCountry && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>목적지 국가를 선택하면<br />입국 시 필요한 서류와 준비물을 확인할 수 있습니다.</p>
                  </div>
                )}

                {selectedCountry && checklistQuery.isLoading && (
                  <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                )}

                {selectedCountry && checklistQuery.data && (() => {
                  const items = checklistQuery.data as any[];
                  const totalCount = items.length;
                  const checkedCount = items.filter((i: any) => i.isChecked).length;
                  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

                  const categoryMap: Record<string, { label: string; icon: any; color: string }> = {
                    required_docs: { label: "필수 서류", icon: FileText, color: "text-red-500" },
                    recommended_items: { label: "권장 준비물", icon: ClipboardCheck, color: "text-blue-500" },
                    tips: { label: "입국 시 주의사항", icon: Info, color: "text-amber-500" },
                    custom: { label: "내 항목", icon: Edit2, color: "text-purple-500" },
                  };

                  const grouped = items.reduce((acc: any, item: any) => {
                    const cat = item.category || "custom";
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(item);
                    return acc;
                  }, {} as Record<string, any[]>);

                  return (
                    <div className="space-y-4">
                      {/* 진행률 */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${progressPct === 100 ? "bg-green-500" : "bg-primary"}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap">
                          {checkedCount}/{totalCount} ({progressPct}%)
                        </span>
                      </div>

                      {/* 카테고리별 항목 */}
                      {["required_docs", "recommended_items", "tips", "custom"].map(cat => {
                        const catItems = grouped[cat];
                        if (!catItems || catItems.length === 0) return null;
                        const meta = categoryMap[cat];
                        const CatIcon = meta.icon;
                        return (
                          <div key={cat}>
                            <div className="flex items-center gap-2 mb-2">
                              <CatIcon className={`w-4 h-4 ${meta.color}`} />
                              <h4 className="font-semibold text-sm">{meta.label}</h4>
                              <Badge variant="outline" className="text-xs">
                                {catItems.filter((i: any) => i.isChecked).length}/{catItems.length}
                              </Badge>
                            </div>
                            <div className="space-y-1.5">
                              {catItems.map((item: any) => (
                                <div
                                  key={item.id}
                                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                                    item.isChecked
                                      ? "border-green-500/30 bg-green-500/5"
                                      : "border-border bg-card hover:border-primary/30"
                                  }`}
                                  onClick={() => toggleItemMut.mutate({ itemId: item.id })}
                                >
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                    item.isChecked ? "border-green-500 bg-green-500" : "border-muted-foreground/30"
                                  }`}>
                                    {item.isChecked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${item.isChecked ? "line-through text-muted-foreground" : ""}`}>
                                      {item.title}
                                    </p>
                                    {item.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                                    )}
                                  </div>
                                  {item.category === "custom" && (
                                    <Button
                                      variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"
                                      onClick={(e) => { e.stopPropagation(); deleteCustomMut.mutate({ itemId: item.id }); }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* 커스텀 항목 추가 */}
                      {showAddCustom ? (
                        <div className="flex gap-2">
                          <Input
                            placeholder="추가할 항목을 입력하세요"
                            value={customItemTitle}
                            onChange={(e) => setCustomItemTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && customItemTitle.trim()) {
                                addCustomMut.mutate({ countryCode: selectedCountry, title: customItemTitle.trim() });
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            disabled={!customItemTitle.trim() || addCustomMut.isPending}
                            onClick={() => addCustomMut.mutate({ countryCode: selectedCountry, title: customItemTitle.trim() })}
                          >
                            {addCustomMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "추가"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setShowAddCustom(false); setCustomItemTitle(""); }}>
                            취소
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full" onClick={() => setShowAddCustom(true)}>
                          <Plus className="w-4 h-4 mr-2" /> 내 항목 추가
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* 입국 심사 팁 */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  {t("myPage.immigrationTips")}
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-primary">•</span>{t("myPage.tip1")}</li>
                  <li className="flex items-start gap-2"><span className="text-primary">•</span>{t("myPage.tip2")}</li>
                  <li className="flex items-start gap-2"><span className="text-primary">•</span>{t("myPage.tip3")}</li>
                  <li className="flex items-start gap-2"><span className="text-primary">•</span>{t("myPage.tip4")}</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

// ── Email Verification Status Card ──
function EmailVerificationCard({ user }: { user: any }) {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const sendVerification = trpc.auth.sendVerificationEmail.useMutation({
    onSuccess: () => {
      toast.success(t("myPage.emailVerification.sent"));
      setSent(true);
      setCooldown(60);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!user?.email) return null;

  const isVerified = user.emailVerified;

  return (
    <Card className={isVerified ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isVerified ? (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
            )}
            <div>
              <p className="font-medium text-sm">
                {isVerified ? t("myPage.emailVerification.verified") : t("myPage.emailVerification.unverified")}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          {!isVerified && (
            <Button
              variant="outline"
              size="sm"
              disabled={sendVerification.isPending || cooldown > 0}
              onClick={() => sendVerification.mutate({ origin: window.location.origin })}
              className="shrink-0"
            >
              {sendVerification.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : cooldown > 0 ? (
                `${cooldown}s`
              ) : sent ? (
                <>{t("myPage.emailVerification.resend")}</>
              ) : (
                <>{t("myPage.emailVerification.sendBtn")}</>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
