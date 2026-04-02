import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Plus, Trash2, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const CHANNEL_TYPES = [
  { value: "pickup_driver", label: "픽업 기사" },
  { value: "manager", label: "중간 매니저" },
  { value: "hotel_checkin", label: "호텔 체크인" },
  { value: "transfer", label: "이동 매니저" },
  { value: "general", label: "일반" },
];

export default function Channels() {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    channelName: "", channelType: "general" as string,
    description: "", assignedTo: "", assignedPhone: "",
    meetupId: undefined as number | undefined,
  });

  const { data: channels, refetch } = trpc.channel.list.useQuery();
  const { data: meetups } = trpc.meetup.list.useQuery();
  const createMutation = trpc.channel.create.useMutation({
    onSuccess: () => { toast.success(t("admin.channels.t14", "채널이 생성되었습니다")); setShowCreate(false); refetch(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.channel.delete.useMutation({
    onSuccess: () => { toast.success(t("admin.channels.t15", "채널이 삭제되었습니다")); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const channelList = useMemo(() => channels ?? [], [channels]);

  const resetForm = () => setForm({ channelName: "", channelType: "general", description: "", assignedTo: "", assignedPhone: "", meetupId: undefined });

  const handleCreate = () => {
    if (!form.channelName.trim()) { toast.error(t("admin.channels.t16", "채널명을 입력하세요")); return; }
    createMutation.mutate({
      channelName: form.channelName,
      channelType: form.channelType as any,
      description: form.description || undefined,
      assignedTo: form.assignedTo || undefined,
      assignedPhone: form.assignedPhone || undefined,
      meetupId: form.meetupId,
    });
  };

  const copyLink = (id: number) => {
    const url = `${window.location.origin}/channel/${id}`;
    navigator.clipboard.writeText(url);
    toast.success(t("admin.channels.t17", "채널 링크가 복사되었습니다"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.channels.t1", "소통 채널 관리")}</h1>
          <p className="text-muted-foreground text-sm">{t("admin.channels.t2", "픽업 기사, 매니저, 호텔 체크인 담당자와의 소통 채널")}</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> {t("admin.channels.t3", "채널 생성")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("admin.channels.t4", "새 소통 채널")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("admin.channels.channelName")}</Label>
                <Input value={form.channelName} onChange={(e) => setForm({ ...form, channelName: e.target.value })} placeholder={t("admin.channels.t18", "예: 두바이 밋업 - 공항 픽업")} />
              </div>
              <div>
                <Label>{t("admin.channels.t5", "채널 유형")}</Label>
                <Select value={form.channelType} onValueChange={(v) => setForm({ ...form, channelType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNEL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("admin.channels.t6", "연결 밋업")}</Label>
                <Select value={form.meetupId?.toString() || "none"} onValueChange={(v) => setForm({ ...form, meetupId: v === "none" ? undefined : parseInt(v) })}>
                  <SelectTrigger><SelectValue placeholder={t("admin.channels.t19", "선택 안함")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("admin.channels.t7", "선택 안함")}</SelectItem>
                    {(meetups ?? []).map((m) => <SelectItem key={m.id} value={m.id.toString()}>{m.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("admin.channels.t8", "담당자 이름")}</Label>
                <Input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} placeholder={t("admin.channels.t20", "담당자 이름")} />
              </div>
              <div>
                <Label>{t("admin.channels.t9", "담당자 전화번호")}</Label>
                <Input value={form.assignedPhone} onChange={(e) => setForm({ ...form, assignedPhone: e.target.value })} placeholder="010-0000-0000" />
              </div>
              <div>
                <Label>{t("admin.channels.t10", "설명")}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("admin.channels.t21", "채널 설명")} />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>{t("admin.channels.t11", "생성")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channelList.map((ch) => (
          <Card key={ch.id} className="hover:border-primary/30 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  {ch.channelName}
                </CardTitle>
                <Badge variant="secondary">{CHANNEL_TYPES.find((t) => t.value === ch.channelType)?.label || ch.channelType}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {ch.description && <p className="text-sm text-muted-foreground">{ch.description}</p>}
              {ch.assignedTo && <p className="text-sm">담당: {ch.assignedTo} {ch.assignedPhone && `(${ch.assignedPhone})`}</p>}
              <p className="text-xs text-muted-foreground">{new Date(ch.createdAt).toLocaleString("ko-KR")}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => copyLink(ch.id)}>
                  <Copy className="mr-1 h-3 w-3" /> {t("admin.channels.t12", "링크 복사")}
                </Button>
                <a href={`/channel/${ch.id}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3" /></Button>
                </a>
                <Button variant="destructive" size="sm" onClick={() => { if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: ch.id }); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {channelList.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("admin.channels.t13", "생성된 소통 채널이 없습니다")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
