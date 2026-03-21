import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessageCircle, Send, Users, ArrowLeft, Plus, Hash, Megaphone, HelpCircle, Smile, Image, MoreVertical, LogOut, Trash2, Edit, Reply, Pin } from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ROOM_TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  general: { label: "일반", icon: Hash, color: "text-blue-400" },
  announcement: { label: "공지", icon: Megaphone, color: "text-orange-400" },
  support: { label: "문의", icon: HelpCircle, color: "text-green-400" },
  social: { label: "소셜", icon: Smile, color: "text-purple-400" },
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/20 text-red-400",
  moderator: "bg-blue-500/20 text-blue-400",
  member: "bg-gray-500/20 text-gray-400",
  attendee: "bg-gray-500/20 text-gray-400",
};

function RoomList() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: rooms } = trpc.chatRoom.list.useQuery({});
  const { data: myRooms } = trpc.chatRoom.myRooms.useQuery();
  const joinMutation = trpc.chatRoom.join.useMutation({
    onSuccess: (r) => { toast.success("채팅방에 참여했습니다"); navigate(`/community/${r.id}`); },
    onError: (e) => toast.error(e.message),
  });

  const myRoomIds = useMemo(() => new Set(myRooms?.map((r: any) => r.id) || []), [myRooms]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-blue-400" />
              커뮤니티
            </h1>
            <p className="text-muted-foreground text-sm mt-1">여행자 그룹과 담당자가 함께 소통하는 공간</p>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> 홈</Button>
          </Link>
        </div>

        {/* 내 채팅방 */}
        {myRooms && myRooms.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">내 채팅방</h2>
            <div className="space-y-2">
              {myRooms.map((room: any) => {
                const typeInfo = ROOM_TYPE_MAP[room.roomType] || ROOM_TYPE_MAP.general;
                const TypeIcon = typeInfo.icon;
                return (
                  <Card key={room.id} className="bg-card/50 hover:bg-card/70 transition-colors cursor-pointer" onClick={() => navigate(`/community/${room.id}`)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-background/50 ${typeInfo.color}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{room.name}</span>
                          <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
                        </div>
                        {room.description && <p className="text-xs text-muted-foreground truncate">{room.description}</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* 전체 채팅방 */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">전체 채팅방</h2>
          {rooms?.length === 0 && (
            <Card className="bg-card/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>아직 개설된 채팅방이 없습니다</p>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            {rooms?.map((room: any) => {
              const typeInfo = ROOM_TYPE_MAP[room.roomType] || ROOM_TYPE_MAP.general;
              const TypeIcon = typeInfo.icon;
              const isMember = myRoomIds.has(room.id);
              return (
                <Card key={room.id} className="bg-card/50 hover:bg-card/70 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-background/50 ${typeInfo.color}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{room.name}</span>
                        <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
                      </div>
                      {room.description && <p className="text-xs text-muted-foreground truncate">{room.description}</p>}
                    </div>
                    {isMember ? (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/community/${room.id}`)}>입장</Button>
                    ) : (
                      <Button size="sm" onClick={() => joinMutation.mutate({ roomId: room.id })} disabled={joinMutation.isPending}>참여</Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatRoomView({ roomId }: { roomId: number }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: room } = trpc.chatRoom.getById.useQuery({ id: roomId });
  const { data: members } = trpc.chatRoom.members.useQuery({ roomId });
  const { data: messages, refetch } = trpc.chatMessage.list.useQuery(
    { roomId, limit: 100 },
    { refetchInterval: 3000 }
  );

  const sendMutation = trpc.chatMessage.send.useMutation({
    onSuccess: () => { setMessage(""); setReplyTo(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // 새 메시지 발생 시 브라우저 알림
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const currentCount = messages.length;
    if (prevMsgCountRef.current > 0 && currentCount > prevMsgCountRef.current) {
      const latestMsg = messages[messages.length - 1];
      if (latestMsg && latestMsg.userId !== user?.id && document.hidden) {
        // 브라우저 알림
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`💬 ${room?.name || "채팅방"}`, {
            body: `${latestMsg.senderName}: ${latestMsg.content?.substring(0, 100)}`,
            icon: "/favicon.ico",
            tag: `chat-${roomId}`,
          });
        }
        // 사운드 알림
        try { new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczIj2LtN/JdkQnN3Oi0+C+bD0jMYC12eSzYjAVJXux4OW/cEMfIHWk1+bGfVQtGSxvn9nixIlgOCQaRYCq2+bQk2xBIBdDdKHY5tKYdEkiGD5pmtfmzZdyTy0YPXOd1+TIlnVPLhk9c53X5MiWdU8uGT1zndfkyJZ1Ty4ZPQ==").play(); } catch {}
      }
    }
    prevMsgCountRef.current = currentCount;
  }, [messages, user?.id, room?.name, roomId]);
  const deleteMutation = trpc.chatMessage.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("삭제됨"); },
    onError: (e) => toast.error(e.message),
  });
  const leaveMutation = trpc.chatRoom.leave.useMutation({
    onSuccess: () => { toast.success("채팅방을 나갔습니다"); navigate("/community"); },
    onError: (e) => toast.error(e.message),
  });
  const markReadMutation = trpc.chatMessage.markRead.useMutation();

  useEffect(() => {
    if (messages && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (roomId) markReadMutation.mutate({ roomId });
  }, [roomId, messages?.length]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({
      roomId,
      content: message.trim(),
      replyToId: replyTo?.id,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/community")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{room?.name || "채팅방"}</h2>
          <p className="text-xs text-muted-foreground">{members?.length || 0}명 참여중</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => leaveMutation.mutate({ roomId })}>
              <LogOut className="h-4 w-4 mr-2" /> 나가기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages?.map((msg: any) => {
          const isMe = msg.userId === user?.id;
          const isSystem = msg.messageType === "system";
          const isAnnouncement = msg.messageType === "announcement";

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{msg.content}</span>
              </div>
            );
          }

          if (isAnnouncement) {
            return (
              <div key={msg.id} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-medium text-orange-400">공지</span>
                  <span className="text-xs text-muted-foreground">{msg.senderName}</span>
                </div>
                <p className="text-sm">{msg.content}</p>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              {!isMe && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">{msg.senderName?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium">{msg.senderName}</span>
                    {msg.senderRole && (
                      <Badge className={`text-[10px] px-1 py-0 ${ROLE_COLORS[msg.senderRole] || ""}`}>{msg.senderRole === "admin" ? "관리자" : "참여자"}</Badge>
                    )}
                  </div>
                )}
                {msg.replyToId && (
                  <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 mb-1 border-l-2 border-blue-400">
                    답글
                  </div>
                )}
                <div className={`rounded-2xl px-3 py-2 text-sm ${isMe ? "bg-blue-600 text-white" : "bg-muted"}`}>
                  {msg.messageType === "image" && msg.fileUrl ? (
                    <img src={msg.fileUrl} alt={msg.fileName || "이미지"} className="rounded-lg max-w-full max-h-60" />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  {msg.isEdited && <span className="text-[10px] opacity-60 ml-1">(수정됨)</span>}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}>
                    <Reply className="h-3 w-3" />
                  </Button>
                  {(isMe || isAdmin) && (
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-red-400" onClick={() => { if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: msg.id }); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 bg-muted/30 border-t flex items-center gap-2">
          <Reply className="h-4 w-4 text-blue-400" />
          <span className="text-xs text-muted-foreground flex-1 truncate">{replyTo.senderName}: {replyTo.content}</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setReplyTo(null)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="border-t px-4 py-3 flex gap-2 shrink-0">
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          className="flex-1"
          disabled={sendMutation.isPending}
        />
        <Button onClick={handleSend} disabled={!message.trim() || sendMutation.isPending} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function CommunityChat() {
  const params = useParams<{ roomId: string }>();
  const roomId = parseInt(params.roomId || "0");

  if (roomId > 0) {
    return <ChatRoomView roomId={roomId} />;
  }
  return <RoomList />;
}
