import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  User, Phone, Building2, Heart, Edit2, Save, Loader2, CheckCircle, AlertTriangle,
} from "lucide-react";
import { TranslateButton } from "@/components/TranslateButton";
import { toast } from "sonner";
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

export default function ProfileTab({ user }: { user: any }) {
  const { t } = useTranslation();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>(null);

  const profileQuery = trpc.userProfile.get.useQuery(undefined, { enabled: !!user });

  const profileMut = trpc.userProfile.upsert.useMutation({
    onSuccess: () => {
      toast.success(t("myPage.profileSaved"));
      setEditingProfile(false);
      profileQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const profile = profileQuery.data;

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

  const handleSaveProfile = () => {
    const data: any = { ...profileForm };
    if (!data.gender) delete data.gender;
    profileMut.mutate(data);
  };

  return (
    <div className="space-y-4">
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
              {profile?.bio && <div className="mt-3 text-sm"><span className="text-muted-foreground">{t("myPage.bio")}</span><p className="mt-1">{profile.bio}</p><TranslateButton text={profile.bio} variant="compact" className="mt-1" /></div>}
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
    </div>
  );
}
