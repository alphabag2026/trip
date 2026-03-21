import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MessageCircle, Send, Users, ArrowLeft, Plus, Hash, Megaphone, HelpCircle, Smile,
  Image, MoreVertical, LogOut, Trash2, Reply, MapPin, Phone, Video, Globe,
  Paperclip, X, Play, Mic, MicOff, VideoOff, PhoneOff, Languages, Camera,
  UserPlus, Settings, Volume2, FileText,
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

// ── 상수 ──────────────────────────────────────────────
const ROOM_TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  general: { label: "일반", icon: Hash, color: "text-blue-400" },
  announcement: { label: "공지", icon: Megaphone, color: "text-orange-400" },
  support: { label: "문의", icon: HelpCircle, color: "text-green-400" },
  social: { label: "소셜", icon: Smile, color: "text-purple-400" },
  direct: { label: "1:1", icon: MessageCircle, color: "text-cyan-400" },
  group: { label: "그룹", icon: Users, color: "text-pink-400" },
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/20 text-red-400",
  moderator: "bg-blue-500/20 text-blue-400",
  member: "bg-gray-500/20 text-gray-400",
  attendee: "bg-gray-500/20 text-gray-400",
};

const LANGUAGES = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "th", name: "ภาษาไทย", flag: "🇹🇭" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "tl", name: "Filipino", flag: "🇵🇭" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "mn", name: "Монгол", flag: "🇲🇳" },
];

// ── 채팅방 목록 ──────────────────────────────────────────
function RoomList() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: rooms, refetch: refetchRooms } = trpc.chatRoom.list.useQuery({});
  const { data: myRooms, refetch: refetchMyRooms } = trpc.chatRoom.myRooms.useQuery();
  const { data: allUsers } = trpc.userSearch.list.useQuery();
  const joinMutation = trpc.chatRoom.join.useMutation({
    onSuccess: (r) => { toast.success("채팅방에 참여했습니다"); navigate(`/community/${r.id}`); },
    onError: (e) => toast.error(e.message),
  });
  const createMutation = trpc.chatRoom.create.useMutation({
    onSuccess: (r) => {
      toast.success("채팅방이 생성되었습니다");
      refetchRooms(); refetchMyRooms();
      setShowCreate(false);
      navigate(`/community/${r.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", description: "", roomType: "group" as string });
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState("");

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter((u: any) =>
      u.id !== user?.id &&
      (u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
    );
  }, [allUsers, userSearch, user?.id]);

  const myRoomIds = useMemo(() => new Set(myRooms?.map((r: any) => r.id) || []), [myRooms]);

  const handleCreate = () => {
    if (!newRoom.name.trim()) { toast.error("채팅방 이름을 입력해주세요"); return; }
    createMutation.mutate({
      name: newRoom.name,
      description: newRoom.description || undefined,
      roomType: newRoom.roomType as any,
      memberUserIds: selectedUsers.length > 0 ? selectedUsers : undefined,
    });
  };

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
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> 대화방 만들기</Button>
            <Link href="/">
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> 홈</Button>
            </Link>
          </div>
        </div>

        {/* 대화방 생성 다이얼로그 */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-blue-400" /> 대화방 만들기</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">방 이름</label>
                <Input placeholder="예: 방콕 여행 그룹" value={newRoom.name} onChange={(e) => setNewRoom(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">설명 (선택)</label>
                <Input placeholder="방 설명" value={newRoom.description} onChange={(e) => setNewRoom(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">방 유형</label>
                <Select value={newRoom.roomType} onValueChange={(v) => setNewRoom(p => ({ ...p, roomType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">그룹 대화</SelectItem>
                    <SelectItem value="direct">1:1 대화</SelectItem>
                    <SelectItem value="social">소셜</SelectItem>
                    {(user?.role === "admin" || user?.role === "superadmin") && (
                      <>
                        <SelectItem value="general">일반</SelectItem>
                        <SelectItem value="announcement">공지</SelectItem>
                        <SelectItem value="support">문의</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">참여자 초대 ({selectedUsers.length}명 선택)</label>
                <Input placeholder="이름 또는 이메일로 검색..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="mb-2" />
                <div className="max-h-40 overflow-y-auto border rounded-lg">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 text-center">검색 결과 없음</p>
                  ) : (
                    filteredUsers.map((u: any) => (
                      <label key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUsers(p => [...p, u.id]);
                            else setSelectedUsers(p => p.filter(id => id !== u.id));
                          }}
                          className="rounded"
                        />
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{u.name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{u.name || "미등록"}</span>
                          {u.email && <span className="text-xs text-muted-foreground ml-2">{u.email}</span>}
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedUsers.map(uid => {
                      const u = allUsers?.find((x: any) => x.id === uid);
                      return (
                        <Badge key={uid} variant="secondary" className="text-xs cursor-pointer" onClick={() => setSelectedUsers(p => p.filter(id => id !== uid))}>
                          {u?.name || uid} ×
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>취소</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "생성 중..." : "대화방 생성"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

// ── 번역 패널 ──────────────────────────────────────────
function TranslatorPanel({ onClose }: { onClose: () => void }) {
  const [inputText, setInputText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [translated, setTranslated] = useState("");
  const translateMutation = trpc.chatMessage.translateText.useMutation({
    onSuccess: (r) => setTranslated(r.translated as string),
    onError: () => toast.error("번역 실패"),
  });

  return (
    <div className="border-t bg-card/80 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-blue-400" />
          <span className="font-medium text-sm">실시간 통번역</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex gap-2 items-center">
        <Select value={sourceLang} onValueChange={setSourceLang}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">자동 감지</SelectItem>
            {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-xs">→</span>
        <Select value={targetLang} onValueChange={setTargetLang}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="번역할 텍스트를 입력하세요..."
        className="text-sm min-h-[60px] resize-none"
      />
      <Button
        size="sm"
        className="w-full"
        onClick={() => translateMutation.mutate({ text: inputText, targetLang, sourceLang: sourceLang === "auto" ? undefined : sourceLang })}
        disabled={!inputText.trim() || translateMutation.isPending}
      >
        {translateMutation.isPending ? "번역 중..." : "번역하기"}
      </Button>
      {translated && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm whitespace-pre-wrap">{translated}</p>
          <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => { navigator.clipboard.writeText(translated); toast.success("복사됨"); }}>
            복사
          </Button>
        </div>
      )}
    </div>
  );
}

// ── 위치 공유 다이얼로그 ──────────────────────────────────
function LocationShareDialog({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (lat: number, lng: number, name: string) => void }) {
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error("위치 서비스를 지원하지 않는 브라우저입니다"); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(7));
        setLng(pos.coords.longitude.toFixed(7));
        setLocationName("내 현재 위치");
        setLoading(false);
      },
      () => { toast.error("위치를 가져올 수 없습니다"); setLoading(false); }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-red-400" /> 위치 공유</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={getCurrentLocation} disabled={loading}>
            <MapPin className="h-4 w-4 mr-2" /> {loading ? "위치 확인 중..." : "현재 위치 가져오기"}
          </Button>
          <div className="text-xs text-muted-foreground text-center">또는 직접 입력</div>
          <Input placeholder="장소 이름 (예: 인천공항 제2터미널)" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="위도 (latitude)" value={lat} onChange={(e) => setLat(e.target.value)} type="number" step="any" />
            <Input placeholder="경도 (longitude)" value={lng} onChange={(e) => setLng(e.target.value)} type="number" step="any" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button onClick={() => { onSend(parseFloat(lat), parseFloat(lng), locationName); onClose(); }} disabled={!lat || !lng || !locationName}>
            <Send className="h-4 w-4 mr-2" /> 전송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── WebRTC 통화 UI ──────────────────────────────────────
function CallOverlay({ callId, callType, callerName, isOutgoing, onEnd }: {
  callId: string; callType: "voice" | "video"; callerName: string; isOutgoing: boolean; onEnd: () => void;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [connected, setConnected] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const endCallMutation = trpc.webrtc.endCall.useMutation();
  const answerMutation = trpc.webrtc.answerCall.useMutation();
  const addIceMutation = trpc.webrtc.addIceCandidate.useMutation();

  // 발신자: 상태 폴링
  const { data: callStatus } = trpc.webrtc.getCallStatus.useQuery(
    { callId },
    { enabled: isOutgoing && !connected, refetchInterval: 1000 }
  );

  // 수신자: 발신자 ICE 후보 폴링
  const { data: callerCandidates } = trpc.webrtc.getCallerCandidates.useQuery(
    { callId },
    { enabled: !isOutgoing, refetchInterval: 1000 }
  );

  // 타이머
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  // P2P 연결 설정
  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        addIceMutation.mutate({ callId, candidate: JSON.stringify(e.candidate), role: isOutgoing ? "caller" : "answerer" });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
        setConnected(true);
      }
    };

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video",
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
      } catch {
        toast.error("미디어 장치에 접근할 수 없습니다");
      }
    };

    initMedia();

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pc.close();
    };
  }, [callId, callType, isOutgoing]);

  // 발신자: answer 수신 시 처리
  useEffect(() => {
    if (isOutgoing && callStatus?.answer && pcRef.current && pcRef.current.signalingState !== "stable") {
      pcRef.current.setRemoteDescription(JSON.parse(callStatus.answer)).catch(console.error);
    }
    if (isOutgoing && callStatus?.candidates) {
      callStatus.candidates.forEach((c: string) => {
        try { pcRef.current?.addIceCandidate(JSON.parse(c)); } catch {}
      });
    }
  }, [callStatus, isOutgoing]);

  // 수신자: caller ICE 후보 추가
  useEffect(() => {
    if (!isOutgoing && callerCandidates?.candidates) {
      callerCandidates.candidates.forEach((c: string) => {
        try { pcRef.current?.addIceCandidate(JSON.parse(c)); } catch {}
      });
    }
  }, [callerCandidates, isOutgoing]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(!isVideoOff);
  };

  const handleEnd = () => {
    endCallMutation.mutate({ callId });
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    onEnd();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      {/* 영상 통화 시 비디오 */}
      {callType === "video" && (
        <>
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-24 right-4 w-32 h-24 rounded-lg object-cover border-2 border-white/30 z-10" />
        </>
      )}

      {/* 음성 통화 시 아바타 */}
      {callType === "voice" && (
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-blue-600/30 flex items-center justify-center mx-auto mb-4">
            <Phone className="h-10 w-10 text-blue-400" />
          </div>
          <h3 className="text-white text-xl font-semibold">{callerName}</h3>
          <p className="text-white/60 text-sm mt-1">
            {connected ? formatTime(duration) : (isOutgoing ? "연결 중..." : "수신 중...")}
          </p>
        </div>
      )}

      {/* 컨트롤 바 */}
      <div className="absolute bottom-8 flex items-center gap-4 z-20">
        <Button variant="outline" size="icon" className={`rounded-full h-14 w-14 ${isMuted ? "bg-red-600 border-red-600" : "bg-white/10 border-white/20"}`} onClick={toggleMute}>
          {isMuted ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
        </Button>
        {callType === "video" && (
          <Button variant="outline" size="icon" className={`rounded-full h-14 w-14 ${isVideoOff ? "bg-red-600 border-red-600" : "bg-white/10 border-white/20"}`} onClick={toggleVideo}>
            {isVideoOff ? <VideoOff className="h-6 w-6 text-white" /> : <Camera className="h-6 w-6 text-white" />}
          </Button>
        )}
        <Button size="icon" className="rounded-full h-16 w-16 bg-red-600 hover:bg-red-700" onClick={handleEnd}>
          <PhoneOff className="h-7 w-7 text-white" />
        </Button>
      </div>
    </div>
  );
}

// ── 메시지 버블 (번역 포함) ──────────────────────────────
function MessageBubble({ msg, isMe, isAdmin, user, onReply, onDelete, myLang }: {
  msg: any; isMe: boolean; isAdmin: boolean; user: any; onReply: (m: any) => void; onDelete: (id: number) => void; myLang: string;
}) {
  const [showTranslation, setShowTranslation] = useState(false);
  const translateMutation = trpc.chatMessage.translate.useMutation();
  const [translated, setTranslated] = useState("");

  const handleTranslate = () => {
    if (translated) { setShowTranslation(!showTranslation); return; }
    translateMutation.mutate({ messageId: msg.id, targetLang: myLang }, {
      onSuccess: (r) => { setTranslated(r.translated as string); setShowTranslation(true); },
      onError: () => toast.error("번역 실패"),
    });
  };

  if (msg.messageType === "system") {
    return (
      <div className="text-center">
        <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{msg.content}</span>
      </div>
    );
  }

  if (msg.messageType === "announcement") {
    return (
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Megaphone className="h-4 w-4 text-orange-400" />
          <span className="text-xs font-medium text-orange-400">공지</span>
          <span className="text-xs text-muted-foreground">{msg.senderName}</span>
        </div>
        <p className="text-sm">{msg.content}</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (msg.messageType) {
      case "image":
        return msg.fileUrl ? <img src={msg.fileUrl} alt={msg.fileName || "이미지"} className="rounded-lg max-w-full max-h-60 cursor-pointer" onClick={() => window.open(msg.fileUrl, "_blank")} /> : <p>{msg.content}</p>;
      case "video":
        return msg.fileUrl ? (
          <video src={msg.fileUrl} controls className="rounded-lg max-w-full max-h-60" />
        ) : <p>{msg.content}</p>;
      case "voice":
        return msg.fileUrl ? (
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-blue-400" />
            <audio src={msg.fileUrl} controls className="h-8" />
          </div>
        ) : <p>{msg.content}</p>;
      case "location":
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-red-400" />
              <span className="font-medium text-sm">{msg.locationName || "위치"}</span>
            </div>
            {msg.latitude && msg.longitude && (
              <a
                href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="bg-muted/50 rounded-lg p-2 text-xs hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-1 text-blue-400">
                    <MapPin className="h-3 w-3" />
                    <span>Google Maps에서 보기</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{Number(msg.latitude).toFixed(5)}, {Number(msg.longitude).toFixed(5)}</p>
                </div>
              </a>
            )}
          </div>
        );
      case "file":
        return (
          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{msg.fileName || "파일"}</span>
          </a>
        );
      default:
        return <p className="whitespace-pre-wrap break-words">{msg.content}</p>;
    }
  };

  return (
    <div className={`group flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
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
              <Badge className={`text-[10px] px-1 py-0 ${ROLE_COLORS[msg.senderRole] || ""}`}>
                {msg.senderRole === "admin" ? "관리자" : "참여자"}
              </Badge>
            )}
          </div>
        )}
        {msg.replyToId && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 mb-1 border-l-2 border-blue-400">답글</div>
        )}
        <div className={`rounded-2xl px-3 py-2 text-sm ${isMe ? "bg-blue-600 text-white" : "bg-muted"}`}>
          {renderContent()}
          {msg.isEdited && <span className="text-[10px] opacity-60 ml-1">(수정됨)</span>}
        </div>
        {/* 번역 표시 */}
        {showTranslation && translated && (
          <div className={`mt-1 rounded-lg px-3 py-1.5 text-xs bg-blue-500/10 border border-blue-500/20 ${isMe ? "text-right" : ""}`}>
            <div className="flex items-center gap-1 text-blue-400 mb-0.5">
              <Globe className="h-3 w-3" />
              <span>번역</span>
            </div>
            <p className="text-foreground">{translated}</p>
          </div>
        )}
        <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : ""}`}>
          <span className="text-[10px] text-muted-foreground">
            {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {/* 번역 버튼 */}
          {msg.messageType === "text" && msg.content && (
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={handleTranslate} title="번역">
              <Globe className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => onReply(msg)}>
            <Reply className="h-3 w-3" />
          </Button>
          {(isMe || isAdmin) && (
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-red-400" onClick={() => onDelete(msg.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 채팅방 뷰 ──────────────────────────────────────────
function ChatRoomView({ roomId }: { roomId: number }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showTranslator, setShowTranslator] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [myLang, setMyLang] = useState("ko");
  const [activeCall, setActiveCall] = useState<{ callId: string; callType: "voice" | "video"; callerName: string; isOutgoing: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadMutation = trpc.chatMessage.uploadFile.useMutation({
    onSuccess: () => { refetch(); toast.success("파일 전송 완료"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.chatMessage.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("삭제됨"); },
    onError: (e) => toast.error(e.message),
  });

  const leaveMutation = trpc.chatRoom.leave.useMutation({
    onSuccess: () => { toast.success("채팅방을 나갔습니다"); navigate("/community"); },
    onError: (e) => toast.error(e.message),
  });

  const markReadMutation = trpc.chatMessage.markRead.useMutation();
  const initiateCallMutation = trpc.webrtc.initiateCall.useMutation();

  // 수신 통화 폴링
  const { data: incomingCall } = trpc.webrtc.pollIncoming.useQuery(
    { roomId },
    { refetchInterval: activeCall ? false : 2000 }
  );

  // 브라우저 알림
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    if (prevMsgCountRef.current > 0 && messages.length > prevMsgCountRef.current) {
      const latestMsg = messages[messages.length - 1];
      if (latestMsg && latestMsg.userId !== user?.id && document.hidden) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`${room?.name || "채팅방"}`, {
            body: `${latestMsg.senderName}: ${latestMsg.content?.substring(0, 100)}`,
            icon: "/favicon.ico",
            tag: `chat-${roomId}`,
          });
        }
        try { new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczIj2LtN/JdkQnN3Oi0+C+bD0jMYC12eSzYjAVJXux4OW/cEMfIHWk1+bGfVQtGSxvn9nixIlgOCQaRYCq2+bQk2xBIBdDdKHY5tKYdEkiGD5pmtfmzZdyTy0YPXOd1+TIlnVPLhk9c53X5MiWdU8uGT1zndfkyJZ1Ty4ZPQ==").play(); } catch {}
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, user?.id, room?.name, roomId]);

  useEffect(() => {
    if (messages && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (roomId) markReadMutation.mutate({ roomId });
  }, [roomId, messages?.length]);

  // 수신 통화 처리
  useEffect(() => {
    if (incomingCall && !activeCall) {
      const accept = confirm(`${incomingCall.callerName}님의 ${incomingCall.callType === "video" ? "영상" : "음성"} 통화를 받으시겠습니까?`);
      if (accept) {
        setActiveCall({
          callId: incomingCall.callId,
          callType: incomingCall.callType as "voice" | "video",
          callerName: incomingCall.callerName,
          isOutgoing: false,
        });
      }
    }
  }, [incomingCall, activeCall]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ roomId, content: message.trim(), replyToId: replyTo?.id, originalLang: myLang });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("파일 크기는 25MB 이하만 가능합니다"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({ roomId, fileName: file.name, fileData: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleLocationSend = (lat: number, lng: number, name: string) => {
    sendMutation.mutate({
      roomId,
      content: name,
      messageType: "location",
      latitude: lat,
      longitude: lng,
      locationName: name,
    });
  };

  const startCall = async (type: "voice" | "video") => {
    if (!members || members.length < 2) { toast.error("통화할 상대가 없습니다"); return; }
    const otherMember = members.find((m: any) => m.userId !== user?.id);
    if (!otherMember) { toast.error("통화할 상대를 찾을 수 없습니다"); return; }

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      pc.close();
      stream.getTracks().forEach(t => t.stop());

      const result = await initiateCallMutation.mutateAsync({
        roomId,
        targetUserId: otherMember.userId,
        callType: type,
        offer: JSON.stringify(offer),
      });

      setActiveCall({
        callId: result.callId,
        callType: type,
        callerName: otherMember.nickname || "상대방",
        isOutgoing: true,
      });
    } catch {
      toast.error("통화를 시작할 수 없습니다. 미디어 권한을 확인해주세요.");
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 통화 오버레이 */}
      {activeCall && (
        <CallOverlay
          callId={activeCall.callId}
          callType={activeCall.callType}
          callerName={activeCall.callerName}
          isOutgoing={activeCall.isOutgoing}
          onEnd={() => setActiveCall(null)}
        />
      )}

      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/community")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{room?.name || "채팅방"}</h2>
          <p className="text-xs text-muted-foreground">{members?.length || 0}명 참여중</p>
        </div>
        {/* 통화 버튼 */}
        <Button variant="ghost" size="icon" onClick={() => startCall("voice")} title="음성 통화">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => startCall("video")} title="영상 통화">
          <Video className="h-5 w-5" />
        </Button>
        {/* 번역 언어 선택 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="내 언어">
              <Globe className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">내 번역 언어</div>
            {LANGUAGES.map(l => (
              <DropdownMenuItem key={l.code} onClick={() => { setMyLang(l.code); toast.success(`번역 언어: ${l.name}`); }}>
                <span className="mr-2">{l.flag}</span> {l.name} {myLang === l.code && " ✓"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowTranslator(!showTranslator)}>
              <Languages className="h-4 w-4 mr-2" /> 통번역기
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => leaveMutation.mutate({ roomId })} className="text-red-400">
              <LogOut className="h-4 w-4 mr-2" /> 나가기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages?.map((msg: any) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isMe={msg.userId === user?.id}
            isAdmin={isAdmin}
            user={user}
            onReply={setReplyTo}
            onDelete={(id) => { if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id }); }}
            myLang={myLang}
          />
        ))}
      </div>

      {/* 번역 패널 */}
      {showTranslator && <TranslatorPanel onClose={() => setShowTranslator(false)} />}

      {/* 위치 공유 다이얼로그 */}
      <LocationShareDialog open={showLocationDialog} onClose={() => setShowLocationDialog(false)} onSend={handleLocationSend} />

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 bg-muted/30 border-t flex items-center gap-2">
          <Reply className="h-4 w-4 text-blue-400" />
          <span className="text-xs text-muted-foreground flex-1 truncate">{replyTo.senderName}: {replyTo.content}</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setReplyTo(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="border-t px-4 py-3 shrink-0">
        <div className="flex gap-2 items-center">
          {/* 첨부 메뉴 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => { fileInputRef.current?.setAttribute("accept", "image/*"); fileInputRef.current?.click(); }}>
                <Image className="h-4 w-4 mr-2" /> 사진
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { fileInputRef.current?.setAttribute("accept", "video/*"); fileInputRef.current?.click(); }}>
                <Play className="h-4 w-4 mr-2" /> 영상
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { fileInputRef.current?.setAttribute("accept", "*/*"); fileInputRef.current?.click(); }}>
                <Paperclip className="h-4 w-4 mr-2" /> 파일
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowLocationDialog(true)}>
                <MapPin className="h-4 w-4 mr-2" /> 위치 공유
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="flex-1"
            disabled={sendMutation.isPending || uploadMutation.isPending}
          />
          <Button onClick={handleSend} disabled={!message.trim() || sendMutation.isPending} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {uploadMutation.isPending && (
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
            <div className="animate-spin h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full" />
            파일 업로드 중...
          </div>
        )}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function CommunityChat() {
  const params = useParams<{ roomId: string }>();
  const roomId = parseInt(params.roomId || "0");

  if (roomId > 0) {
    return <ChatRoomView roomId={roomId} />;
  }
  return <RoomList />;
}
