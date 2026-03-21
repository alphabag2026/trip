import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, Users, Car, Hotel, ArrowRightLeft, Hash, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

const channelTypeIcons: Record<string, any> = {
  pickup_driver: Car,
  manager: Users,
  hotel_checkin: Hotel,
  transfer: ArrowRightLeft,
  general: Hash,
};

const channelTypeLabels: Record<string, string> = {
  pickup_driver: "픽업 기사",
  manager: "매니저",
  hotel_checkin: "호텔 체크인",
  transfer: "이동 매니저",
  general: "일반",
};

export default function ChatDashboard() {
  const { t } = useTranslation();
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channelsQuery = trpc.channel.allWithUnread.useQuery(undefined, { refetchInterval: 3000 });
  const messagesQuery = trpc.message.list.useQuery(
    { channelId: selectedChannelId!, limit: 100 },
    { enabled: !!selectedChannelId, refetchInterval: 2000 }
  );

  const sendMutation = trpc.message.send.useMutation({
    onSuccess: () => {
      setNewMessage("");
      messagesQuery.refetch();
      channelsQuery.refetch();
    },
  });

  const markReadMutation = trpc.message.markRead.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data]);

  useEffect(() => {
    if (selectedChannelId) {
      markReadMutation.mutate({ channelId: selectedChannelId });
    }
  }, [selectedChannelId]);

  const handleSend = () => {
    if (!newMessage.trim() || !selectedChannelId) return;
    sendMutation.mutate({
      channelId: selectedChannelId,
      senderName: "관리자",
      senderRole: "admin",
      content: newMessage.trim(),
    });
  };

  const channels = channelsQuery.data || [];
  const messages = messagesQuery.data || [];
  const selectedChannel = channels.find((c: any) => c.id === selectedChannelId);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Channel List */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> 소통 채널
          </h2>
          <p className="text-xs text-muted-foreground mt-1">참석자, 기사, 매니저와 실시간 소통</p>
        </div>
        <ScrollArea className="flex-1">
          {channelsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : channels.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">채널이 없습니다</p>
          ) : (
            <div className="space-y-1 p-2">
              {channels.map((ch: any) => {
                const Icon = channelTypeIcons[ch.channelType] || Hash;
                const isSelected = ch.id === selectedChannelId;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannelId(ch.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate flex-1">{ch.channelName}</span>
                      {ch.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5">{ch.unreadCount}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{channelTypeLabels[ch.channelType] || ch.channelType}</Badge>
                      {ch.assignedTo && <span className="text-xs text-muted-foreground truncate">{ch.assignedTo}</span>}
                    </div>
                    {ch.lastMessage && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {ch.lastMessage.senderName}: {ch.lastMessage.content}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedChannelId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>채널을 선택하여 대화를 시작하세요</p>
              <p className="text-sm mt-1">참석자, 기사, 매니저와 실시간으로 소통할 수 있습니다</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card flex items-center justify-between">
              <div>
                <h3 className="font-bold">{selectedChannel?.channelName}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {channelTypeLabels[selectedChannel?.channelType || "general"]}
                  </Badge>
                  {selectedChannel?.assignedTo && <span>담당: {selectedChannel.assignedTo}</span>}
                  {selectedChannel?.assignedPhone && <span>({selectedChannel.assignedPhone})</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => messagesQuery.refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesQuery.isLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">아직 메시지가 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg: any) => {
                    const isAdmin = msg.senderRole === "admin";
                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-lg p-3 ${
                          isAdmin ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{msg.senderName}</span>
                            <Badge variant="outline" className={`text-xs ${isAdmin ? "border-primary-foreground/30 text-primary-foreground" : ""}`}>
                              {msg.senderRole === "admin" ? "관리자" :
                               msg.senderRole === "driver" ? "기사" :
                               msg.senderRole === "manager" ? "매니저" : "참석자"}
                            </Badge>
                          </div>
                          {msg.messageType === "image" && msg.imageUrl ? (
                            <img src={msg.imageUrl} alt="사진" className="rounded max-h-48 mb-1" />
                          ) : null}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isAdmin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.createdAt).toLocaleString("ko-KR")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="메시지를 입력하세요..."
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <Button onClick={handleSend} disabled={!newMessage.trim() || sendMutation.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
