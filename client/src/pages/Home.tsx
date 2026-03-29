import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plane, ClipboardList, Search, Shield, MapPin, Globe,
  MessageCircle, Car, Hotel, Luggage, User, LayoutDashboard,
  UserPlus, LogIn, ArrowRight, CheckCircle2, Building2, Users, Briefcase, LogOut, AlertCircle,
  Ticket, Bot, MoreHorizontal, Timer, Sparkles, Star, ChevronRight, ExternalLink, Play,
  UtensilsCrossed, Bike, ChevronDown, Map, Headphones, Smartphone, Settings, DollarSign,
  Compass, Ship, BookOpen, Gift, CalendarDays, Video, Share2, Train, Phone, UserCheck
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";
import { useState, useMemo } from "react";
import { getLoginUrl } from "@/const";
import PromoCarousel from "@/components/PromoCarousel";

// CDN Image URLs
const IMAGES = {
  heroBanner: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/hero-banner-main-RHKBHr3tmWcbadw6sfeo2v.webp",
  featureMeetup: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/feature-meetup-E5PcfucWTtZ4bQJoVDtDUX.webp",
  featureTravel: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/feature-travel-kr6kzeGjMpVtJ2WYudmQUh.webp",
  featurePassport: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/feature-passport-ghzP5AXN43JfVneYxEQJmd.webp",
  featureCommunity: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/feature-community-8YEFFMwGt8JKZzHNoiyD5E.webp",
  featureBooking: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/feature-booking-gfDtaoNENGKKQqXPR5AnP3.webp",
  adTravel: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/ad-banner-travel-hQHohRtnBqxSohmoBcK87V.webp",
  adHotel: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/ad-banner-hotel-KkWokkstuyCaX4eiNFaWeb.webp",
  adCruise: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/ad-square-cruise-UV3Mpji7tAjQa95k7HRPge.webp",
  testimonialBg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/testimonial-bg-oLAKs5rQUp3ZSEXjUNfPbP.webp",
  promoUsdt: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/promo-banner-usdt-kQn6mhiJvcWnPHjC44srGS.webp",
  promoVat: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/promo-banner-vat-LnDugwMhVaD9R7wgrjvPuZ.webp",
  promoRide: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/promo-banner-ride-nGA7EfthDNqzYb4nUSwJVE.webp",
  promoDelivery: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/promo-banner-delivery-NaofzccrxbAWFgmzkSvJnX.webp",
  promoCruise: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/promo-banner-cruise-NLWr8Bie5pCQKeZSeLvDR6.webp",
};

// ── Row 1: 핵심 기능 (밋업/출장 관리의 핵심)
const CORE_ICONS = [
  { icon: Users, label: "home.menu_meetup", href: "/register", gradient: "from-indigo-500 to-blue-600", ring: "ring-indigo-200 dark:ring-indigo-800" },
  { icon: UserCheck, label: "home.menu_invite", href: "/lookup", gradient: "from-violet-500 to-purple-600", ring: "ring-violet-200 dark:ring-violet-800" },
  { icon: CalendarDays, label: "home.menu_schedule", href: "/schedule", gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-200 dark:ring-emerald-800" },
  { icon: MessageCircle, label: "home.menu_chat", href: "/community", gradient: "from-sky-500 to-cyan-600", ring: "ring-sky-200 dark:ring-sky-800" },
];

// ── Row 2: 업무 지원 (이동/숙박 예약)
const WORK_ICONS = [
  { icon: Share2, label: "home.menu_share_schedule", href: "/dashboard", gradient: "from-amber-500 to-orange-600", ring: "ring-amber-200 dark:ring-amber-800" },
  { icon: Plane, label: "home.menu_flights", href: "/booking", gradient: "from-blue-500 to-indigo-600", ring: "ring-blue-200 dark:ring-blue-800" },
  { icon: Hotel, label: "home.menu_hotels", href: "/booking", gradient: "from-rose-500 to-pink-600", ring: "ring-rose-200 dark:ring-rose-800" },
  { icon: Train, label: "home.menu_rail", href: "/booking", gradient: "from-slate-500 to-gray-600", ring: "ring-slate-200 dark:ring-slate-800" },
];

// ── Row 3+: 부가 서비스 (자유시간/개인 서비스)
const EXTRA_ICONS = [
  { icon: Car, label: "home.menu_ride", href: "/ride", gradient: "from-purple-500 to-fuchsia-600", ring: "ring-purple-200 dark:ring-purple-800" },
  { icon: UtensilsCrossed, label: "home.menu_delivery", href: "/delivery", gradient: "from-orange-500 to-red-600", ring: "ring-orange-200 dark:ring-orange-800" },
  { icon: Map, label: "home.menu_map", href: "/booking", gradient: "from-teal-500 to-green-600", ring: "ring-teal-200 dark:ring-teal-800" },
  { icon: Bot, label: "home.menu_ai", href: "/chatbot", gradient: "from-cyan-500 to-blue-600", ring: "ring-cyan-200 dark:ring-cyan-800" },
  { icon: Video, label: "home.menu_video_call", href: "/community", gradient: "from-pink-500 to-rose-600", ring: "ring-pink-200 dark:ring-pink-800" },
  { icon: Shield, label: "home.menu_passport", href: "/my-page", gradient: "from-yellow-500 to-amber-600", ring: "ring-yellow-200 dark:ring-yellow-800" },
  { icon: Luggage, label: "home.menu_baggage", href: "/flight-tracker", gradient: "from-stone-500 to-neutral-600", ring: "ring-stone-200 dark:ring-stone-800" },
  { icon: Compass, label: "home.menu_guide", href: "/immigration-checklist", gradient: "from-lime-500 to-green-600", ring: "ring-lime-200 dark:ring-lime-800" },
];

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [showMoreServices, setShowMoreServices] = useState(false);

  // DB에서 활성 광고 배너 불러오기
  const { data: adBanners } = trpc.adBanner.list.useQuery(
    { activeOnly: true },
    { refetchOnWindowFocus: false }
  );
  const trackClick = trpc.adBanner.trackClick.useMutation();
  const getAdByPosition = (pos: string) => (adBanners || []).find((b: any) => b.position === pos);

  const { data: onboardingStatus } = trpc.userProfile.onboardingStatus.useQuery(
    undefined,
    { enabled: isAuthenticated, retry: false, refetchOnWindowFocus: false }
  );
  const needsOnboarding = isAuthenticated && onboardingStatus && !onboardingStatus.onboardingCompleted;

  const { data: profileData } = trpc.userProfile.get.useQuery(undefined, {
    enabled: isAuthenticated, retry: false, refetchOnWindowFocus: false,
  });
  const { data: passportData } = trpc.passport.get.useQuery(undefined, {
    enabled: isAuthenticated, retry: false, refetchOnWindowFocus: false,
  });

  const profileCompletion = (() => {
    if (!isAuthenticated) return 0;
    let total = 0, filled = 0;
    total += 1; filled += 1;
    const fields = ['phone', 'nationality', 'birthDate', 'gender', 'organization', 'position'];
    fields.forEach(f => { total += 1; if (profileData && (profileData as any)[f]) filled += 1; });
    total += 1; if (passportData?.passportNumber) filled += 1;
    total += 1; if (onboardingStatus?.onboardingCompleted) filled += 1;
    return Math.round((filled / total) * 100);
  })();

  const secondaryFeatures = [
    { icon: Shield, titleKey: "home.feat_passport", descKey: "home.feat_passport_desc" },
    { icon: Plane, titleKey: "home.feat_flight", descKey: "home.feat_flight_desc" },
    { icon: Car, titleKey: "home.feat_pickup", descKey: "home.feat_pickup_desc" },
    { icon: Hotel, titleKey: "home.feat_hotel", descKey: "home.feat_hotel_desc" },
    { icon: MessageCircle, titleKey: "home.feat_comm", descKey: "home.feat_comm_desc" },
    { icon: MapPin, titleKey: "home.feat_country", descKey: "home.feat_country_desc" },
    { icon: Globe, titleKey: "home.feat_telegram", descKey: "home.feat_telegram_desc" },
    { icon: Search, titleKey: "home.feat_data", descKey: "home.feat_data_desc" },
    { icon: Luggage, titleKey: "home.feat_baggage", descKey: "home.feat_baggage_desc" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ===== HEADER - Trip.com Style ===== */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/95">
        <div className="container flex items-center justify-between h-14 gap-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-lg hidden sm:inline" style={{ fontFamily: 'Inter, sans-serif' }}>Alpha Trip</span>
          </Link>

          {/* Search Bar - Trip.com style */}
          <div
            className="flex-1 max-w-md mx-2 cursor-pointer"
            onClick={() => navigate("/booking")}
          >
            <div className="flex items-center gap-2 bg-muted/60 hover:bg-muted rounded-full px-4 py-2 transition-colors border border-border/50">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{t("home.searchPlaceholder", "어디로 가세요?")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <LanguageSelector />
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">{user?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link href="/my-page" className="cursor-pointer"><User className="h-4 w-4 mr-2" />{t("nav.myProfile")}</Link>
                  </DropdownMenuItem>
                  {(user?.role === "admin" || user?.role === "superadmin") && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer"><LayoutDashboard className="h-4 w-4 mr-2" />{t("nav.backoffice")}</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer"><LayoutDashboard className="h-4 w-4 mr-2" />{t("nav.dashboard")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/flight-pickup" className="cursor-pointer"><Plane className="h-4 w-4 mr-2" />{t("nav.flightPickup")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/community" className="cursor-pointer"><MessageCircle className="h-4 w-4 mr-2" />{t("nav.community", "커뮤니티")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/immigration-checklist" className="cursor-pointer"><Shield className="h-4 w-4 mr-2" />{t("nav.immigrationChecklist", "입국 체크리스트")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={async () => { await logout(); window.location.href = "/"; }}>
                    <LogOut className="h-4 w-4 mr-2" />{t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">{t("home.loginBtn")}</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Onboarding Banner for authenticated users */}
      {needsOnboarding && (
        <section className="bg-primary/10 border-b border-primary/20">
          <div className="container py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-foreground">{t("home.onboardingBanner", "프로필 설정을 완료하면 모든 기능을 이용할 수 있습니다.")}</span>
            </div>
            <Link href="/onboarding">
              <Button size="sm" variant="default" className="gap-1 whitespace-nowrap">
                {t("home.completeOnboarding", "프로필 설정하기")}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* ===== MAIN CONTENT - Trip.com App Style ===== */}
      <main className="pb-20 md:pb-0">

        {/* ── Service Icon Grid - Categorized with glassmorphism ── */}
        <section className="pt-5 pb-2">
          <div className="container max-w-lg mx-auto px-4">

            {/* Category: Core - 밋업/출장 핵심 */}
            <div className="mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">{t("home.cat_core", "밋업 관리")}</span>
            </div>
            <div className="grid grid-cols-4 gap-y-4 gap-x-2 mb-5">
              {CORE_ICONS.map((svc, i) => (
                <Link key={`core-${i}`} href={svc.href}>
                  <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
                    <div className={`relative w-[52px] h-[52px] md:w-[60px] md:h-[60px] rounded-2xl bg-gradient-to-br ${svc.gradient} flex items-center justify-center shadow-lg ring-2 ${svc.ring} group-hover:scale-110 group-hover:shadow-xl transition-all duration-200`}>
                      <svc.icon className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow" />
                    </div>
                    <span className="text-[11px] font-medium text-foreground text-center leading-tight">{t(svc.label)}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Category: Work Support - 업무 지원 */}
            <div className="mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400">{t("home.cat_work", "이동/숙박")}</span>
            </div>
            <div className="grid grid-cols-4 gap-y-4 gap-x-2 mb-4">
              {WORK_ICONS.map((svc, i) => (
                <Link key={`work-${i}`} href={svc.href}>
                  <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
                    <div className={`relative w-[52px] h-[52px] md:w-[60px] md:h-[60px] rounded-2xl bg-gradient-to-br ${svc.gradient} flex items-center justify-center shadow-lg ring-2 ${svc.ring} group-hover:scale-110 group-hover:shadow-xl transition-all duration-200`}>
                      <svc.icon className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow" />
                    </div>
                    <span className="text-[11px] font-medium text-foreground text-center leading-tight">{t(svc.label)}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* More services toggle */}
            {showMoreServices && (
              <>
                <div className="mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-500 dark:text-purple-400">{t("home.cat_extra", "부가 서비스")}</span>
                </div>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {EXTRA_ICONS.map((svc, i) => (
                    <Link key={`extra-${i}`} href={svc.href}>
                      <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
                        <div className={`relative w-[52px] h-[52px] md:w-[60px] md:h-[60px] rounded-2xl bg-gradient-to-br ${svc.gradient} flex items-center justify-center shadow-lg ring-2 ${svc.ring} group-hover:scale-110 group-hover:shadow-xl transition-all duration-200`}>
                          <svc.icon className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow" />
                        </div>
                        <span className="text-[11px] font-medium text-foreground text-center leading-tight">{t(svc.label)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Toggle button */}
            <div className="flex items-center justify-center mt-2">
              <button
                onClick={() => setShowMoreServices(!showMoreServices)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-3 rounded-full hover:bg-muted/50"
              >
                {showMoreServices ? t("home.showLess", "접기") : t("home.showMore", "더 보기")}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showMoreServices ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>
        </section>

        {/* ── Promo Carousel (Trip.com style auto-slide) ── */}
        <section className="py-4">
          <div className="container max-w-lg mx-auto px-4">
            <PromoCarousel
              slides={[
                {
                  id: "usdt",
                  imageUrl: IMAGES.promoUsdt,
                  href: "/booking",
                },
                {
                  id: "vat",
                  imageUrl: IMAGES.promoVat,
                  href: "/ride",
                },
                {
                  id: "ride",
                  imageUrl: IMAGES.promoRide,
                  href: "/ride",
                },
                {
                  id: "delivery",
                  imageUrl: IMAGES.promoDelivery,
                  href: "/delivery",
                },
                {
                  id: "cruise",
                  imageUrl: IMAGES.promoCruise,
                  href: "/booking",
                },
              ]}
              autoPlayInterval={4000}
            />

            {/* CTA Buttons below carousel */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Link href="/booking">
                <Button variant="outline" className="w-full h-11 text-sm font-semibold rounded-xl border-2 border-foreground/20 hover:border-primary hover:bg-primary/5">
                  {t("home.promoSearchBtn", "예약 검색")}
                </Button>
              </Link>
              {isAuthenticated ? (
                <Link href="/my-page">
                  <Button className="w-full h-11 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                    {t("home.promoMyPageBtn", "마이페이지")}
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button className="w-full h-11 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                    {t("home.promoLoginBtn", "로그인/회원가입")}
                  </Button>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ── Profile Completion (authenticated only) ── */}
        {isAuthenticated && (
          <section className="py-2">
            <div className="container max-w-lg mx-auto px-4">
              <div className="bg-card border border-border/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t("home.profileCompletion", "프로필 완성도")}</span>
                  <span className="text-sm font-bold text-primary">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="h-2 mb-2" />
                {profileCompletion < 100 && (
                  <Link href="/my-page" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />{t("home.completeProfile", "프로필 완성하기")}
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Ad Banner - Dynamic from DB ── */}
        {(() => {
          const ad1 = getAdByPosition("hero_top");
          const imgSrc = ad1?.imageUrl || IMAGES.adTravel;
          const linkUrl = ad1?.linkUrl || "https://www.trip.com";
          const title = ad1?.title || t("home.ad_travel_title", "꿈의 여행지를 찾아보세요");
          return (
            <section className="py-3">
              <div className="container max-w-lg mx-auto px-4">
                <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block relative rounded-xl overflow-hidden group cursor-pointer" onClick={() => ad1 && trackClick.mutate({ id: ad1.id })}>
                  <img src={imgSrc} alt={title} className="w-full h-36 md:h-44 object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
                    <div className="px-6">
                      <Badge className="bg-amber-500 text-white mb-2 text-xs">AD</Badge>
                      <h3 className="text-white text-lg font-bold mb-0.5">{title}</h3>
                    </div>
                  </div>
                </a>
              </div>
            </section>
          );
        })()}

        {/* ── Quick Info Bar ── */}
        <section className="py-3">
          <div className="container max-w-lg mx-auto px-4">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>{t("home.infoBar1", "24시간 고객센터")}</span>
              </div>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-amber-500" />
                <span>{t("home.infoBar2", "예약할 때마다 쌓이는 혜택")}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Settings Section (Trip.com style) ── */}
        <section className="py-2">
          <div className="container max-w-lg mx-auto px-4">
            <div className="border-t border-border/50 pt-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">{t("home.settingsTitle", "설정")}</h4>
              <div className="space-y-0">
                <div className="flex items-center gap-3 py-3 border-b border-border/30">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm flex-1">{t("home.settingLang", "한국어")}</span>
                  <LanguageSelector />
                </div>
                <div className="flex items-center gap-3 py-3 border-b border-border/30">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm flex-1">{t("home.settingCurrency", "USDT")}</span>
                  <span className="text-xs text-muted-foreground">Tether</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Service Menu: 밋업/출장 관리 ── */}
        <section className="py-2">
          <div className="container max-w-lg mx-auto px-4">
            <div className="border-t border-border/50 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-indigo-500" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">{t("home.svc_core_title", "밋업/출장 관리")}</h4>
                <span className="text-[10px] text-muted-foreground">{t("home.svc_core_desc", "초청, 일정, 소통을 한 곳에서")}</span>
              </div>
              <div className="space-y-0">
                <Link href="/register">
                  <div className="flex items-center gap-3 py-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <Users className="h-5 w-5 text-indigo-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_meetup")}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <Link href="/lookup">
                  <div className="flex items-center gap-3 py-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <UserCheck className="h-5 w-5 text-violet-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_invite")}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <Link href="/dashboard">
                  <div className="flex items-center gap-3 py-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <CalendarDays className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_schedule")}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <Link href="/community">
                  <div className="flex items-center gap-3 py-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <MessageCircle className="h-5 w-5 text-sky-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_chat")}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <Link href="/community">
                  <div className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <Video className="h-5 w-5 text-pink-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_video_call")}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">NEW</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Service Menu: 이동/숙박 예약 ── */}
        <section className="py-2">
          <div className="container max-w-lg mx-auto px-4">
            <div className="border-t border-border/50 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-amber-500" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">{t("home.svc_travel_title", "이동/숙박 예약")}</h4>
                <span className="text-[10px] text-muted-foreground">{t("home.svc_travel_desc", "항공, 호텔, 철도를 쉽게 예약")}</span>
              </div>
              <div className="space-y-0">
                <Link href="/booking">
                  <div className="flex items-center gap-3 py-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <Plane className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_flights")}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <Link href="/booking">
                  <div className="flex items-center gap-3 py-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <Hotel className="h-5 w-5 text-rose-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_hotels")}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <Link href="/booking">
                  <div className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <Train className="h-5 w-5 text-slate-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_rail")}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Service Menu: 자유시간 서비스 ── */}
        <section className="py-2 pb-6">
          <div className="container max-w-lg mx-auto px-4">
            <div className="border-t border-border/50 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-purple-500" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">{t("home.svc_personal_title", "자유시간 서비스")}</h4>
                <span className="text-[10px] text-muted-foreground">{t("home.svc_personal_desc", "차량, 배달, 지도 등 개인 서비스")}</span>
              </div>
              <div className="space-y-0">
                <Link href="/ride">
                  <div className="flex items-center gap-3 py-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <Car className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_ride")}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">NEW</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <Link href="/delivery">
                  <div className="flex items-center gap-3 py-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <UtensilsCrossed className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_delivery")}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">NEW</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <Link href="/booking">
                  <div className="flex items-center gap-3 py-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <Map className="h-5 w-5 text-teal-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_map")}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <Link href="/chatbot">
                  <div className="flex items-center gap-3 py-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <Bot className="h-5 w-5 text-cyan-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_ai")}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <Link href="/immigration-checklist">
                  <div className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <Compass className="h-5 w-5 text-lime-500" />
                    <span className="text-sm font-medium flex-1">{t("home.menu_guide")}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 mb-16 md:mb-0 bg-muted/20">
        <div className="container max-w-lg mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-6 w-6 rounded" />
            <span className="font-bold text-sm">Alpha Trip</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{t("home.footer_desc", "글로벌 밋업 & 여행 자동화 플랫폼")}</p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/booking" className="hover:text-foreground transition-colors">{t("home.bookingCenterTitle")}</Link>
            <Link href="/ride" className="hover:text-foreground transition-colors">{t("home.rideHailingTitle", "Ride")}</Link>
            <Link href="/delivery" className="hover:text-foreground transition-colors">{t("home.foodDeliveryTitle", "Delivery")}</Link>
            <a href="https://t.me/alphatrip" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Telegram</a>
          </div>
          <div className="border-t border-border/30 mt-4 pt-4 text-xs text-muted-foreground">
            <p>{t("home.footer")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
