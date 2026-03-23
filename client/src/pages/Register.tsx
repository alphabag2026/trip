import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plane, ArrowLeft, CheckCircle, Upload, Info, Luggage, AlertTriangle, Clock, UtensilsCrossed, Wine, Cigarette, Train, Car, Check } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";

const FORM_STEPS = [
  { id: 1, labelKey: "register.stepTransport", label: "교통수단" },
  { id: 2, labelKey: "register.stepRequired", label: "필수 정보" },
  { id: 3, labelKey: "register.stepMeal", label: "식사/생활" },
  { id: 4, labelKey: "register.stepAdditional", label: "추가 정보" },
];

export default function Register() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const params = useParams<{ meetupId?: string }>();
  const meetupId = params.meetupId ? parseInt(params.meetupId) : undefined;

  const [locationType, setLocationType] = useState<"domestic" | "overseas">("domestic");
  const [submitted, setSubmitted] = useState(false);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [checkedBagRequest, setCheckedBagRequest] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
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
    mealPreference: "",
    allergies: "",
    drinkAlcohol: "" as "" | "yes" | "no" | "sometimes",
    smoking: "" as "" | "yes" | "no",
    transportType: "" as "" | "flight" | "ktx" | "none" | "other",
    transportNotes: "",
  });

  const { data: meetups } = trpc.meetup.list.useQuery({ status: "open" });
  const { data: selectedMeetup } = trpc.meetup.getById.useQuery(
    { id: meetupId! },
    { enabled: !!meetupId }
  );

  // Auto-fill from user profile
  const { data: profileData } = trpc.userProfile.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (profileData && !form.name && !form.phone) {
      setForm(prev => ({
        ...prev,
        name: prev.name || user?.name || "",
        phone: prev.phone || profileData.phone || "",
        messengerId: prev.messengerId || profileData.telegramId || "",
      }));
    }
  }, [profileData, user]);

  const createMutation = trpc.registration.create.useMutation();
  const uploadPassportMutation = trpc.registration.uploadPassport.useMutation();

  const handleChange = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const baggageNotice = selectedMeetup?.baggageNotice || t("register.baggageNotice");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.messengerId) {
      toast.error(t("register.requiredError"));
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
        transportType: locationType === "domestic" && form.transportType ? form.transportType as "flight" | "ktx" | "none" | "other" : undefined,
        transportNotes: locationType === "domestic" && form.transportNotes ? form.transportNotes : undefined,
        preferredDepartureTime: form.preferredDepartureTime || undefined,
        mealPreference: form.mealPreference || undefined,
        allergies: form.allergies || undefined,
        drinkAlcohol: form.drinkAlcohol || undefined,
        smoking: form.smoking || undefined,
      });

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
          } catch { toast.error(t("register.passportError")); }
        };
        reader.readAsDataURL(passportFile);
      }
      setSubmitted(true);
      toast.success(t("register.successToast"));
    } catch (err: any) {
      toast.error(err.message || t("register.errorToast"));
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t("register.successTitle")}</h2>
            <p className="text-muted-foreground mb-6">{t("register.successDesc")}</p>
            <div className="flex gap-3 justify-center">
              <Link href="/"><Button variant="outline">{t("register.goHome")}</Button></Link>
              <Link href="/lookup"><Button>{t("register.goLookup")}</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <Plane className="h-5 w-5 text-primary" />
            <span className="font-semibold">{t("register.title")}</span>
          </Link>
          <LanguageSelector />
        </div>
      </header>

      <div className="container max-w-2xl py-8">
        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    currentStep > step.id ? 'bg-green-500 text-white' :
                    currentStep === step.id ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                  </div>
                  <span className={`text-[10px] mt-1 whitespace-nowrap ${
                    currentStep >= step.id ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}>{t(step.labelKey, step.label)}</span>
                </div>
                {i < FORM_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mt-[-16px] transition-colors ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Location Type Toggle */}
        <div className="flex gap-3 mb-6">
          <Button variant={locationType === "domestic" ? "default" : "outline"} className="flex-1" onClick={() => setLocationType("domestic")}>{t("register.domestic")}</Button>
          <Button variant={locationType === "overseas" ? "default" : "outline"} className="flex-1" onClick={() => setLocationType("overseas")}>{t("register.overseas")}</Button>
        </div>

        {locationType === "overseas" && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-primary">{t("register.overseasInfo")}</p>
          </div>
        )}

        {/* 내륙 교통수단 선택 */}
        {locationType === "domestic" && (
          <Card className="bg-card border-border mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Train className="h-5 w-5 text-primary" />
                {t("register.transportTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: "flight" as const, icon: Plane, label: t("register.transport_flight") },
                  { value: "ktx" as const, icon: Train, label: t("register.transport_ktx") },
                  { value: "none" as const, icon: Car, label: t("register.transport_none") },
                  { value: "other" as const, icon: Info, label: t("register.transport_other") },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleChange("transportType", opt.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      form.transportType === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <opt.icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
              {form.transportType === "other" && (
                <div>
                  <Label htmlFor="transportNotes">{t("register.transportNotes")}</Label>
                  <Input
                    id="transportNotes"
                    value={form.transportNotes}
                    onChange={e => handleChange("transportNotes", e.target.value)}
                    placeholder={t("register.transportNotesPh")}
                  />
                </div>
              )}
              {form.transportType === "flight" && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
                  <Plane className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-400">{t("register.transportFlightInfo")}</p>
                </div>
              )}
              {form.transportType === "ktx" && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-2">
                  <Train className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-green-400">{t("register.transportKtxInfo")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 수화물 공지 */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Luggage className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-500 mb-1">{t("register.baggageNotice")}</p>
            <p className="text-sm text-amber-400/90">{baggageNotice}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 필수 입력 */}
          <Card className="bg-card border-border" onFocus={() => setCurrentStep(2)}>
            <CardHeader><CardTitle className="text-lg">{t("register.required")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">{t("register.name")} *</Label>
                <Input id="name" value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder={t("register.namePh")} required />
              </div>
              <div>
                <Label htmlFor="scheduleStart">{t("register.date")} {locationType === "overseas" ? t("register.departureDate") + " *" : "*"}</Label>
                <Input id="scheduleStart" type="date" value={form.scheduleStart} onChange={e => handleChange("scheduleStart", e.target.value)} />
              </div>
              {locationType === "overseas" && (
                <div>
                  <Label htmlFor="scheduleEnd">{t("register.returnDate")} *</Label>
                  <Input id="scheduleEnd" type="date" value={form.scheduleEnd} onChange={e => handleChange("scheduleEnd", e.target.value)} />
                </div>
              )}
              <div>
                <Label htmlFor="preferredDepartureTime" className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {t("register.departureTime")}
                </Label>
                <Select value={form.preferredDepartureTime} onValueChange={v => handleChange("preferredDepartureTime", v)}>
                  <SelectTrigger><SelectValue placeholder={t("register.departureTimePh")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="00:00~03:00">00:00~03:00</SelectItem>
                    <SelectItem value="03:00~06:00">03:00~06:00</SelectItem>
                    <SelectItem value="06:00~09:00">06:00~09:00</SelectItem>
                    <SelectItem value="09:00~12:00">09:00~12:00</SelectItem>
                    <SelectItem value="12:00~15:00">12:00~15:00</SelectItem>
                    <SelectItem value="15:00~18:00">15:00~18:00</SelectItem>
                    <SelectItem value="18:00~21:00">18:00~21:00</SelectItem>
                    <SelectItem value="21:00~24:00">21:00~24:00</SelectItem>
                    <SelectItem value="no_preference">{t("register.noPreference")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="phone">{t("register.phone")} *</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder={t("register.phonePh")} required />
              </div>
              <div>
                <Label htmlFor="messengerId">{t("register.messengerId")} *</Label>
                <Input id="messengerId" value={form.messengerId} onChange={e => handleChange("messengerId", e.target.value)} placeholder={t("register.messengerIdPh")} required />
              </div>
            </CardContent>
          </Card>

          {/* 식사 / 알레르기 / 음주 / 흡연 */}
          <Card className="bg-card border-border" onFocus={() => setCurrentStep(3)}>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><UtensilsCrossed className="h-5 w-5 text-primary" />{t("register.mealLife")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="mealPreference">{t("register.mealPreference")}</Label>
                <Select value={form.mealPreference} onValueChange={v => handleChange("mealPreference", v)}>
                  <SelectTrigger><SelectValue placeholder={t("register.mealPh")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="일반식">{t("register.meal_normal")}</SelectItem>
                    <SelectItem value="채식">{t("register.meal_vegetarian")}</SelectItem>
                    <SelectItem value="비건">{t("register.meal_vegan")}</SelectItem>
                    <SelectItem value="할랄">{t("register.meal_halal")}</SelectItem>
                    <SelectItem value="코셔">{t("register.meal_kosher")}</SelectItem>
                    <SelectItem value="글루텐프리">{t("register.meal_glutenfree")}</SelectItem>
                    <SelectItem value="해산물제외">{t("register.meal_noseafood")}</SelectItem>
                    <SelectItem value="기타">{t("register.meal_other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="allergies">{t("register.allergies")}</Label>
                <Textarea
                  id="allergies"
                  value={form.allergies}
                  onChange={e => handleChange("allergies", e.target.value)}
                  placeholder={t("register.allergiesPh")}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <Wine className="h-3.5 w-3.5 text-primary" />
                    {t("register.drink")}
                  </Label>
                  <Select value={form.drinkAlcohol} onValueChange={v => handleChange("drinkAlcohol", v)}>
                    <SelectTrigger><SelectValue placeholder={t("register.select")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">{t("register.drink_yes")}</SelectItem>
                      <SelectItem value="sometimes">{t("register.drink_sometimes")}</SelectItem>
                      <SelectItem value="no">{t("register.drink_no")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Cigarette className="h-3.5 w-3.5 text-primary" />
                    {t("register.smoking")}
                  </Label>
                  <Select value={form.smoking} onValueChange={v => handleChange("smoking", v)}>
                    <SelectTrigger><SelectValue placeholder={t("register.select")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">{t("register.smoking_yes")}</SelectItem>
                      <SelectItem value="no">{t("register.smoking_no")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 위탁수화물 신청서 */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Luggage className="h-5 w-5 text-primary" />
                  {t("register.checkedBag")}
                </CardTitle>
                <Switch checked={checkedBagRequest} onCheckedChange={setCheckedBagRequest} />
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
                    <Label htmlFor="checkedBagCount">{t("register.bagCount")}</Label>
                    <Select value={form.checkedBagCount} onValueChange={v => handleChange("checkedBagCount", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 {t("register.pcs")}</SelectItem>
                        <SelectItem value="2">2 {t("register.pcs")}</SelectItem>
                        <SelectItem value="3">3 {t("register.pcs")}</SelectItem>
                        <SelectItem value="4">4 {t("register.pcs")}</SelectItem>
                        <SelectItem value="5">5 {t("register.pcsOrMore")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="checkedBagWeight">{t("register.bagWeight")}</Label>
                    <Select value={form.checkedBagWeight} onValueChange={v => handleChange("checkedBagWeight", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15kg">15kg</SelectItem>
                        <SelectItem value="20kg">20kg</SelectItem>
                        <SelectItem value="23kg">23kg ({t("register.bagNormal")})</SelectItem>
                        <SelectItem value="28kg">28kg</SelectItem>
                        <SelectItem value="32kg">32kg ({t("register.bagOver")})</SelectItem>
                        <SelectItem value="기타">{t("register.bagOther")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="checkedBagNotes">{t("register.bagNotes")}</Label>
                  <Textarea
                    id="checkedBagNotes"
                    value={form.checkedBagNotes}
                    onChange={e => handleChange("checkedBagNotes", e.target.value)}
                    placeholder={t("register.bagNotesPh")}
                    rows={3}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* 선택 입력 */}
          <Card className="bg-card border-border" onFocus={() => setCurrentStep(4)}>
            <CardHeader><CardTitle className="text-lg">{t("register.additional")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="walletAddress">{t("register.wallet")}</Label>
                <Input id="walletAddress" value={form.walletAddress} onChange={e => handleChange("walletAddress", e.target.value)} placeholder="0x..." />
              </div>
              <div>
                <Label htmlFor="referrerName">{t("register.referrer")}</Label>
                <Input id="referrerName" value={form.referrerName} onChange={e => handleChange("referrerName", e.target.value)} placeholder={t("register.referrerPh")} />
              </div>
              <div>
                <Label htmlFor="teamName">{t("register.teamName")}</Label>
                <Input id="teamName" value={form.teamName} onChange={e => handleChange("teamName", e.target.value)} placeholder={t("register.teamNamePh")} />
              </div>
              <div>
                <Label htmlFor="teamIntro">{t("register.teamIntro")}</Label>
                <Textarea id="teamIntro" value={form.teamIntro} onChange={e => handleChange("teamIntro", e.target.value)} placeholder={t("register.teamIntroPh")} rows={3} />
              </div>
              {locationType === "overseas" && (
                <div>
                  <Label htmlFor="roommatePreference">{t("register.roommate")}</Label>
                  <Input id="roommatePreference" value={form.roommatePreference} onChange={e => handleChange("roommatePreference", e.target.value)} placeholder={t("register.roommatePh")} />
                </div>
              )}
              <div>
                <Label htmlFor="notes">{t("register.notes")}</Label>
                <Textarea id="notes" value={form.notes} onChange={e => handleChange("notes", e.target.value)} placeholder={t("register.notesPh")} rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* 여권 업로드 (해외) */}
          {locationType === "overseas" && (
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-lg">{t("register.passport")}</CardTitle></CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">{t("register.passportDesc")}</p>
                  <input type="file" accept="image/*" className="hidden" id="passport-upload" onChange={e => setPassportFile(e.target.files?.[0] || null)} />
                  <label htmlFor="passport-upload">
                    <Button type="button" variant="outline" asChild><span>{t("register.selectFile")}</span></Button>
                  </label>
                  {passportFile && <p className="mt-3 text-sm text-primary">{passportFile.name}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? t("register.submitting") : t("register.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
