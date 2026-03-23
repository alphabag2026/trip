import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plane, ClipboardList, Search, Shield, MapPin, Globe,
  MessageCircle, Car, Hotel, Luggage, User, LayoutDashboard,
  UserPlus, LogIn, ArrowRight, CheckCircle2, Building2, Users, Briefcase, LogOut, AlertCircle,
  Ticket, Bot, MoreHorizontal, Timer, Sparkles
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

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();

  // 온보딩 상태 조회 (로그인 사용자만)
  const { data: onboardingStatus } = trpc.userProfile.onboardingStatus.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
  const needsOnboarding = isAuthenticated && onboardingStatus && !onboardingStatus.onboardingCompleted;

  // 프로필 완성도 계산
  const { data: profileData } = trpc.userProfile.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: passportData } = trpc.passport.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const profileCompletion = (() => {
    if (!isAuthenticated) return 0;
    let total = 0;
    let filled = 0;
    // Basic account
    total += 1; filled += 1; // account exists
    // Profile fields
    const fields = ['phone', 'nationality', 'birthDate', 'gender', 'organization', 'position'];
    fields.forEach(f => {
      total += 1;
      if (profileData && (profileData as any)[f]) filled += 1;
    });
    // Passport
    total += 1;
    if (passportData?.passportNumber) filled += 1;
    // Onboarding completed
    total += 1;
    if (onboardingStatus?.onboardingCompleted) filled += 1;
    return Math.round((filled / total) * 100);
  })();

  // Primary features (large cards)
  const primaryFeatures = [
    { icon: ClipboardList, titleKey: "home.feat_register", descKey: "home.feat_register_desc", href: "/register", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Ticket, titleKey: "home.bookingCenterTitle", descKey: "home.bookingCenterDesc", href: "/booking", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Bot, titleKey: "home.feat_ai", descKey: "home.feat_ai_desc", href: "/chatbot", color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  // Secondary features (smaller cards)
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
      {/* Header - Simplified Navigation */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>Alpha Trip</span>
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm">
            {isAuthenticated ? (
              <>
                {/* Primary 4 menu items */}
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
                {/* More menu */}
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
                        <User className="h-4 w-4" />
                        {t("nav.myProfile")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/flight-pickup" className="cursor-pointer flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        {t("nav.flightPickup")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/community" className="cursor-pointer flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        {t("nav.community", "커뮤니티")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/flight-tracker" className="cursor-pointer flex items-center gap-2">
                        <Luggage className="h-4 w-4" />
                        {t("nav.flightTracker")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/immigration-checklist" className="cursor-pointer flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {t("nav.immigrationChecklist", "입국 체크리스트")}
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
              <Link href="/admin">
                <Button variant="outline" size="sm">{t("nav.backoffice")}</Button>
              </Link>
            )}
            {isAuthenticated && user?.role !== "admin" && user?.role !== "superadmin" && (
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  {t("nav.dashboard")}
                </Button>
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
                    <Link href="/my-page" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      {t("home.myPageBtn")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => { logout(); window.location.href = "/"; }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="gap-1">
                    <LogIn className="h-4 w-4" />
                    {t("home.loginBtn")}
                  </Button>
                </Link>
                <Link href="/login?tab=register">
                  <Button size="sm" className="gap-1">
                    <UserPlus className="h-4 w-4" />
                    {t("nav.signup")}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero - Non-authenticated */}
      {!isAuthenticated && (
        <section className="py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
          <div className="container relative text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-6 border border-primary/20">
              <Globe className="h-4 w-4" />
              {t("home.badge")}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              {t("home.title1")}<br />
              <span className="text-primary">{t("home.title2")}</span> {t("home.title3")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              {t("home.desc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/login?tab=register">
                <Button size="lg" className="text-base px-8 gap-2 h-12">
                  <UserPlus className="h-5 w-5" />
                  {t("home.signupFree")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-base px-8 gap-2 h-12">
                  <LogIn className="h-5 w-5" />
                  {t("home.loginBtn")}
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("home.signupHint")}
            </p>
          </div>
        </section>
      )}

      {/* Onboarding Banner - 온보딩 미완료 사용자 안내 */}
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

      {/* Hero - Authenticated (Personalized) */}
      {isAuthenticated && (
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              {/* Welcome + Profile completion */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-2">
                    {t("home.welcomeUser", { name: user?.name })}
                  </h1>
                  <p className="text-muted-foreground">
                    {t("home.welcomeDesc")}
                  </p>
                </div>
                {/* Profile completion gauge */}
                <div className="w-full md:w-64 bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t("home.profileCompletion", "프로필 완성도")}</span>
                    <span className="text-sm font-bold text-primary">{profileCompletion}%</span>
                  </div>
                  <Progress value={profileCompletion} className="h-2 mb-2" />
                  {profileCompletion < 100 && (
                    <Link href="/my-page" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {t("home.completeProfile", "프로필 완성하기")}
                    </Link>
                  )}
                </div>
              </div>

              {/* Quick action buttons */}
              <div className="flex flex-wrap gap-3 mb-8">
                <Link href="/register">
                  <Button size="lg" className="gap-2">
                    <ClipboardList className="h-5 w-5" />
                    {t("home.applyBtn")}
                  </Button>
                </Link>
                <Link href="/my-page">
                  <Button size="lg" variant="outline" className="gap-2">
                    <User className="h-5 w-5" />
                    {t("home.myPageBtn")}
                  </Button>
                </Link>
                <Link href="/lookup">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Search className="h-5 w-5" />
                    {t("home.lookupBtn")}
                  </Button>
                </Link>
              </div>

              {/* Primary feature cards - Large */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {primaryFeatures.map((f, i) => (
                  <Link key={i} href={f.href}>
                    <Card className="bg-card border-border/50 hover:border-primary/30 transition-all hover:shadow-lg cursor-pointer group h-full">
                      <CardContent className="p-6">
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.bg} mb-4`}>
                          <f.icon className={`h-6 w-6 ${f.color}`} />
                        </div>
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{t(f.titleKey)}</h3>
                        <p className="text-muted-foreground text-sm">{t(f.descKey)}</p>
                        <div className="mt-3 flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          {t("home.goNow", "바로 가기")} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Non-authenticated: User types */}
      {!isAuthenticated && (
        <section id="roles" className="py-20 border-t border-border/30">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">{t("home.rolesTitle")}</h2>
            <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
              {t("home.rolesDesc")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Briefcase,
                  titleKey: "home.role_organizer",
                  descKey: "home.role_organizer_desc",
                  color: "text-blue-400",
                  bg: "bg-blue-500/10",
                },
                {
                  icon: Building2,
                  titleKey: "home.role_agency",
                  descKey: "home.role_agency_desc",
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/10",
                },
                {
                  icon: Hotel,
                  titleKey: "home.role_partner",
                  descKey: "home.role_partner_desc",
                  color: "text-amber-400",
                  bg: "bg-amber-500/10",
                },
                {
                  icon: Users,
                  titleKey: "home.role_attendee",
                  descKey: "home.role_attendee_desc",
                  color: "text-purple-400",
                  bg: "bg-purple-500/10",
                },
              ].map((role, i) => (
                <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${role.bg} mb-4`}>
                      <role.icon className={`h-7 w-7 ${role.color}`} />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{t(role.titleKey)}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{t(role.descKey)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Non-authenticated: How it works */}
      {!isAuthenticated && (
        <section id="how-it-works" className="py-20 border-t border-border/30">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">{t("home.howTitle")}</h2>
            <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
              {t("home.howDesc")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { step: "1", titleKey: "home.step1", descKey: "home.step1_desc", icon: UserPlus },
                { step: "2", titleKey: "home.step2", descKey: "home.step2_desc", icon: Shield },
                { step: "3", titleKey: "home.step3", descKey: "home.step3_desc", icon: CheckCircle2 },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 mb-4">
                    <item.icon className="h-7 w-7 text-primary" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t(item.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{t(item.descKey)}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/login?tab=register">
                <Button size="lg" className="text-base px-8 gap-2 h-12">
                  <UserPlus className="h-5 w-5" />
                  {t("home.startFree")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features - with visual hierarchy */}
      <section id="features" className="py-20 border-t border-border/30">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">{t("home.features")}</h2>
          {/* Secondary features - smaller grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {secondaryFeatures.map((f, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <f.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold text-sm mb-1">{t(f.titleKey)}</h3>
                  <p className="text-muted-foreground text-xs">{t(f.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Non-authenticated: Bottom CTA */}
      {!isAuthenticated && (
        <section className="py-20 border-t border-border/30">
          <div className="container text-center">
            <div className="max-w-2xl mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-10 border border-primary/20">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("home.ctaTitle")}</h2>
              <p className="text-muted-foreground mb-8">
                {t("home.ctaDesc")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login?tab=register">
                  <Button size="lg" className="text-base px-8 gap-2 h-12">
                    <UserPlus className="h-5 w-5" />
                    {t("home.signupFree")}
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="text-base px-8 gap-2 h-12">
                    <LogIn className="h-5 w-5" />
                    {t("home.ctaLogin")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 mb-16 md:mb-0">
        <div className="container text-center text-sm text-muted-foreground">
          <p>{t("home.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
