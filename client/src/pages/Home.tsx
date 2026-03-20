import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plane, ClipboardList, Search, Shield, MapPin, Globe,
  MessageCircle, Car, Hotel, Luggage, User, LayoutDashboard,
  UserPlus, LogIn, ArrowRight, CheckCircle2, Building2, Users, Briefcase
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">{t("brand")}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {isAuthenticated ? (
              <>
                <Link href="/my-page" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.myProfile") || "마이페이지"}</Link>
                <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.register")}</Link>
                <Link href="/lookup" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.lookup")}</Link>
                <Link href="/flight-pickup" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.flightPickup")}</Link>
                <Link href="/chatbot" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.chatbot")}</Link>
              </>
            ) : (
              <>
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">주요 기능</a>
                <a href="#roles" className="text-muted-foreground hover:text-foreground transition-colors">사용자 유형</a>
                <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">이용 방법</a>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3">
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
                  대시보드
                </Button>
              </Link>
            )}
            {isAuthenticated ? (
              <Link href="/my-page">
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span>{user?.name}</span>
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <a href={getLoginUrl()}>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <LogIn className="h-4 w-4" />
                    로그인
                  </Button>
                </a>
                <a href={getLoginUrl("/onboarding")}>
                  <Button size="sm" className="gap-1">
                    <UserPlus className="h-4 w-4" />
                    회원가입
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero - 비로그인 사용자 */}
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
                  무료 회원가입
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href={getLoginUrl()}>
                <Button size="lg" variant="outline" className="text-base px-8 gap-2 h-12">
                  <LogIn className="h-5 w-5" />
                  로그인
                </Button>
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              가입 후 프로필과 여권 정보를 한 번만 등록하면, 다음 출장부터 다시 입력할 필요가 없습니다.
            </p>
          </div>
        </section>
      )}

      {/* Hero - 로그인 사용자 */}
      {isAuthenticated && (
        <section className="py-16 md:py-24">
          <div className="container text-center">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              환영합니다, <span className="text-primary">{user?.name}</span>님
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              밋업 신청, 여정표 조회, 출장 관리를 한곳에서 처리하세요.
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
                  마이페이지
                </Button>
              </Link>
              <Link href="/lookup">
                <Button size="lg" variant="outline" className="text-base px-8 gap-2">
                  <Search className="h-5 w-5" />
                  {t("home.lookupBtn")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 비로그인: 사용자 유형 소개 */}
      {!isAuthenticated && (
        <section id="roles" className="py-20 border-t border-border/30">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">누가 사용하나요?</h2>
            <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
              역할에 따라 맞춤형 대시보드와 기능을 제공합니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Briefcase,
                  title: "행사/여행 주최자",
                  desc: "밋업과 출장을 기획하고 참석자를 관리합니다. 전체 일정과 배치를 한눈에 파악할 수 있습니다.",
                  color: "text-blue-400",
                  bg: "bg-blue-500/10",
                },
                {
                  icon: Building2,
                  title: "지역 에이전시",
                  desc: "호텔, 식사, 숙박 등 단체 서비스를 담당합니다. 파트너 업체를 관리하고 서비스를 조율합니다.",
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/10",
                },
                {
                  icon: Hotel,
                  title: "파트너 업체",
                  desc: "식당, 클럽, 마사지, 여행, 크루즈, 차량, 통역 등 다양한 서비스를 제공하는 파트너입니다.",
                  color: "text-amber-400",
                  bg: "bg-amber-500/10",
                },
                {
                  icon: Users,
                  title: "참석자",
                  desc: "밋업에 참여하는 최종 사용자입니다. 여권 1회 등록 후 간편하게 출장을 관리합니다.",
                  color: "text-purple-400",
                  bg: "bg-purple-500/10",
                },
              ].map((role, i) => (
                <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${role.bg} mb-4`}>
                      <role.icon className={`h-7 w-7 ${role.color}`} />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{role.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{role.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 비로그인: 이용 방법 */}
      {!isAuthenticated && (
        <section id="how-it-works" className="py-20 border-t border-border/30">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">3단계로 시작하세요</h2>
            <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
              회원가입부터 출장 관리까지, 간단한 3단계로 시작할 수 있습니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                {
                  step: "1",
                  title: "회원가입",
                  desc: "간편하게 계정을 만들고 기본 프로필 정보를 입력합니다.",
                  icon: UserPlus,
                },
                {
                  step: "2",
                  title: "여권 등록",
                  desc: "여권 정보를 한 번만 등록하면 다음 출장부터 재입력이 필요 없습니다.",
                  icon: Shield,
                },
                {
                  step: "3",
                  title: "밋업 신청",
                  desc: "원하는 밋업에 신청하고, 항공편/숙소/픽업까지 자동으로 관리됩니다.",
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
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <a href={getLoginUrl("/onboarding")}>
                <Button size="lg" className="text-base px-10 gap-2 h-12">
                  <UserPlus className="h-5 w-5" />
                  지금 무료로 시작하기
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

      {/* 비로그인: 하단 CTA */}
      {!isAuthenticated && (
        <section className="py-20 border-t border-border/30">
          <div className="container text-center">
            <div className="max-w-2xl mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-10 border border-primary/20">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">지금 바로 시작하세요</h2>
              <p className="text-muted-foreground mb-8">
                무료로 가입하고 출장 관리의 모든 것을 자동화하세요.<br />
                프로젝트 팀, 에이전시, 파트너 업체 모두 환영합니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href={getLoginUrl("/onboarding")}>
                  <Button size="lg" className="text-base px-8 gap-2 h-12">
                    <UserPlus className="h-5 w-5" />
                    무료 회원가입
                  </Button>
                </a>
                <a href={getLoginUrl()}>
                  <Button size="lg" variant="outline" className="text-base px-8 gap-2 h-12">
                    <LogIn className="h-5 w-5" />
                    이미 계정이 있으신가요?
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex justify-around py-2">
          {isAuthenticated ? (
            <>
              <Link href="/" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
                <Globe className="h-5 w-5" /><span>{t("nav.home")}</span>
              </Link>
              <Link href="/register" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
                <ClipboardList className="h-5 w-5" /><span>{t("nav.apply")}</span>
              </Link>
              <Link href="/lookup" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
                <Search className="h-5 w-5" /><span>{t("nav.search")}</span>
              </Link>
              <Link href="/dashboard" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
                <LayoutDashboard className="h-5 w-5" /><span>대시보드</span>
              </Link>
              <Link href="/my-page" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
                <User className="h-5 w-5" /><span>{t("nav.myProfile") || "MY"}</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
                <Globe className="h-5 w-5" /><span>{t("nav.home")}</span>
              </Link>
              <a href="#features" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
                <Search className="h-5 w-5" /><span>기능</span>
              </a>
              <a href={getLoginUrl("/onboarding")} className="flex flex-col items-center gap-1 p-2 text-xs text-primary font-semibold">
                <UserPlus className="h-5 w-5" /><span>회원가입</span>
              </a>
              <a href={getLoginUrl()} className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
                <LogIn className="h-5 w-5" /><span>로그인</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 mb-16 md:mb-0">
        <div className="container text-center text-sm text-muted-foreground">
          <p>{t("home.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
