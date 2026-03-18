import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Send, Settings, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminTelegram() {
  const { data: config, refetch } = trpc.telegram.getConfig.useQuery();
  const updateMutation = trpc.telegram.updateConfig.useMutation({
    onSuccess: () => { refetch(); toast.success("설정이 저장되었습니다."); },
  });
  const testMutation = trpc.telegram.testSend.useMutation({
    onSuccess: () => toast.success("테스트 메시지가 전송되었습니다!"),
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
      <h1 className="text-2xl font-bold">텔레그램 설정</h1>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            봇 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="botToken">Bot Token</Label>
            <Input id="botToken" type="password" value={botToken} onChange={e => setBotToken(e.target.value)} placeholder="123456:ABC-DEF..." />
            <p className="text-xs text-muted-foreground mt-1">@BotFather에서 발급받은 토큰을 입력하세요.</p>
          </div>
          <div>
            <Label htmlFor="chatId">Chat ID</Label>
            <Input id="chatId" value={chatId} onChange={e => setChatId(e.target.value)} placeholder="-1001234567890" />
            <p className="text-xs text-muted-foreground mt-1">알림을 받을 그룹 또는 채널의 Chat ID를 입력하세요.</p>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label>알림 활성화</Label>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />저장
            </Button>
            <Button variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
              <Send className="h-4 w-4 mr-2" />테스트 전송
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">알림 형식 안내</CardTitle></CardHeader>
        <CardContent>
          <div className="bg-secondary/50 rounded-lg p-4 text-sm font-mono">
            <p className="text-primary mb-2">신청 접수 시 전송 형식:</p>
            <p className="text-muted-foreground">[지역명] 이름 / 일시 / 전화번호 / 메신저ID / 비고 / 추천자</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            새로운 밋업 신청이 접수되면 위 형식으로 자동 전송됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
