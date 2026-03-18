import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, ArrowLeft, TrendingUp, Target, Users, DollarSign, Rocket, Shield, CheckCircle, Clock } from "lucide-react";
import { Link } from "wouter";

const milestones = [
  { done: true, label: "바이낸스 알파 상장 완료", detail: "한국 유명 게임 회사 상장사 토큰" },
  { done: true, label: "쿠코인 선물 상장 완료", detail: "토큰 99% 이상 매수 확보" },
  { done: true, label: "한국 UP거래소 & 빗썸 계약 확정", detail: "1개월 내 상장 예정" },
  { done: true, label: "마켓메이킹 계약 완료", detail: "5일간 3억달러 FDV, 0.3 USDT 가격 유지" },
  { done: true, label: "한국 10개 운영센터 출범", detail: "매일 매수 진행 중" },
  { done: false, label: "바이낸스 선물 상장", detail: "오퍼 확보, 자금 조달 진행 중" },
  { done: false, label: "바이낸스 현물 상장", detail: "선물 상장 후 목표" },
  { done: false, label: "한국 대형 거래소 상장", detail: "빗썸/업비트 상장 목표" },
];

const financials = [
  { label: "현재 가격", value: "0.05 USDT", icon: DollarSign },
  { label: "선물 상장 목표가", value: "0.5 USDT", icon: TrendingUp },
  { label: "시세 유지 목표가", value: "0.3 USDT (5일)", icon: Target },
  { label: "최종 목표가", value: "2.0 USDT", icon: Rocket },
  { label: "재단 보유 자금", value: "150만 USDT", icon: Shield },
  { label: "시세관리 투입 자금", value: "1,000만 USDT", icon: DollarSign },
  { label: "필요 자금", value: "50~100만 USDT", icon: Target },
  { label: "예상 수익", value: "2,000~5,000만 USDT", icon: TrendingUp },
];

export default function TokenStatus() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center h-14">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <Plane className="h-5 w-5 text-primary" />
            <span className="font-semibold">토큰 프로젝트 현황</span>
          </Link>
        </div>
      </header>

      <div className="container max-w-4xl py-8 space-y-8">
        {/* Overview */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">바이낸스 알파 토큰 프로젝트</h1>
          <p className="text-muted-foreground">한국 유명 게임 회사 상장사 토큰 | 바이낸스 알파 상장 완료</p>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {financials.map((f, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4">
                <f.icon className="h-5 w-5 text-primary mb-2" />
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className="font-bold text-sm mt-1">{f.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Roadmap */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" />로드맵</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${m.done ? "text-green-500" : "text-muted-foreground"}`}>
                    {m.done ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${m.done ? "text-foreground" : "text-muted-foreground"}`}>{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progress Details */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />진행 현황</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4 text-primary" />거래소 상장</h4>
              <p className="text-muted-foreground">한국 UP거래소 및 빗썸 거래소 계약서 및 오퍼 확정 (1개월 내 상장). 바이낸스 선물 상장을 위한 초기 상승 자금 50만~100만불 투자자 준비 중.</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />자금 현황</h4>
              <p className="text-muted-foreground">재단 150만불 보유, 토큰 99% 수준 보유. 시세관리팀 1,000만불 + 5일간 가격 유지 비용 준비 완료. 100만 USDT로 토큰 300만~500만개 매수 및 5일 시세 관리 자금으로 사용 예정.</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />마켓메이킹</h4>
              <p className="text-muted-foreground">현재 계약한 마켓메이킹은 2,000만~5,000만불 수익 가능. 해시키 마켓메이커는 월 1,500만불 순수익 목표. 한국 대형 거래소 상장과 바이낸스 현물 상장 시 더 큰 수익 기대.</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2"><Target className="h-4 w-4 text-primary" />운영 현황</h4>
              <p className="text-muted-foreground">한국 10개 운영센터 출범 완료. 매일 조금씩 매수 진행 중. 빠르면 1주일 내 100만불 자금 조달 완료 예정. 한국인 투자자 300만명 데이터 확보 가능.</p>
            </div>
          </CardContent>
        </Card>

        {/* Investment Proposal */}
        <Card className="bg-card border-primary/30 border-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" />투자 제안</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">바이낸스 알파 프로젝트를 바이낸스 선물, 현물, 한국 최대 거래소까지 상장하는 성공사례를 만들고, 두 번째 프로젝트 또한 바이낸스 알파 프로젝트로 진행하여 유저 신뢰도를 높이는 것이 목표입니다.</p>
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <p className="font-semibold text-primary mb-1">빠른 협력 시 제안</p>
              <p className="text-muted-foreground text-xs">한국 상장회사 재단의 토큰 에스크로 가능, 보유 자금 100만불 공동계좌 위탁 가능. 투자 후 4일 내 100만불 원금 회수 제공, 추후 선물 재단 수익의 5~10% 제공.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
