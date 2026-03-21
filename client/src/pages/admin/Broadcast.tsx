import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Megaphone, Send, Loader2, Clock, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function AdminBroadcast() {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const { data: history, isLoading } = trpc.broadcast.list.useQuery();
  const { data: meetups } = trpc.meetup.list.useQuery();

  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [meetupId, setMeetupId] = useState<string>("none");
  const [targetType, setTargetType] = useState<"all" | "meetup" | "approved_only">("all");
  const [sendViaTelegram, setSendViaTelegram] = useState(true);

  const sendMutation = trpc.broadcast.send.useMutation({
    onSuccess: (data) => {
      toast.success(`단체 메시지가 발송되었습니다. (대상: ${data.recipientCount}명, 텔레그램: ${data.telegramSent ? "성공" : "실패"})`);
      utils.broadcast.list.invalidate();
      resetForm();
      setShowCompose(false);
    },
    onError: () => toast.error("발송 중 오류가 발생했습니다."),
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setMeetupId("none");
    setTargetType("all");
    setSendViaTelegram(true);
  };

  const handleSend = () => {
    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }
    if (!confirm("단체 메시지를 발송하시겠습니까?")) return;

    sendMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      meetupId: meetupId !== "none" ? parseInt(meetupId) : undefined,
      targetType,
      sendViaTelegram,
    });
  };

  const templates = [
    { title: "일정 변경 안내", content: "안녕하세요, 일정 변경 사항을 안내드립니다.\n\n변경 내용:\n- \n\n문의사항은 관리자에게 연락해주세요." },
    { title: "집합 장소 안내", content: "안녕하세요, 집합 장소를 안내드립니다.\n\n장소: \n시간: \n\n시간 엄수 부탁드립니다." },
    { title: "긴급 공지", content: "[긴급] 참석자 여러분께 안내드립니다.\n\n내용:\n\n빠른 확인 부탁드립니다." },
    { title: "감사 인사", content: "밋업에 참석해주신 모든 분들께 감사드립니다.\n\n즐거운 시간이 되셨기를 바라며, 다음에 또 만나뵙겠습니다.\n\n감사합니다." },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            단체 메시지
          </h1>
          <p className="text-sm text-muted-foreground mt-1">전체 참석자에게 일괄 메시지를 발송합니다</p>
        </div>
        <Dialog open={showCompose} onOpenChange={setShowCompose}>
          <DialogTrigger asChild>
            <Button><Send className="h-4 w-4 mr-2" /> 메시지 작성</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>단체 메시지 작성</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Quick templates */}
              <div>
                <Label className="mb-2 block">빠른 템플릿</Label>
                <div className="flex flex-wrap gap-2">
                  {templates.map((t, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => { setTitle(t.title); setContent(t.content); }}
                    >
                      {t.title}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>{t("admin.broadcast.titleField")}</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="메시지 제목" />
              </div>
              <div>
                <Label>{t("admin.broadcast.content")}</Label>
                <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="메시지 내용을 입력하세요..." rows={6} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>대상 밋업</Label>
                  <Select value={meetupId} onValueChange={setMeetupId}>
                    <SelectTrigger><SelectValue placeholder="밋업 선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">전체 밋업</SelectItem>
                      {meetups?.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("admin.broadcast.target")}</Label>
                  <Select value={targetType} onValueChange={v => setTargetType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 참석자</SelectItem>
                      <SelectItem value="approved_only">승인된 참석자만</SelectItem>
                      <SelectItem value="meetup">선택 밋업만</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Switch checked={sendViaTelegram} onCheckedChange={setSendViaTelegram} />
                <div>
                  <Label className="cursor-pointer">텔레그램으로 발송</Label>
                  <p className="text-xs text-muted-foreground">텔레그램 채널에 메시지를 함께 발송합니다</p>
                </div>
              </div>

              {/* Preview */}
              {(title || content) && (
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">미리보기</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 rounded-lg bg-muted/30 text-sm">
                      <p className="font-semibold mb-1">📢 단체 공지</p>
                      <p className="font-medium">{title || "(제목 없음)"}</p>
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{content || "(내용 없음)"}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button onClick={handleSend} disabled={sendMutation.isPending}>
                {sendMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 발송 중...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> 발송</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{history?.length || 0}</p>
              <p className="text-xs text-muted-foreground">총 발송 건수</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{history?.filter(h => h.sentViaTelegram).length || 0}</p>
              <p className="text-xs text-muted-foreground">텔레그램 발송 성공</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {history?.reduce((sum, h) => sum + (h.recipientCount || 0), 0) || 0}
              </p>
              <p className="text-xs text-muted-foreground">총 수신자 수</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            발송 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !history || history.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>아직 발송 이력이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(h => (
                <div key={h.id} className="p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{h.title}</h4>
                        <Badge variant={h.sentViaTelegram ? "default" : "secondary"} className="text-[10px]">
                          {h.sentViaTelegram ? "텔레그램 발송" : "웹 전용"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {h.targetType === "all" ? "전체" : h.targetType === "approved_only" ? "승인자" : "밋업별"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{h.content}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {h.recipientCount}명
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {h.sentAt ? new Date(h.sentAt).toLocaleString("ko-KR") : new Date(h.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
