import { useState, useMemo } from "react";
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
  FileText, Info, AlertTriangle
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/_core/hooks/useAuth";
import LanguageSelector from "@/components/LanguageSelector";

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
          <TabsList className="w-full grid grid-cols-3">
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

            {/* 공유 URL */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Share2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t("meetupPortal.shareUrl", "공유 URL")}</span>
                </div>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="text-xs font-mono bg-background" />
                  <Button size="sm" variant="outline" onClick={handleCopyUrl} className="shrink-0 gap-1.5">
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("meetupPortal.shareDesc", "이 URL을 공유하면 누구나 이 밋업에 바로 접속할 수 있습니다.")}
                </p>
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
        </Tabs>
      </div>
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
