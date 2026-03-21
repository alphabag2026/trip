import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Send, Settings, CheckCircle, Webhook, Globe, AlertTriangle, Loader2, Unlink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function AdminTelegram() {
  const { t } = useTranslation();
  const { data: config, refetch } = trpc.telegram.getConfig.useQuery();
  const { data: webhookInfo, refetch: refetchWebhook } = trpc.telegram.webhookInfo.useQuery();
  const updateMutation = trpc.telegram.updateConfig.useMutation({
    onSuccess: () => { refetch(); toast.success(t("admin.telegramConfig.saved")); },
  });
  const testMutation = trpc.telegram.testSend.useMutation({
    onSuccess: () => toast.success(t("admin.telegramConfig.testSent")),
    onError: (err) => toast.error(err.message),
  });
  const setupWebhookMutation = trpc.telegram.setupWebhook.useMutation({
    onSuccess: () => { refetchWebhook(); toast.success("Webhook이 설정되었습니다"); },
    onError: (err) => toast.error(err.message),
  });
  const removeWebhookMutation = trpc.telegram.removeWebhook.useMutation({
    onSuccess: () => { refetchWebhook(); toast.success("Webhook이 해제되었습니다"); },
    onError: (err) => toast.error(err.message),
  });

  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    if (config) {
      setBotToken(config.botToken || "");
      setChatId(config.chatId || "");
      setEnabled(config.enabled ?? true);
    }
  }, [config]);

  // Auto-generate webhook URL based on current origin
  useEffect(() => {
    if (!webhookUrl) {
      setWebhookUrl(`${window.location.origin}/api/telegram/webhook`);
    }
  }, []);

  const handleSave = () => {
    updateMutation.mutate({
      botToken: botToken || undefined,
      chatId: chatId || undefined,
      enabled,
    });
  };

  const handleSetupWebhook = () => {
    if (!webhookUrl) { toast.error("Webhook URL을 입력하세요"); return; }
    setupWebhookMutation.mutate({ webhookUrl });
  };

  const isWebhookActive = webhookInfo?.url && webhookInfo.url.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.telegramConfig.title")}</h1>

      {/* Bot Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t("admin.telegramConfig.botSettings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="botToken">Bot Token</Label>
            <Input id="botToken" type="password" value={botToken} onChange={e => setBotToken(e.target.value)} placeholder="123456:ABC-DEF..." />
            <p className="text-xs text-muted-foreground mt-1">{t("admin.telegramConfig.botTokenHint")}</p>
          </div>
          <div>
            <Label htmlFor="chatId">Chat ID</Label>
            <Input id="chatId" value={chatId} onChange={e => setChatId(e.target.value)} placeholder="-1001234567890" />
            <p className="text-xs text-muted-foreground mt-1">{t("admin.telegramConfig.chatIdHint")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label>{t("admin.telegramConfig.enableNotif")}</Label>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />{t("admin.telegramConfig.save")}
            </Button>
            <Button variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
              <Send className="h-4 w-4 mr-2" />{t("admin.telegramConfig.testSend")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-blue-400" />
            Webhook 설정
          </CardTitle>
          <CardDescription>
            텔레그램 봇에 Webhook을 등록하면, 관리자가 텔레그램으로 보낸 메시지가 자동으로 수신되어 여행 정보로 파싱됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">현재 상태:</span>
                {isWebhookActive ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">활성</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">미설정</Badge>
                )}
              </div>
              {isWebhookActive && (
                <p className="text-xs text-muted-foreground truncate mt-1">URL: {webhookInfo.url}</p>
              )}
              {webhookInfo?.pending_update_count > 0 && (
                <p className="text-xs text-orange-400 mt-1">대기중 업데이트: {webhookInfo.pending_update_count}건</p>
              )}
              {webhookInfo?.last_error_message && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-red-400">{webhookInfo.last_error_message}</span>
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetchWebhook()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Setup Webhook */}
          <div>
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://your-domain.com/api/telegram/webhook"
            />
            <p className="text-xs text-muted-foreground mt-1">
              배포 후 실제 도메인 URL을 입력하세요. 현재 개발 환경에서는 HTTPS가 필요합니다.
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSetupWebhook} disabled={setupWebhookMutation.isPending || !botToken}>
              {setupWebhookMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Webhook className="h-4 w-4 mr-2" />}
              Webhook 등록
            </Button>
            {isWebhookActive && (
              <Button variant="destructive" onClick={() => removeWebhookMutation.mutate()} disabled={removeWebhookMutation.isPending}>
                {removeWebhookMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unlink className="h-4 w-4 mr-2" />}
                Webhook 해제
              </Button>
            )}
          </div>

          {/* How it works */}
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-sm space-y-2">
            <p className="font-medium text-blue-400">Webhook 작동 방식</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
              <li>위에서 Bot Token을 설정하고 저장합니다</li>
              <li>Webhook URL을 입력하고 "Webhook 등록" 버튼을 클릭합니다</li>
              <li>텔레그램 봇에 메시지를 보내면 자동으로 수신됩니다</li>
              <li>수신된 메시지는 LLM이 자동 분석하여 여행 정보로 분류합니다</li>
              <li>"텔레그램 업로드" 메뉴에서 수신된 정보를 확인/승인할 수 있습니다</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
