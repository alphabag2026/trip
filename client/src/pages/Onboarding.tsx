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
import { useTranslation } from "react-i18next";

const NATIONALITIES = [
  "한국", "미국", "일본", "중국", "영국", "독일", "프랑스", "캐나다", "호주",
  "싱가포르", "태국", "베트남", "필리핀", "인도네시아", "말레이시아", "인도", "기타"
];

const LANGUAGES_LIST = [
  { value: "ko", label: "한국어" }, { value: "en", label: "English" },
  { value: "ja", label: "日本語" }, { value: "zh", label: "中文" },
  { value: "th", label: "ไทย" }, { value: "vi", label: "Tiếng Việt" },
];

export default function Onboarding() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const { t } = useTranslation();
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
    onSuccess: () => { toast.success(t("onboarding.profileSaved")); setStep(2); },
    onError: (e) => toast.error(e.message),
  });

  const passportMut = trpc.passport.save.useMutation({
    onSuccess: () => { toast.success(t("onboarding.passportSaved")); setStep(3); },
    onError: (e) => toast.error(e.message),
  });

  const completeMut = trpc.userProfile.completeOnboarding.useMutation({
    onSuccess: () => { toast.success(t("onboarding.completed")); navigate("/"); },
    onError: (e) => toast.error(e.message),
  });

  const handleProfileSubmit = () => {
    if (!profileForm.phone.trim()) { toast.error(t("onboarding.phoneRequired")); return; }
    const data: any = { ...profileForm };
    if (!data.gender) delete data.gender;
    profileMut.mutate(data);
  };

  const handlePassportSubmit = () => {
    const data: any = { ...passportForm };
    if (!data.gender) delete data.gender;
    Object.keys(data).forEach(k => { if (data[k] === "") delete data[k]; });
    passportMut.mutate(data);
  };

  const handlePassportImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t("onboarding.fileSizeError")); return; }
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
          toast.success(t("onboarding.passportImageUploaded"));
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setPassportForm(p => ({ ...p, passportImageUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
        toast.info(t("onboarding.imageSavedLocal"));
      }
    } catch {
      toast.error(t("onboarding.imageUploadFailed"));
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
          <a href="/" className="text-lg font-bold text-primary hover:opacity-80 transition-opacity cursor-pointer">Meetup Travel</a>
          <span className="text-sm text-muted-foreground">{t("onboarding.welcome", { name: user?.name })}</span>
        </div>
      </header>

      <div className="container max-w-2xl py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 gap-0">
          {[
            { num: 1, label: t("onboarding.stepProfile"), icon: User },
            { num: 2, label: t("onboarding.stepPassport"), icon: BookOpen },
            { num: 3, label: t("onboarding.stepComplete"), icon: CheckCircle },
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
                <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />{t("onboarding.basicProfileTitle")}</CardTitle>
                <CardDescription>{t("onboarding.basicProfileDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{t("onboarding.phone")} *</Label>
                    <Input placeholder="+82-10-1234-5678" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{t("onboarding.nationality")}</Label>
                    <Select value={profileForm.nationality} onValueChange={v => setProfileForm(p => ({ ...p, nationality: v }))}>
                      <SelectTrigger><SelectValue placeholder={t("onboarding.selectNationality")} /></SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("onboarding.birthDate")}</Label>
                    <Input type="date" value={profileForm.birthDate} onChange={e => setProfileForm(p => ({ ...p, birthDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{t("onboarding.gender")}</Label>
                    <Select value={profileForm.gender} onValueChange={v => setProfileForm(p => ({ ...p, gender: v as "male" | "female" | "other" }))}>
                      <SelectTrigger><SelectValue placeholder={t("onboarding.selectGender")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t("onboarding.male")}</SelectItem>
                        <SelectItem value="female">{t("onboarding.female")}</SelectItem>
                        <SelectItem value="other">{t("onboarding.otherGender")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />{t("onboarding.orgTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t("onboarding.orgName")}</Label>
                    <Input placeholder={t("onboarding.orgPlaceholder")} value={profileForm.organization} onChange={e => setProfileForm(p => ({ ...p, organization: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{t("onboarding.position")}</Label>
                    <Input placeholder={t("onboarding.positionPlaceholder")} value={profileForm.position} onChange={e => setProfileForm(p => ({ ...p, position: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{t("onboarding.department")}</Label>
                    <Input placeholder={t("onboarding.departmentPlaceholder")} value={profileForm.department} onChange={e => setProfileForm(p => ({ ...p, department: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{t("onboarding.telegramId")}</Label>
                    <Input placeholder="@username" value={profileForm.telegramId} onChange={e => setProfileForm(p => ({ ...p, telegramId: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>{t("onboarding.bio")}</Label>
                  <Textarea placeholder={t("onboarding.bioPlaceholder")} value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} rows={2} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5 text-primary" />{t("onboarding.healthTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t("onboarding.emergencyName")}</Label>
                    <Input placeholder={t("onboarding.emergencyNamePlaceholder")} value={profileForm.emergencyContact} onChange={e => setProfileForm(p => ({ ...p, emergencyContact: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{t("onboarding.emergencyPhone")}</Label>
                    <Input placeholder={t("onboarding.emergencyPhonePlaceholder")} value={profileForm.emergencyPhone} onChange={e => setProfileForm(p => ({ ...p, emergencyPhone: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>{t("onboarding.dietary")}</Label>
                  <Input placeholder={t("onboarding.dietaryPlaceholder")} value={profileForm.dietaryRestrictions} onChange={e => setProfileForm(p => ({ ...p, dietaryRestrictions: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("onboarding.allergies")}</Label>
                  <Input placeholder={t("onboarding.allergiesPlaceholder")} value={profileForm.allergies} onChange={e => setProfileForm(p => ({ ...p, allergies: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("onboarding.medicalNotes")}</Label>
                  <Textarea placeholder={t("onboarding.medicalNotesPlaceholder")} value={profileForm.medicalNotes} onChange={e => setProfileForm(p => ({ ...p, medicalNotes: e.target.value }))} rows={2} />
                </div>
                <div>
                  <Label>{t("onboarding.preferredLang")}</Label>
                  <Select value={profileForm.preferredLanguage} onValueChange={v => setProfileForm(p => ({ ...p, preferredLanguage: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES_LIST.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button size="lg" onClick={handleProfileSubmit} disabled={profileMut.isPending}>
                {profileMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t("onboarding.nextPassport")} <ArrowRight className="w-4 h-4 ml-2" />
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
                    <p className="font-medium text-amber-200">{t("onboarding.passportSecure")}</p>
                    <p className="text-sm text-muted-foreground">{t("onboarding.passportSecureDesc")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />{t("onboarding.passportTitle")}</CardTitle>
                <CardDescription>{t("onboarding.passportDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Passport Image Upload */}
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
                  {passportForm.passportImageUrl ? (
                    <div className="space-y-3">
                      <img src={passportForm.passportImageUrl} alt={t("onboarding.passportTitle")} className="max-h-48 mx-auto rounded-lg object-contain" />
                      <Badge variant="secondary">{t("onboarding.passportImageDone")}</Badge>
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        {t("onboarding.reupload")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{t("onboarding.passportUploadHint")}</p>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        {uploading ? t("onboarding.uploading") : t("onboarding.selectImage")}
                      </Button>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePassportImageUpload} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t("onboarding.passportNumber")}</Label>
                    <Input placeholder="M12345678" value={passportForm.passportNumber} onChange={e => setPassportForm(p => ({ ...p, passportNumber: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{t("onboarding.fullNameEn")}</Label>
                    <Input placeholder="HONG GILDONG" value={passportForm.fullName} onChange={e => setPassportForm(p => ({ ...p, fullName: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{t("onboarding.issuingCountry")}</Label>
                    <Select value={passportForm.issuingCountry} onValueChange={v => setPassportForm(p => ({ ...p, issuingCountry: v }))}>
                      <SelectTrigger><SelectValue placeholder={t("onboarding.issuingCountry")} /></SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("onboarding.nationality")}</Label>
                    <Select value={passportForm.nationality} onValueChange={v => setPassportForm(p => ({ ...p, nationality: v }))}>
                      <SelectTrigger><SelectValue placeholder={t("onboarding.nationality")} /></SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("onboarding.birthDate")}</Label>
                    <Input type="date" value={passportForm.birthDate} onChange={e => setPassportForm(p => ({ ...p, birthDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{t("onboarding.gender")}</Label>
                    <Select value={passportForm.gender} onValueChange={v => setPassportForm(p => ({ ...p, gender: v as "M" | "F" }))}>
                      <SelectTrigger><SelectValue placeholder={t("onboarding.gender")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">{t("onboarding.male")} (M)</SelectItem>
                        <SelectItem value="F">{t("onboarding.female")} (F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("onboarding.issueDate")}</Label>
                    <Input type="date" value={passportForm.issueDate} onChange={e => setPassportForm(p => ({ ...p, issueDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{t("onboarding.expiryDate")}</Label>
                    <Input type="date" value={passportForm.expiryDate} onChange={e => setPassportForm(p => ({ ...p, expiryDate: e.target.value }))} />
                  </div>
                </div>

                {passportForm.expiryDate && new Date(passportForm.expiryDate) < new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">{t("onboarding.expiryWarning")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />{t("onboarding.prev")}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="lg" onClick={() => setStep(3)}>
                  {t("onboarding.skip")}
                </Button>
                <Button size="lg" onClick={handlePassportSubmit} disabled={passportMut.isPending}>
                  {passportMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {t("onboarding.nextComplete")} <ArrowRight className="w-4 h-4 ml-2" />
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
                <h2 className="text-2xl font-bold mb-2">{t("onboarding.completeTitle")}</h2>
                <p className="text-muted-foreground">
                  {t("onboarding.completeDesc", { name: user?.name })}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="p-3 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">{t("onboarding.profileRegistered")}</p>
                  <Badge variant="default" className="mt-1">{t("onboarding.done")}</Badge>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <BookOpen className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">{t("onboarding.passportInfoLabel")}</p>
                  <Badge variant={passportForm.passportNumber ? "default" : "secondary"} className="mt-1">
                    {passportForm.passportNumber ? t("onboarding.done") : t("onboarding.notRegistered")}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <Shield className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">{t("onboarding.securitySettings")}</p>
                  <Badge variant="default" className="mt-1">{t("onboarding.done")}</Badge>
                </div>
              </div>

              <Button size="lg" className="px-8" onClick={() => completeMut.mutate()} disabled={completeMut.isPending}>
                {completeMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t("onboarding.start")} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
