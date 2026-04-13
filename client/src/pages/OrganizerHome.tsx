import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users, CalendarDays, Plane, Hotel, ClipboardList, LayoutDashboard,
  ArrowRight, CheckCircle2, Clock, AlertCircle, ChevronRight, Settings,
  MessageCircle, Car, Megaphone, BarChart3, Luggage, MapPin, Plus,
  FileText, Ticket, Globe, DollarSign, Bell, Sparkles, UserPlus,
  LogOut, User, StickyNote, Languages, Search, Bot, Shield,
  ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/_core/hooks/useAuth";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════
// 주최자 밋업 준비 워크플로우 단계
// ═══════════════════════════════════════════════════════
interface WorkflowStep {
  id: string;
  icon: any;
  labelKey: string;
  labelDefault: string;
  descKey: string;
  descDefault: string;
  href: string;
  checkFn: (data: any) => boolean;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "create_meetup",
    icon: CalendarDays,
    labelKey: "org_home.step1_title",
    labelDefault: "밋업 생성",
    descKey: "org_home.step1_desc",
    descDefault: "새 밋업을 만들고 날짜, 장소, 인원을 설정하세요",
    href: "/admin/meetups",
    checkFn: (d) => (d?.meetups?.length || 0) > 0,
  },
  {
    id: "invite_attendees",
    icon: UserPlus,
    labelKey: "org_home.step2_title",
    labelDefault: "참석자 초대/관리",
    descKey: "org_home.step2_desc",
    descDefault: "참석자를 초대하고 신청을 승인하세요",
    href: "/admin/registrations",
    checkFn: (d) => (d?.totalAttendees || 0) > 0,
  },
  {
    id: "assign_flights",
    icon: Plane,
    labelKey: "org_home.step3_title",
    labelDefault: "항공편 배정",
    descKey: "org_home.step3_desc",
    descDefault: "참석자에게 항공편을 배정하세요",
    href: "/admin/flight-tickets",
    checkFn: (d) => (d?.flightAssigned || 0) > 0,
  },
  {
    id: "assign_hotels",
    icon: Hotel,
    labelKey: "org_home.step4_title",
    labelDefault: "호텔/숙소 배정",
    descKey: "org_home.step4_desc",
    descDefault: "호텔 바우처를 생성하고 방을 배정하세요",
    href: "/admin/hotel-vouchers",
    checkFn: (d) => (d?.hotelAssigned || 0) > 0,
  },
  {
    id: "setup_transport",
    icon: Car,
    labelKey: "org_home.step5_title",
    labelDefault: "픽업/차량 배치",
    descKey: "org_home.step5_desc",
    descDefault: "공항 픽업 차량과 기사를 배정하세요",
    href: "/admin/pickups",
    checkFn: (d) => (d?.pickupAssigned || 0) > 0,
  },
  {
    id: "manage_onsite",
    icon: ClipboardList,
    labelKey: "org_home.step6_title",
    labelDefault: "현장 관리",
    descKey: "org_home.step6_desc",
    descDefault: "일정, 소통 채널, 설문을 설정하세요",
    href: "/admin/schedule-events",
    checkFn: (d) => (d?.scheduleCount || 0) > 0,
  },
];

// ═══════════════════════════════════════════════════════
// 빠른 액션 메뉴
// ═══════════════════════════════════════════════════════
const QUICK_ACTIONS = [
  { icon: CalendarDays, labelKey: "org_home.qa_meetups", labelDefault: "밋업 관리", href: "/admin/meetups", gradient: "from-blue-500 to-indigo-600", ring: "ring-blue-200 dark:ring-blue-900" },
  { icon: Users, labelKey: "org_home.qa_attendees", labelDefault: "참석자 관리", href: "/admin/registrations", gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-200 dark:ring-emerald-900" },
  { icon: Plane, labelKey: "org_home.qa_flights", labelDefault: "항공편", href: "/admin/flights", gradient: "from-sky-500 to-blue-600", ring: "ring-sky-200 dark:ring-sky-900" },
  { icon: Hotel, labelKey: "org_home.qa_hotels", labelDefault: "숙소 배정", href: "/admin/accommodations", gradient: "from-rose-500 to-pink-600", ring: "ring-rose-200 dark:ring-rose-900" },
  { icon: Car, labelKey: "org_home.qa_pickups", labelDefault: "픽업 배치", href: "/admin/pickups", gradient: "from-purple-500 to-fuchsia-600", ring: "ring-purple-200 dark:ring-purple-900" },
  { icon: Ticket, labelKey: "org_home.qa_tickets", labelDefault: "항공권 배정", href: "/admin/flight-tickets", gradient: "from-amber-500 to-orange-600", ring: "ring-amber-200 dark:ring-amber-900" },
  { icon: FileText, labelKey: "org_home.qa_vouchers", labelDefault: "호텔 바우처", href: "/admin/hotel-vouchers", gradient: "from-teal-500 to-green-600", ring: "ring-teal-200 dark:ring-teal-900" },
  { icon: LayoutDashboard, labelKey: "org_home.qa_dashboard", labelDefault: "백오피스", href: "/admin", gradient: "from-slate-500 to-gray-600", ring: "ring-slate-200 dark:ring-slate-900" },
];

const MORE_ACTIONS = [
  { icon: Megaphone, label: "org_home.more_broadcast", labelDefault: "단체 메시지", href: "/admin/broadcast" },
  { icon: MessageCircle, label: "org_home.more_chat", labelDefault: "소통 채널", href: "/admin/channels" },
  { icon: CalendarDays, label: "org_home.more_schedule", labelDefault: "일정 관리", href: "/admin/schedule-events" },
  { icon: ClipboardList, label: "org_home.more_surveys", labelDefault: "설문 조사", href: "/admin/surveys" },
  { icon: Luggage, label: "org_home.more_baggage", labelDefault: "수화물/체크인", href: "/admin/baggage-checkin" },
  { icon: BarChart3, label: "org_home.more_stats", labelDefault: "통계/리포트", href: "/admin" },
  { icon: Globe, label: "org_home.more_travel", labelDefault: "여행 정보", href: "/admin/travel-info" },
  { icon: Languages, label: "org_home.more_translator", labelDefault: "통역", href: "/translator" },
  { icon: Bot, label: "org_home.more_ai", labelDefault: "AI 도우미", href: "/chatbot" },
  { icon: Shield, label: "org_home.more_passport", labelDefault: "여권 명단", href: "/admin/passport-list" },
  { icon: DollarSign, label: "org_home.more_expenses", labelDefault: "비용 관리", href: "/admin/expenses" },
  { icon: Search, label: "org_home.more_booking", labelDefault: "예약 검색", href: "/admin/booking-search" },
];

export default function OrganizerHome() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [expandedWorkflow, setExpandedWorkflow] = useState(true);

  // 주최자 대시보드 데이터
  const { data: dashData, isLoading } = trpc.roleDashboard.organizer.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const meetups = dashData?.meetups || [];
  const totalAttendees = dashData?.totalAttendees || 0;
  const pendingRegistrations = dashData?.pendingRegistrations || 0;
  const activeMeetups = meetups.filter((m: any) => m.status === "active" || m.status === "upcoming").length;

  // 워크플로우 진행률 계산
  const workflowProgress = useMemo(() => {
    const completed = WORKFLOW_STEPS.filter(step => step.checkFn(dashData)).length;
    return Math.round((completed / WORKFLOW_STEPS.length) * 100);
  }, [dashData]);

  // 다음 해야 할 단계 찾기
  const nextStep = useMemo(() => {
    return WORKFLOW_STEPS.find(step => !step.checkFn(dashData));
  }, [dashData]);

  // 가장 가까운 밋업
  const upcomingMeetup = useMemo(() => {
    const now = Date.now();
    return meetups
      .filter((m: any) => m.scheduleStart && new Date(m.scheduleStart).getTime() > now)
      .sort((a: any, b: any) => new Date(a.scheduleStart).getTime() - new Date(b.scheduleStart).getTime())[0];
  }, [meetups]);

  // D-Day 계산
  const daysUntil = useMemo(() => {
    if (!upcomingMeetup?.scheduleStart) return null;
    const diff = new Date(upcomingMeetup.scheduleStart).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [upcomingMeetup]);

  return (
    <div className="min-h-screen bg-background">
      {/* ===== HEADER ===== */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/95">
        <div className="container flex items-center justify-between h-14 gap-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img loading="lazy" decoding="async" src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-lg hidden sm:inline" style={{ fontFamily: 'Inter, sans-serif' }}>Alpha Trip</span>
          </Link>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <LanguageSelector />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">{user?.name}</span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 hidden sm:inline-flex">{t("home.role_organizer", "주최자")}</Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 border-b border-border/50 mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{t("home.role_organizer", "주최자")}</Badge>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/my-page" className="cursor-pointer"><User className="h-4 w-4 mr-2" />{t("nav.myProfile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer"><LayoutDashboard className="h-4 w-4 mr-2" />{t("nav.backoffice")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/notes" className="cursor-pointer"><StickyNote className="h-4 w-4 mr-2" />{t("home.u_memo", "메모")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={async () => { await logout(); window.location.href = "/"; }}>
                  <LogOut className="h-4 w-4 mr-2" />{t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="pb-20 md:pb-8">
        <div className="container max-w-2xl mx-auto px-4">

          {/* ── 환영 메시지 + 긴급 알림 ── */}
          <section className="pt-5 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {t("org_home.welcome", "안녕하세요, {{name}}님", { name: user?.name || "" })}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("org_home.welcome_sub", "밋업 준비 현황을 확인하세요")}
                </p>
              </div>
              {daysUntil !== null && daysUntil > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 text-center flex-shrink-0">
                  <div className="text-2xl font-bold text-primary">D-{daysUntil}</div>
                  <div className="text-[10px] text-muted-foreground">{t("org_home.next_meetup", "다음 밋업")}</div>
                </div>
              )}
            </div>
          </section>

          {/* ── 밋업 생성 CTA 버튼 (최전면) ── */}
          <section className="pb-3">
            <Link href="/admin/meetups">
              <Button className="w-full h-12 text-base font-bold gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 rounded-xl">
                <Plus className="h-5 w-5" />
                {t("org_home.create_meetup", "밋업 생성하기")}
              </Button>
            </Link>
          </section>

          {/* ── 긴급 알림 배너 ── */}
          {pendingRegistrations > 0 && (
            <section className="pb-3">
              <Link href="/admin/registrations">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      {t("org_home.pending_alert", "승인 대기 {{count}}건", { count: pendingRegistrations })}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {t("org_home.pending_alert_desc", "참석자 신청을 확인하고 승인해주세요")}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-amber-500 flex-shrink-0" />
                </div>
              </Link>
            </section>
          )}

          {/* ── KPI 카드 4개 ── */}
          <section className="pb-4">
            <div className="grid grid-cols-2 gap-3">
              <Link href="/admin/meetups">
                <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-muted-foreground">{t("org_home.kpi_meetups", "진행중 밋업")}</p>
                        <p className="text-2xl font-bold">{isLoading ? "-" : activeMeetups}</p>
                      </div>
                      <CalendarDays className="h-7 w-7 text-blue-500 opacity-70" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/admin/registrations">
                <Card className="border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-muted-foreground">{t("org_home.kpi_attendees", "총 참석자")}</p>
                        <p className="text-2xl font-bold">{isLoading ? "-" : totalAttendees}</p>
                      </div>
                      <Users className="h-7 w-7 text-emerald-500 opacity-70" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/admin/registrations">
                <Card className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-muted-foreground">{t("org_home.kpi_pending", "승인 대기")}</p>
                        <p className="text-2xl font-bold">{isLoading ? "-" : pendingRegistrations}</p>
                      </div>
                      <Clock className="h-7 w-7 text-amber-500 opacity-70" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/admin">
                <Card className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-muted-foreground">{t("org_home.kpi_total_meetups", "전체 밋업")}</p>
                        <p className="text-2xl font-bold">{isLoading ? "-" : meetups.length}</p>
                      </div>
                      <BarChart3 className="h-7 w-7 text-purple-500 opacity-70" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>

          {/* ── 밋업 준비 워크플로우 체크리스트 ── */}
          <section className="pb-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpandedWorkflow(!expandedWorkflow)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{t("org_home.workflow_title", "밋업 준비 체크리스트")}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={workflowProgress === 100 ? "default" : "secondary"} className="text-xs">
                      {workflowProgress}%
                    </Badge>
                    {expandedWorkflow ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                <Progress value={workflowProgress} className="h-1.5 mt-2" />
              </CardHeader>

              {expandedWorkflow && (
                <CardContent className="pt-0 space-y-2">
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const done = step.checkFn(dashData);
                    const isNext = !done && step.id === nextStep?.id;
                    return (
                      <Link key={step.id} href={step.href}>
                        <div className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer
                          ${isNext ? "bg-primary/5 border border-primary/20 shadow-sm" : done ? "bg-muted/30" : "hover:bg-muted/50"}
                        `}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                            ${done ? "bg-emerald-100 dark:bg-emerald-900/30" : isNext ? "bg-primary/10" : "bg-muted"}
                          `}>
                            {done ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <step.icon className={`h-5 w-5 ${isNext ? "text-primary" : "text-muted-foreground"}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                {t(step.labelKey, step.labelDefault)}
                              </span>
                              {isNext && (
                                <Badge variant="default" className="text-[9px] px-1.5 py-0">
                                  {t("org_home.next", "다음")}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {t(step.descKey, step.descDefault)}
                            </p>
                          </div>
                          <ChevronRight className={`h-4 w-4 flex-shrink-0 ${isNext ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                      </Link>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          </section>

          {/* ── 빠른 액션 아이콘 그리드 ── */}
          <section className="pb-4">
            <div className="mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                {t("org_home.quick_actions", "빠른 관리")}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              {QUICK_ACTIONS.map((action, i) => (
                <Link key={i} href={action.href}>
                  <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
                    <div className={`relative w-[52px] h-[52px] md:w-[60px] md:h-[60px] rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg ring-2 ${action.ring} group-hover:scale-110 group-hover:shadow-xl transition-all duration-200`}>
                      <action.icon className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow" />
                    </div>
                    <span className="text-[11px] font-medium text-foreground text-center leading-tight">{t(action.labelKey, action.labelDefault)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── 더보기 메뉴 ── */}
          <section className="pb-4">
            <div className="flex items-center justify-center">
              <button
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-3 rounded-full hover:bg-muted/50"
              >
                {showMoreActions ? t("home.showLess", "접기") : t("org_home.more_tools", "추가 관리 도구")}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showMoreActions ? "rotate-180" : ""}`} />
              </button>
            </div>

            {showMoreActions && (
              <div className="mt-3 border-t border-border/50 pt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-0">
                  {MORE_ACTIONS.map((item, i) => (
                    <Link key={i} href={item.href}>
                      <div className={`flex items-center gap-3 py-3 ${i < MORE_ACTIONS.length - 1 ? "border-b border-border/30" : ""} cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors`}>
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium flex-1">{t(item.label, item.labelDefault)}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── 다가오는 밋업 카드 ── */}
          {upcomingMeetup && (
            <section className="pb-4">
              <div className="mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400">
                  {t("org_home.upcoming_meetup", "다가오는 밋업")}
                </span>
              </div>
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-100 dark:border-blue-900/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{upcomingMeetup.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>{upcomingMeetup.destinationCountry || upcomingMeetup.location || "-"}</span>
                      </div>
                      {upcomingMeetup.scheduleStart && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <CalendarDays className="h-3 w-3" />
                          <span>{new Date(upcomingMeetup.scheduleStart).toLocaleDateString()}</span>
                          {upcomingMeetup.scheduleEnd && (
                            <span>~ {new Date(upcomingMeetup.scheduleEnd).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {daysUntil !== null && (
                      <div className="bg-white dark:bg-background rounded-xl px-3 py-2 text-center shadow-sm flex-shrink-0">
                        <div className="text-xl font-bold text-primary">D-{daysUntil}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link href="/admin/registrations" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                        <Users className="h-3 w-3" />
                        {t("org_home.view_attendees", "참석자 보기")}
                      </Button>
                    </Link>
                    <Link href="/admin/schedule-events" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {t("org_home.view_schedule", "일정 보기")}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* ── 최근 밋업 목록 ── */}
          {meetups.length > 0 && (
            <section className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-500 dark:text-purple-400">
                  {t("org_home.recent_meetups", "밋업 목록")}
                </span>
                <Link href="/admin/meetups" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  {t("org_home.view_all", "전체 보기")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {meetups.slice(0, 3).map((meetup: any) => (
                  <Link key={meetup.id} href="/admin/meetups">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 cursor-pointer hover:shadow-sm transition-shadow">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        meetup.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                        meetup.status === "upcoming" ? "bg-blue-100 dark:bg-blue-900/30" :
                        "bg-muted"
                      }`}>
                        <CalendarDays className={`h-5 w-5 ${
                          meetup.status === "active" ? "text-emerald-600 dark:text-emerald-400" :
                          meetup.status === "upcoming" ? "text-blue-600 dark:text-blue-400" :
                          "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{meetup.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{meetup.destinationCountry || meetup.location || "-"}</span>
                          {meetup.scheduleStart && (
                            <>
                              <span>·</span>
                              <span>{new Date(meetup.scheduleStart).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant={meetup.status === "active" ? "default" : meetup.status === "upcoming" ? "outline" : "secondary"} className="text-[10px] flex-shrink-0">
                        {meetup.status === "active" ? t("org_home.status_active", "진행중") :
                         meetup.status === "upcoming" ? t("org_home.status_upcoming", "예정") :
                         meetup.status === "completed" ? t("org_home.status_completed", "완료") :
                         meetup.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── 밋업이 없을 때 CTA ── */}
          {!isLoading && meetups.length === 0 && (
            <section className="pb-4">
              <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t("org_home.no_meetup_title", "첫 밋업을 만들어보세요!")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("org_home.no_meetup_desc", "밋업을 생성하면 참석자 초대, 항공편/호텔 배정, 현장 관리까지 모든 과정을 자동화할 수 있습니다.")}
                  </p>
                  <Link href="/admin/meetups">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t("org_home.create_meetup", "밋업 생성하기")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </section>
          )}

          {/* ── 백오피스 바로가기 배너 ── */}
          <section className="pb-4">
            <Link href="/admin">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{t("org_home.goto_backoffice", "백오피스 전체 관리")}</p>
                  <p className="text-xs text-white/60">{t("org_home.goto_backoffice_desc", "참석자, 항공, 숙소, 일정 등 33개 관리 메뉴")}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white/60 flex-shrink-0" />
              </div>
            </Link>
          </section>

        </div>
      </main>

      {/* ── 하단 네비게이션 (모바일) ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/50 md:hidden z-50">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          <Link href="/" className="flex flex-col items-center gap-0.5 py-1 text-primary">
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t("nav.home", "홈")}</span>
          </Link>
          <Link href="/schedule" className="flex flex-col items-center gap-0.5 py-1 text-muted-foreground hover:text-foreground transition-colors">
            <CalendarDays className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t("nav.schedule", "일정")}</span>
          </Link>
          <Link href="/community" className="flex flex-col items-center gap-0.5 py-1 text-muted-foreground hover:text-foreground transition-colors">
            <MessageCircle className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t("nav.chat", "채팅")}</span>
          </Link>
          <Link href="/chatbot" className="flex flex-col items-center gap-0.5 py-1 text-muted-foreground hover:text-foreground transition-colors">
            <Bot className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t("nav.ai", "AI 도우미")}</span>
          </Link>
          <Link href="/ride" className="flex flex-col items-center gap-0.5 py-1 text-muted-foreground hover:text-foreground transition-colors">
            <Car className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t("nav.grab", "그랩")}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
