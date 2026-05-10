import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MapPin, Calendar, Luggage, Edit, Sparkles, Loader2, Wand2, CheckCircle2, Globe, Copy, Link2, Share2, ExternalLink, QrCode, Download, Pencil, Users, XCircle, Megaphone, AlertTriangle, CopyPlus, MessageCircle, Send, LayoutGrid, List, ChevronDown, ChevronUp, Search, Filter } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function AdminMeetups() {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [editBaggageId, setEditBaggageId] = useState<number | null>(null);
  const [editBaggageText, setEditBaggageText] = useState("");
  // 밋업 상세 수정 상태
  const [editMeetup, setEditMeetup] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    title: "", type: "meetup" as const, locationType: "domestic" as const,
    destinationCountry: "", location: "", description: "",
    scheduleStart: "", scheduleEnd: "", maxParticipants: 0,
    baggageNotice: "",
    visibility: "referral_only" as "public" | "referral_only",
  });
  // 밋업 취소 상태
  const [cancelMeetup, setCancelMeetup] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  // 공지 보내기 상태
  const [announceMeetup, setAnnounceMeetup] = useState<any>(null);
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceContent, setAnnounceContent] = useState("");

  const { data: meetups, refetch } = trpc.meetup.list.useQuery();
  const createMutation = trpc.meetup.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); toast.success(t("admin.meetups.created")); }});
  const deleteMutation = trpc.meetup.delete.useMutation({ onSuccess: () => { refetch(); toast.success(t("admin.meetups.deleted")); }});
  const updateMutation = trpc.meetup.update.useMutation({ onSuccess: () => { refetch(); toast.success(t("admin.meetups.t38", "업데이트되었습니다.")); }});
  const cancelMutation = trpc.meetup.cancel.useMutation({
    onSuccess: () => { refetch(); setCancelMeetup(null); setCancelReason(""); toast.success("밋업이 취소되었습니다."); },
    onError: (err) => toast.error(err.message),
  });
  const announceMutation = trpc.meetup.sendAnnouncement.useMutation({
    onSuccess: () => { setAnnounceMeetup(null); setAnnounceTitle(""); setAnnounceContent(""); toast.success("공지가 전송되었습니다."); },
    onError: (err) => toast.error(err.message),
  });

  // QR 코드 다이얼로그 상태
  const [qrMeetup, setQrMeetup] = useState<any>(null);
  // 밋업 복제 상태
  const [cloneMeetup, setCloneMeetup] = useState<any>(null);
  const [cloneForm, setCloneForm] = useState({ title: "", scheduleStart: "", scheduleEnd: "" });
  // SNS 공유 팝업 상태
  const [shareMeetup, setShareMeetup] = useState<any>(null);
  // 뷰 모드 상태 (card: 상세보기, compact: 간단히 보기)
  const [viewMode, setViewMode] = useState<"card" | "compact">(() => {
    return (localStorage.getItem("meetup-view-mode") as "card" | "compact") || "card";
  });
  // 검색/필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // 정렬 상태
  const [sortField, setSortField] = useState<"title" | "date" | "status" | "location">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // AI 프롬프트 상태
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiMode, setShowAiMode] = useState(false);
  const [aiParsedData, setAiParsedData] = useState<any>(null);
  const aiParseMutation = trpc.aiMeetup.parsePrompt.useMutation({
    onSuccess: (result) => {
      if (result.success && result.data) {
        setAiParsedData(result.data);
        setForm({
          title: result.data.title || "",
          type: (result.data.type || "meetup") as any,
          locationType: (result.data.locationType || "domestic") as any,
          destinationCountry: result.data.destinationCountry || "",
          location: result.data.location || "",
          description: result.data.description || "",
          scheduleStart: result.data.scheduleStart || "",
          scheduleEnd: result.data.scheduleEnd || "",
          maxParticipants: result.data.maxParticipants || 0,
          baggageNotice: result.data.suggestedBaggageNotice || "초과화물은 직접부담할 수 있습니다.",
          visibility: "referral_only" as const,
        });
        setShowAiMode(false);
        toast.success(t("admin.meetups.t39", "AI가 밋업 정보를 자동으로 채웠습니다!"));
      } else {
        toast.error(result.error || "AI 파싱에 실패했습니다.");
      }
    },
    onError: () => {
      toast.error(t("admin.meetups.t40", "AI 처리 중 오류가 발생했습니다."));
    },
  });

  const [form, setForm] = useState({
    title: "", type: "meetup" as const, locationType: "domestic" as const,
    destinationCountry: "", location: "", description: "",
    scheduleStart: "", scheduleEnd: "", maxParticipants: 0,
    baggageNotice: "초과화물은 직접부담할 수 있습니다.",
    visibility: "referral_only" as "public" | "referral_only",
  });

  const typeLabels: Record<string, string> = {
    meetup: "밋업", pre_visit: "사전방문", event: "이벤트", meeting: "미팅", other: "기타"
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: "초안", color: "bg-gray-500/20 text-gray-400" },
    open: { label: "모집중", color: "bg-green-500/20 text-green-400" },
    closed: { label: "마감", color: "bg-orange-500/20 text-orange-400" },
    completed: { label: "완료", color: "bg-blue-500/20 text-blue-400" },
    cancelled: { label: "취소됨", color: "bg-red-500/20 text-red-400" },
  };

  const COUNTRY_FLAGS: Record<string, string> = {
    KR: "🇰🇷", CN: "🇨🇳", JP: "🇯🇵", TH: "🇹🇭", VN: "🇻🇳", SG: "🇸🇬", MY: "🇲🇾",
    ID: "🇮🇩", PH: "🇵🇭", US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", AU: "🇦🇺",
    IN: "🇮🇳", TW: "🇹🇼", HK: "🇭🇰", AE: "🇦🇪", TR: "🇹🇷", RU: "🇷🇺", BR: "🇧🇷",
    CA: "🇨🇦", MX: "🇲🇽", IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", CH: "🇨🇭", SE: "🇸🇪",
    PL: "🇵🇱", UA: "🇺🇦", NZ: "🇳🇿", KH: "🇰🇭", LA: "🇱🇦", MM: "🇲🇲", MN: "🇲🇳",
  };

  const handleAiParse = () => {
    if (!aiPrompt.trim()) {
      toast.error(t("admin.meetups.t41", "밋업 정보를 입력해주세요."));
      return;
    }
    aiParseMutation.mutate({ prompt: aiPrompt });
  };

  const handleOpenEdit = (m: any) => {
    setEditForm({
      title: m.title || "",
      type: m.type || "meetup",
      locationType: m.locationType || "domestic",
      destinationCountry: m.destinationCountry || "",
      location: m.location || "",
      description: m.description || "",
      scheduleStart: m.scheduleStart ? new Date(m.scheduleStart).toISOString().split("T")[0] : "",
      scheduleEnd: m.scheduleEnd ? new Date(m.scheduleEnd).toISOString().split("T")[0] : "",
      maxParticipants: m.maxParticipants || 0,
      baggageNotice: m.baggageNotice || "",
      visibility: m.visibility || "referral_only",
    });
    setEditMeetup(m);
  };

  const handleOpenCreate = () => {
    setForm({
      title: "", type: "meetup" as const, locationType: "domestic" as const,
      destinationCountry: "", location: "", description: "",
      scheduleStart: "", scheduleEnd: "", maxParticipants: 0,
      baggageNotice: "초과화물은 직접부담할 수 있습니다.",
      visibility: "referral_only",
    });
    setAiParsedData(null);
    setAiPrompt("");
    setShowAiMode(false);
    setShowCreate(true);
  };

  const toggleViewMode = (mode: "card" | "compact") => {
    setViewMode(mode);
    localStorage.setItem("meetup-view-mode", mode);
  };

  // 필터링 + 정렬 로직
  const filteredMeetups = useMemo(() => {
    if (!meetups) return [];
    let list = [...meetups];
    // 상태 필터
    if (statusFilter !== "all") {
      list = list.filter((m: any) => m.status === statusFilter);
    }
    // 검색
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m: any) =>
        (m.title || "").toLowerCase().includes(q) ||
        (m.location || "").toLowerCase().includes(q) ||
        (m.projectCode || "").toLowerCase().includes(q) ||
        (m.destinationCountry || "").toLowerCase().includes(q)
      );
    }
    // 정렬
    list.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortField === "title") cmp = (a.title || "").localeCompare(b.title || "");
      else if (sortField === "date") cmp = new Date(a.scheduleStart || 0).getTime() - new Date(b.scheduleStart || 0).getTime();
      else if (sortField === "status") cmp = (a.status || "").localeCompare(b.status || "");
      else if (sortField === "location") cmp = (a.location || "").localeCompare(b.location || "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [meetups, statusFilter, searchQuery, sortField, sortDir]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      {/* 헤더: 제목 + 뷰 토글 + 새 밋업 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.meetups.title")}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              className={`p-1.5 transition-colors ${viewMode === "card" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              onClick={() => toggleViewMode("card")}
              title="상세 보기"
            ><LayoutGrid className="h-4 w-4" /></button>
            <button
              className={`p-1.5 transition-colors ${viewMode === "compact" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              onClick={() => toggleViewMode("compact")}
              title="간단히 보기"
            ><List className="h-4 w-4" /></button>
          </div>
          <Button onClick={handleOpenCreate}><Plus className="h-4 w-4 mr-2" />{t("admin.meetups.t1", "새 밋업")}</Button>
        </div>
      </div>

      {/* 검색 + 필터 바 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="밋업 검색 (제목, 장소, 코드)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="draft">초안</SelectItem>
            <SelectItem value="open">모집중</SelectItem>
            <SelectItem value="closed">마감</SelectItem>
            <SelectItem value="completed">완료</SelectItem>
            <SelectItem value="cancelled">취소됨</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filteredMeetups.length}개{meetups && filteredMeetups.length !== meetups.length ? ` / 전체 ${meetups.length}개` : ""}
        </span>
      </div>

      {/* 컴팩트 뷰 (테이블 형태) */}
      {viewMode === "compact" ? (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40px] text-center">#</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("title")}>
                  <span className="flex items-center gap-1">제목 <SortIcon field="title" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none w-[100px]" onClick={() => handleSort("location")}>
                  <span className="flex items-center gap-1">장소 <SortIcon field="location" /></span>
                </TableHead>
                <TableHead className="w-[70px]">유형</TableHead>
                <TableHead className="cursor-pointer select-none w-[90px]" onClick={() => handleSort("date")}>
                  <span className="flex items-center gap-1">일정 <SortIcon field="date" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none w-[80px]" onClick={() => handleSort("status")}>
                  <span className="flex items-center gap-1">상태 <SortIcon field="status" /></span>
                </TableHead>
                <TableHead className="w-[60px] text-center">코드</TableHead>
                <TableHead className="w-[120px] text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMeetups.map((m: any, idx: number) => (
                <TableRow
                  key={m.id}
                  className={`hover:bg-muted/30 transition-colors ${m.status === "cancelled" ? "opacity-50" : ""}`}
                >
                  <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`font-medium text-sm truncate max-w-[250px] ${m.status === "cancelled" ? "line-through text-muted-foreground" : ""}`}>
                        {m.title}
                      </span>
                      {m.locationType === "overseas" && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-500 shrink-0">해외</span>
                      )}
                      {m.visibility === "public" ? (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-500 shrink-0">공개</span>
                      ) : (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-gray-500/20 text-gray-400 shrink-0">추천</span>
                      )}
                      {m.invitedCountries && Array.isArray(m.invitedCountries) && (m.invitedCountries as string[]).length > 0 && (
                        <span className="flex items-center gap-0.5 shrink-0">
                          {(m.invitedCountries as string[]).slice(0, 3).map((code: string) => (
                            <span key={code} className="text-xs">{COUNTRY_FLAGS[code] || code}</span>
                          ))}
                          {(m.invitedCountries as string[]).length > 3 && <span className="text-[10px] text-muted-foreground">+{(m.invitedCountries as string[]).length - 3}</span>}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]">{m.location || "-"}</TableCell>
                  <TableCell>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">{typeLabels[m.type] || m.type}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {m.scheduleStart ? new Date(m.scheduleStart).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : "-"}
                    {m.scheduleEnd && <span className="text-muted-foreground/50">~{new Date(m.scheduleEnd).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>}
                  </TableCell>
                  <TableCell>
                    <Select value={m.status} onValueChange={v => updateMutation.mutate({ id: m.id, status: v as any })}>
                      <SelectTrigger className="h-6 w-[75px] text-[10px] px-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">초안</SelectItem>
                        <SelectItem value="open">모집중</SelectItem>
                        <SelectItem value="closed">마감</SelectItem>
                        <SelectItem value="completed">완료</SelectItem>
                        <SelectItem value="cancelled">취소됨</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    {m.projectCode ? (
                      <span className="text-[10px] font-mono text-muted-foreground">#{m.projectCode?.toString().slice(0, 7)}</span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEdit(m)} title="수정">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {m.shareToken && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/m/${m.shareToken}`);
                          toast.success("공유 URL 복사됨");
                        }} title="URL 복사">
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                      {m.shareToken && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(`/m/${m.shareToken}`, "_blank")} title="열기">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
                        if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: m.id });
                      }} title="삭제">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredMeetups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery || statusFilter !== "all" ? "검색 결과가 없습니다" : t("admin.meetups.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
      /* 상세 보기 (기존 카드 뷰) */
      <div className="grid gap-4">
        {filteredMeetups.map((m: any) => (
          <Card key={m.id} className={`bg-card border-border ${m.status === "cancelled" ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold text-lg ${m.status === "cancelled" ? "line-through text-muted-foreground" : ""}`}>{m.title}</h3>
                    {m.status === "cancelled" && (
                      <Badge variant="destructive" className="text-[10px]">취소됨</Badge>
                    )}
                    {m.visibility === "public" ? (
                      <Badge className="text-[10px] bg-blue-500/20 text-blue-500 border-blue-500/30">공개</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">추천코드</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location || "미정"}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">{typeLabels[m.type]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${m.locationType === "overseas" ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400"}`}>
                      {m.locationType === "overseas" ? "해외" : "내륙"}
                    </span>
                  </div>
                  {m.scheduleStart && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(m.scheduleStart).toLocaleDateString("ko-KR")}
                      {m.scheduleEnd && ` ~ ${new Date(m.scheduleEnd).toLocaleDateString("ko-KR")}`}
                    </p>
                  )}
                  {/* 프로젝트 코드 & 초청국가 */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {m.projectCode && (
                      <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                        <Link2 className="h-2.5 w-2.5" />#{m.projectCode}
                      </Badge>
                    )}
                    {m.invitedCountries && Array.isArray(m.invitedCountries) && (m.invitedCountries as string[]).length > 0 && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-blue-500" />
                        {(m.invitedCountries as string[]).map((code: string) => (
                          <span key={code} className="text-xs">{COUNTRY_FLAGS[code] || code}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 공유 URL 복사 */}
                  {m.shareToken && (
                    <div className="flex items-center gap-2 mt-1">
                      <Share2 className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-[11px] text-muted-foreground font-mono truncate">
                        {window.location.origin}/m/{m.shareToken}
                      </span>
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/m/${m.shareToken}`);
                          toast.success(t("admin.meetups.t42", "공유 URL이 복사되었습니다"));
                        }}
                      ><Copy className="h-3 w-3" /></Button>
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5 shrink-0"
                        onClick={() => window.open(`/m/${m.shareToken}`, "_blank")}
                      ><ExternalLink className="h-3 w-3" /></Button>
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5 shrink-0"
                        onClick={() => setQrMeetup(m)}
                        title="QR 코드"
                      ><QrCode className="h-3 w-3" /></Button>
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5 shrink-0"
                        onClick={() => setShareMeetup(m)}
                        title="SNS 공유"
                      ><Send className="h-3 w-3" /></Button>
                    </div>
                  )}
                  {/* 액션 버튼 그룹 */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Button
                      variant="outline" size="sm" className="h-6 text-[11px] gap-1 px-2"
                      onClick={() => handleOpenEdit(m)}
                    ><Pencil className="h-3 w-3" />{t("admin.meetups.editMeetup", "밋업 수정")}</Button>
                    <Button
                      variant="outline" size="sm" className="h-6 text-[11px] gap-1 px-2 border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                      onClick={() => { setAnnounceMeetup(m); setAnnounceTitle(""); setAnnounceContent(""); }}
                    ><Megaphone className="h-3 w-3" />공지 보내기</Button>
                    {m.status !== "cancelled" && (
                      <Button
                        variant="outline" size="sm" className="h-6 text-[11px] gap-1 px-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
                        onClick={() => { setCancelMeetup(m); setCancelReason(""); }}
                      ><XCircle className="h-3 w-3" />밋업 취소</Button>
                    )}
                    <Button
                      variant="outline" size="sm" className="h-6 text-[11px] gap-1 px-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                      onClick={() => {
                        setCloneForm({
                          title: `${m.title} (복사)`,
                          scheduleStart: "",
                          scheduleEnd: "",
                        });
                        setCloneMeetup(m);
                      }}
                    ><CopyPlus className="h-3 w-3" />복제</Button>
                  </div>
                  {/* 수화물 공지 표시 */}
                  <div className="flex items-center gap-2 mt-2">
                    <Luggage className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-400/80 truncate">{m.baggageNotice || "초과화물은 직접부담할 수 있습니다."}</span>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                      onClick={() => { setEditBaggageId(m.id); setEditBaggageText(m.baggageNotice || "초과화물은 직접부담할 수 있습니다."); }}
                    ><Edit className="h-3 w-3" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Select value={m.status} onValueChange={v => updateMutation.mutate({ id: m.id, status: v as any })}>
                    <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t("admin.meetups.t2", "초안")}</SelectItem>
                      <SelectItem value="open">{t("admin.meetups.t3", "모집중")}</SelectItem>
                      <SelectItem value="closed">{t("admin.meetups.t4", "마감")}</SelectItem>
                      <SelectItem value="completed">{t("admin.meetups.t5", "완료")}</SelectItem>
                      <SelectItem value="cancelled">취소됨</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                    if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: m.id });
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredMeetups.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery || statusFilter !== "all" ? "검색 결과가 없습니다" : t("admin.meetups.empty")}
          </div>
        )}
      </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("admin.meetups.t6", "새 밋업 생성")}
          </DialogTitle></DialogHeader>

          {/* AI 프롬프트 입력 영역 */}
          <div className="space-y-3">
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="h-4 w-4 text-violet-500" />
                <Label className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                  {t("admin.meetups.t7", "AI 자동 입력")}
                </Label>
                <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-500">BETA</Badge>
              </div>
              <div className="relative">
                <Textarea
                  placeholder={`예시:\n• 프로젝트 밋업 태국 방콕, 4월1일~4월25일, 초청국가 한국 중국\n• 사전방문 일본 도쿄, 5월10일~15일, 50명\n• 내륙 밋업 서울 강남, 3월20일~22일`}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={3}
                  className="pr-20 bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 focus:border-violet-400"
                />
                <Button
                  size="sm"
                  onClick={handleAiParse}
                  disabled={aiParseMutation.isPending || !aiPrompt.trim()}
                  className="absolute right-2 bottom-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-sm"
                >
                  {aiParseMutation.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />{t("admin.meetups.t8", "분석중")}</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1" />{t("admin.meetups.t9", "자동입력")}</>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {t("admin.meetups.t10", "자연어로 밋업 정보를 입력하면 AI가 자동으로 모든 필드를 채워줍니다")}
              </p>
            </div>

            {/* AI 파싱 결과 미리보기 */}
            {aiParsedData && (
              <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{t("admin.meetups.t11", "AI 분석 완료")}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <span className="text-muted-foreground">{t("admin.meetups.t12", "제목:")}</span>
                  <span className="font-medium truncate">{aiParsedData.title}</span>
                  <span className="text-muted-foreground">{t("admin.meetups.t13", "장소:")}</span>
                  <span className="font-medium">{aiParsedData.location}</span>
                  <span className="text-muted-foreground">{t("admin.meetups.t14", "기간:")}</span>
                  <span className="font-medium">{aiParsedData.scheduleStart} ~ {aiParsedData.scheduleEnd}</span>
                  {aiParsedData.invitedCountries?.length > 0 && (
                    <>
                      <span className="text-muted-foreground">{t("admin.meetups.t15", "초청국:")}</span>
                      <span className="font-medium flex items-center gap-1 flex-wrap">
                        {aiParsedData.invitedCountries.map((code: string) => (
                          <span key={code} className="inline-flex items-center gap-0.5">
                            {COUNTRY_FLAGS[code] || "🏳️"}{code}
                          </span>
                        ))}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-border" />
              <span className="px-3 text-xs text-muted-foreground bg-background">{t("admin.meetups.t16", "또는 직접 입력")}</span>
              <div className="flex-1 border-t border-border" />
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); createMutation.mutate({
            ...form,
            maxParticipants: form.maxParticipants || undefined,
            scheduleStart: form.scheduleStart || undefined,
            scheduleEnd: form.scheduleEnd || undefined,
            destinationCountry: form.destinationCountry || undefined,
            location: form.location || undefined,
            description: form.description || undefined,
            baggageNotice: form.baggageNotice || undefined,
          }); }} className="space-y-4">
            <div><Label>{t("admin.meetups.meetupTitle")}</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("admin.meetups.t17", "유형")}</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({...p, type: v as any}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meetup">{t("admin.meetups.t18", "밋업")}</SelectItem>
                    <SelectItem value="pre_visit">{t("admin.meetups.t19", "사전방문")}</SelectItem>
                    <SelectItem value="event">{t("admin.meetups.t20", "이벤트")}</SelectItem>
                    <SelectItem value="meeting">{t("admin.meetups.t21", "미팅")}</SelectItem>
                    <SelectItem value="other">{t("admin.meetups.t22", "기타")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("admin.meetups.t23", "구분")}</Label>
                <Select value={form.locationType} onValueChange={v => setForm(p => ({...p, locationType: v as any}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domestic">{t("admin.meetups.t24", "내륙")}</SelectItem>
                    <SelectItem value="overseas">{t("admin.meetups.t25", "해외")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("admin.meetups.t26", "목적지 국가")}</Label>
                <Input
                  value={form.destinationCountry}
                  onChange={e => setForm(p => ({...p, destinationCountry: e.target.value}))}
                  placeholder={t("admin.meetups.t45", "예: TH, JP, CN")}
                />
              </div>
              <div>
                <Label>{t("admin.meetups.t27", "장소")}</Label>
                <Input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} placeholder={t("admin.meetups.t46", "예: Bangkok, Thailand")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("admin.meetups.startDate")}</Label><Input type="date" value={form.scheduleStart} onChange={e => setForm(p => ({...p, scheduleStart: e.target.value}))} /></div>
              <div><Label>{t("admin.meetups.endDate")}</Label><Input type="date" value={form.scheduleEnd} onChange={e => setForm(p => ({...p, scheduleEnd: e.target.value}))} /></div>
            </div>
            <div>
              <Label>{t("admin.meetups.t28", "최대 참석자 수")}</Label>
              <Input type="number" value={form.maxParticipants || ""} onChange={e => setForm(p => ({...p, maxParticipants: parseInt(e.target.value) || 0}))} placeholder={t("admin.meetups.t47", "0 = 제한없음")} />
            </div>
            <div><Label>{t("admin.meetups.description")}</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3} /></div>
            {/* 공개 설정 */}
            <div>
              <Label className="flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" />{t("admin.meetups.visibility", "공개 설정")}</Label>
              <Select value={form.visibility} onValueChange={v => setForm(p => ({...p, visibility: v as any}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">{t("admin.meetups.visibility_public", "공개 - 누구나 검색/조회 가능")}</SelectItem>
                  <SelectItem value="referral_only">{t("admin.meetups.visibility_referral", "추천코드 전용 - 링크/코드로만 접근")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{t("admin.meetups.visibility_desc", "공개 밋업은 홈 화면 검색에 노출됩니다.")}</p>
            </div>
            {/* 수화물 공지 */}
            <div>
              <Label className="flex items-center gap-2"><Luggage className="h-4 w-4 text-amber-500" />{t("admin.meetups.t29", "수화물 공지")}</Label>
              <Textarea
                value={form.baggageNotice}
                onChange={e => setForm(p => ({...p, baggageNotice: e.target.value}))}
                placeholder={t("admin.meetups.t48", "초과화물은 직접부담할 수 있습니다.")}
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">{t("admin.meetups.t30", "신청 페이지에 표시될 수화물 안내 문구입니다.")}</p>
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              밋업 생성
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!qrMeetup} onOpenChange={open => { if (!open) setQrMeetup(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            {t("admin.meetups.t31", "QR 코드 - 밋업 초대장")}
          </DialogTitle></DialogHeader>
          {qrMeetup && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-2xl shadow-lg" id="qr-container">
                <QRCodeSVG
                  value={`${window.location.origin}/m/${qrMeetup.shareToken}`}
                  size={220}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#1a1a2e"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-sm">{qrMeetup.title}</p>
                {qrMeetup.projectCode && (
                  <Badge variant="secondary" className="text-[10px] font-mono">#{qrMeetup.projectCode}</Badge>
                )}
                <p className="text-[11px] text-muted-foreground font-mono">
                  {window.location.origin}/m/{qrMeetup.shareToken}
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/m/${qrMeetup.shareToken}`);
                    toast.success(t("admin.meetups.t43", "URL이 복사되었습니다"));
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t("admin.meetups.t32", "URL 복사")}
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    const svg = document.querySelector('#qr-container svg');
                    if (!svg) return;
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const canvas = document.createElement('canvas');
                    canvas.width = 440; canvas.height = 440;
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    img.onload = () => {
                      ctx?.drawImage(img, 0, 0, 440, 440);
                      const a = document.createElement('a');
                      a.download = `meetup-qr-${qrMeetup.projectCode || qrMeetup.id}.png`;
                      a.href = canvas.toDataURL('image/png');
                      a.click();
                      toast.success(t("admin.meetups.t44", "QR 코드 다운로드 완료"));
                    };
                    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("admin.meetups.t33", "PNG 다운로드")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Meetup Dialog */}
      <Dialog open={!!editMeetup} onOpenChange={open => { if (!open) setEditMeetup(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            {t("admin.meetups.editMeetupTitle", "밋업 정보 수정")}
          </DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (!editMeetup) return;
            updateMutation.mutate({
              id: editMeetup.id,
              title: editForm.title || undefined,
              type: editForm.type || undefined,
              locationType: editForm.locationType || undefined,
              destinationCountry: editForm.destinationCountry || undefined,
              location: editForm.location || undefined,
              description: editForm.description || undefined,
              scheduleStart: editForm.scheduleStart || undefined,
              scheduleEnd: editForm.scheduleEnd || undefined,
              maxParticipants: editForm.maxParticipants || undefined,
              baggageNotice: editForm.baggageNotice || undefined,
              visibility: editForm.visibility,
            });
            setEditMeetup(null);
          }} className="space-y-4">
            <div><Label>{t("admin.meetups.meetupTitle")}</Label><Input value={editForm.title} onChange={e => setEditForm(p => ({...p, title: e.target.value}))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("admin.meetups.t17", "유형")}</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm(p => ({...p, type: v as any}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meetup">{t("admin.meetups.t18", "밋업")}</SelectItem>
                    <SelectItem value="pre_visit">{t("admin.meetups.t19", "사전방문")}</SelectItem>
                    <SelectItem value="event">{t("admin.meetups.t20", "이벤트")}</SelectItem>
                    <SelectItem value="meeting">{t("admin.meetups.t21", "미팅")}</SelectItem>
                    <SelectItem value="other">{t("admin.meetups.t22", "기타")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("admin.meetups.t23", "구분")}</Label>
                <Select value={editForm.locationType} onValueChange={v => setEditForm(p => ({...p, locationType: v as any}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domestic">{t("admin.meetups.t24", "내륙")}</SelectItem>
                    <SelectItem value="overseas">{t("admin.meetups.t25", "해외")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("admin.meetups.t26", "목적지 국가")}</Label>
                <Input value={editForm.destinationCountry} onChange={e => setEditForm(p => ({...p, destinationCountry: e.target.value}))} placeholder="예: TH, JP, CN" />
              </div>
              <div>
                <Label>{t("admin.meetups.t27", "장소")}</Label>
                <Input value={editForm.location} onChange={e => setEditForm(p => ({...p, location: e.target.value}))} placeholder="예: Bangkok, Thailand" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("admin.meetups.startDate")}</Label><Input type="date" value={editForm.scheduleStart} onChange={e => setEditForm(p => ({...p, scheduleStart: e.target.value}))} /></div>
              <div><Label>{t("admin.meetups.endDate")}</Label><Input type="date" value={editForm.scheduleEnd} onChange={e => setEditForm(p => ({...p, scheduleEnd: e.target.value}))} /></div>
            </div>
            <div>
              <Label className="flex items-center gap-2"><Users className="h-4 w-4" />{t("admin.meetups.t28", "최대 참석자 수")}</Label>
              <Input type="number" value={editForm.maxParticipants || ""} onChange={e => setEditForm(p => ({...p, maxParticipants: parseInt(e.target.value) || 0}))} placeholder="0 = 제한없음" />
            </div>
            <div><Label>{t("admin.meetups.description")}</Label><Textarea value={editForm.description} onChange={e => setEditForm(p => ({...p, description: e.target.value}))} rows={3} /></div>
            <div>
              <Label className="flex items-center gap-2"><Luggage className="h-4 w-4 text-amber-500" />{t("admin.meetups.t29", "수화물 공지")}</Label>
              <Textarea value={editForm.baggageNotice} onChange={e => setEditForm(p => ({...p, baggageNotice: e.target.value}))} rows={2} />
            </div>
            {/* 공개 설정 */}
            <div>
              <Label className="flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" />{t("admin.meetups.visibility", "공개 설정")}</Label>
              <Select value={editForm.visibility} onValueChange={v => setEditForm(p => ({...p, visibility: v as any}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">{t("admin.meetups.visibility_public", "공개 - 누구나 검색/조회 가능")}</SelectItem>
                  <SelectItem value="referral_only">{t("admin.meetups.visibility_referral", "추천코드 전용 - 링크/코드로만 접근")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditMeetup(null)}>{t("admin.meetups.t36", "취소")}</Button>
              <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
                {t("admin.meetups.saveChanges", "변경 저장")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Meetup Dialog */}
      <Dialog open={!!cancelMeetup} onOpenChange={open => { if (!open) setCancelMeetup(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            밋업 취소
          </DialogTitle></DialogHeader>
          {cancelMeetup && (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-sm font-medium mb-1">"{cancelMeetup.title}" 밋업을 취소하시겠습니까?</p>
                <p className="text-xs text-muted-foreground">취소 시 공지 채널에 자동으로 취소 안내 메시지가 전송됩니다.</p>
              </div>
              <div>
                <Label>취소 사유 (선택)</Label>
                <Textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="취소 사유를 입력하세요..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCancelMeetup(null)}>돌아가기</Button>
                <Button
                  variant="destructive" className="flex-1"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate({ id: cancelMeetup.id, reason: cancelReason || undefined })}
                >
                  {cancelMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  밋업 취소 확인
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Announcement Dialog */}
      <Dialog open={!!announceMeetup} onOpenChange={open => { if (!open) setAnnounceMeetup(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-blue-500">
            <Megaphone className="h-5 w-5" />
            참가자에게 공지 보내기
          </DialogTitle></DialogHeader>
          {announceMeetup && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">대상 밋업</p>
                <p className="text-sm font-medium">{announceMeetup.title}</p>
              </div>
              <div>
                <Label>공지 제목</Label>
                <Input
                  value={announceTitle}
                  onChange={e => setAnnounceTitle(e.target.value)}
                  placeholder="예: 일정 변경 안내"
                />
              </div>
              <div>
                <Label>공지 내용</Label>
                <Textarea
                  value={announceContent}
                  onChange={e => setAnnounceContent(e.target.value)}
                  placeholder="참가자들에게 전달할 공지 내용을 입력하세요..."
                  rows={5}
                />
              </div>
              <p className="text-xs text-muted-foreground">공지 채널과 텔레그램으로 동시에 전송됩니다.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAnnounceMeetup(null)}>취소</Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={announceMutation.isPending || !announceTitle.trim() || !announceContent.trim()}
                  onClick={() => announceMutation.mutate({ meetupId: announceMeetup.id, title: announceTitle, content: announceContent })}
                >
                  {announceMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
                  공지 전송
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clone Meetup Dialog */}
      <Dialog open={!!cloneMeetup} onOpenChange={open => { if (!open) setCloneMeetup(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <CopyPlus className="h-5 w-5 text-emerald-500" />
            밋업 복제
          </DialogTitle></DialogHeader>
          {cloneMeetup && (
            <form onSubmit={e => {
              e.preventDefault();
              createMutation.mutate({
                title: cloneForm.title,
                type: cloneMeetup.type,
                locationType: cloneMeetup.locationType,
                destinationCountry: cloneMeetup.destinationCountry || "",
                location: cloneMeetup.location || "",
                description: cloneMeetup.description || "",
                scheduleStart: cloneForm.scheduleStart || undefined,
                scheduleEnd: cloneForm.scheduleEnd || undefined,
                maxParticipants: cloneMeetup.maxParticipants || 0,
                baggageNotice: cloneMeetup.baggageNotice || "초과화물은 직접부담할 수 있습니다.",
                invitedCountries: cloneMeetup.invitedCountries || [],
              }, {
                onSuccess: () => {
                  setCloneMeetup(null);
                  toast.success("밋업이 복제되었습니다!");
                },
              });
            }} className="space-y-4">
              <div>
                <Label>밋업 제목</Label>
                <Input value={cloneForm.title} onChange={e => setCloneForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>시작일</Label>
                  <Input type="date" value={cloneForm.scheduleStart} onChange={e => setCloneForm(p => ({ ...p, scheduleStart: e.target.value }))} />
                </div>
                <div>
                  <Label>종료일</Label>
                  <Input type="date" value={cloneForm.scheduleEnd} onChange={e => setCloneForm(p => ({ ...p, scheduleEnd: e.target.value }))} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">기존 밋업의 유형, 장소, 설명, 수화물 공지, 초청국가가 그대로 복사됩니다.</p>
              <div className="flex gap-2">
                <Button variant="outline" type="button" className="flex-1" onClick={() => setCloneMeetup(null)}>취소</Button>
                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CopyPlus className="h-4 w-4 mr-2" />}
                  복제 생성
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* SNS Share Dialog */}
      <Dialog open={!!shareMeetup} onOpenChange={open => { if (!open) setShareMeetup(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            초대장 공유
          </DialogTitle></DialogHeader>
          {shareMeetup && (() => {
            const shareUrl = `${window.location.origin}/m/${shareMeetup.shareToken}`;
            const shareText = `${shareMeetup.title}\n${shareMeetup.location || ""}\n${shareMeetup.scheduleStart ? new Date(shareMeetup.scheduleStart).toLocaleDateString("ko-KR") : ""}${shareMeetup.scheduleEnd ? " ~ " + new Date(shareMeetup.scheduleEnd).toLocaleDateString("ko-KR") : ""}\n\n신청하기: ${shareUrl}`;
            return (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-semibold">{shareMeetup.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{shareMeetup.location}</p>
                  <p className="text-xs text-muted-foreground">{shareMeetup.scheduleStart ? new Date(shareMeetup.scheduleStart).toLocaleDateString("ko-KR") : ""}{shareMeetup.scheduleEnd ? " ~ " + new Date(shareMeetup.scheduleEnd).toLocaleDateString("ko-KR") : ""}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline" className="h-12 gap-2 text-sm"
                    onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMeetup.title)}`, "_blank")}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#0088cc"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    Telegram
                  </Button>
                  <Button
                    variant="outline" className="h-12 gap-2 text-sm"
                    onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank")}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline" className="h-12 gap-2 text-sm"
                    onClick={() => window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`, "_blank")}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#00B900"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                    LINE
                  </Button>
                  <Button
                    variant="outline" className="h-12 gap-2 text-sm"
                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank")}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    X (Twitter)
                  </Button>
                </div>
                <Button
                  variant="secondary" className="w-full gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("링크가 복사되었습니다!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                  링크 복사
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Baggage Notice Dialog */}
      <Dialog open={editBaggageId !== null} onOpenChange={open => { if (!open) setEditBaggageId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Luggage className="h-5 w-5 text-amber-500" />{t("admin.meetups.t34", "수화물 공지 수정")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editBaggageText}
              onChange={e => setEditBaggageText(e.target.value)}
              placeholder={t("admin.meetups.t49", "수화물 관련 공지사항을 입력하세요")}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{t("admin.meetups.t35", "참석자 신청 페이지에 표시되는 수화물 안내 문구입니다.")}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditBaggageId(null)}>{t("admin.meetups.t36", "취소")}</Button>
              <Button className="flex-1" onClick={() => {
                if (editBaggageId) {
                  updateMutation.mutate({ id: editBaggageId, baggageNotice: editBaggageText });
                  setEditBaggageId(null);
                }
              }}>{t("admin.meetups.t37", "저장")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
