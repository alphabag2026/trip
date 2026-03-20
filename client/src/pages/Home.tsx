import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, ClipboardList, Search, Shield, MapPin, Globe, MessageCircle, Car, Hotel, Luggage, User, BookOpen } from "lucide-react";
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
            <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.register")}</Link>
            <Link href="/lookup" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.lookup")}</Link>
            <Link href="/flight-pickup" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.flightPickup")}</Link>
            <Link href="/chatbot" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.chatbot")}</Link>
            <Link href="/flight-tracker" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.flightTracker")}</Link>
            <Link href="/my-page" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.myProfile") || "마이페이지"}</Link>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            {isAuthenticated && user?.role === "admin" && (
              <Link href="/admin">
                <Button variant="outline" size="sm">{t("nav.backoffice")}</Button>
              </Link>
            )}
            {isAuthenticated ? (
              <span className="text-sm text-muted-foreground">{user?.name}</span>
            ) : (
              <a href={getLoginUrl()}>
                <Button variant="outline" size="sm">{t("nav.login")}</Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-base px-8">
                <ClipboardList className="mr-2 h-5 w-5" />
                {t("home.applyBtn")}
              </Button>
            </Link>
            <Link href="/lookup">
              <Button size="lg" variant="outline" className="text-base px-8">
                <Search className="mr-2 h-5 w-5" />
                {t("home.lookupBtn")}
              </Button>
            </Link>
            {isAuthenticated && (
              <Link href="/my-page">
                <Button size="lg" variant="outline" className="text-base px-8">
                  <User className="mr-2 h-5 w-5" />
                  마이페이지
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/30">
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

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex justify-around py-2">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
            <Globe className="h-5 w-5" /><span>{t("nav.home")}</span>
          </Link>
          <Link href="/register" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
            <ClipboardList className="h-5 w-5" /><span>{t("nav.apply")}</span>
          </Link>
          <Link href="/lookup" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
            <Search className="h-5 w-5" /><span>{t("nav.search")}</span>
          </Link>
          <Link href="/flight-pickup" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
            <Plane className="h-5 w-5" /><span>{t("nav.flightPickup")}</span>
          </Link>
          <Link href="/chatbot" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
            <MessageCircle className="h-5 w-5" /><span>{t("nav.ai")}</span>
          </Link>
          <Link href="/my-page" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
            <User className="h-5 w-5" /><span>{t("nav.myProfile") || "마이페이지"}</span>
          </Link>
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
