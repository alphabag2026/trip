import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, Shield, Eye, EyeOff, User, Building2, Briefcase, Hotel, Users, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useTranslation } from "react-i18next";

type AccountType = "personal" | "organizer" | "agency" | "partner";

export default function LoginPage() {
  const { t } = useTranslation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const returnPath = params.get("returnPath") || "/";
  const initialTab = params.get("tab") === "register" ? "register" : "login";

  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [step, setStep] = useState<"form" | "2fa" | "type-select">(initialTab === "register" ? "type-select" : "form");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [organizationName, setOrganizationName] = useState("");

  const emailLogin = trpc.auth.emailLogin.useMutation({
    onSuccess: (data) => {
      if (data.requires2FA) {
        setUserId((data as any).userId);
        setStep("2fa");
        setError("");
      } else {
        window.location.href = returnPath;
      }
    },
    onError: (err) => setError(err.message),
  });

  const verify2FA = trpc.auth.verify2FA.useMutation({
    onSuccess: () => { window.location.href = returnPath; },
    onError: (err) => { setError(err.message); setTotpCode(""); },
  });

  const emailRegister = trpc.auth.emailRegister.useMutation({
    onSuccess: () => {
      window.location.href = `/welcome?type=${accountType}&name=${encodeURIComponent(regName)}`;
    },
    onError: (err) => setError(err.message),
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    emailLogin.mutate({ email, password });
  };

  const handle2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setError("");
    verify2FA.mutate({ userId, token: totpCode });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (regPassword !== regPasswordConfirm) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }
    if (regPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    if (accountType !== "personal" && !organizationName.trim()) {
      setError("조직/회사명을 입력해주세요");
      return;
    }
    emailRegister.mutate({
      email: regEmail,
      password: regPassword,
      name: regName,
      accountType,
      organizationName: accountType !== "personal" ? organizationName : undefined,
    });
  };

  const switchToRegister = () => {
    setTab("register");
    setStep("type-select");
    setError("");
  };

  const switchToLogin = () => {
    setTab("login");
    setStep("form");
    setError("");
  };

  const accountTypes: { type: AccountType; icon: typeof User; title: string; desc: string; color: string; bg: string }[] = [
    {
      type: "personal",
      icon: Users,
      title: "개인 참가자",
      desc: "밋업 및 여행에 참가하는 개인 사용자",
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/30 hover:border-purple-400",
    },
    {
      type: "organizer",
      icon: Briefcase,
      title: "주최자 (Organizer)",
      desc: "밋업/이벤트를 기획하고 운영하는 주최자",
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/30 hover:border-blue-400",
    },
    {
      type: "agency",
      icon: Building2,
      title: "여행사 (Agency)",
      desc: "항공, 숙박, 교통 등 여행 서비스를 제공하는 여행사",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400",
    },
    {
      type: "partner",
      icon: Hotel,
      title: "파트너 (Partner)",
      desc: "호텔, 레스토랑 등 현지 서비스 파트너",
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30 hover:border-amber-400",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="inline-flex items-center gap-3">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp"
                alt="Alpha Trip"
                className="h-12 w-12 rounded-xl shadow-lg"
              />
              <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>Alpha Trip</span>
            </div>
          </Link>
        </div>

        {/* Tab Switcher */}
        {step !== "2fa" && (
          <div className="flex mb-6 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
            <button
              onClick={switchToLogin}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                tab === "login"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              로그인
            </button>
            <button
              onClick={switchToRegister}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                tab === "register"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              회원가입
            </button>
          </div>
        )}

        {/* ── LOGIN TAB ── */}
        {tab === "login" && step === "form" && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl text-white">로그인</CardTitle>
              <CardDescription className="text-slate-400">
                이메일과 비밀번호를 입력해주세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
                  disabled={emailLogin.isPending}
                >
                  {emailLogin.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />로그인 중...</>
                  ) : (
                    "로그인"
                  )}
                </Button>
              </form>

              <div className="mt-3 text-center">
                <Link href="/forgot-password">
                  <button className="text-slate-400 hover:text-blue-400 text-xs transition-colors">
                    비밀번호를 잊으셨나요?
                  </button>
                </Link>
              </div>

              {/* Social Login Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-800/50 px-3 text-slate-400">또는</span>
                </div>
              </div>

              {/* Kakao Login Button */}
              <button
                type="button"
                onClick={() => {
                  const origin = window.location.origin;
                  window.location.href = `/api/auth/kakao?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}`;
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all hover:brightness-95"
                style={{ backgroundColor: '#FEE500', color: '#191919' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.63 5.17l-.93 3.42c-.08.3.26.54.52.37l4.07-2.68c.23.02.47.03.71.03 4.42 0 8-2.79 8-6.21S13.42 1 9 1z" fill="#191919"/>
                </svg>
                카카오로 로그인
              </button>

              <div className="mt-3 text-center">
                <p className="text-slate-500 text-sm">
                  계정이 없으신가요?{" "}
                  <button onClick={switchToRegister} className="text-blue-400 hover:text-blue-300 font-medium">
                    회원가입
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── 2FA STEP ── */}
        {step === "2fa" && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                2차 인증
              </CardTitle>
              <CardDescription className="text-slate-400">
                Google Authenticator 앱에서 6자리 코드를 입력해주세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handle2FA} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="totp" className="text-slate-300">인증 코드</Label>
                  <Input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-2xl tracking-[0.5em] font-mono bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                    autoFocus
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
                  disabled={verify2FA.isPending || totpCode.length !== 6}
                >
                  {verify2FA.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />인증 중...</>
                  ) : (
                    "인증 확인"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-slate-300"
                  onClick={() => { setStep("form"); setTotpCode(""); setError(""); }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  뒤로 가기
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── REGISTER: Account Type Selection ── */}
        {tab === "register" && step === "type-select" && (
          <div className="space-y-4">
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl text-white">가입 유형 선택</CardTitle>
                <CardDescription className="text-slate-400">
                  어떤 유형으로 가입하시겠습니까?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {accountTypes.map((at) => (
                  <button
                    key={at.type}
                    onClick={() => { setAccountType(at.type); setStep("form"); setError(""); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${at.bg} ${
                      accountType === at.type ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${at.bg.split(" ")[0]}`}>
                      <at.icon className={`h-6 w-6 ${at.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{at.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{at.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  </button>
                ))}
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-slate-500 text-sm">
                이미 계정이 있으신가요?{" "}
                <button onClick={switchToLogin} className="text-blue-400 hover:text-blue-300 font-medium">
                  로그인
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── REGISTER: Form ── */}
        {tab === "register" && step === "form" && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setStep("type-select"); setError(""); }}
                  className="text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <CardTitle className="text-xl text-white">회원가입</CardTitle>
                  <CardDescription className="text-slate-400 flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      accountType === "personal" ? "bg-purple-500/10 text-purple-300 border-purple-500/30" :
                      accountType === "organizer" ? "bg-blue-500/10 text-blue-300 border-blue-500/30" :
                      accountType === "agency" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" :
                      "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    }`}>
                      <CheckCircle2 className="w-3 h-3" />
                      {accountTypes.find(a => a.type === accountType)?.title}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-slate-300">이름</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="홍길동"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-slate-300">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="email@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>

                {/* Organization name for non-personal accounts */}
                {accountType !== "personal" && (
                  <div className="space-y-2">
                    <Label htmlFor="org-name" className="text-slate-300">
                      {accountType === "organizer" ? "프로젝트/팀 이름" :
                       accountType === "agency" ? "여행사명" : "파트너 회사명"}
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="org-name"
                        type="text"
                        placeholder={
                          accountType === "organizer" ? "예: Alpha 밋업팀" :
                          accountType === "agency" ? "예: 글로벌 트래블" : "예: 서울 호텔"
                        }
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-slate-300">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="reg-password"
                      type={showRegPassword ? "text" : "password"}
                      placeholder="8자 이상"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password-confirm" className="text-slate-300">비밀번호 확인</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="reg-password-confirm"
                      type={showRegPassword ? "text" : "password"}
                      placeholder="비밀번호 재입력"
                      value={regPasswordConfirm}
                      onChange={(e) => setRegPasswordConfirm(e.target.value)}
                      className={`pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 ${
                        regPasswordConfirm && regPassword !== regPasswordConfirm ? "border-red-500" : ""
                      }`}
                      required
                      minLength={8}
                    />
                  </div>
                  {regPasswordConfirm && regPassword !== regPasswordConfirm && (
                    <p className="text-xs text-red-400">비밀번호가 일치하지 않습니다</p>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
                  disabled={emailRegister.isPending}
                >
                  {emailRegister.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />가입 중...</>
                  ) : (
                    "회원가입"
                  )}
                </Button>
              </form>

              {/* Social Login Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-800/50 px-3 text-slate-400">또는</span>
                </div>
              </div>

              {/* Kakao Register Button */}
              <button
                type="button"
                onClick={() => {
                  const origin = window.location.origin;
                  window.location.href = `/api/auth/kakao?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}`;
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all hover:brightness-95"
                style={{ backgroundColor: '#FEE500', color: '#191919' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.63 5.17l-.93 3.42c-.08.3.26.54.52.37l4.07-2.68c.23.02.47.03.71.03 4.42 0 8-2.79 8-6.21S13.42 1 9 1z" fill="#191919"/>
                </svg>
                카카오로 간편 가입
              </button>

              <div className="mt-4 text-center">
                <p className="text-slate-500 text-sm">
                  이미 계정이 있으신가요?{" "}
                  <button onClick={switchToLogin} className="text-blue-400 hover:text-blue-300 font-medium">
                    로그인
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-slate-500 text-xs mt-6">
          Alpha Trip &mdash; Meetup & Travel Automation
        </p>
      </div>
    </div>
  );
}
