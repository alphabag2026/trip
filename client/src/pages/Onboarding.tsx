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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  User, BookOpen, CheckCircle, ArrowRight, ArrowLeft, Upload, Loader2, Shield, Globe, Phone, Building2,
  Briefcase, Heart, AlertTriangle, LogOut, ScanLine, Camera, Sparkles, AlertCircle, ShieldCheck, ShieldAlert, Info, Eye,
} from "lucide-react";
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

// 신뢰도 돈 표시 컴포넌트
function ConfidenceDot({ score }: { score: number }) {
  const color = score >= 0.9 ? 'bg-green-400' : score >= 0.7 ? 'bg-amber-400' : 'bg-red-400';
  const label = score >= 0.9 ? '높음' : score >= 0.7 ? '보통' : '낮음';
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground" title={`신뢰도: ${Math.round(score * 100)}%`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {score < 0.7 && <span className="text-red-400">확인 필요</span>}
    </span>
  );
}

// 신뢰도에 따른 필드 테두리 색상
function getFieldBorderClass(score?: number): string {
  if (score == null) return '';
  if (score < 0.7) return 'border-red-500/50 focus-visible:ring-red-500/30';
  if (score < 0.9) return 'border-amber-500/50 focus-visible:ring-amber-500/30';
  return '';
}

export default function Onboarding() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const passportScanInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<any>(null);

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

  // 여권 스캔 OCR 결과
  const [ocrData, setOcrData] = useState<any>(null);
  const [scanImagePreview, setScanImagePreview] = useState<string>("");

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

  const scanMut = trpc.passport.scan.useMutation();
  const scanAndRegisterMut = trpc.passport.scanAndRegister.useMutation({
    onSuccess: () => {
      toast.success("여권 스캔으로 가입이 완료되었습니다!");
      navigate("/");
    },
    onError: (e) => toast.error(e.message),
  });
  const checkDuplicateMut = trpc.passport.checkDuplicate.useMutation();

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

  // ── 여권 스캔으로 한번에 가입 ──────────────────────────
  const handlePassportScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("파일 크기는 10MB 이하만 가능합니다"); return; }

    setScanning(true);
    // 미리보기 표시
    const reader = new FileReader();
    reader.onload = () => setScanImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      // base64 변환
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // OCR 실행
      const result = await scanMut.mutateAsync({
        imageBase64: base64,
        mimeType: file.type || "image/jpeg",
      });

      if (result.success && result.ocrData) {
        setOcrData(result.ocrData);
        // OCR 결과로 폼 자동 채우기
        const ocr = result.ocrData;
        setPassportForm(p => ({
          ...p,
          fullName: ocr.fullName || p.fullName,
          passportNumber: ocr.passportNumber || p.passportNumber,
          nationality: ocr.nationality || p.nationality,
          issuingCountry: ocr.issuingCountry || p.issuingCountry,
          birthDate: ocr.dateOfBirth || p.birthDate,
          gender: (ocr.gender === "M" || ocr.gender === "F") ? ocr.gender : p.gender,
          issueDate: ocr.issueDate || p.issueDate,
          expiryDate: ocr.expiryDate || p.expiryDate,
          passportImageUrl: result.imageUrl || p.passportImageUrl,
          passportImageKey: result.imageKey || p.passportImageKey,
        }));
        // 프로필도 자동 채우기
        setProfileForm(p => ({
          ...p,
          nationality: ocr.nationality || p.nationality,
          birthDate: ocr.dateOfBirth || p.birthDate,
          gender: ocr.gender === "M" ? "male" : ocr.gender === "F" ? "female" : p.gender,
          phone: ocr.phone || p.phone,
        }));

        // 중복 체크
        try {
          const dupResult = await checkDuplicateMut.mutateAsync({
            passportNumber: ocr.passportNumber,
            fullName: ocr.fullName,
            birthDate: ocr.dateOfBirth,
          });
          if (dupResult.isDuplicate) {
            setDuplicateInfo(dupResult);
            setShowDuplicateDialog(true);
          }
        } catch { /* 중복 체크 실패 무시 */ }

        toast.success("여권 정보가 자동으로 인식되었습니다! 확인 후 저장해주세요.");
        setStep(0); // 스캔 결과 확인 단계
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

  // 스캔 결과로 한번에 가입
  const handleScanAndRegister = () => {
    if (!profileForm.phone.trim()) {
      toast.error("전화번호를 입력해주세요.");
      return;
    }
    scanAndRegisterMut.mutate({
      phone: profileForm.phone,
      nationality: profileForm.nationality || undefined,
      birthDate: profileForm.birthDate || undefined,
      gender: profileForm.gender as "male" | "female" | "other" || undefined,
      preferredLanguage: profileForm.preferredLanguage,
      telegramId: profileForm.telegramId || undefined,
      passportNumber: passportForm.passportNumber || undefined,
      issuingCountry: passportForm.issuingCountry || undefined,
      passportNationality: passportForm.nationality || undefined,
      fullName: passportForm.fullName || undefined,
      passportBirthDate: passportForm.birthDate || undefined,
      passportGender: passportForm.gender as "M" | "F" || undefined,
      issueDate: passportForm.issueDate || undefined,
      expiryDate: passportForm.expiryDate || undefined,
      passportImageUrl: passportForm.passportImageUrl || undefined,
      passportImageKey: passportForm.passportImageKey || undefined,
      ocrData: ocrData || undefined,
    });
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
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{t("onboarding.welcome", { name: user?.name })}</span>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1" onClick={() => { logout(); window.location.href = "/"; }}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav.logout", "로그아웃")}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-2xl py-8">
        {/* 여권 스캔 자동 가입 버튼 (step 1에서만 표시) */}
        {step === 1 && (
          <Card className="mb-6 border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 overflow-hidden relative">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <ScanLine className="h-7 w-7 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-300 mb-1 flex items-center gap-2">
                    여권 스캔으로 한번에 가입
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
                      <Sparkles className="h-3 w-3 mr-0.5" /> AI OCR
                    </Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    여권 사진 한 장으로 프로필과 여권 정보를 자동으로 입력합니다. 전화번호만 추가로 입력하면 가입 완료!
                  </p>
                  {/* 이미지 품질 가이드 */}
                  <div className="mb-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Info className="h-3 w-3" /> 촬영 팁 (정확도 향상)
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Eye className="h-3 w-3 text-green-400 shrink-0" /> 여권 정보 페이지를 평평하게 펼쳐주세요</div>
                      <div className="flex items-center gap-1.5"><Camera className="h-3 w-3 text-green-400 shrink-0" /> 밝은 곳에서 반사 없이 촬영</div>
                      <div className="flex items-center gap-1.5"><ScanLine className="h-3 w-3 text-green-400 shrink-0" /> 하단 MRZ 코드가 선명하게 보이도록</div>
                      <div className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-green-400 shrink-0" /> 손가락으로 정보를 가리지 마세요</div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => passportScanInputRef.current?.click()}
                      disabled={scanning}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          AI가 여권을 분석 중...
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4" />
                          여권 사진 촬영/선택
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { /* 일반 가입 진행 */ }}>
                      직접 입력하기
                    </Button>
                  </div>
                </div>
              </div>
              <input
                ref={passportScanInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePassportScan}
              />
            </CardContent>
          </Card>
        )}

        {/* 스캔 중 오버레이 */}
        {scanning && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <Card className="max-w-sm mx-4">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto animate-pulse">
                  <ScanLine className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">여권 분석 중...</h3>
                  <p className="text-sm text-muted-foreground mt-1">AI가 여권 정보를 읽고 있습니다</p>
                </div>
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-400" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 중복 프로필 경고 다이얼로그 */}
        <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-400">
                <AlertCircle className="h-5 w-5" /> 중복 프로필 감지
              </DialogTitle>
              <DialogDescription>
                동일한 여권 정보로 등록된 사용자가 이미 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {duplicateInfo?.matches?.map((m: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                  <p className="font-medium text-amber-300">
                    {m.matchType === "passport_number" ? "여권번호 일치" : "이름+생년월일 일치"}
                  </p>
                  {m.fullName && <p className="text-muted-foreground">이름: {m.fullName}</p>}
                  {m.passportNumber && <p className="text-muted-foreground">여권번호: {m.passportNumber}</p>}
                </div>
              ))}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
                무시하고 계속
              </Button>
              <Button variant="destructive" onClick={() => { setShowDuplicateDialog(false); setStep(1); setOcrData(null); setScanImagePreview(""); }}>
                취소하고 돌아가기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Progress Steps (step 0은 스캔 결과 확인) */}
        {step !== 0 && (
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
        )}

        {/* Step 0: 여권 스캔 결과 확인 & 한번에 가입 */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4 gap-2">
              <ScanLine className="h-6 w-6 text-blue-400" />
              <h2 className="text-xl font-bold">여권 스캔 결과 확인</h2>
            </div>

            {/* 스캔 이미지 미리보기 */}
            {scanImagePreview && (
              <Card>
                <CardContent className="pt-4 pb-4 flex justify-center">
                  <img src={scanImagePreview} alt="여권 스캔" className="max-h-48 rounded-lg object-contain" />
                </CardContent>
              </Card>
            )}

            {/* MRZ 검증 상태 배너 */}
            {ocrData?._mrzValidation && (
              <Card className={`border ${ocrData._mrzValidation.allChecksValid ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    {ocrData._mrzValidation.allChecksValid ? (
                      <ShieldCheck className="h-6 w-6 text-green-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="h-6 w-6 text-amber-400 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${ocrData._mrzValidation.allChecksValid ? 'text-green-400' : 'text-amber-400'}`}>
                        {ocrData._mrzValidation.allChecksValid
                          ? 'MRZ 체크디짓 검증 통과 - 높은 신뢰도'
                          : 'MRZ 일부 검증 실패 - 수동 확인 필요'}
                      </p>
                      <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span className={ocrData._mrzValidation.passportNumberValid ? 'text-green-400' : 'text-red-400'}>
                          여권번호 {ocrData._mrzValidation.passportNumberValid ? '✓' : '✗'}
                        </span>
                        <span className={ocrData._mrzValidation.dobValid ? 'text-green-400' : 'text-red-400'}>
                          생년월일 {ocrData._mrzValidation.dobValid ? '✓' : '✗'}
                        </span>
                        <span className={ocrData._mrzValidation.expiryValid ? 'text-green-400' : 'text-red-400'}>
                          만료일 {ocrData._mrzValidation.expiryValid ? '✓' : '✗'}
                        </span>
                        <span className={ocrData._mrzValidation.overallValid ? 'text-green-400' : 'text-red-400'}>
                          종합 {ocrData._mrzValidation.overallValid ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* OCR 결과 - 여권 정보 */}
            <Card className="border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="w-4 h-4 text-blue-400" /> 인식된 여권 정보
                  {ocrData?.confidence?.overall != null && (
                    <Badge variant="outline" className={`text-[10px] ${ocrData.confidence.overall >= 0.9 ? 'border-green-500/30 text-green-400' : ocrData.confidence.overall >= 0.7 ? 'border-amber-500/30 text-amber-400' : 'border-red-500/30 text-red-400'}`}>
                      신뢰도 {Math.round(ocrData.confidence.overall * 100)}%
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      영문 이름
                      {ocrData?.confidence?.fullName != null && <ConfidenceDot score={ocrData.confidence.fullName} />}
                    </Label>
                    <Input value={passportForm.fullName} onChange={e => setPassportForm(p => ({ ...p, fullName: e.target.value }))} className={getFieldBorderClass(ocrData?.confidence?.fullName)} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      여권번호
                      {ocrData?.confidence?.passportNumber != null && <ConfidenceDot score={ocrData.confidence.passportNumber} />}
                    </Label>
                    <Input value={passportForm.passportNumber} onChange={e => setPassportForm(p => ({ ...p, passportNumber: e.target.value }))} className={getFieldBorderClass(ocrData?.confidence?.passportNumber)} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      국적
                      {ocrData?.confidence?.nationality != null && <ConfidenceDot score={ocrData.confidence.nationality} />}
                    </Label>
                    <Input value={passportForm.nationality} onChange={e => setPassportForm(p => ({ ...p, nationality: e.target.value }))} className={getFieldBorderClass(ocrData?.confidence?.nationality)} />
                  </div>
                  <div>
                    <Label className="text-xs">발급국</Label>
                    <Input value={passportForm.issuingCountry} onChange={e => setPassportForm(p => ({ ...p, issuingCountry: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      생년월일
                      {ocrData?.confidence?.dateOfBirth != null && <ConfidenceDot score={ocrData.confidence.dateOfBirth} />}
                    </Label>
                    <Input type="date" value={passportForm.birthDate} onChange={e => setPassportForm(p => ({ ...p, birthDate: e.target.value }))} className={getFieldBorderClass(ocrData?.confidence?.dateOfBirth)} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      성별
                      {ocrData?.confidence?.gender != null && <ConfidenceDot score={ocrData.confidence.gender} />}
                    </Label>
                    <Select value={passportForm.gender} onValueChange={v => setPassportForm(p => ({ ...p, gender: v as "M" | "F" }))}>
                      <SelectTrigger><SelectValue placeholder="성별" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">남성 (M)</SelectItem>
                        <SelectItem value="F">여성 (F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">발급일</Label>
                    <Input type="date" value={passportForm.issueDate} onChange={e => setPassportForm(p => ({ ...p, issueDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      만료일
                      {ocrData?.confidence?.expiryDate != null && <ConfidenceDot score={ocrData.confidence.expiryDate} />}
                    </Label>
                    <Input type="date" value={passportForm.expiryDate} onChange={e => setPassportForm(p => ({ ...p, expiryDate: e.target.value }))} className={getFieldBorderClass(ocrData?.confidence?.expiryDate)} />
                  </div>
                </div>

                {passportForm.expiryDate && new Date(passportForm.expiryDate) < new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">여권 만료일이 6개월 이내입니다. 갱신을 권장합니다.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 추가 입력 필요 - 전화번호 */}
            <Card className="border-green-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="w-4 h-4 text-green-400" /> 추가 정보 입력
                  <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">필수</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">전화번호 *</Label>
                    <Input placeholder="+82-10-1234-5678" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">텔레그램 ID</Label>
                    <Input placeholder="@username" value={profileForm.telegramId} onChange={e => setProfileForm(p => ({ ...p, telegramId: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">선호 언어</Label>
                    <Select value={profileForm.preferredLanguage} onValueChange={v => setProfileForm(p => ({ ...p, preferredLanguage: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES_LIST.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 액션 버튼 */}
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => { setStep(1); setOcrData(null); setScanImagePreview(""); }}>
                <ArrowLeft className="w-4 h-4 mr-2" /> 돌아가기
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  직접 입력하기
                </Button>
                <Button
                  size="lg"
                  onClick={handleScanAndRegister}
                  disabled={scanAndRegisterMut.isPending || !profileForm.phone.trim()}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  {scanAndRegisterMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  한번에 가입 완료
                </Button>
              </div>
            </div>
          </div>
        )}

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
