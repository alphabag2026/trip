import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Send, Settings, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function AdminTelegram() {
  const { t } = useTranslation();
  const { data: config, refetch } = trpc.telegram.getConfig.useQuery();
  const updateMutation = trpc.telegram.updateConfig.useMutation({
    onSuccess: () => { refetch(); toast.success(t("admin.telegramConfig.saved")); },
  });
  const testMutation = trpc.telegram.testSend.useMutation({
    onSuccess: () => toast.success(t("admin.telegramConfig.testSent")),
    onError: (err) => toast.error(err.message),
  });

  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (config) {
      setBotToken(config.botToken || "");
      setChatId(config.chatId || "");
      setEnabled(config.enabled ?? true);
    }
  }, [config]);

  const handleSave = () => {
    updateMutation.mutate({
      botToken: botToken || undefined,
      chatId: chatId || undefined,
      enabled,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.telegramConfig.title")}</h1>

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
    </div>
  );
}
