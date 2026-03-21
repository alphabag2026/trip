import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plane, ClipboardList, Search, Shield, MapPin, Globe,
  MessageCircle, Car, Hotel, Luggage, User, LayoutDashboard,
  UserPlus, LogIn, ArrowRight, CheckCircle2, Building2, Users, Briefcase, LogOut, AlertCircle,
  Ticket
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>Alpha Trip</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {isAuthenticated ? (
              <>
                <Link href="/my-page" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.myProfile")}</Link>
                <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.register")}</Link>
                <Link href="/lookup" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.lookup")}</Link>
                <Link href="/flight-pickup" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.flightPickup")}</Link>
                <Link href="/booking-center" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Ticket className="h-3.5 w-3.5" />
                  {t("nav.bookingCenter", "예약센터")}
                </Link>
                <Link href="/chatbot" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.chatbot")}</Link>
                <Link href="/community" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("nav.community", "커뮤니티")}
                </Link>
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
                    <span>{user?.name}</span>
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
                <a href={getLoginUrl()}>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <LogIn className="h-4 w-4" />
                    {t("home.loginBtn")}
                  </Button>
                </a>
                <a href={getLoginUrl("/onboarding")}>
                  <Button size="sm" className="gap-1">
                    <UserPlus className="h-4 w-4" />
                    {t("nav.signup")}
                  </Button>
                </a>
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
              <a href={getLoginUrl("/onboarding")}>
                <Button size="lg" className="text-base px-8 gap-2 h-12">
                  <UserPlus className="h-5 w-5" />
                  {t("home.signupFree")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href={getLoginUrl()}>
                <Button size="lg" variant="outline" className="text-base px-8 gap-2 h-12">
                  <LogIn className="h-5 w-5" />
                  {t("home.loginBtn")}
                </Button>
              </a>
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

      {/* Hero - Authenticated */}
      {isAuthenticated && (
        <section className="py-16 md:py-24">
          <div className="container text-center">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              {t("home.welcomeUser", { name: user?.name })}
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              {t("home.welcomeDesc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="text-base px-8 gap-2">
                  <ClipboardList className="h-5 w-5" />
                  {t("home.applyBtn")}
                </Button>
              </Link>
              <Link href="/my-page">
                <Button size="lg" variant="outline" className="text-base px-8 gap-2">
                  <User className="h-5 w-5" />
                  {t("home.myPageBtn")}
                </Button>
              </Link>
              <Link href="/lookup">
                <Button size="lg" variant="outline" className="text-base px-8 gap-2">
                  <Search className="h-5 w-5" />
                  {t("home.lookupBtn")}
                </Button>
              </Link>
            </div>

            {/* 예약센터 바로가기 배너 */}
            <div className="mt-10 max-w-2xl mx-auto">
              <Link href="/booking-center">
                <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-blue-500/10 border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer group">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20">
                        <Ticket className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-lg">{t("home.bookingCenterTitle", "항공권 & 호텔 예약센터")}</h3>
                        <p className="text-sm text-muted-foreground">{t("home.bookingCenterDesc", "Trip.com, Booking.com, Agoda 최저가 비교 후 바로 예약하세요")}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              </Link>
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
                {
                  step: "1",
                  titleKey: "home.step1",
                  descKey: "home.step1_desc",
                  icon: UserPlus,
                },
                {
                  step: "2",
                  titleKey: "home.step2",
                  descKey: "home.step2_desc",
                  icon: Shield,
                },
                {
                  step: "3",
                  titleKey: "home.step3",
                  descKey: "home.step3_desc",
                  icon: CheckCircle2,
                },
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
              <a href={getLoginUrl("/onboarding")}>
                <Button size="lg" className="text-base px-8 gap-2 h-12">
                  <UserPlus className="h-5 w-5" />
                  {t("home.startFree")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section id="features" className="py-20 border-t border-border/30">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">{t("home.features")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: ClipboardList, titleKey: "home.feat_register", descKey: "home.feat_register_desc" },
              { icon: Shield, titleKey: "home.feat_passport", descKey: "home.feat_passport_desc" },
              { icon: Plane, titleKey: "home.feat_flight", descKey: "home.feat_flight_desc" },
              { icon: Car, titleKey: "home.feat_pickup", descKey: "home.feat_pickup_desc" },
              { icon: Hotel, titleKey: "home.feat_hotel", descKey: "home.feat_hotel_desc" },
              { icon: MessageCircle, titleKey: "home.feat_comm", descKey: "home.feat_comm_desc" },
              { icon: MapPin, titleKey: "home.feat_country", descKey: "home.feat_country_desc" },
              { icon: Globe, titleKey: "home.feat_telegram", descKey: "home.feat_telegram_desc" },
              { icon: Search, titleKey: "home.feat_data", descKey: "home.feat_data_desc" },
              { icon: MessageCircle, titleKey: "home.feat_ai", descKey: "home.feat_ai_desc" },
              { icon: ClipboardList, titleKey: "home.feat_survey", descKey: "home.feat_survey_desc" },
              { icon: Luggage, titleKey: "home.feat_baggage", descKey: "home.feat_baggage_desc" },
            ].map((f, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <f.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{t(f.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm">{t(f.descKey)}</p>
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
                <a href={getLoginUrl("/onboarding")}>
                  <Button size="lg" className="text-base px-8 gap-2 h-12">
                    <UserPlus className="h-5 w-5" />
                    {t("home.signupFree")}
                  </Button>
                </a>
                <a href={getLoginUrl()}>
                  <Button size="lg" variant="outline" className="text-base px-8 gap-2 h-12">
                    <LogIn className="h-5 w-5" />
                    {t("home.ctaLogin")}
                  </Button>
                </a>
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
