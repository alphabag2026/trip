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
  UtensilsCrossed, Bike
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";

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
};

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();

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

  const primaryFeatures = [
    { icon: ClipboardList, titleKey: "home.feat_register", descKey: "home.feat_register_desc", href: "/register", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Ticket, titleKey: "home.bookingCenterTitle", descKey: "home.bookingCenterDesc", href: "/booking", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Bot, titleKey: "home.feat_ai", descKey: "home.feat_ai_desc", href: "/chatbot", color: "text-purple-500", bg: "bg-purple-500/10" },
    { icon: Car, titleKey: "home.rideHailingTitle", descKey: "home.rideHailingDesc", href: "/ride", color: "text-violet-500", bg: "bg-violet-500/10" },
    { icon: UtensilsCrossed, titleKey: "home.foodDeliveryTitle", descKey: "home.foodDeliveryDesc", href: "/delivery", color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

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
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>Alpha Trip</span>
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm">
            {isAuthenticated ? (
              <>
                <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors font-medium">{t("nav.register")}</Link>
                <Link href="/lookup" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.lookup")}</Link>
                <Link href="/booking" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Ticket className="h-3.5 w-3.5" />
                  {t("nav.bookingCenter", "예약센터")}
                </Link>
                <Link href="/chatbot" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Bot className="h-3.5 w-3.5" />
                  {t("nav.chatbot")}
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm">
                      <MoreHorizontal className="h-4 w-4" />
                      {t("nav.more", "더보기")}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/my-page" className="cursor-pointer flex items-center gap-2">
                        <User className="h-4 w-4" />{t("nav.myProfile")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/flight-pickup" className="cursor-pointer flex items-center gap-2">
                        <Plane className="h-4 w-4" />{t("nav.flightPickup")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/community" className="cursor-pointer flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />{t("nav.community", "커뮤니티")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/flight-tracker" className="cursor-pointer flex items-center gap-2">
                        <Luggage className="h-4 w-4" />{t("nav.flightTracker")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/immigration-checklist" className="cursor-pointer flex items-center gap-2">
                        <Shield className="h-4 w-4" />{t("nav.immigrationChecklist", "입국 체크리스트")}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">{t("home.navFeatures")}</a>
                <a href="#roles" className="text-muted-foreground hover:text-foreground transition-colors">{t("home.navRoles")}</a>
                <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">{t("home.navHow")}</a>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSelector />
            {isAuthenticated && (user?.role === "admin" || user?.role === "superadmin") && (
              <Link href="/admin"><Button variant="outline" size="sm">{t("nav.backoffice")}</Button></Link>
            )}
            {isAuthenticated && user?.role !== "admin" && user?.role !== "superadmin" && (
              <Link href="/dashboard">
                <Button variant="outline" size="sm"><LayoutDashboard className="h-4 w-4 mr-1" />{t("nav.dashboard")}</Button>
              </Link>
            )}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/my-page" className="cursor-pointer"><User className="h-4 w-4 mr-2" />{t("home.myPageBtn")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={async () => { await logout(); window.location.href = "/"; }}>
                    <LogOut className="h-4 w-4 mr-2" />{t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login"><Button variant="ghost" size="sm" className="gap-1"><LogIn className="h-4 w-4" />{t("home.loginBtn")}</Button></Link>
                <Link href="/login?tab=register"><Button size="sm" className="gap-1"><UserPlus className="h-4 w-4" />{t("nav.signup")}</Button></Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== NON-AUTHENTICATED LANDING ===== */}
      {!isAuthenticated && (
        <>
          {/* Hero Section with Full-Width Image */}
          <section className="relative overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={IMAGES.heroBanner}
                alt="Global networking event"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
            </div>
            <div className="relative container py-24 md:py-36 lg:py-44">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm mb-6 border border-white/20">
                  <Globe className="h-4 w-4" />
                  {t("home.badge")}
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-white leading-tight">
                  {t("home.title1")}<br />
                  <span className="text-blue-400">{t("home.title2")}</span> {t("home.title3")}
                </h1>
                <p className="text-lg md:text-xl text-white/80 mb-10 leading-relaxed max-w-xl">
                  {t("home.desc")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/login?tab=register">
                    <Button size="lg" className="text-base px-8 gap-2 h-13 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30">
                      <UserPlus className="h-5 w-5" />
                      {t("home.signupFree")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="text-base px-8 gap-2 h-13 border-white/30 text-white hover:bg-white/10 bg-transparent">
                      <LogIn className="h-5 w-5" />
                      {t("home.loginBtn")}
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-6 mt-8 text-white/60 text-sm">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{t("home.signupHint")}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Bar */}
          <section className="bg-card border-b border-border/50">
            <div className="container py-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {[
                  { value: "5,000+", label: t("home.stat_users", "글로벌 사용자") },
                  { value: "200+", label: t("home.stat_meetups", "밋업 운영") },
                  { value: "50+", label: t("home.stat_countries", "지원 국가") },
                  { value: "23", label: t("home.stat_languages", "지원 언어") },
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Ad Banner 1 - Dynamic from DB (hero_top) */}
          {(() => {
            const ad1 = getAdByPosition("hero_top");
            const imgSrc = ad1?.imageUrl || IMAGES.adTravel;
            const linkUrl = ad1?.linkUrl || "https://www.trip.com";
            const title = ad1?.title || t("home.ad_travel_title", "꾿의 여행지를 찾아보세요");
            const desc = ad1?.description || t("home.ad_travel_desc", "전 세계 최저가 항공권 & 호텔 예약");
            return (
              <section className="py-4 bg-muted/30">
                <div className="container">
                  <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block relative rounded-xl overflow-hidden group cursor-pointer" onClick={() => ad1 && trackClick.mutate({ id: ad1.id })}>
                    <img src={imgSrc} alt={title} className="w-full h-32 md:h-48 object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
                      <div className="px-8">
                        <Badge className="bg-amber-500 text-white mb-2 text-xs">AD</Badge>
                        <h3 className="text-white text-lg md:text-2xl font-bold mb-1">{title}</h3>
                        <p className="text-white/80 text-sm hidden md:block">{desc}</p>
                      </div>
                    </div>
                  </a>
                </div>
              </section>
            );
          })()}

          {/* ══ Quick Services - App Style Cards ══ */}
          <section className="py-12 bg-gradient-to-b from-background to-muted/20">
            <div className="container">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("home.quickServicesTitle")}</h2>
                  <p className="text-muted-foreground text-sm mt-1">{t("home.quickServicesDesc")}</p>
                </div>
                <Badge variant="outline" className="hidden md:flex gap-1.5 px-3 py-1.5 text-xs font-medium border-primary/30 text-primary">
                  <Play className="h-3 w-3" />
                  {t("home.demoMode")}
                </Badge>
              </div>

              {/* Ride-Hailing Card */}
              <Link href="/ride">
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 md:p-8 mb-4 cursor-pointer transition-all hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                  <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg">
                          🚕
                        </div>
                        <div>
                          <span className="text-white/60 text-xs font-medium uppercase tracking-wider">{t("home.feat_ride_label")}</span>
                          <h3 className="text-xl md:text-2xl font-bold text-white">{t("home.feat_ride_title")}</h3>
                        </div>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed max-w-lg mb-4">
                        {t("home.feat_ride_desc")}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge className="bg-white/15 text-white border-0 text-xs">{t("home.feat_tag_ride1")}</Badge>
                        <Badge className="bg-white/15 text-white border-0 text-xs">{t("home.feat_tag_ride2")}</Badge>
                        <Badge className="bg-white/15 text-white border-0 text-xs">{t("home.feat_tag_ride3")}</Badge>
                      </div>
                      <div className="inline-flex items-center gap-2 text-white font-medium text-sm group-hover:gap-3 transition-all">
                        {t("home.tryNow")} <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="hidden md:flex flex-col gap-2 min-w-[200px]">
                      {[{emoji: '🚗', label: 'Economy', price: '$3.50'}, {emoji: '🚙', label: 'Comfort', price: '$5.80'}, {emoji: '🏎️', label: 'Premium', price: '$12.00'}].map((v, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 group-hover:bg-white/15 transition-colors">
                          <span className="text-lg">{v.emoji}</span>
                          <div className="flex-1">
                            <div className="text-white text-sm font-medium">{v.label}</div>
                          </div>
                          <div className="text-white/80 text-sm font-mono">~{v.price}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>

              {/* Food Delivery Card */}
              <Link href="/delivery">
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 p-6 md:p-8 mb-4 cursor-pointer transition-all hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                  <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg">
                          🍽️
                        </div>
                        <div>
                          <span className="text-white/60 text-xs font-medium uppercase tracking-wider">{t("home.feat_delivery_label")}</span>
                          <h3 className="text-xl md:text-2xl font-bold text-white">{t("home.feat_delivery_title")}</h3>
                        </div>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed max-w-lg mb-4">
                        {t("home.feat_delivery_desc")}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge className="bg-white/15 text-white border-0 text-xs">{t("home.feat_tag_delivery1")}</Badge>
                        <Badge className="bg-white/15 text-white border-0 text-xs">{t("home.feat_tag_delivery2")}</Badge>
                        <Badge className="bg-white/15 text-white border-0 text-xs">{t("home.feat_tag_delivery3")}</Badge>
                      </div>
                      <div className="inline-flex items-center gap-2 text-white font-medium text-sm group-hover:gap-3 transition-all">
                        {t("home.tryNow")} <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="hidden md:grid grid-cols-3 gap-2 min-w-[240px]">
                      {[{emoji: '🍜', label: 'Thai'}, {emoji: '🍣', label: 'Japanese'}, {emoji: '🍲', label: 'Vietnamese'}, {emoji: '🥘', label: 'Korean'}, {emoji: '🍔', label: 'Western'}, {emoji: '🍰', label: 'Dessert'}].map((c, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 group-hover:bg-white/15 transition-colors">
                          <span className="text-xl">{c.emoji}</span>
                          <span className="text-white/80 text-[10px] font-medium">{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>

              {/* Booking Center Card (smaller) */}
              <Link href="/booking">
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 md:p-6 cursor-pointer transition-all hover:shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                  <div className="relative flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shadow-lg">✈️</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{t("home.bookingCenterTitle")}</h3>
                      <p className="text-white/70 text-xs">{t("home.bookingCenterDesc")}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {/* Feature Showcase - Image + Text Alternating */}
          <section id="features" className="py-20">
            <div className="container">
              <div className="text-center mb-16">
                <Badge variant="outline" className="mb-4 text-sm px-4 py-1">{t("home.navFeatures")}</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.features")}</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                  {t("home.featuresSubtitle", "밋업 기획부터 여행 관리까지, 하나의 플랫폼에서 모두 해결하세요")}
                </p>
              </div>

              {/* Feature 1: Meetup Management */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <img src={IMAGES.featureMeetup} alt="Meetup management" className="w-full h-72 md:h-96 object-cover" />
                </div>
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium">
                    <ClipboardList className="h-4 w-4" />
                    {t("home.feat_meetup_label", "밋업 관리")}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold leading-tight">
                    {t("home.feat_meetup_title", "글로벌 밋업을 손쉽게 기획하고 관리하세요")}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {t("home.feat_meetup_desc", "참가자 등록부터 항공편 관리, 숙소 배정, 일정 관리까지 모든 것을 하나의 대시보드에서 관리합니다. 실시간 알림과 자동화로 운영 효율을 극대화하세요.")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {[t("home.feat_tag1", "참가자 관리"), t("home.feat_tag2", "자동 알림"), t("home.feat_tag3", "엑셀 내보내기")].map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-sm px-3 py-1">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feature 2: Travel Automation (reversed) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
                <div className="space-y-6 order-2 lg:order-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                    <Plane className="h-4 w-4" />
                    {t("home.feat_travel_label", "여행 자동화")}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold leading-tight">
                    {t("home.feat_travel_title", "항공편, 호텔, 픽업까지 원스톱 관리")}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {t("home.feat_travel_desc", "항공편 실시간 추적, 호텔 바우처 자동 배정, 공항 픽업 배치까지. 여행의 모든 과정을 자동화하여 참가자와 주최자 모두에게 편리한 경험을 제공합니다.")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {[t("home.feat_tag4", "실시간 추적"), t("home.feat_tag5", "바우처 관리"), t("home.feat_tag6", "픽업 배치")].map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-sm px-3 py-1">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden shadow-2xl order-1 lg:order-2">
                  <img src={IMAGES.featureTravel} alt="Travel automation" className="w-full h-72 md:h-96 object-cover" />
                </div>
              </div>

              {/* Feature 3: Booking Center */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <img src={IMAGES.featureBooking} alt="Booking center" className="w-full h-72 md:h-96 object-cover" />
                </div>
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm font-medium">
                    <Ticket className="h-4 w-4" />
                    {t("home.feat_booking_label", "예약 센터")}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold leading-tight">
                    {t("home.feat_booking_title", "항공권과 호텔을 한 곳에서 비교하세요")}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {t("home.feat_booking_desc", "Trip.com, Booking.com, Agoda 등 주요 플랫폼의 가격을 한눈에 비교하고 최저가로 예약하세요. 텔레그램으로 검색 결과를 바로 공유할 수도 있습니다.")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {[t("home.feat_tag7", "가격 비교"), t("home.feat_tag8", "최저가 검색"), t("home.feat_tag9", "텔레그램 공유")].map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-sm px-3 py-1">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Ad Banner 2 - Dynamic from DB (middle_left + middle_right) */}
          {(() => {
            const adLeft = getAdByPosition("middle_left");
            const adRight = getAdByPosition("middle_right");
            const leftImg = adLeft?.imageUrl || IMAGES.adHotel;
            const leftLink = adLeft?.linkUrl || "https://www.booking.com";
            const leftTitle = adLeft?.title || t("home.ad_hotel_title", "특급 호텔 최대 40% 할인");
            const leftDesc = adLeft?.description || t("home.ad_hotel_desc", "전 세계 프리미엄 호텔을 특별 가격에 만나보세요");
            const rightImg = adRight?.imageUrl || IMAGES.adCruise;
            const rightLink = adRight?.linkUrl || "https://www.klook.com";
            const rightTitle = adRight?.title || t("home.ad_cruise_title", "크루즈 여행");
            return (
              <section className="py-4 bg-muted/30">
                <div className="container">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a href={leftLink} target="_blank" rel="noopener noreferrer" className="md:col-span-2 block relative rounded-xl overflow-hidden group cursor-pointer" onClick={() => adLeft && trackClick.mutate({ id: adLeft.id })}>
                      <img src={leftImg} alt={leftTitle} className="w-full h-40 md:h-52 object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                        <div className="p-6">
                          <Badge className="bg-amber-500 text-white mb-2 text-xs">AD</Badge>
                          <h3 className="text-white text-lg md:text-xl font-bold mb-1">{leftTitle}</h3>
                          <p className="text-white/80 text-sm">{leftDesc}</p>
                        </div>
                      </div>
                    </a>
                    <a href={rightLink} target="_blank" rel="noopener noreferrer" className="block relative rounded-xl overflow-hidden group cursor-pointer" onClick={() => adRight && trackClick.mutate({ id: adRight.id })}>
                      <img src={rightImg} alt={rightTitle} className="w-full h-40 md:h-52 object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                        <div className="p-4">
                          <Badge className="bg-amber-500 text-white mb-2 text-xs">AD</Badge>
                          <h3 className="text-white text-base font-bold">{rightTitle}</h3>
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Roles Section with Images */}
          <section id="roles" className="py-20">
            <div className="container">
              <div className="text-center mb-16">
                <Badge variant="outline" className="mb-4 text-sm px-4 py-1">{t("home.navRoles")}</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.rolesTitle")}</h2>
                <p className="text-muted-foreground max-w-xl mx-auto text-lg">{t("home.rolesDesc")}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: Briefcase, titleKey: "home.role_organizer", descKey: "home.role_organizer_desc", color: "from-blue-500 to-blue-600", iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
                  { icon: Building2, titleKey: "home.role_agency", descKey: "home.role_agency_desc", color: "from-emerald-500 to-emerald-600", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
                  { icon: Hotel, titleKey: "home.role_partner", descKey: "home.role_partner_desc", color: "from-amber-500 to-amber-600", iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
                  { icon: Users, titleKey: "home.role_attendee", descKey: "home.role_attendee_desc", color: "from-purple-500 to-purple-600", iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
                ].map((role, i) => (
                  <Card key={i} className="group border-border/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className={`h-2 bg-gradient-to-r ${role.color}`} />
                    <CardContent className="p-6 text-center">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${role.iconBg} mb-5 group-hover:scale-110 transition-transform`}>
                        <role.icon className={`h-8 w-8 ${role.iconColor}`} />
                      </div>
                      <h3 className="font-bold text-lg mb-3">{t(role.titleKey)}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{t(role.descKey)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonial / Social Proof Section */}
          <section className="relative py-20 overflow-hidden">
            <div className="absolute inset-0">
              <img src={IMAGES.testimonialBg} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            </div>
            <div className="relative container text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-12">{t("home.testimonial_title", "전 세계 주최자들이 신뢰합니다")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {[
                  { name: "Kim S.", role: t("home.testimonial_role1", "밋업 주최자"), text: t("home.testimonial1", "Alpha Trip 덕분에 50명 규모의 해외 밋업을 혼자서도 완벽하게 관리할 수 있었습니다. 항공편 추적부터 숙소 배정까지 정말 편리해요."), stars: 5 },
                  { name: "David L.", role: t("home.testimonial_role2", "여행사 대표"), text: t("home.testimonial2", "파트너 관리와 참가자 소통이 한 곳에서 이루어져서 업무 효율이 3배 이상 올랐습니다. 다국어 지원도 큰 장점이에요."), stars: 5 },
                  { name: "Yuki T.", role: t("home.testimonial_role3", "이벤트 매니저"), text: t("home.testimonial3", "실시간 커뮤니티 채팅과 AI 챗봇이 참가자 문의를 대폭 줄여줬어요. 이제 더 중요한 일에 집중할 수 있습니다."), stars: 5 },
                ].map((t, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-left">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: t.stars }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-white/90 text-sm leading-relaxed mb-4">"{t.text}"</p>
                    <div>
                      <div className="font-semibold text-white text-sm">{t.name}</div>
                      <div className="text-white/60 text-xs">{t.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How it Works */}
          <section id="how-it-works" className="py-20">
            <div className="container">
              <div className="text-center mb-16">
                <Badge variant="outline" className="mb-4 text-sm px-4 py-1">{t("home.navHow")}</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.howTitle")}</h2>
                <p className="text-muted-foreground max-w-xl mx-auto text-lg">{t("home.howDesc")}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {[
                  { step: "1", titleKey: "home.step1", descKey: "home.step1_desc", icon: UserPlus, color: "bg-blue-500" },
                  { step: "2", titleKey: "home.step2", descKey: "home.step2_desc", icon: Shield, color: "bg-emerald-500" },
                  { step: "3", titleKey: "home.step3", descKey: "home.step3_desc", icon: CheckCircle2, color: "bg-purple-500" },
                ].map((item, i) => (
                  <div key={i} className="text-center relative">
                    {i < 2 && (
                      <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-border" />
                    )}
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                      <item.icon className="h-7 w-7 text-primary" />
                      <span className={`absolute -top-2 -right-2 w-7 h-7 rounded-full ${item.color} text-white text-sm font-bold flex items-center justify-center shadow-lg`}>
                        {item.step}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{t(item.titleKey)}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{t(item.descKey)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Community Section with Image */}
          <section className="py-16 bg-muted/30">
            <div className="container">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm font-medium">
                    <MessageCircle className="h-4 w-4" />
                    {t("home.community_label", "커뮤니티")}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold leading-tight">
                    {t("home.community_title", "전 세계 여행자들과 소통하세요")}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {t("home.community_desc", "실시간 채팅, 영상 통화, 자동 번역 기능으로 언어 장벽 없이 전 세계 참가자들과 소통할 수 있습니다. 미디어 공유, 위치 공유 등 다양한 기능을 활용해보세요.")}
                  </p>
                  <Link href="/login?tab=register">
                    <Button size="lg" className="gap-2">
                      {t("home.community_join", "커뮤니티 참여하기")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <img src={IMAGES.featureCommunity} alt="Community" className="w-full h-72 md:h-96 object-cover" />
                </div>
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="py-20">
            <div className="container text-center">
              <div className="max-w-3xl mx-auto relative overflow-hidden rounded-3xl">
                <div className="absolute inset-0">
                  <img src={IMAGES.featurePassport} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 to-purple-900/80" />
                </div>
                <div className="relative p-12 md:p-16">
                  <h2 className="text-2xl md:text-4xl font-bold mb-4 text-white">{t("home.ctaTitle")}</h2>
                  <p className="text-white/80 mb-8 text-lg">{t("home.ctaDesc")}</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/login?tab=register">
                      <Button size="lg" className="text-base px-8 gap-2 h-13 bg-white text-blue-900 hover:bg-white/90 shadow-lg">
                        <UserPlus className="h-5 w-5" />
                        {t("home.signupFree")}
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button size="lg" variant="outline" className="text-base px-8 gap-2 h-13 border-white/30 text-white hover:bg-white/10 bg-transparent">
                        <LogIn className="h-5 w-5" />
                        {t("home.ctaLogin")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ===== AUTHENTICATED SECTION ===== */}
      {isAuthenticated && (
        <>
          {/* Onboarding Banner */}
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

          {/* Authenticated Hero */}
          <section className="py-12 md:py-16">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-2">
                      {t("home.welcomeUser", { name: user?.name })}
                    </h1>
                    <p className="text-muted-foreground">{t("home.welcomeDesc")}</p>
                  </div>
                  <div className="w-full md:w-64 bg-card border border-border/50 rounded-xl p-4">
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

                <div className="flex flex-wrap gap-3 mb-8">
                  <Link href="/register"><Button size="lg" className="gap-2"><ClipboardList className="h-5 w-5" />{t("home.applyBtn")}</Button></Link>
                  <Link href="/my-page"><Button size="lg" variant="outline" className="gap-2"><User className="h-5 w-5" />{t("home.myPageBtn")}</Button></Link>
                  <Link href="/lookup"><Button size="lg" variant="outline" className="gap-2"><Search className="h-5 w-5" />{t("home.lookupBtn")}</Button></Link>
                </div>

                {/* ══ Quick Services - App Style Cards (same as non-auth) ══ */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight">{t("home.quickServicesTitle")}</h2>
                      <p className="text-muted-foreground text-sm mt-0.5">{t("home.quickServicesDescAuth", t("home.quickServicesDesc"))}</p>
                    </div>
                  </div>

                  {/* Ride-Hailing Card */}
                  <Link href="/ride">
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 md:p-8 mb-4 cursor-pointer transition-all hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-0.5">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                      <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg">🚕</div>
                            <div>
                              <span className="text-white/60 text-xs font-medium uppercase tracking-wider">{t("home.feat_ride_label")}</span>
                              <h3 className="text-xl md:text-2xl font-bold text-white">{t("home.feat_ride_title")}</h3>
                            </div>
                          </div>
                          <p className="text-white/70 text-sm leading-relaxed max-w-lg mb-4">{t("home.feat_ride_desc")}</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge className="bg-white/15 text-white border-0 text-xs">{t("home.feat_tag_ride1")}</Badge>
                            <Badge className="bg-white/15 text-white border-0 text-xs">{t("home.feat_tag_ride2")}</Badge>
                            <Badge className="bg-white/15 text-white border-0 text-xs">{t("home.feat_tag_ride3")}</Badge>
                          </div>
                          <div className="inline-flex items-center gap-2 text-white font-medium text-sm group-hover:gap-3 transition-all">
                            {t("home.tryNow")} <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="hidden md:flex flex-col gap-2 min-w-[200px]">
                          {[{emoji: '🚗', label: 'Economy', price: '$3.50'}, {emoji: '🚙', label: 'Comfort', price: '$5.80'}, {emoji: '🏎️', label: 'Premium', price: '$12.00'}].map((v, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 group-hover:bg-white/15 transition-colors">
                              <span className="text-lg">{v.emoji}</span>
                              <div className="flex-1"><div className="text-white text-sm font-medium">{v.label}</div></div>
                              <div className="text-white/80 text-sm font-mono">~{v.price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Food Delivery Card */}
                  <Link href="/delivery">
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 p-6 md:p-8 mb-4 cursor-pointer transition-all hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-0.5">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                      <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg">🍽️</div>
                            <div>
                              <span className="text-white/60 text-xs font-medium uppercase tracking-wider">{t("home.feat_delivery_label")}</span>
                              <h3 className="text-xl md:text-2xl font-bold text-white">{t("home.feat_delivery_title")}</h3>
                            </div>
                          </div>
                          <p className="text-white/70 text-sm leading-relaxed max-w-lg mb-4">{t("home.feat_delivery_desc")}</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge className="bg-white/15 text-white border-0 text-xs">{t("home.feat_tag_delivery1")}</Badge>
                            <Badge className="bg-white/15 text-white border-0 text-xs">{t("home.feat_tag_delivery2")}</Badge>
                            <Badge className="bg-white/15 text-white border-0 text-xs">{t("home.feat_tag_delivery3")}</Badge>
                          </div>
                          <div className="inline-flex items-center gap-2 text-white font-medium text-sm group-hover:gap-3 transition-all">
                            {t("home.tryNow")} <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="hidden md:grid grid-cols-3 gap-2 min-w-[240px]">
                          {[{emoji: '🍜', label: 'Thai'}, {emoji: '🍣', label: 'Japanese'}, {emoji: '🍲', label: 'Vietnamese'}, {emoji: '🥘', label: 'Korean'}, {emoji: '🍔', label: 'Western'}, {emoji: '🍰', label: 'Dessert'}].map((c, i) => (
                            <div key={i} className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 group-hover:bg-white/15 transition-colors">
                              <span className="text-xl">{c.emoji}</span>
                              <span className="text-white/80 text-[10px] font-medium">{c.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Quick Action Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Link href="/booking">
                      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-0.5">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                        <div className="relative flex items-center gap-4">
                          <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shadow-lg">✈️</div>
                          <div className="flex-1">
                            <h3 className="text-base font-bold text-white">{t("home.bookingCenterTitle")}</h3>
                            <p className="text-white/70 text-xs">{t("home.bookingCenterDesc")}</p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                    <Link href="/register">
                      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                        <div className="relative flex items-center gap-4">
                          <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shadow-lg">📋</div>
                          <div className="flex-1">
                            <h3 className="text-base font-bold text-white">{t("home.feat_register")}</h3>
                            <p className="text-white/70 text-xs">{t("home.feat_register_desc")}</p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                    <Link href="/chatbot">
                      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-0.5">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                        <div className="relative flex items-center gap-4">
                          <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shadow-lg">🤖</div>
                          <div className="flex-1">
                            <h3 className="text-base font-bold text-white">{t("home.feat_ai")}</h3>
                            <p className="text-white/70 text-xs">{t("home.feat_ai_desc")}</p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Ad Banner for authenticated users - Dynamic from DB (bottom) */}
                {(() => {
                  const adBottom = getAdByPosition("bottom");
                  const bImg = adBottom?.imageUrl || IMAGES.adTravel;
                  const bLink = adBottom?.linkUrl || "https://www.trip.com";
                  const bTitle = adBottom?.title || t("home.ad_travel_title", "꾿의 여행지를 찾아보세요");
                  return (
                <a href={bLink} target="_blank" rel="noopener noreferrer" className="block relative rounded-xl overflow-hidden group cursor-pointer mb-6" onClick={() => adBottom && trackClick.mutate({ id: adBottom.id })}>
                  <img src={bImg} alt={bTitle} className="w-full h-28 md:h-36 object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
                    <div className="px-6">
                      <Badge className="bg-amber-500 text-white mb-1 text-xs">AD</Badge>
                      <h3 className="text-white text-base md:text-lg font-bold">{bTitle}</h3>
                    </div>
                  </div>
                </a>
                  );
                })()}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Features Grid - Both authenticated and non-authenticated */}
      <section className="py-16 border-t border-border/30">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">{t("home.features")}</h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
            {t("home.featuresGridSubtitle", "다양한 기능으로 여행의 모든 순간을 지원합니다")}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {secondaryFeatures.map((f, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 hover:shadow-md transition-all group">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{t(f.titleKey)}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{t(f.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-10 mb-16 md:mb-0">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-6 w-6 rounded" />
                <span className="font-bold">Alpha Trip</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("home.footer_desc", "글로벌 밋업 & 여행 자동화 플랫폼")}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">{t("home.footer_product", "서비스")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/register" className="hover:text-foreground transition-colors">{t("home.feat_register")}</Link></li>
                <li><Link href="/booking" className="hover:text-foreground transition-colors">{t("home.bookingCenterTitle")}</Link></li>
                <li><Link href="/chatbot" className="hover:text-foreground transition-colors">{t("home.feat_ai")}</Link></li>
                <li><Link href="/ride" className="hover:text-foreground transition-colors">{t("home.rideHailingTitle", "Ride-Hailing")}</Link></li>
                <li><Link href="/delivery" className="hover:text-foreground transition-colors">{t("home.foodDeliveryTitle", "Food Delivery")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">{t("home.footer_support", "지원")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/community" className="hover:text-foreground transition-colors">{t("home.feat_comm")}</Link></li>
                <li><Link href="/immigration-checklist" className="hover:text-foreground transition-colors">{t("nav.immigrationChecklist", "입국 체크리스트")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">{t("home.footer_connect", "연결")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://t.me/alphatrip" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">Telegram <ExternalLink className="h-3 w-3" /></a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/30 pt-6 text-center text-sm text-muted-foreground">
            <p>{t("home.footer")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
