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
  ArrowRight, Navigation, ClipboardCheck, FileCheck, FileWarning, LogOut
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import LanguageSelector from "@/components/LanguageSelector";
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
  const [uploading, setUploading] = useState(false);

  // Queries
  const profileQuery = trpc.userProfile.get.useQuery(undefined, { enabled: !!user });
  const passportQuery = trpc.passport.get.useQuery(undefined, { enabled: !!user });
  const tripQuery = trpc.tripHistory.list.useQuery(undefined, { enabled: !!user });
  const onboardingQuery = trpc.userProfile.onboardingStatus.useQuery(undefined, { enabled: !!user });
  const vouchersQuery = trpc.hotelVoucher.listMy.useQuery(undefined, { enabled: !!user });
  const ticketsQuery = trpc.flightTicket.listMy.useQuery(undefined, { enabled: !!user });
  const immigrationQuery = trpc.immigration.myStatus.useQuery(undefined, { enabled: !!user });

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
          <div className="flex items-center gap-3">
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile" className="flex items-center gap-1.5">
              <User className="w-4 h-4" />{t("myPage.tabProfile")}
            </TabsTrigger>
            <TabsTrigger value="passport" className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />{t("myPage.tabPassport")}
            </TabsTrigger>
            <TabsTrigger value="trips" className="flex items-center gap-1.5">
              <History className="w-4 h-4" />{t("myPage.tabTrips")}
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />{t("myPage.tabHotel")}
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-1.5">
              <Ticket className="w-4 h-4" />{t("myPage.tabFlight")}
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4" />{t("myPage.tabChecklist")}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
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
                  <Button variant="outline" size="sm" onClick={startEditPassport}>
                    <Edit2 className="w-4 h-4 mr-1" />{passport?.passportNumber ? t("myPage.edit") : t("myPage.register")}
                  </Button>
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
                    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center">
                      {passportForm.passportImageUrl ? (
                        <div className="space-y-2">
                          <img src={passportForm.passportImageUrl} alt={t("myPage.passportInfo")} className="max-h-36 mx-auto rounded-lg object-contain" />
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>{t("myPage.reupload")}</Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                            {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                            {t("myPage.selectImage")}
                          </Button>
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePassportImageUpload} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>{t("myPage.passportNumber")}</Label><Input value={passportForm.passportNumber} onChange={e => setPassportForm((p: any) => ({ ...p, passportNumber: e.target.value }))} /></div>
                      <div><Label>{t("myPage.fullNameEn")}</Label><Input value={passportForm.fullName} onChange={e => setPassportForm((p: any) => ({ ...p, fullName: e.target.value }))} /></div>
                      <div>
                        <Label>{t("myPage.issuingCountry")}</Label>
                        <Select value={passportForm.issuingCountry} onValueChange={v => setPassportForm((p: any) => ({ ...p, issuingCountry: v }))}>
                          <SelectTrigger><SelectValue placeholder={t("myPage.select")} /></SelectTrigger>
                          <SelectContent>{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t("myPage.nationality")}</Label>
                        <Select value={passportForm.nationality} onValueChange={v => setPassportForm((p: any) => ({ ...p, nationality: v }))}>
                          <SelectTrigger><SelectValue placeholder={t("myPage.select")} /></SelectTrigger>
                          <SelectContent>{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>{t("myPage.birthDate")}</Label><Input type="date" value={passportForm.birthDate} onChange={e => setPassportForm((p: any) => ({ ...p, birthDate: e.target.value }))} /></div>
                      <div>
                        <Label>{t("myPage.gender")}</Label>
                        <Select value={passportForm.gender} onValueChange={v => setPassportForm((p: any) => ({ ...p, gender: v }))}>
                          <SelectTrigger><SelectValue placeholder={t("myPage.select")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">{t("myPage.male")} (M)</SelectItem>
                            <SelectItem value="F">{t("myPage.female")} (F)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>{t("myPage.issueDate")}</Label><Input type="date" value={passportForm.issueDate} onChange={e => setPassportForm((p: any) => ({ ...p, issueDate: e.target.value }))} /></div>
                      <div><Label>{t("myPage.expiryDate")}</Label><Input type="date" value={passportForm.expiryDate} onChange={e => setPassportForm((p: any) => ({ ...p, expiryDate: e.target.value }))} /></div>
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
            {immigrationQuery.isLoading ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (() => {
              const imm = immigrationQuery.data;
              const hasPassport = !!imm?.passport?.passportNumber;
              const passportExpiry = imm?.passport?.expiryDate;
              const isPassportValid = passportExpiry ? new Date(passportExpiry) > new Date() : false;
              const hasVoucher = (imm?.vouchers?.length || 0) > 0;
              const hasTicket = (imm?.tickets?.length || 0) > 0;
              const hasReturnTicket = imm?.tickets?.some((t: any) => t.returnFlightNo);
              const completedCount = [hasPassport, isPassportValid, hasVoucher, hasTicket, hasReturnTicket].filter(Boolean).length;
              const totalItems = 5;
              const progressPercent = Math.round((completedCount / totalItems) * 100);

              const checkItems = [
                {
                  key: "passport",
                  label: t("myPage.checkPassport"),
                  desc: t("myPage.checkPassportDesc"),
                  done: hasPassport,
                  icon: BookOpen,
                },
                {
                  key: "passportValid",
                  label: t("myPage.checkPassportValid"),
                  desc: hasPassport && passportExpiry ? t("myPage.checkPassportValidDesc", { date: passportExpiry }) : t("myPage.checkPassportValidNone"),
                  done: isPassportValid,
                  icon: Shield,
                },
                {
                  key: "voucher",
                  label: t("myPage.checkVoucher"),
                  desc: hasVoucher ? t("myPage.checkVoucherDesc", { count: imm?.vouchers?.length }) : t("myPage.checkVoucherNone"),
                  done: hasVoucher,
                  icon: Hotel,
                },
                {
                  key: "ticket",
                  label: t("myPage.checkTicket"),
                  desc: hasTicket ? t("myPage.checkTicketDesc", { count: imm?.tickets?.length }) : t("myPage.checkTicketNone"),
                  done: hasTicket,
                  icon: Plane,
                },
                {
                  key: "returnTicket",
                  label: t("myPage.checkReturnTicket"),
                  desc: t("myPage.checkReturnTicketDesc"),
                  done: !!hasReturnTicket,
                  icon: Plane,
                },
              ];

              return (
                <>
                  {/* Progress */}
                  <Card className="border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <ClipboardCheck className="w-5 h-5 text-primary" />
                          {t("myPage.checklistTitle")}
                        </h3>
                        <Badge variant={completedCount === totalItems ? "default" : "secondary"}>
                          {completedCount}/{totalItems}
                        </Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 mb-2">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${completedCount === totalItems ? "bg-green-500" : "bg-primary"}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {completedCount === totalItems ? t("myPage.checklistComplete") : t("myPage.checklistProgress", { count: completedCount, total: totalItems })}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Check Items */}
                  <div className="space-y-3">
                    {checkItems.map((item) => (
                      <Card key={item.key} className={`transition-all ${item.done ? "border-green-500/30 bg-green-500/5" : "border-orange-500/30 bg-orange-500/5"}`}>
                        <CardContent className="py-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? "bg-green-500/20" : "bg-orange-500/20"}`}>
                              {item.done ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <item.icon className="w-4 h-4 text-muted-foreground" />
                                <h4 className="font-semibold">{item.label}</h4>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Tips */}
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
                </>
              );
            })()}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
