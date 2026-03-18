import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Image, ArrowLeft, Camera } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자", manager: "매니저", driver: "기사", participant: "참석자", hotel_staff: "호텔 스태프",
};
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/20 text-red-400", manager: "bg-blue-500/20 text-blue-400",
  driver: "bg-green-500/20 text-green-400", participant: "bg-gray-500/20 text-gray-400",
  hotel_staff: "bg-purple-500/20 text-purple-400",
};

export default function CommChannel() {
  const params = useParams<{ channelId: string }>();
  const channelId = parseInt(params.channelId || "0");
  const [senderName, setSenderName] = useState("");
  const [senderRole, setSenderRole] = useState<string>("participant");
  const [message, setMessage] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: channel } = trpc.channel.getById.useQuery({ id: channelId }, { enabled: channelId > 0 });
  const { data: messageList, refetch } = trpc.message.list.useQuery(
    { channelId, limit: 200 },
    { enabled: channelId > 0 && isJoined, refetchInterval: 3000 }
  );
  const sendMutation = trpc.message.send.useMutation({
    onSuccess: () => { setMessage(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const uploadPhotoMutation = trpc.message.uploadPhoto.useMutation({
    onSuccess: () => { refetch(); toast.success("사진이 전송되었습니다"); },
    onError: (e) => toast.error(e.message),
  });
  const markReadMutation = trpc.message.markRead.useMutation();

  const stableMessages = useMemo(() => messageList ?? [], [messageList]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [stableMessages]);

  useEffect(() => {
    if (isJoined && channelId > 0) {
      markReadMutation.mutate({ channelId });
    }
  }, [isJoined, channelId, stableMessages.length]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({
      channelId, senderName, senderRole: senderRole as any, content: message,
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadPhotoMutation.mutate({
        channelId, senderName, senderRole: senderRole as any,
        imageBase64: base64, mimeType: file.type, caption: `${senderName}님이 사진을 공유했습니다`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const CHANNEL_TYPE_LABELS: Record<string, string> = {
    pickup_driver: "픽업 기사", manager: "중간 매니저", hotel_checkin: "호텔 체크인", transfer: "이동 매니저", general: "일반",
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/">
                <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
              </Link>
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">소통 채널 입장</CardTitle>
            </div>
            {channel && (
              <div className="space-y-1">
                <p className="font-semibold">{channel.channelName}</p>
                <Badge variant="secondary">{CHANNEL_TYPE_LABELS[channel.channelType] || channel.channelType}</Badge>
                {channel.description && <p className="text-sm text-muted-foreground">{channel.description}</p>}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">이름</label>
              <Input placeholder="이름을 입력하세요" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">역할</label>
              <Select value={senderRole} onValueChange={setSenderRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">참석자</SelectItem>
                  <SelectItem value="driver">기사</SelectItem>
                  <SelectItem value="manager">매니저</SelectItem>
                  <SelectItem value="hotel_staff">호텔 스태프</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!senderName.trim()} onClick={() => setIsJoined(true)}>
              채널 입장
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/50 px-4 py-3 flex items-center gap-3 bg-card/50">
        <Link href="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <MessageCircle className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{channel?.channelName || "소통 채널"}</p>
          <p className="text-xs text-muted-foreground">
            {channel?.assignedTo && `담당: ${channel.assignedTo}`}
            {channel?.assignedPhone && ` (${channel.assignedPhone})`}
          </p>
        </div>
        <Badge variant="outline" className={ROLE_COLORS[senderRole]}>{ROLE_LABELS[senderRole]}</Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3 max-w-2xl mx-auto">
          {stableMessages.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>아직 메시지가 없습니다</p>
              <p className="text-sm">첫 메시지를 보내보세요</p>
            </div>
          )}
          {stableMessages.map((msg) => {
            const isMe = msg.senderName === senderName;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${isMe ? "bg-primary/20 border-primary/30" : "bg-card border-border/50"} border rounded-lg p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">{msg.senderName}</span>
                    <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${ROLE_COLORS[msg.senderRole]}`}>
                      {ROLE_LABELS[msg.senderRole]}
                    </Badge>
                  </div>
                  {msg.messageType === "photo" && msg.photoUrl && (
                    <img src={msg.photoUrl} alt="photo" className="rounded-md max-w-full max-h-60 mb-2" />
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(msg.createdAt).toLocaleString("ko-KR")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/50 p-3 bg-card/50">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoUpload} />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploadPhotoMutation.isPending}>
            <Camera className="h-5 w-5" />
          </Button>
          <Input
            placeholder="메시지를 입력하세요..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={sendMutation.isPending || !message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
