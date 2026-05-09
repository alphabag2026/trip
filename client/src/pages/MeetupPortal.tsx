import { useState, useMemo } from "react";
import { MeetupShareModal } from "@/components/MeetupShareModal";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plane, MapPin, Calendar, Users, ArrowLeft, Sparkles, ScanLine,
  Loader2, MessageCircle, Send, Clock, Globe, Share2, Copy, CheckCircle,
  FileText, Info, AlertTriangle, Download, ExternalLink, Car, UtensilsCrossed,
  XCircle, HelpCircle, Hotel, Navigation, Phone
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/_core/hooks/useAuth";
import LanguageSelector from "@/components/LanguageSelector";
import { TranslateButton } from "@/components/TranslateButton";

export default function MeetupPortal() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const params = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const token = params.token || "";

  // 공유 토큰으로 밋업 조회
  const { data: meetup, isLoading, error } = trpc.meetup.getByShareToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const [activeTab, setActiveTab] = useState("info");
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/m/${token}`;
  }, [token]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success(t("meetupPortal.urlCopied", "URL이 복사되었습니다"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegister = () => {
    if (meetup?.id) {
      navigate(`/register/${meetup.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t("meetupPortal.loading", "밋업 정보를 불러오는 중...")}</p>
        </div>
      </div>
    );
  }

  if (error || !meetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold">{t("meetupPortal.notFound", "밋업을 찾을 수 없습니다")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("meetupPortal.notFoundDesc", "유효하지 않은 링크이거나 밋업이 종료되었을 수 있습니다.")}
            </p>
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t("meetupPortal.goHome", "홈으로")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColor = meetup.status === "open" ? "bg-green-500" : meetup.status === "closed" ? "bg-red-500" : "bg-amber-500";
  const statusLabel = meetup.status === "open" ? t("meetupPortal.statusOpen", "모집중") : meetup.status === "closed" ? t("meetupPortal.statusClosed", "마감") : t("meetupPortal.statusDraft", "준비중");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <Plane className="h-5 w-5 text-primary" />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopyUrl} className="gap-1.5">
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
              {copied ? t("meetupPortal.copied", "복사됨") : t("meetupPortal.share", "공유")}
            </Button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border/30">
        <div className="container max-w-3xl py-8">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1">
                  <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                  {statusLabel}
                </Badge>
                {meetup.projectCode && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    #{meetup.projectCode}
                  </Badge>
                )}
                {meetup.type && (
                  <Badge variant="outline">{meetup.type}</Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">{meetup.title}</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {meetup.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span>{meetup.location}</span>
              </div>
            )}
            {(meetup.scheduleStart || meetup.scheduleEnd) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span>
                  {meetup.scheduleStart && new Date(meetup.scheduleStart).toLocaleDateString()}
                  {meetup.scheduleEnd && ` ~ ${new Date(meetup.scheduleEnd).toLocaleDateString()}`}
                </span>
              </div>
            )}
            {meetup.maxParticipants && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span>{t("meetupPortal.maxAttendees", "최대 인원")}: {meetup.maxParticipants}{t("meetupPortal.people", "명")}</span>
              </div>
            )}
            {meetup.invitedCountries != null && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <span>{t("meetupPortal.invitedCountries", "초청국가")}: {String(meetup.invitedCountries)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container max-w-3xl py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="info" className="gap-1.5">
              <FileText className="h-4 w-4" />
              {t("meetupPortal.tabInfo", "정보")}
            </TabsTrigger>
            <TabsTrigger value="register" className="gap-1.5">
              <Plane className="h-4 w-4" />
              {t("meetupPortal.tabRegister", "신청")}
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5">
              <MessageCircle className="h-4 w-4" />
              {t("meetupPortal.tabChat", "소통")}
            </TabsTrigger>
            <TabsTrigger value="accommodations" className="gap-1.5">
              <Hotel className="h-4 w-4" />
              {t("meetupPortal.tabAccommodations", "숙소")}
            </TabsTrigger>
          </TabsList>

          {/* 정보 탭 */}
          <TabsContent value="info" className="mt-6 space-y-4">
            {meetup.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("meetupPortal.description", "밋업 소개")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{meetup.description}</p>
                  <TranslateButton text={meetup.description} variant="compact" className="mt-2" />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("meetupPortal.details", "상세 정보")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={MapPin} label={t("meetupPortal.location", "장소")} value={meetup.location || "-"} />
                <InfoRow icon={Calendar} label={t("meetupPortal.period", "기간")} value={
                  meetup.scheduleStart && meetup.scheduleEnd
                    ? `${new Date(meetup.scheduleStart).toLocaleDateString()} ~ ${new Date(meetup.scheduleEnd).toLocaleDateString()}`
                    : meetup.scheduleStart ? new Date(meetup.scheduleStart).toLocaleDateString() : "-"
                } />
                <InfoRow icon={Users} label={t("meetupPortal.maxAttendees", "최대 인원")} value={meetup.maxParticipants ? `${meetup.maxParticipants}${t("meetupPortal.people", "명")}` : "-"} />
                <InfoRow icon={Globe} label={t("meetupPortal.invitedCountries", "초청국가")} value={meetup.invitedCountries ? String(meetup.invitedCountries) : "-"} />
                {meetup.projectCode && (
                  <InfoRow icon={FileText} label={t("meetupPortal.projectCode", "프로젝트 번호")} value={meetup.projectCode} mono />
                )}
              </CardContent>
            </Card>

            {/* 교통/식사 일정 + RSVP */}
            <ScheduleListWithRsvp meetupId={meetup.id} />

            {/* 캘린더 연동 */}
            <CalendarButtons meetupId={meetup.id} />

            {/* 공유 URL + QR 코드 */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{t("meetupPortal.shareUrl", "공유 URL")}</span>
                  </div>
                  <Button size="sm" variant="default" className="gap-1.5" onClick={() => setShowShareModal(true)}>
                    <Send className="h-3.5 w-3.5" />
                    {t("meetupPortal.shareRecommend", "추천글 공유")}
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="bg-white p-3 rounded-xl shadow-sm shrink-0">
                    <QRCodeSVG
                      value={shareUrl}
                      size={140}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#1a1a2e"
                    />
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex gap-2">
                      <Input value={shareUrl} readOnly className="text-xs font-mono bg-background" />
                      <Button size="sm" variant="outline" onClick={handleCopyUrl} className="shrink-0 gap-1.5">
                        {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("meetupPortal.shareDesc", "이 URL을 공유하면 누구나 이 밋업에 바로 접속할 수 있습니다.")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("meetupPortal.qrDesc", "QR 코드를 초대장이나 포스터에 활용하세요.")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 신청 탭 */}
          <TabsContent value="register" className="mt-6 space-y-4">
            {meetup.status === "open" ? (
              <Card>
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Plane className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">{meetup.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("meetupPortal.registerDesc", "아래 버튼을 클릭하여 이 밋업에 신청하세요. AI 빠른 입력과 여권 스캔을 지원합니다.")}
                    </p>
                  </div>
                  <Button size="lg" className="w-full gap-2" onClick={handleRegister}>
                    <Plane className="h-5 w-5" />
                    {t("meetupPortal.registerBtn", "밋업 신청하기")}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t("meetupPortal.registerNote", "신청 시 AI 프롬프트 자동 입력, 여권 스캔 자동 채움을 사용할 수 있습니다.")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
                  <p className="text-muted-foreground">
                    {t("meetupPortal.registrationClosed", "현재 신청이 마감되었습니다.")}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 소통 탭 */}
          <TabsContent value="chat" className="mt-6 space-y-4">
            <MeetupChat meetupId={meetup.id} meetupTitle={meetup.title} isAuthenticated={isAuthenticated} />
          </TabsContent>

          {/* 공유 숙소 탭 */}
          <TabsContent value="accommodations" className="mt-6 space-y-4">
            <SharedAccommodationsSection meetupId={meetup.id} />
          </TabsContent>
         </Tabs>
      </div>
      {/* 추천글 공유 모달 */}
      {meetup && (
        <MeetupShareModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
          meetup={meetup}
          shareUrl={shareUrl}
        />
      )}
    </div>
  );
}
// 정보 행 컴포넌트
function InfoRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

// 밋업 전용 채팅 컴포넌트
function MeetupChat({ meetupId, meetupTitle, isAuthenticated }: { meetupId: number; meetupTitle: string; isAuthenticated: boolean }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");

  // 밋업 전용 채팅방 목록
  const { data: rooms } = trpc.chatRoom.list.useQuery(
    { meetupId },
    { enabled: isAuthenticated }
  );

  const meetupRooms = rooms?.filter((r: any) => r.meetupId === meetupId) || [];

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-medium mb-1">{t("meetupPortal.loginRequired", "로그인이 필요합니다")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("meetupPortal.loginForChat", "밋업 전용 채팅에 참여하려면 로그인해주세요.")}
            </p>
          </div>
          <Link href="/login">
            <Button className="gap-2">
              {t("meetupPortal.login", "로그인")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (meetupRooms.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-medium mb-1">{t("meetupPortal.noChatRoom", "채팅방이 없습니다")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("meetupPortal.noChatRoomDesc", "이 밋업의 전용 채팅방이 아직 생성되지 않았습니다. 관리자가 곧 생성할 예정입니다.")}
            </p>
          </div>
          <Link href="/community">
            <Button variant="outline" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              {t("meetupPortal.goToCommunity", "커뮤니티 채팅 바로가기")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("meetupPortal.chatDesc", "이 밋업의 전용 채팅방입니다. 참가자들과 소통하세요.")}
      </p>
      {meetupRooms.map((room: any) => (
        <Link key={room.id} href={`/community/${room.id}`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{room.name}</h4>
                {room.description && (
                  <p className="text-xs text-muted-foreground truncate">{room.description}</p>
                )}
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {room.roomType === "announcement" ? t("meetupPortal.announcement", "공지") :
                 room.roomType === "support" ? t("meetupPortal.support", "문의") :
                 t("meetupPortal.general", "일반")}
              </Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// 캘린더 연동 버튼 컴포넌트
function CalendarButtons({ meetupId }: { meetupId: number }) {
  const { t } = useTranslation();
  const { data, isLoading } = trpc.calendar.generateIcs.useQuery(
    { meetupId },
    { enabled: !!meetupId }
  );

  const handleDownloadIcs = () => {
    if (!data?.ics) return;
    const blob = new Blob([data.ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meetup-${meetupId}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("meetupPortal.icsDownloaded", "캘린더 파일이 다운로드되었습니다"));
  };

  const handleGoogleCalendar = () => {
    if (!data?.gcalUrl) return;
    window.open(data.gcalUrl, "_blank");
  };

  if (isLoading) return null;
  if (!data) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{t("meetupPortal.addToCalendar", "캘린더에 추가")}</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 flex-1"
            onClick={handleGoogleCalendar}
          >
            <ExternalLink className="h-4 w-4" />
            Google Calendar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 flex-1"
            onClick={handleDownloadIcs}
          >
            <Download className="h-4 w-4" />
            Apple Calendar (.ics)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t("meetupPortal.calendarDesc", "밋업 일정을 내 캘린더에 바로 추가할 수 있습니다.")}
        </p>
      </CardContent>
    </Card>
  );
}


// 교통/식사 일정 목록 + RSVP 응답 (참가자용)
function ScheduleListWithRsvp({ meetupId }: { meetupId: number }) {
  const { t } = useTranslation();
  const schedules = trpc.meetupSchedule.list.useQuery({ meetupId }, { enabled: !!meetupId });

  if (!schedules.data || schedules.data.length === 0) return null;

  const TYPE_ICONS: Record<string, { icon: string; label: string }> = {
    transport: { icon: "🚗", label: "교통" },
    meal: { icon: "🍽️", label: "식사" },
    tour: { icon: "🗺️", label: "관광" },
    meeting: { icon: "📋", label: "미팅" },
    free: { icon: "🆓", label: "자유시간" },
    other: { icon: "📌", label: "기타" },
  };

  // 날짜별 그룹핑
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const s of schedules.data || []) {
      const dateKey = new Date(s.eventDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
      if (!g[dateKey]) g[dateKey] = [];
      g[dateKey].push(s);
    }
    return g;
  }, [schedules.data]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {t("meetupPortal.schedules", "교통/식사 일정")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(grouped).map(([dateKey, items]) => (
          <div key={dateKey}>
            <p className="text-xs font-semibold text-muted-foreground mb-2">{dateKey}</p>
            <div className="space-y-2">
              {items.map((s: any) => {
                const typeInfo = TYPE_ICONS[s.scheduleType] || TYPE_ICONS.other;
                const time = new Date(s.eventDate).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
                const endTime = s.endTime ? new Date(s.endTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : null;
                return (
                  <div key={s.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{typeInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{s.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {time}{endTime ? ` ~ ${endTime}` : ""}</span>
                          {s.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.location}</span>}
                        </div>
                        {/* 교통 상세 */}
                        {s.scheduleType === "transport" && (s.pickupLocation || s.driverName) && (
                          <div className="mt-1.5 text-xs space-y-0.5 text-muted-foreground">
                            {s.pickupLocation && <p className="flex items-center gap-1"><Car className="w-3 h-3" /> 픽업: {s.pickupLocation}</p>}
                            {s.dropoffLocation && <p className="ml-4">→ 하차: {s.dropoffLocation}</p>}
                            {s.driverName && <p>기사: {s.driverName} {s.driverPhone || ""}</p>}
                            {s.vehicleInfo && <p>차량: {s.vehicleInfo}</p>}
                          </div>
                        )}
                        {/* 식사 상세 */}
                        {s.scheduleType === "meal" && (s.restaurantName || s.menuInfo) && (
                          <div className="mt-1.5 text-xs space-y-0.5 text-muted-foreground">
                            {s.restaurantName && <p className="flex items-center gap-1"><UtensilsCrossed className="w-3 h-3" /> {s.restaurantName} {s.cuisineType ? `(${s.cuisineType})` : ""}</p>}
                            {s.menuInfo && <p>메뉴: {s.menuInfo}</p>}
                            {s.costPerPerson && <p>1인 비용: {s.costPerPerson}</p>}
                          </div>
                        )}
                        {s.description && (
                          <div className="flex items-center gap-1 mt-1">
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                            <TranslateButton text={s.description} variant="icon" />
                          </div>
                        )}
                        {s.notes && (
                          <div className="flex items-center gap-1 mt-1">
                            <p className="text-xs text-muted-foreground/70 italic">{s.notes}</p>
                            <TranslateButton text={s.notes} variant="icon" />
                          </div>
                        )}
                        {s.locationUrl && (
                          <a href={s.locationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> 지도 보기
                          </a>
                        )}
                      </div>
                    </div>
                    {/* RSVP 응답 */}
                    <ScheduleRsvpResponder scheduleId={s.id} meetupId={meetupId} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// 참가자 RSVP 응답 컴포넌트
function ScheduleRsvpResponder({ scheduleId, meetupId }: { scheduleId: number; meetupId: number }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const stats = trpc.scheduleRsvp.stats.useQuery({ scheduleId });
  const utils = trpc.useUtils();
  const respondMut = trpc.scheduleRsvp.respond.useMutation({
    onSuccess: () => {
      utils.scheduleRsvp.stats.invalidate({ scheduleId });
      toast.success(t("meetupPortal.rsvpSaved", "참석 여부가 저장되었습니다"));
    },
    onError: (e) => toast.error(e.message),
  });

  // 참가자가 아닌 경우 통계만 표시
  const s = stats.data;

  return (
    <div className="pt-2 border-t border-border/30">
      {/* RSVP 통계 */}
      {s && s.total > 0 && (
        <div className="flex items-center gap-3 text-xs mb-2">
          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" /> {s.attending}</span>
          <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3 h-3" /> {s.not_attending}</span>
          <span className="flex items-center gap-1 text-yellow-600"><HelpCircle className="w-3 h-3" /> {s.maybe}</span>
        </div>
      )}
      {/* 응답 버튼 (로그인한 사용자만) */}
      {user && (
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 flex-1 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
            onClick={() => respondMut.mutate({ scheduleId, meetupId, registrationId: 0, response: "attending" })}
            disabled={respondMut.isPending}
          >
            <CheckCircle className="w-3 h-3" /> {t("meetupPortal.attending", "참석")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 flex-1 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300"
            onClick={() => respondMut.mutate({ scheduleId, meetupId, registrationId: 0, response: "maybe" })}
            disabled={respondMut.isPending}
          >
            <HelpCircle className="w-3 h-3" /> {t("meetupPortal.maybe", "미정")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 flex-1 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            onClick={() => respondMut.mutate({ scheduleId, meetupId, registrationId: 0, response: "not_attending" })}
            disabled={respondMut.isPending}
          >
            <XCircle className="w-3 h-3" /> {t("meetupPortal.notAttending", "불참")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── 공유 숙소 섹션 ───────────────────────────────────────────
function SharedAccommodationsSection({ meetupId }: { meetupId: number }) {
  const { t } = useTranslation();
  const { data: sharedList, isLoading } = trpc.myTravel.sharedAccommodationsByMeetup.useQuery({ meetupId });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sharedList || sharedList.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Hotel className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">{t("meetupPortal.noSharedAccommodations", "아직 공유된 숙소 정보가 없습니다.")}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t("meetupPortal.shareAccommodationHint", "참석자들이 숙소 정보를 공유하면 여기에 표시됩니다.")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Hotel className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">{t("meetupPortal.sharedAccommodations", "공유된 숙소 정보")}</h3>
        <Badge variant="secondary" className="ml-auto">{sharedList.length}개</Badge>
      </div>
      {sharedList.map((item: any) => (
        <Card key={item.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{item.hotelName}</h4>
                </div>
                {item.hotelAddress && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{item.hotelAddress}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {item.checkIn && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.checkIn} ~ {item.checkOut || ""}
                    </span>
                  )}
                  {item.roomType && (
                    <Badge variant="outline" className="text-[10px] h-5">{item.roomType}</Badge>
                  )}
                </div>
                {item.sharedByName && (
                  <p className="text-[10px] text-muted-foreground/60 mt-2">
                    {t("meetupPortal.sharedBy", "공유자")}: {item.sharedByName}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {item.hotelAddress && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.hotelAddress)}`, "_blank")}
                      title="Google Maps"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(`https://grab.onelink.me/2695613898?af_dp=grab://open?screenType=BOOKING&dropOffAddress=${encodeURIComponent(item.hotelAddress)}`, "_blank")}
                      title="Grab"
                    >
                      <Car className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
