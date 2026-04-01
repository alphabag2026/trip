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
  UserPlus, Settings, Volume2, FileText, Pin, PinOff, GalleryHorizontalEnd, Download,
  Grid3X3, Film, File,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useParams, useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";

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
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { data: rooms, refetch: refetchRooms } = trpc.chatRoom.list.useQuery({}, { enabled: isAuthenticated });
  const { data: myRooms, refetch: refetchMyRooms } = trpc.chatRoom.myRooms.useQuery(undefined, { enabled: isAuthenticated });
  const { data: unreadCounts } = trpc.chatRoom.unreadCounts.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 5000 });
  const unreadMap = useMemo(() => {
    const m = new Map<number, number>();
    unreadCounts?.forEach((u: any) => m.set(u.roomId, u.unreadCount));
    return m;
  }, [unreadCounts]);
  const totalUnread = useMemo(() => {
    let t = 0;
    unreadMap.forEach(v => t += v);
    return t;
  }, [unreadMap]);
  const { data: allUsers } = trpc.userSearch.list.useQuery(undefined, { enabled: isAuthenticated });
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

  // 주최자/에이전시/관리자는 전체 목록 표시, 참가자/파트너는 검색어 입력 시에만 노출
  const isManagerRole = user?.role === "organizer" || user?.role === "agency" || user?.role === "admin" || user?.role === "superadmin";
  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    // 참가자/파트너: 검색어가 2글자 이상일 때만 결과 표시
    if (!isManagerRole && userSearch.trim().length < 2) return [];
    return allUsers.filter((u: any) =>
      u.id !== user?.id &&
      (u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
    );
  }, [allUsers, userSearch, user?.id, isManagerRole]);

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

  // 비로그인 시 로그인 안내
  if (!loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">커뮤니티</h2>
          <p className="text-muted-foreground mb-6">여행자 그룹과 담당자가 함께 소통하는 공간입니다. 참여하려면 로그인이 필요합니다.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/login?returnPath=/community">
              <Button>로그인</Button>
            </Link>
            <Link href="/login?tab=register">
              <Button variant="outline">회원가입</Button>
            </Link>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mt-4"><ArrowLeft className="h-4 w-4 mr-1" /> 홈으로</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-blue-400" />
              커뮤니티
              {totalUnread > 0 && (
                <Badge className="bg-red-500 text-white text-xs ml-2">{totalUnread > 99 ? "99+" : totalUnread}</Badge>
              )}
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
                    <p className="text-xs text-muted-foreground p-3 text-center">
                      {!isManagerRole && userSearch.trim().length < 2 ? t("community.search_hint", "이름 또는 이메일을 2글자 이상 입력하세요") : t("community.no_results", "검색 결과 없음")}
                    </p>
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
                      {(unreadMap.get(room.id) || 0) > 0 && (
                        <Badge className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
                          {unreadMap.get(room.id)! > 99 ? "99+" : unreadMap.get(room.id)}
                        </Badge>
                      )}
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
          {rooms?.length === 0 && (!myRooms || myRooms.length === 0) && (
            <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-dashed border-2 border-border/50">
              <CardContent className="p-10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4">
                  <MessageCircle className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">아직 대화방이 없습니다</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                  첫 번째 대화방을 만들어 여행자들과 소통을 시작해 보세요!<br/>
                  그룹 대화, 1:1 대화, 공지 채널 등 다양한 유형을 지원합니다.
                </p>
                <Button onClick={() => setShowCreate(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  첫 대화방 만들기
                </Button>
              </CardContent>
            </Card>
          )}
          {rooms?.length === 0 && myRooms && myRooms.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">참여하지 않은 다른 채팅방이 없습니다</p>
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

  // TURN 서버 포함 ICE 서버 설정 가져오기
  const { data: iceConfig } = trpc.webrtc.getIceServers.useQuery();

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
    if (!iceConfig) return;
    const pc = new RTCPeerConnection({
      iceServers: iceConfig.iceServers,
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
  }, [callId, callType, isOutgoing, iceConfig]);

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

// ── 그룹 통화 UI (Mesh 방식) ──────────────────────────────
function GroupCallOverlay({ callId, callType, roomName, onEnd }: {
  callId: string; callType: "voice" | "video"; roomName: string; onEnd: () => void;
}) {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<number, MediaStream>>(new Map());
  const [remoteParticipants, setRemoteParticipants] = useState<{ userId: number; name: string; stream?: MediaStream }[]>([]);
  const processedOffersRef = useRef<Set<string>>(new Set());
  const processedAnswersRef = useRef<Set<string>>(new Set());

  const leaveGroupCallMutation = trpc.webrtc.leaveGroupCall.useMutation();
  const sendGroupOfferMutation = trpc.webrtc.sendGroupOffer.useMutation();
  const sendGroupAnswerMutation = trpc.webrtc.sendGroupAnswer.useMutation();
  const addGroupIceMutation = trpc.webrtc.addGroupIceCandidate.useMutation();

  // 시그널 폴링
  const { data: groupSignals } = trpc.webrtc.pollGroupSignals.useQuery(
    { callId },
    { refetchInterval: 1000 }
  );

  // TURN 서버 포함 ICE 서버 설정 가져오기
  const { data: iceConfig } = trpc.webrtc.getIceServers.useQuery();
  const iceServers = useMemo(() => iceConfig?.iceServers || [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ], [iceConfig]);

  // 타이머
  useEffect(() => {
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 미디어 초기화
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video",
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        toast.error("미디어 장치에 접근할 수 없습니다");
      }
    };
    initMedia();
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnectionsRef.current.forEach(pc => pc.close());
    };
  }, [callType]);

  // 새 참여자에게 offer 전송
  useEffect(() => {
    if (!groupSignals || !localStreamRef.current || !user) return;
    const myId = user.id;
    for (const p of groupSignals.participants) {
      if (p.userId === myId) continue;
      if (peerConnectionsRef.current.has(p.userId)) continue;
      // 새 피어 발견 - offer 전송 (낮은 ID가 offer 전송)
      if (myId < p.userId) {
        const pc = new RTCPeerConnection({ iceServers });
        peerConnectionsRef.current.set(p.userId, pc);
        localStreamRef.current!.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
        pc.onicecandidate = (e) => {
          if (e.candidate) addGroupIceMutation.mutate({ callId, targetUserId: p.userId, candidate: JSON.stringify(e.candidate) });
        };
        pc.ontrack = (e) => {
          if (e.streams[0]) {
            remoteStreamsRef.current.set(p.userId, e.streams[0]);
            setRemoteParticipants(prev => {
              const existing = prev.find(x => x.userId === p.userId);
              if (existing) return prev.map(x => x.userId === p.userId ? { ...x, stream: e.streams[0] } : x);
              return [...prev, { userId: p.userId, name: p.name, stream: e.streams[0] }];
            });
          }
        };
        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
          sendGroupOfferMutation.mutate({ callId, targetUserId: p.userId, offer: JSON.stringify(offer) });
        }).catch(console.error);
      }
    }
  }, [groupSignals?.participants, user, callId, iceServers]);

  // 수신된 offer에 answer 응답
  useEffect(() => {
    if (!groupSignals || !localStreamRef.current || !user) return;
    for (const o of groupSignals.offers) {
      const key = `offer-${o.fromUserId}`;
      if (processedOffersRef.current.has(key)) continue;
      processedOffersRef.current.add(key);
      const pc = new RTCPeerConnection({ iceServers });
      peerConnectionsRef.current.set(o.fromUserId, pc);
      localStreamRef.current!.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
      pc.onicecandidate = (e) => {
        if (e.candidate) addGroupIceMutation.mutate({ callId, targetUserId: o.fromUserId, candidate: JSON.stringify(e.candidate) });
      };
      pc.ontrack = (e) => {
        if (e.streams[0]) {
          remoteStreamsRef.current.set(o.fromUserId, e.streams[0]);
          const pName = groupSignals.participants.find((p: any) => p.userId === o.fromUserId)?.name || "상대방";
          setRemoteParticipants(prev => {
            const existing = prev.find(x => x.userId === o.fromUserId);
            if (existing) return prev.map(x => x.userId === o.fromUserId ? { ...x, stream: e.streams[0] } : x);
            return [...prev, { userId: o.fromUserId, name: pName, stream: e.streams[0] }];
          });
        }
      };
      pc.setRemoteDescription(JSON.parse(o.offer)).then(() => pc.createAnswer()).then(answer => {
        pc.setLocalDescription(answer);
        sendGroupAnswerMutation.mutate({ callId, fromUserId: o.fromUserId, answer: JSON.stringify(answer) });
      }).catch(console.error);
    }
  }, [groupSignals?.offers, user, callId, iceServers]);

  // answer 수신 처리
  useEffect(() => {
    if (!groupSignals) return;
    for (const a of groupSignals.answers) {
      const key = `answer-${a.fromUserId}`;
      if (processedAnswersRef.current.has(key)) continue;
      processedAnswersRef.current.add(key);
      const pc = peerConnectionsRef.current.get(a.fromUserId);
      if (pc && pc.signalingState !== "stable") {
        pc.setRemoteDescription(JSON.parse(a.answer)).catch(console.error);
      }
    }
  }, [groupSignals?.answers]);

  // ICE candidates 처리
  useEffect(() => {
    if (!groupSignals) return;
    for (const c of groupSignals.candidates) {
      const pc = peerConnectionsRef.current.get(c.fromUserId);
      if (pc) {
        for (const cand of c.candidates) {
          try { pc.addIceCandidate(JSON.parse(cand)); } catch {}
        }
      }
    }
  }, [groupSignals?.candidates]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(!isVideoOff);
  };

  const handleEnd = () => {
    leaveGroupCallMutation.mutate({ callId });
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerConnectionsRef.current.forEach(pc => pc.close());
    onEnd();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const totalParticipants = (groupSignals?.participants?.length || 1);

  // 그리드 레이아웃 계산 (2x2, 2x3 등)
  const gridCols = totalParticipants <= 2 ? 1 : totalParticipants <= 4 ? 2 : totalParticipants <= 6 ? 3 : 4;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* 상단 정보 */}
      <div className="px-4 py-3 flex items-center gap-3 text-white">
        <Users className="h-5 w-5 text-green-400" />
        <div className="flex-1">
          <span className="font-medium">{roomName}</span>
          <span className="text-white/60 text-sm ml-2">{totalParticipants}명 참여 중</span>
        </div>
        <span className="text-white/60 text-sm">{formatTime(duration)}</span>
      </div>

      {/* 비디오 그리드 */}
      <div className={`flex-1 p-2 grid gap-2`} style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
        {/* 내 비디오 */}
        <div className="relative bg-gray-800 rounded-xl overflow-hidden">
          {callType === "video" ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-blue-600/30 flex items-center justify-center">
                <Mic className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-0.5 text-xs text-white">
            나 {isMuted && "(음소거)"}
          </div>
        </div>
        {/* 원격 참여자 비디오 */}
        {remoteParticipants.map(p => (
          <div key={p.userId} className="relative bg-gray-800 rounded-xl overflow-hidden">
            {callType === "video" && p.stream ? (
              <RemoteVideo stream={p.stream} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-green-600/30 flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-400">{p.name?.charAt(0) || "?"}</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-0.5 text-xs text-white">
              {p.name}
            </div>
          </div>
        ))}
        {/* 빈 슬롯 (대기 중) */}
        {totalParticipants > remoteParticipants.length + 1 && Array.from({ length: totalParticipants - remoteParticipants.length - 1 }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-gray-800/50 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse h-3 w-3 rounded-full bg-yellow-500 mx-auto mb-2" />
              <span className="text-xs text-white/40">연결 중...</span>
            </div>
          </div>
        ))}
      </div>

      {/* 컨트롤 바 */}
      <div className="py-6 flex items-center justify-center gap-4">
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

// 원격 비디오 컴포넌트 (srcObject 설정용)
function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />;
}

// ── 메시지 버블 ────────────────────────────────────────────
function MessageBubble({ msg, isMe, isAdmin, user, onReply, onDelete, onPin, onUnpin, myLang }: {
  msg: any; isMe: boolean; isAdmin: boolean; user: any; onReply: (m: any) => void; onDelete: (id: number) => void; onPin?: (id: number) => void; onUnpin?: (id: number) => void; myLang: string;
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
        <div className={`rounded-2xl px-3 py-2 text-sm ${isMe ? "bg-blue-600 text-white" : "bg-muted"} ${msg.isPinned ? "ring-1 ring-amber-400/50" : ""}`}>
          {msg.isPinned && (
            <div className="flex items-center gap-1 text-amber-400 text-[10px] mb-1">
              <Pin className="h-2.5 w-2.5" />
              <span>고정됨</span>
            </div>
          )}
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
          {isAdmin && !msg.isPinned && onPin && (
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-amber-400" onClick={() => onPin(msg.id)} title="고정">
              <Pin className="h-3 w-3" />
            </Button>
          )}
          {isAdmin && msg.isPinned && onUnpin && (
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-amber-400" onClick={() => onUnpin(msg.id)} title="고정 해제">
              <PinOff className="h-3 w-3" />
            </Button>
          )}
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
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showTranslator, setShowTranslator] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showPinnedList, setShowPinnedList] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<"all" | "image" | "video" | "file">("all");
  const [myLang, setMyLang] = useState("ko");
  const [activeCall, setActiveCall] = useState<{ callId: string; callType: "voice" | "video"; callerName: string; isOutgoing: boolean } | null>(null);
  const [groupCall, setGroupCall] = useState<{ callId: string; callType: "voice" | "video" } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: room } = trpc.chatRoom.getById.useQuery({ id: roomId }, { enabled: isAuthenticated });
  const { data: members } = trpc.chatRoom.members.useQuery({ roomId }, { enabled: isAuthenticated });
  const { data: messages, refetch } = trpc.chatMessage.list.useQuery(
    { roomId, limit: 100 },
    { enabled: isAuthenticated, refetchInterval: 3000 }
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
  const createGroupCallMutation = trpc.webrtc.createGroupCall.useMutation();
  const joinGroupCallMutation = trpc.webrtc.joinGroupCall.useMutation();

  // 미디어 갤러리
  const { data: mediaItems, refetch: refetchMedia } = trpc.chatMessage.mediaList.useQuery(
    { roomId, mediaType: mediaFilter, limit: 100 },
    { enabled: isAuthenticated && showMediaGallery }
  );
  const { data: mediaCount } = trpc.chatMessage.mediaCount.useQuery(
    { roomId },
    { enabled: isAuthenticated && showMediaGallery }
  );

  // 고정 메시지
  const { data: pinnedMessages, refetch: refetchPinned } = trpc.chatMessage.pinnedList.useQuery(
    { roomId },
    { enabled: isAuthenticated, refetchInterval: 10000 }
  );
  const pinMutation = trpc.chatMessage.pin.useMutation({
    onSuccess: () => { refetch(); refetchPinned(); toast.success("메시지가 고정되었습니다"); },
    onError: (e) => toast.error(e.message),
  });
  const unpinMutation = trpc.chatMessage.unpin.useMutation({
    onSuccess: () => { refetch(); refetchPinned(); toast.success("고정이 해제되었습니다"); },
    onError: (e) => toast.error(e.message),
  });

  // 활성 그룹 통화 조회
   const { data: activeGroupCall } = trpc.webrtc.getActiveGroupCall.useQuery(
    { roomId },
    { enabled: isAuthenticated, refetchInterval: groupCall ? false : 3000 }
  );
  // 수신 통화 폴링
  const { data: incomingCall } = trpc.webrtc.pollIncoming.useQuery(
    { roomId },
    { enabled: isAuthenticated, refetchInterval: activeCall ? false : 2000 }
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

  // ICE 서버 설정 조회
  const { data: iceConfig } = trpc.webrtc.getIceServers.useQuery();

  const startCall = async (type: "voice" | "video") => {
    if (!members || members.length < 2) { toast.error("통화할 상대가 없습니다"); return; }
    const otherMember = members.find((m: any) => m.userId !== user?.id);
    if (!otherMember) { toast.error("통화할 상대를 찾을 수 없습니다"); return; }

    try {
      const pc = new RTCPeerConnection({
        iceServers: iceConfig?.iceServers || [{ urls: "stun:stun.l.google.com:19302" }],
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

  const startGroupCall = async (type: "voice" | "video") => {
    try {
      const result = await createGroupCallMutation.mutateAsync({ roomId, callType: type });
      setGroupCall({ callId: result.callId, callType: type });
      toast.success(`그룹 ${type === "video" ? "영상" : "음성"} 통화가 시작되었습니다`);
    } catch {
      toast.error("그룹 통화를 시작할 수 없습니다");
    }
  };

  const joinExistingGroupCall = async () => {
    if (!activeGroupCall) return;
    try {
      await joinGroupCallMutation.mutateAsync({ callId: activeGroupCall.callId });
      setGroupCall({ callId: activeGroupCall.callId, callType: activeGroupCall.callType as "voice" | "video" });
      toast.success("그룹 통화에 참여했습니다");
    } catch (e: any) {
      toast.error(e.message || "참여 실패");
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

      {/* 그룹 통화 오버레이 */}
      {groupCall && (
        <GroupCallOverlay
          callId={groupCall.callId}
          callType={groupCall.callType}
          roomName={room?.name || "채팅방"}
          onEnd={() => setGroupCall(null)}
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
        {/* 1:1 통화 */}
        <Button variant="ghost" size="icon" onClick={() => startCall("voice")} title="1:1 음성 통화">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => startCall("video")} title="1:1 영상 통화">
          <Video className="h-5 w-5" />
        </Button>
        {/* 그룹 통화 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="그룹 통화">
              <Users className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => startGroupCall("voice")}>
              <Phone className="h-4 w-4 mr-2" /> 그룹 음성 통화 시작
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => startGroupCall("video")}>
              <Video className="h-4 w-4 mr-2" /> 그룹 영상 통화 시작
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
            <DropdownMenuItem onClick={() => setShowMediaGallery(true)}>
              <GalleryHorizontalEnd className="h-4 w-4 mr-2" /> 미디어 갤러리
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowPinnedList(!showPinnedList)}>
              <Pin className="h-4 w-4 mr-2" /> 고정 메시지 {pinnedMessages?.length ? `(${pinnedMessages.length})` : ""}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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

      {/* 활성 그룹 통화 배너 */}
      {activeGroupCall && !groupCall && (
        <div className="px-4 py-2 bg-green-500/10 border-b border-green-500/20 flex items-center gap-3">
          <div className="animate-pulse h-3 w-3 rounded-full bg-green-500" />
          <div className="flex-1">
            <span className="text-sm font-medium text-green-400">그룹 {activeGroupCall.callType === "video" ? "영상" : "음성"} 통화 진행 중</span>
            <span className="text-xs text-muted-foreground ml-2">{activeGroupCall.participantCount}/{activeGroupCall.maxParticipants}명</span>
          </div>
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={joinExistingGroupCall}>
            <Phone className="h-4 w-4 mr-1" /> 참여하기
          </Button>
        </div>
      )}

      {/* 고정 메시지 배너 */}
      {pinnedMessages && pinnedMessages.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 cursor-pointer" onClick={() => setShowPinnedList(true)}>
          <Pin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="text-sm text-amber-200 truncate flex-1">{pinnedMessages[0]?.content || "고정된 메시지"}</span>
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 shrink-0">{pinnedMessages.length}</Badge>
        </div>
      )}

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
            onPin={(id) => pinMutation.mutate({ messageId: id })}
            onUnpin={(id) => unpinMutation.mutate({ messageId: id })}
            myLang={myLang}
          />
        ))}
      </div>

      {/* 번역 패널 */}
      {showTranslator && <TranslatorPanel onClose={() => setShowTranslator(false)} />}

      {/* 위치 공유 다이얼로그 */}
      <LocationShareDialog open={showLocationDialog} onClose={() => setShowLocationDialog(false)} onSend={handleLocationSend} />

      {/* 미디어 갤러리 Sheet */}
      <Sheet open={showMediaGallery} onOpenChange={setShowMediaGallery}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="flex items-center gap-2">
              <GalleryHorizontalEnd className="h-5 w-5" /> 미디어 갤러리
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-2">
            <div className="flex gap-1 text-xs">
              <span className="text-muted-foreground">사진 {mediaCount?.images || 0}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">영상 {mediaCount?.videos || 0}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">파일 {mediaCount?.files || 0}</span>
            </div>
          </div>
          <Tabs value={mediaFilter} onValueChange={(v) => setMediaFilter(v as any)} className="px-4">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1 text-xs">전체</TabsTrigger>
              <TabsTrigger value="image" className="flex-1 text-xs">사진</TabsTrigger>
              <TabsTrigger value="video" className="flex-1 text-xs">영상</TabsTrigger>
              <TabsTrigger value="file" className="flex-1 text-xs">파일</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="overflow-y-auto flex-1 p-4" style={{ maxHeight: "calc(100vh - 180px)" }}>
            {(!mediaItems || mediaItems.length === 0) ? (
              <div className="text-center text-muted-foreground py-12">
                <GalleryHorizontalEnd className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">공유된 미디어가 없습니다</p>
              </div>
            ) : (
              <div className={mediaFilter === "file" ? "space-y-2" : "grid grid-cols-3 gap-1.5"}>
                {mediaItems.map((item: any) => {
                  if (item.messageType === "image") {
                    return (
                      <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(item.fileUrl, "_blank")}>
                        <img src={item.fileUrl} alt={item.fileName || "이미지"} className="w-full h-full object-cover" />
                      </div>
                    );
                  }
                  if (item.messageType === "video") {
                    return (
                      <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-muted relative cursor-pointer" onClick={() => window.open(item.fileUrl, "_blank")}>
                        <video src={item.fileUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    );
                  }
                  // file / voice
                  return (
                    <a key={item.id} href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        {item.messageType === "voice" ? <Volume2 className="h-5 w-5 text-blue-400" /> : <FileText className="h-5 w-5 text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.fileName || "파일"}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("ko-KR")} · {item.senderName}</p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 고정 메시지 목록 Sheet */}
      <Sheet open={showPinnedList} onOpenChange={setShowPinnedList}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="flex items-center gap-2">
              <Pin className="h-5 w-5 text-amber-400" /> 고정된 메시지
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto flex-1 p-4 space-y-3" style={{ maxHeight: "calc(100vh - 100px)" }}>
            {(!pinnedMessages || pinnedMessages.length === 0) ? (
              <div className="text-center text-muted-foreground py-12">
                <Pin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">고정된 메시지가 없습니다</p>
              </div>
            ) : (
              pinnedMessages.map((pm: any) => (
                <div key={pm.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">{pm.senderName?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{pm.senderName}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(pm.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {pm.messageType === "image" && pm.fileUrl ? (
                    <img src={pm.fileUrl} alt="" className="rounded-lg max-h-40 mb-1" />
                  ) : pm.messageType === "video" && pm.fileUrl ? (
                    <video src={pm.fileUrl} controls className="rounded-lg max-h-40 mb-1" />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{pm.content}</p>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="sm" className="mt-1 text-xs text-amber-400 h-7" onClick={() => { unpinMutation.mutate({ messageId: pm.id }); }}>
                      <PinOff className="h-3 w-3 mr-1" /> 고정 해제
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

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
