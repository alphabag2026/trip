import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, RefreshCw, Check, X, Trash2, Eye, Plane, Hotel, Calendar, Truck, HelpCircle, FileText, Bot, Send, MessageSquare, Users, BarChart3, Search, Image, Bell, BellRing, Settings, Shield, Edit, Save, Plus, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "대기중", color: "bg-yellow-500/20 text-yellow-400" },
  parsed: { label: "파싱완료", color: "bg-blue-500/20 text-blue-400" },
  approved: { label: "승인됨", color: "bg-green-500/20 text-green-400" },
  applied: { label: "적용됨", color: "bg-emerald-500/20 text-emerald-400" },
  rejected: { label: "거절됨", color: "bg-red-500/20 text-red-400" },
};

const TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  flight: { label: "항공편", icon: Plane, color: "text-blue-400" },
  hotel: { label: "숙소", icon: Hotel, color: "text-purple-400" },
  schedule: { label: "일정", icon: Calendar, color: "text-orange-400" },
  transfer: { label: "교통", icon: Truck, color: "text-green-400" },
  register_participants: { label: "참가자 등록", icon: Users, color: "text-cyan-400" },
  list_meetups: { label: "밋업 조회", icon: FileText, color: "text-indigo-400" },
  list_participants: { label: "참가자 조회", icon: Users, color: "text-teal-400" },
  get_stats: { label: "통계", icon: BarChart3, color: "text-pink-400" },
  search: { label: "검색", icon: Search, color: "text-amber-400" },
  assign_flight: { label: "항공편 배정", icon: Plane, color: "text-sky-400" },
  assign_hotel: { label: "숙소 배정", icon: Hotel, color: "text-violet-400" },
  ocr_passport: { label: "여권 OCR", icon: Image, color: "text-rose-400" },
  travel_info: { label: "여행정보", icon: FileText, color: "text-lime-400" },
  general: { label: "일반", icon: FileText, color: "text-gray-400" },
  unknown: { label: "미분류", icon: HelpCircle, color: "text-gray-500" },
  help: { label: "도움말", icon: HelpCircle, color: "text-gray-400" },
};

export default function TelegramUploads() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedUpload, setSelectedUpload] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [meetupIdInput, setMeetupIdInput] = useState("");
  const [activeTab, setActiveTab] = useState("notifications");

  // Settings state
  const [newTelegramId, setNewTelegramId] = useState("");
  const [newTelegramName, setNewTelegramName] = useState("");

  // OCR Review state
  const [editingOcr, setEditingOcr] = useState<any>(null);
  const [ocrEditData, setOcrEditData] = useState<any>({});

  // Queries
  const { data: uploads, refetch } = trpc.telegramUpload.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    parsedType: typeFilter !== "all" ? typeFilter : undefined,
  });
  const { data: stats } = trpc.telegramUpload.stats.useQuery();
  const { data: meetups } = trpc.meetup.list.useQuery();
  const { data: notifications, refetch: refetchNotifications } = trpc.telegramUpload.notifications.useQuery({ unreadOnly: false, limit: 50 });
  const { data: unreadCountData, refetch: refetchUnreadCount } = trpc.telegramUpload.unreadCount.useQuery();
  const { data: telegramConfig, refetch: refetchConfig } = trpc.telegramUpload.getConfig.useQuery();

  // Auto-refresh notifications every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchNotifications();
      refetchUnreadCount();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Mutations
  const reparseMutation = trpc.telegramUpload.reparse.useMutation({
    onSuccess: () => { toast.success("재파싱 완료"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const approveMutation = trpc.telegramUpload.approve.useMutation({
    onSuccess: (r: any) => { toast.success(`승인 완료 (${r.appliedToTable})`); setSelectedUpload(null); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const rejectMutation = trpc.telegramUpload.reject.useMutation({
    onSuccess: () => { toast.success("거절 완료"); setSelectedUpload(null); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.telegramUpload.delete.useMutation({
    onSuccess: () => { toast.success("삭제 완료"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const markReadMutation = trpc.telegramUpload.markNotificationsRead.useMutation({
    onSuccess: () => { refetchNotifications(); refetchUnreadCount(); },
  });
  const markAllReadMutation = trpc.telegramUpload.markAllNotificationsRead.useMutation({
    onSuccess: () => { refetchNotifications(); refetchUnreadCount(); toast.success("모든 알림을 읽음 처리했습니다"); },
  });
  const saveConfigMutation = trpc.telegramUpload.updateConfig.useMutation({
    onSuccess: () => { toast.success("설정 저장 완료"); refetchConfig(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateOcrMutation = trpc.telegramUpload.updateParsedData.useMutation({
    onSuccess: () => { toast.success("OCR 결과 수정 완료"); setEditingOcr(null); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  // OCR pending items
  const ocrPendingItems = useMemo(() => {
    return (uploads || []).filter((u: any) =>
      u.parsedType === "ocr_passport" && (u.status === "parsed" || u.status === "pending")
    );
  }, [uploads]);

  // Allowed telegram IDs
  const allowedIds = useMemo(() => {
    try {
      return JSON.parse(telegramConfig?.allowedTelegramIds || "[]");
    } catch { return []; }
  }, [telegramConfig]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-400" />
            텔레그램 AI 명령 센터
          </h1>
          <p className="text-muted-foreground mt-1">텔레그램에서 자연어로 전송된 명령을 AI가 자동으로 분석하고 실행합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { refetch(); refetchNotifications(); refetchUnreadCount(); }} size="sm">
            <RefreshCw className="h-4 w-4 mr-1" /> 새로고침
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "전체", value: stats.total, color: "text-foreground" },
            { label: "대기중", value: stats.pending, color: "text-yellow-400" },
            { label: "파싱완료", value: stats.parsed, color: "text-blue-400" },
            { label: "승인됨", value: stats.approved, color: "text-green-400" },
            { label: "적용됨", value: stats.applied, color: "text-emerald-400" },
            { label: "거절됨", value: stats.rejected, color: "text-red-400" },
          ].map((s) => (
            <Card key={s.label} className="bg-card/50">
              <CardContent className="p-3 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="notifications" className="gap-1 relative">
            <BellRing className="h-4 w-4" /> 실시간 알림
            {(unreadCountData?.count || 0) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCountData?.count}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ocr-review" className="gap-1 relative">
            <Image className="h-4 w-4" /> OCR 확인/수정
            {ocrPendingItems.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {ocrPendingItems.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <MessageSquare className="h-4 w-4" /> 명령 이력
          </TabsTrigger>
          <TabsTrigger value="admin-ids" className="gap-1">
            <Shield className="h-4 w-4" /> 관리자 ID
          </TabsTrigger>
          <TabsTrigger value="commands" className="gap-1">
            <Bot className="h-4 w-4" /> 사용 가능 명령
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <Settings className="h-4 w-4" /> 봇 설정
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-1">
            <HelpCircle className="h-4 w-4" /> 등록 가이드
          </TabsTrigger>
        </TabsList>

        {/* ═══ Notifications Tab ═══ */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5" /> 실시간 푸시 알림
              {(unreadCountData?.count || 0) > 0 && <Badge variant="destructive">{unreadCountData?.count}개 읽지 않음</Badge>}
            </h3>
            {(unreadCountData?.count || 0) > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()}>
                <Check className="h-4 w-4 mr-1" /> 모두 읽음
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {!notifications || notifications.length === 0 ? (
              <Card className="bg-card/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>아직 알림이 없습니다</p>
                  <p className="text-xs mt-1">텔레그램에서 명령을 보내면 여기에 실시간으로 표시됩니다</p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((notif: any) => (
                <Card
                  key={notif.id}
                  className={`bg-card/50 transition-all cursor-pointer hover:bg-card/80 ${!notif.isRead ? "border-l-4 border-l-blue-500" : "opacity-70"}`}
                  onClick={() => {
                    if (!notif.isRead) {
                      markReadMutation.mutate({ ids: [notif.id] });
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-full ${
                        notif.type === "success" ? "bg-green-500/20 text-green-400" :
                        notif.type === "warning" ? "bg-amber-500/20 text-amber-400" :
                        notif.type === "error" ? "bg-red-500/20 text-red-400" :
                        "bg-blue-500/20 text-blue-400"
                      }`}>
                        {notif.type === "success" ? <Check className="h-4 w-4" /> :
                         notif.type === "warning" ? <AlertTriangle className="h-4 w-4" /> :
                         notif.type === "error" ? <X className="h-4 w-4" /> :
                         <Bell className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{notif.title}</span>
                          {!notif.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{notif.message}</p>
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          {new Date(notif.createdAt).toLocaleString("ko-KR")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ═══ OCR Review Tab ═══ */}
        <TabsContent value="ocr-review" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Image className="h-5 w-5" /> OCR 분석 결과 확인/수정
            </h3>
            <Badge variant="outline">{ocrPendingItems.length}건 대기중</Badge>
          </div>

          {ocrPendingItems.length === 0 ? (
            <Card className="bg-card/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>확인 대기중인 OCR 결과가 없습니다</p>
                <p className="text-xs mt-1">텔레그램으로 여권/항공권 이미지를 보내면 여기에 표시됩니다</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {ocrPendingItems.map((item: any) => (
                <Card key={item.id} className="bg-card/50 border-l-4 border-l-amber-500">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {item.rawFileUrl && (
                        <div className="shrink-0">
                          <img
                            src={item.rawFileUrl}
                            alt="OCR 이미지"
                            className="w-32 h-40 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(item.rawFileUrl, "_blank")}
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-500/20 text-amber-400">OCR 대기</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleString("ko-KR")}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {item.uploadedBy || "알 수 없음"}
                          </span>
                        </div>

                        {item.parsedData && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            {item.parsedData.name && (
                              <div><span className="text-xs text-muted-foreground">이름</span><p className="font-medium">{item.parsedData.name}</p></div>
                            )}
                            {item.parsedData.passportNumber && (
                              <div><span className="text-xs text-muted-foreground">여권번호</span><p className="font-medium">{item.parsedData.passportNumber}</p></div>
                            )}
                            {item.parsedData.nationality && (
                              <div><span className="text-xs text-muted-foreground">국적</span><p className="font-medium">{item.parsedData.nationality}</p></div>
                            )}
                            {item.parsedData.birthDate && (
                              <div><span className="text-xs text-muted-foreground">생년월일</span><p className="font-medium">{item.parsedData.birthDate}</p></div>
                            )}
                            {item.parsedData.expiryDate && (
                              <div><span className="text-xs text-muted-foreground">만료일</span><p className="font-medium">{item.parsedData.expiryDate}</p></div>
                            )}
                            {item.parsedData.gender && (
                              <div><span className="text-xs text-muted-foreground">성별</span><p className="font-medium">{item.parsedData.gender}</p></div>
                            )}
                            {item.parsedData.flightNo && (
                              <div><span className="text-xs text-muted-foreground">항공편</span><p className="font-medium">{item.parsedData.flightNo}</p></div>
                            )}
                            {item.parsedData.departure && (
                              <div><span className="text-xs text-muted-foreground">출발</span><p className="font-medium">{item.parsedData.departure}</p></div>
                            )}
                            {item.parsedData.arrival && (
                              <div><span className="text-xs text-muted-foreground">도착</span><p className="font-medium">{item.parsedData.arrival}</p></div>
                            )}
                          </div>
                        )}

                        {item.parsedSummary && (
                          <p className="text-xs text-muted-foreground bg-background/50 rounded p-2">{item.parsedSummary}</p>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingOcr(item);
                              setOcrEditData(item.parsedData || {});
                            }}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" /> 수정
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setMeetupIdInput("");
                              setReviewNotes("");
                              setSelectedUpload(item);
                            }}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> 승인 & 적용
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("이 OCR 결과를 거절하시겠습니까?")) {
                                rejectMutation.mutate({ id: item.id });
                              }
                            }}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> 거절
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ History Tab ═══ */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="상태 필터" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="parsed">파싱완료</SelectItem>
                <SelectItem value="approved">승인됨</SelectItem>
                <SelectItem value="applied">적용됨</SelectItem>
                <SelectItem value="rejected">거절됨</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="유형 필터" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유형</SelectItem>
                <SelectItem value="flight">항공편</SelectItem>
                <SelectItem value="hotel">숙소</SelectItem>
                <SelectItem value="register_participants">참가자 등록</SelectItem>
                <SelectItem value="ocr_passport">여권 OCR</SelectItem>
                <SelectItem value="assign_flight">항공편 배정</SelectItem>
                <SelectItem value="assign_hotel">숙소 배정</SelectItem>
                <SelectItem value="get_stats">통계</SelectItem>
                <SelectItem value="search">검색</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {!uploads || uploads.length === 0 ? (
              <Card className="bg-card/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>명령 이력이 없습니다</p>
                </CardContent>
              </Card>
            ) : (
              uploads.map((upload: any) => {
                const typeInfo = TYPE_MAP[upload.parsedType] || TYPE_MAP.unknown;
                const statusInfo = STATUS_MAP[upload.status] || STATUS_MAP.pending;
                const TypeIcon = typeInfo.icon;
                return (
                  <Card key={upload.id} className="bg-card/50 hover:bg-card/80 transition-all cursor-pointer" onClick={() => { setSelectedUpload(upload); setReviewNotes(""); setMeetupIdInput(""); }}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-background/50 ${typeInfo.color}`}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] ${typeInfo.color}`}>{typeInfo.label}</Badge>
                            <Badge variant="outline" className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
                            {upload.parsedConfidence && <span className="text-[10px] text-muted-foreground">{upload.parsedConfidence}%</span>}
                          </div>
                          <p className="text-sm mt-1 truncate">{upload.parsedSummary || upload.rawText?.substring(0, 80) || "(이미지)"}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{upload.uploadedBy || "알 수 없음"}</span>
                            <span>{new Date(upload.createdAt).toLocaleString("ko-KR")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); reparseMutation.mutate({ id: upload.id }); }}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={(e) => { e.stopPropagation(); if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: upload.id }); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ═══ Admin IDs Tab ═══ */}
        <TabsContent value="admin-ids" className="space-y-4">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-400" /> 허용된 관리자 텔레그램 ID
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-500/10 rounded-lg p-4 text-sm">
                <p className="text-muted-foreground">
                  여기에 등록된 텔레그램 ID만 봇 명령을 실행할 수 있습니다.
                  텔레그램에서 <code className="bg-background/50 px-1 rounded">@userinfobot</code>에게 메시지를 보내면 자신의 ID를 확인할 수 있습니다.
                </p>
              </div>

              <div className="space-y-2">
                {allowedIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    등록된 관리자 ID가 없습니다. (모든 사용자가 접근 가능)
                  </p>
                ) : (
                  allowedIds.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-background/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.name || "이름 없음"}</p>
                          <p className="text-xs text-muted-foreground">ID: {item.id}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400"
                        onClick={() => {
                          const updated = allowedIds.filter((_: any, i: number) => i !== idx);
                          saveConfigMutation.mutate({
                            allowedTelegramIds: JSON.stringify(updated),
                          });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">새 관리자 추가</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="텔레그램 ID (숫자)"
                    value={newTelegramId}
                    onChange={(e) => setNewTelegramId(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="이름 (선택)"
                    value={newTelegramName}
                    onChange={(e) => setNewTelegramName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      if (!newTelegramId.trim()) { toast.error("텔레그램 ID를 입력하세요"); return; }
                      const updated = [...allowedIds, { id: newTelegramId.trim(), name: newTelegramName.trim() || `관리자 ${allowedIds.length + 1}` }];
                      saveConfigMutation.mutate({
                        allowedTelegramIds: JSON.stringify(updated),
                      });
                      setNewTelegramId("");
                      setNewTelegramName("");
                    }}
                    disabled={saveConfigMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" /> 추가
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Commands Tab ═══ */}
        <TabsContent value="commands" className="space-y-4">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">AI 자연어 명령 가이드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm text-blue-400 mb-2">참가자 관리</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• "김철수 M12345678 KOR 1990-01-01 남 만료 2030-12-31 등록해줘"</p>
                  <p>• "참가자 목록 보여줘"</p>
                  <p>• "김철수 검색해줘"</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-indigo-400 mb-2">밋업 관리</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• "밋업 목록 보여줘"</p>
                  <p>• "하롱베이 2140 Xplay 행사 5/10~5/13 생성해줘"</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-sky-400 mb-2">항공편/숙소</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• "아시아나항공 OZ733 ICN-HAN 08:00-10:50 등록해줘"</p>
                  <p>• "Grand Plaza 호텔 5/10~5/13 배정해줘"</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-pink-400 mb-2">통계/현황</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• "현황 알려줘" / "통계 보여줘"</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-rose-400 mb-2">이미지 분석</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• 여권/항공권 사진 전송 → 자동 OCR 분석 → 백오피스에서 확인/수정 후 적용</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-lime-400 mb-2">프롬프트 일괄 등록</h3>
                <pre className="bg-background/50 rounded p-2 mt-1 text-xs text-muted-foreground">
{`하롱베이 2140 Xplay 행사 박석봉팀 5월 10일부터 5월 13일까지
항공: 아시아나항공 OZ733 ICN→HAN 08:00-10:50
참가자:
김철수 M99731754 KOR 1959-02-10 남 만료 2027-06-28`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Guide Tab ═══ */}
        <TabsContent value="guide" className="space-y-4">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-400" />
                텔레그램 봇 등록 가이드
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-5 border border-blue-500/20">
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                  텔레그램에서 봇 생성
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>텔레그램 앱을 열고 검색창에 <code className="bg-background/80 px-1.5 py-0.5 rounded text-blue-400">@BotFather</code> 를 검색합니다</li>
                  <li>BotFather와 대화를 시작하고 <code className="bg-background/80 px-1.5 py-0.5 rounded text-blue-400">/newbot</code> 명령어를 입력합니다</li>
                  <li>봇 이름을 입력합니다 (예: <span className="text-foreground">Alpha Trip Bot</span>)</li>
                  <li>봇 username을 입력합니다 (예: <span className="text-foreground">alphatrip_bot</span>) — 반드시 <code className="text-amber-400">_bot</code>으로 끝나야 합니다</li>
                  <li>BotFather가 <span className="text-green-400 font-medium">API Token</span>을 발급해줍니다</li>
                </ol>
                <div className="mt-3 bg-background/50 rounded-lg p-3 text-xs font-mono text-muted-foreground">
                  토큰 형태 예시: <span className="text-green-400">8111456656:AAGpeiLmG2GW2aXBqg3Q_HTTWw4GMcFir4U</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-5 border border-purple-500/20">
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                  봇 토큰 등록
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>위의 <span className="text-foreground font-medium">"봇 설정"</span> 탭으로 이동합니다</li>
                  <li><span className="text-foreground font-medium">"변경"</span> 버튼을 클릭합니다</li>
                  <li>BotFather에서 발급받은 토큰을 붙여넣기 합니다</li>
                  <li>봇 활성화 스위치를 켭니다</li>
                </ol>
              </div>

              {/* Step 3 */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-5 border border-green-500/20">
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                  관리자 텔레그램 ID 등록
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>텔레그램에서 <code className="bg-background/80 px-1.5 py-0.5 rounded text-blue-400">@userinfobot</code> 을 검색합니다</li>
                  <li><code className="bg-background/80 px-1.5 py-0.5 rounded text-blue-400">/start</code> 를 보내면 본인의 숫자 ID가 표시됩니다</li>
                  <li>위의 <span className="text-foreground font-medium">"관리자 ID"</span> 탭으로 이동합니다</li>
                  <li>본인의 텔레그램 숫자 ID를 등록합니다</li>
                </ol>
                <div className="mt-3 bg-background/50 rounded-lg p-3 text-xs">
                  <span className="text-muted-foreground">ID 예시:</span> <span className="text-green-400 font-mono">8250367913</span>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-5 border border-amber-500/20">
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <span className="bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                  Webhook 설정 (자동)
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  봇 토큰을 등록하면 Webhook이 자동으로 설정됩니다. 수동으로 설정하려면:
                </p>
                <div className="bg-background/50 rounded-lg p-3 text-xs font-mono break-all">
                  <span className="text-muted-foreground">URL:</span> <span className="text-amber-400">{window.location.origin}/api/telegram/webhook</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  또는 브라우저에서 아래 URL을 방문하세요:
                </p>
                <div className="bg-background/50 rounded-lg p-3 text-xs font-mono break-all mt-1">
                  <span className="text-cyan-400">https://api.telegram.org/bot[토큰]/setWebhook?url={window.location.origin}/api/telegram/webhook</span>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-xl p-5 border border-teal-500/20">
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <span className="bg-teal-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">5</span>
                  사용 시작
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  모든 설정이 완료되면 텔레그램에서 봇에게 메시지를 보내 테스트합니다:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="bg-background/50 rounded-lg p-3">
                    <span className="text-muted-foreground">텍스트 명령:</span>
                    <p className="text-foreground mt-1 font-mono text-xs">"방콕 밋업 참가자 목록 보여줘"</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <span className="text-muted-foreground">이미지 전송:</span>
                    <p className="text-foreground mt-1 font-mono text-xs">여권/항공권 사진 → 자동 OCR</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <span className="text-muted-foreground">참가자 등록:</span>
                    <p className="text-foreground mt-1 font-mono text-xs">"홍길동 010-1234-5678 방콕 밋업 등록"</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <span className="text-muted-foreground">통계 조회:</span>
                    <p className="text-foreground mt-1 font-mono text-xs">"현재 밋업 현황 알려줘"</p>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" /> 주의사항
                </h4>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  <li>봇 토큰은 절대 외부에 공유하지 마세요</li>
                  <li>관리자 ID에 등록된 사용자만 봇 명령을 사용할 수 있습니다</li>
                  <li>OCR 결과는 백오피스에서 최종 확인 후 적용됩니다</li>
                  <li>봇이 응답하지 않으면 Webhook URL이 올바른지 확인하세요</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Settings Tab ═══ */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">텔레그램 봇 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">봇 활성화</label>
                  <div className="flex items-center gap-3 mt-1">
                    <Switch
                      checked={telegramConfig?.enabled || false}
                      onCheckedChange={(checked) => saveConfigMutation.mutate({ enabled: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {telegramConfig?.enabled ? "활성화됨" : "비활성화됨"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">봇 토큰</label>
                  <p className="text-xs text-muted-foreground mb-1">@BotFather에서 발급받은 토큰</p>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={telegramConfig?.botToken || ""}
                      placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                      readOnly
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={() => {
                      const token = prompt("새 봇 토큰을 입력하세요:");
                      if (token) saveConfigMutation.mutate({ botToken: token });
                    }}>
                      변경
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">웹훅 URL</label>
                  <p className="text-xs text-muted-foreground mb-1">텔레그램이 메시지를 전달할 URL</p>
                  <Input
                    value={telegramConfig?.webhookUrl || `${window.location.origin}/api/telegram/webhook`}
                    readOnly
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-4 text-sm mt-4">
                <h4 className="font-semibold mb-2">설정 방법</h4>
                <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                  <li>@BotFather에서 봇 생성 후 토큰 발급</li>
                  <li>위에 봇 토큰 입력</li>
                  <li>관리자 ID 탭에서 허용할 텔레그램 ID 등록</li>
                  <li>봇에 메시지 전송하면 자동 처리 시작</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ Detail Dialog ═══ */}
      <Dialog open={!!selectedUpload} onOpenChange={(open) => !open && setSelectedUpload(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>명령 상세 정보</DialogTitle>
          </DialogHeader>
          {selectedUpload && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">유형</label>
                  <Badge variant="outline">{TYPE_MAP[selectedUpload.parsedType]?.label || "미분류"}</Badge>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">보낸 사람</label>
                  <p className="text-sm">{selectedUpload.uploadedBy || "알 수 없음"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">신뢰도</label>
                  <p className="text-sm">{selectedUpload.parsedConfidence}%</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">원본 텍스트</label>
                <div className="bg-background/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedUpload.rawText || "(없음)"}
                </div>
              </div>
              {selectedUpload.rawFileUrl && (
                <div>
                  <label className="text-xs text-muted-foreground">첨부 파일</label>
                  <div className="mt-1">
                    {selectedUpload.rawFileType === "photo" || selectedUpload.rawFileType === "image" ? (
                      <img src={selectedUpload.rawFileUrl} alt="첨부 이미지" className="max-h-48 rounded-lg border" />
                    ) : (
                      <a href={selectedUpload.rawFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline text-sm">파일 보기</a>
                    )}
                  </div>
                </div>
              )}
              {selectedUpload.parsedSummary && (
                <div>
                  <label className="text-xs text-muted-foreground">AI 파싱 요약</label>
                  <div className="bg-blue-500/10 rounded-lg p-3 text-sm">{selectedUpload.parsedSummary}</div>
                </div>
              )}
              {selectedUpload.parsedData && (
                <div>
                  <label className="text-xs text-muted-foreground">파싱된 데이터</label>
                  <pre className="bg-background/50 rounded-lg p-3 text-xs overflow-x-auto max-h-60 overflow-y-auto">
                    {JSON.stringify(selectedUpload.parsedData, null, 2)}
                  </pre>
                </div>
              )}
              {(selectedUpload.status === "parsed" || selectedUpload.status === "pending") && (
                <div className="space-y-3 border-t pt-3">
                  <h4 className="font-medium">승인/거절</h4>
                  <div>
                    <label className="text-xs text-muted-foreground">밋업 선택 (선택사항)</label>
                    <Select value={meetupIdInput} onValueChange={setMeetupIdInput}>
                      <SelectTrigger><SelectValue placeholder="밋업 선택" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">선택 안함</SelectItem>
                        {meetups?.map((m: any) => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">메모</label>
                    <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="검토 메모 (선택사항)" rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveMutation.mutate({
                        id: selectedUpload.id,
                        meetupId: meetupIdInput && meetupIdInput !== "none" ? parseInt(meetupIdInput) : undefined,
                        notes: reviewNotes || undefined,
                      })}
                      disabled={approveMutation.isPending}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-1" /> 승인 & 적용
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => rejectMutation.mutate({ id: selectedUpload.id, notes: reviewNotes || undefined })}
                      disabled={rejectMutation.isPending}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" /> 거절
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ OCR Edit Dialog ═══ */}
      <Dialog open={!!editingOcr} onOpenChange={(open) => !open && setEditingOcr(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>OCR 결과 수정</DialogTitle>
          </DialogHeader>
          {editingOcr && (
            <div className="space-y-4">
              {editingOcr.rawFileUrl && (
                <img src={editingOcr.rawFileUrl} alt="원본 이미지" className="max-h-40 rounded-lg border mx-auto" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">이름</label>
                  <Input value={ocrEditData.name || ""} onChange={(e) => setOcrEditData({ ...ocrEditData, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">여권번호</label>
                  <Input value={ocrEditData.passportNumber || ""} onChange={(e) => setOcrEditData({ ...ocrEditData, passportNumber: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">국적</label>
                  <Input value={ocrEditData.nationality || ""} onChange={(e) => setOcrEditData({ ...ocrEditData, nationality: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">생년월일</label>
                  <Input value={ocrEditData.birthDate || ""} onChange={(e) => setOcrEditData({ ...ocrEditData, birthDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">성별</label>
                  <Input value={ocrEditData.gender || ""} onChange={(e) => setOcrEditData({ ...ocrEditData, gender: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">만료일</label>
                  <Input value={ocrEditData.expiryDate || ""} onChange={(e) => setOcrEditData({ ...ocrEditData, expiryDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">항공편</label>
                  <Input value={ocrEditData.flightNo || ""} onChange={(e) => setOcrEditData({ ...ocrEditData, flightNo: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">예약번호</label>
                  <Input value={ocrEditData.bookingRef || ""} onChange={(e) => setOcrEditData({ ...ocrEditData, bookingRef: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingOcr(null)}>취소</Button>
                <Button
                  onClick={() => updateOcrMutation.mutate({ id: editingOcr.id, parsedData: ocrEditData })}
                  disabled={updateOcrMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-1" /> 저장
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
