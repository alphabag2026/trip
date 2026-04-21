import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, BookOpen, History, ArrowLeft, Loader2, ArrowRight,
  CreditCard, Ticket, ClipboardCheck, LogOut, Car, Shield,
} from "lucide-react";
import { Link } from "wouter";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";
import { useTranslation } from "react-i18next";
import { AppDownloadCard } from "@/components/AppDownloadPrompt";

// Lazy-loaded tab content components
const ProfileTab = lazy(() => import("./mypage/ProfileTab"));
const PassportTab = lazy(() => import("./mypage/PassportTab"));
const TripsTab = lazy(() => import("./mypage/TripsTab"));
const VouchersTab = lazy(() => import("./mypage/VouchersTab"));
const TicketsTab = lazy(() => import("./mypage/TicketsTab"));
const ChecklistTab = lazy(() => import("./mypage/ChecklistTab"));
const TransportTab = lazy(() => import("./mypage/TransportTab"));
const SafetyTab = lazy(() => import("./mypage/SafetyTab"));

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

export default function MyPage() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { t } = useTranslation();

  const profileQuery = trpc.userProfile.get.useQuery(undefined, { enabled: !!user });
  const passportQuery = trpc.passport.get.useQuery(undefined, { enabled: !!user });
  const tripQuery = trpc.tripHistory.list.useQuery(undefined, { enabled: !!user });
  const onboardingQuery = trpc.userProfile.onboardingStatus.useQuery(undefined, { enabled: !!user });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const profile = profileQuery.data;
  const passport = passportQuery.data;
  const trips = tripQuery.data || [];
  const onboarding = onboardingQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary"><img loading="lazy" decoding="async" src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-7 w-7 rounded-md" />Alpha Trip</Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSelector />
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1" onClick={async () => { await logout(); window.location.href = "/"; }}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav.logout", "로그아웃")}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-3xl py-8 space-y-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />{t("myPage.backHome")}
        </Link>

        {/* User Summary Card with Profile Completion Gauge */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold">{user?.name || t("myPage.user")}</h1>
                <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant={onboarding?.onboardingCompleted ? "default" : "secondary"}>
                    {onboarding?.onboardingCompleted ? t("myPage.onboardingDone") : t("myPage.onboardingPending")}
                  </Badge>
                  <Badge variant={passport?.passportNumber ? "default" : "outline"}>
                    {passport?.passportNumber ? t("myPage.passportRegistered") : t("myPage.passportNotRegistered")}
                  </Badge>
                  <Badge variant="outline">{t("myPage.tripCount", { count: trips.length })}</Badge>
                </div>
              </div>
            </div>
            {/* Profile Completion Gauge */}
            {(() => {
              let total = 0, filled = 0;
              total += 1; filled += 1; // account
              const fields = ['phone', 'nationality', 'birthDate', 'gender', 'organization', 'position'];
              fields.forEach(f => { total += 1; if (profile && (profile as any)[f]) filled += 1; });
              total += 1; if (passport?.passportNumber) filled += 1;
              total += 1; if (onboarding?.onboardingCompleted) filled += 1;
              const pct = Math.round((filled / total) * 100);
              const nextAction = !profile?.phone ? t("myPage.nextPhone", "전화번호를 입력해주세요")
                : !profile?.nationality ? t("myPage.nextNationality", "국적을 선택해주세요")
                : !passport?.passportNumber ? t("myPage.nextPassport", "여권 정보를 등록해주세요")
                : pct < 100 ? t("myPage.nextComplete", "나머지 정보를 채워주세요") : null;
              return (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t("myPage.profileCompletion", "프로필 완성도")}</span>
                    <span className={`text-sm font-bold ${pct === 100 ? 'text-green-500' : 'text-primary'}`}>{pct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                  </div>
                  {nextAction && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3 text-primary" />
                      {t("myPage.nextStep", "다음 단계")}: {nextAction}
                    </p>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto no-scrollbar gap-1 h-auto flex-wrap sm:flex-nowrap">
            <TabsTrigger value="profile" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabProfile")}</span><span className="sm:hidden">{t("myPage.t1", "프로필")}</span>
            </TabsTrigger>
            <TabsTrigger value="passport" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabPassport")}</span><span className="sm:hidden">{t("myPage.t2", "여권")}</span>
            </TabsTrigger>
            <TabsTrigger value="trips" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabTrips")}</span><span className="sm:hidden">{t("myPage.t3", "이력")}</span>
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabHotel")}</span><span className="sm:hidden">{t("myPage.t4", "호텔")}</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabFlight")}</span><span className="sm:hidden">{t("myPage.t5", "항공")}</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabChecklist")}</span><span className="sm:hidden">{t("myPage.t6", "체크")}</span>
            </TabsTrigger>
            <TabsTrigger value="transport" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabTransport", "차량/숙소")}</span><span className="sm:hidden">{t("myPage.tabTransportShort", "차량")}</span>
            </TabsTrigger>
            <TabsTrigger value="safety" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap shrink-0">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t("myPage.tabSafety", "안전/SOS")}</span><span className="sm:hidden">SOS</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Suspense fallback={<TabLoader />}>
              <ProfileTab user={user} />
            </Suspense>
          </TabsContent>

          <TabsContent value="passport">
            <Suspense fallback={<TabLoader />}>
              <PassportTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="trips">
            <Suspense fallback={<TabLoader />}>
              <TripsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="vouchers">
            <Suspense fallback={<TabLoader />}>
              <VouchersTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="tickets">
            <Suspense fallback={<TabLoader />}>
              <TicketsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="checklist">
            <Suspense fallback={<TabLoader />}>
              <ChecklistTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="transport">
            <Suspense fallback={<TabLoader />}>
              <TransportTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="safety">
            <Suspense fallback={<TabLoader />}>
              <SafetyTab />
            </Suspense>
          </TabsContent>
        </Tabs>

        {/* 앱 다운로드 안내 */}
        <div className="mt-6">
          <AppDownloadCard />
        </div>
      </div>
    </div>
  );
}
