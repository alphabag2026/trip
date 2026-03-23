import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function TwoFactorSettings() {
  const { user, refresh } = useAuth();
  const [setupData, setSetupData] = useState<{ secret: string; qrDataUrl: string; uri: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [copied, setCopied] = useState(false);

  const setup2FA = trpc.auth.setup2FA.useMutation({
    onSuccess: (data) => {
      setSetupData(data);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const confirm2FA = trpc.auth.confirm2FA.useMutation({
    onSuccess: () => {
      toast.success("Google Authenticator 2차 인증이 활성화되었습니다.");
      setSetupData(null);
      setConfirmCode("");
      refresh();
    },
    onError: (err) => {
      toast.error(err.message);
      setConfirmCode("");
    },
  });

  const disable2FA = trpc.auth.disable2FA.useMutation({
    onSuccess: () => {
      toast.success("2차 인증이 비활성화되었습니다.");
      setDisableCode("");
      refresh();
    },
    onError: (err) => {
      toast.error(err.message);
      setDisableCode("");
    },
  });

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) return null;

  const is2FAEnabled = (user as any).totpEnabled;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">2차 인증 (2FA)</h2>
        <p className="text-slate-400 mt-1">Google Authenticator를 사용한 2차 인증을 관리합니다.</p>
      </div>

      {/* Current Status */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {is2FAEnabled ? (
              <>
                <ShieldCheck className="w-5 h-5 text-green-400" />
                2FA 활성화됨
              </>
            ) : (
              <>
                <ShieldOff className="w-5 h-5 text-yellow-400" />
                2FA 비활성화됨
              </>
            )}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {is2FAEnabled
              ? "로그인 시 Google Authenticator 코드가 필요합니다."
              : "보안 강화를 위해 2차 인증을 활성화하세요."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Enable 2FA */}
      {!is2FAEnabled && !setupData && (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">2FA 활성화</CardTitle>
            <CardDescription className="text-slate-400">
              Google Authenticator 앱을 설치한 후 아래 버튼을 클릭하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setup2FA.mutate()}
              disabled={setup2FA.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {setup2FA.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  QR 코드 생성 중...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  2FA 설정 시작
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR Code Setup */}
      {setupData && (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">QR 코드 스캔</CardTitle>
            <CardDescription className="text-slate-400">
              Google Authenticator 앱에서 아래 QR 코드를 스캔하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-xl">
                <img src={setupData.qrDataUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            </div>

            {/* Manual Secret */}
            <div className="space-y-2">
              <Label className="text-slate-300">수동 입력 키 (QR 스캔이 안 될 경우)</Label>
              <div className="flex gap-2">
                <Input
                  value={setupData.secret}
                  readOnly
                  className="font-mono text-sm bg-slate-700/50 border-slate-600 text-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copySecret}
                  className="border-slate-600 text-slate-300 hover:text-white shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Confirm Code */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                confirm2FA.mutate({ token: confirmCode });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="text-slate-300">인증 코드 확인</Label>
                <p className="text-xs text-slate-500">앱에 표시된 6자리 코드를 입력하여 설정을 완료하세요.</p>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-xl tracking-[0.3em] font-mono bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 max-w-xs"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={confirm2FA.isPending || confirmCode.length !== 6}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {confirm2FA.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 mr-2" />
                  )}
                  활성화 확인
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-400"
                  onClick={() => {
                    setSetupData(null);
                    setConfirmCode("");
                  }}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Disable 2FA */}
      {is2FAEnabled && (
        <Card className="border-red-900/50 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">2FA 비활성화</CardTitle>
            <CardDescription className="text-slate-400">
              현재 인증 코드를 입력하여 2차 인증을 비활성화할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                disable2FA.mutate({ token: disableCode });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="text-slate-300">현재 인증 코드</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-xl tracking-[0.3em] font-mono bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 max-w-xs"
                />
              </div>
              <Button
                type="submit"
                variant="destructive"
                disabled={disable2FA.isPending || disableCode.length !== 6}
              >
                {disable2FA.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ShieldOff className="w-4 h-4 mr-2" />
                )}
                2FA 비활성화
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
