import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, ClipboardList, Search, Shield, MapPin, Globe } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Meetup Travel</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors">밋업 신청</Link>
            <Link href="/lookup" className="text-muted-foreground hover:text-foreground transition-colors">여정표 조회</Link>
            <Link href="/token-status" className="text-muted-foreground hover:text-foreground transition-colors">토큰 현황</Link>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated && user?.role === "admin" && (
              <Link href="/admin">
                <Button variant="outline" size="sm">백오피스</Button>
              </Link>
            )}
            {isAuthenticated ? (
              <span className="text-sm text-muted-foreground">{user?.name}</span>
            ) : (
              <a href={getLoginUrl()}>
                <Button variant="outline" size="sm">로그인</Button>
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
            글로벌 밋업 & 출장 관리 시스템
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            밋업 예약부터<br />
            <span className="text-primary">여정표 발송까지</span> 한번에
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            해외 밋업 신청, 여권 OCR 자동 처리, 국가별 맞춤 여행 정보, 텔레그램 자동 알림까지.
            출장 관리의 모든 것을 자동화합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-base px-8">
                <ClipboardList className="mr-2 h-5 w-5" />
                밋업 신청하기
              </Button>
            </Link>
            <Link href="/lookup">
              <Button size="lg" variant="outline" className="text-base px-8">
                <Search className="mr-2 h-5 w-5" />
                여정표 조회
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/30">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">주요 기능</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: ClipboardList, title: "밋업 신청", desc: "내륙/해외 구분, 필수 정보 입력, 여권 사진 업로드까지 간편한 원스톱 신청" },
              { icon: Shield, title: "여권 OCR", desc: "업로드된 여권 이미지를 AI가 자동으로 분석하여 텍스트 데이터로 변환" },
              { icon: Plane, title: "여정표 자동 발송", desc: "항공편, 숙소, 일정 정보를 포함한 여정표를 웹/메신저로 자동 발송" },
              { icon: MapPin, title: "국가별 맞춤 정보", desc: "목적지 국가의 여행 준비물, 출입국 정보, 비자 요건을 자동으로 안내" },
              { icon: Globe, title: "텔레그램 알림", desc: "신청 접수 시 회사 텔레그램으로 실시간 알림 자동 전송" },
              { icon: Search, title: "데이터 검색/분석", desc: "키워드 검색으로 참가자 데이터 및 관계자 연관성을 빠르게 파악" },
            ].map((f, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <f.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile Nav (hamburger alternative - bottom bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex justify-around py-2">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
            <Globe className="h-5 w-5" /><span>홈</span>
          </Link>
          <Link href="/register" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
            <ClipboardList className="h-5 w-5" /><span>신청</span>
          </Link>
          <Link href="/lookup" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
            <Search className="h-5 w-5" /><span>조회</span>
          </Link>
          <Link href="/token-status" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
            <Shield className="h-5 w-5" /><span>토큰</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 mb-16 md:mb-0">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Meetup Travel Automation System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
