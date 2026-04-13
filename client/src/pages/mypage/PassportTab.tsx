import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BookOpen, Shield, Edit2, Save, Loader2, Eye, EyeOff, Upload,
  ScanLine, RotateCcw, Camera,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function PassportTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [editingPassport, setEditingPassport] = useState(false);
  const [showPassportNumber, setShowPassportNumber] = useState(false);
  const [passportForm, setPassportForm] = useState<any>(null);
  const [originalPassportForm, setOriginalPassportForm] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const passportQuery = trpc.passport.get.useQuery(undefined, { enabled: !!user });
  const passportMut = trpc.passport.save.useMutation({
    onSuccess: () => {
      toast.success(t("myPage.passportSaved"));
      setEditingPassport(false);
      passportQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const scanMut = trpc.passport.scan.useMutation();

  const passport = passportQuery.data;

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

  const handlePassportScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error(t("myPage.t24", "파일 크기는 10MB 이하만 가능합니다")); return; }
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
        toast.success(t("myPage.t25", "여권 정보가 자동으로 인식되었습니다! 확인 후 저장해주세요."));
      } else {
        toast.error(t("myPage.t26", "여권 인식에 실패했습니다. 사진을 다시 촬영해주세요."));
      }
    } catch {
      toast.error(t("myPage.t27", "여권 스캔 중 오류가 발생했습니다."));
    } finally {
      setScanning(false);
      if (e.target) e.target.value = "";
    }
  };

  const maskPassportNumber = (num: string) => {
    if (!num) return "-";
    if (showPassportNumber) return num;
    return num.slice(0, 2) + "***" + num.slice(-2);
  };

  const resetPassportField = (field: string) => {
    if (originalPassportForm) {
      setPassportForm((p: any) => ({ ...p, [field]: originalPassportForm[field] }));
      toast.info(t("myPage.t28", "원래 OCR 값으로 복원되었습니다."));
    }
  };
  const resetAllPassportFields = () => {
    if (originalPassportForm) {
      setPassportForm(originalPassportForm);
      toast.info(t("myPage.t29", "모든 필드가 OCR 원래 값으로 복원되었습니다."));
    }
  };

  return (
    <div className="space-y-4">
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
              <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePassportScan} />
            </div>
          </CardHeader>
          <CardContent>
            {passport?.passportNumber ? (
              <div className="space-y-4">
                {passport.passportImageUrl && (
                  <div className="flex justify-center">
                    <img loading="lazy" decoding="async" src={passport.passportImageUrl} alt={t("myPage.passportInfo")} className="max-h-40 rounded-lg object-contain border" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("myPage.passportNumber")}</span>
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-medium">{maskPassportNumber(passport.passportNumber)}</p>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowPassportNumber(!showPassportNumber)}>
                        {showPassportNumber ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                  <div><span className="text-muted-foreground">{t("myPage.fullName")}</span><p className="font-medium">{passport.fullName || "-"}</p></div>
                  <div><span className="text-muted-foreground">{t("myPage.issuingCountry")}</span><p className="font-medium">{passport.issuingCountry || "-"}</p></div>
                  <div><span className="text-muted-foreground">{t("myPage.passportNationality")}</span><p className="font-medium">{passport.nationality || "-"}</p></div>
                  <div><span className="text-muted-foreground">{t("myPage.passportBirthDate")}</span><p className="font-medium">{passport.birthDate || "-"}</p></div>
                  <div><span className="text-muted-foreground">{t("myPage.passportGender")}</span><p className="font-medium">{passport.gender || "-"}</p></div>
                  <div><span className="text-muted-foreground">{t("myPage.issueDate")}</span><p className="font-medium">{passport.issueDate || "-"}</p></div>
                  <div><span className="text-muted-foreground">{t("myPage.expiryDate")}</span><p className="font-medium">{passport.expiryDate || "-"}</p></div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t("myPage.noPassport")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />{t("myPage.editPassport")}</CardTitle>
              {originalPassportForm && (
                <Button variant="ghost" size="sm" onClick={resetAllPassportFields} className="gap-1 text-xs">
                  <RotateCcw className="w-3.5 h-3.5" />{t("myPage.t29", "OCR 복원")}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Passport Image */}
              <div className="space-y-2">
                <Label>{t("myPage.passportImage")}</Label>
                {passportForm?.passportImageUrl && (
                  <div className="flex justify-center">
                    <img loading="lazy" decoding="async" src={passportForm.passportImageUrl} alt="Passport" className="max-h-32 rounded-lg object-contain border" />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {t("myPage.uploadImage")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => scanInputRef.current?.click()} disabled={scanning} className="gap-1">
                    {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    {t("myPage.t25b", "AI 스캔")}
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePassportImageUpload} />
                  <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePassportScan} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "passportNumber", label: t("myPage.passportNumber") },
                  { key: "fullName", label: t("myPage.fullName") },
                  { key: "issuingCountry", label: t("myPage.issuingCountry") },
                  { key: "nationality", label: t("myPage.passportNationality") },
                  { key: "birthDate", label: t("myPage.passportBirthDate"), type: "date" },
                  { key: "issueDate", label: t("myPage.issueDate"), type: "date" },
                  { key: "expiryDate", label: t("myPage.expiryDate"), type: "date" },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between">
                      <Label>{label}</Label>
                      {originalPassportForm && originalPassportForm[key] !== passportForm?.[key] && (
                        <Button variant="ghost" size="sm" className="h-5 text-xs px-1" onClick={() => resetPassportField(key)}>
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <Input
                      type={type || "text"}
                      value={passportForm?.[key] || ""}
                      onChange={e => setPassportForm((p: any) => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <Label>{t("myPage.passportGender")}</Label>
                  <Select value={passportForm?.gender || ""} onValueChange={v => setPassportForm((p: any) => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder={t("myPage.select")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                    </SelectContent>
                  </Select>
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
    </div>
  );
}
