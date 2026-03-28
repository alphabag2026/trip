import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Mail, Lock, Shield, Eye, EyeOff, User, Building2, Briefcase, Hotel, Users,
  ArrowLeft, ArrowRight, CheckCircle2, Phone, Globe, MapPin, FileText, Calendar,
  UserCheck, Target, UsersRound,
} from "lucide-react";
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
  const [step, setStep] = useState<"form" | "2fa" | "type-select" | "org-step1" | "org-step2">(initialTab === "register" ? "type-select" : "form");

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

  // Organizer/Agency/Partner extra fields
  const [contactPhone, setContactPhone] = useState("");
  const [businessRegistration, setBusinessRegistration] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [industryCategory, setIndustryCategory] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [eventExperience, setEventExperience] = useState("");
  const [expectedEventsPerYear, setExpectedEventsPerYear] = useState("");
  const [targetRegions, setTargetRegions] = useState("");
  const [teamSize, setTeamSize] = useState("");

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
      contactPhone: contactPhone || undefined,
      businessRegistration: businessRegistration || undefined,
      businessType: businessType || undefined,
      companyAddress: companyAddress || undefined,
      companyWebsite: companyWebsite || undefined,
      companyDescription: companyDescription || undefined,
      industryCategory: industryCategory || undefined,
      employeeCount: employeeCount ? parseInt(employeeCount) : undefined,
      foundedYear: foundedYear ? parseInt(foundedYear) : undefined,
      eventExperience: eventExperience || undefined,
      expectedEventsPerYear: expectedEventsPerYear ? parseInt(expectedEventsPerYear) : undefined,
      targetRegions: targetRegions || undefined,
      teamSize: teamSize ? parseInt(teamSize) : undefined,
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

  // Validate org step 1 (basic info)
  const canProceedOrgStep1 = useMemo(() => {
    return regName.trim() && regEmail.trim() && regPassword.length >= 8 &&
      regPassword === regPasswordConfirm && organizationName.trim() && contactPhone.trim();
  }, [regName, regEmail, regPassword, regPasswordConfirm, organizationName, contactPhone]);

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

  const industryOptions = [
    "이벤트/행사", "여행/관광", "호텔/숙박", "항공/교통", "식음료/요식업",
    "엔터테인먼트", "IT/테크", "금융/핀테크", "블록체인/Web3", "교육/컨퍼런스",
    "의료/헬스케어", "부동산", "무역/수출입", "기타",
  ];

  const businessTypeOptions = [
    "개인사업자", "법인사업자", "프리랜서", "비영리단체", "정부/공공기관", "기타",
  ];

  const isOrgType = accountType !== "personal";

  // Step indicator for org registration
  const orgStepNumber = step === "form" || step === "org-step1" ? 1 : step === "org-step2" ? 2 : 0;

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
                    onClick={() => {
                      setAccountType(at.type);
                      setError("");
                      if (at.type === "personal") {
                        setStep("form");
                      } else {
                        setStep("org-step1");
                      }
                    }}
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

        {/* ── REGISTER: Personal Form (simple) ── */}
        {tab === "register" && step === "form" && accountType === "personal" && (
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-purple-500/10 text-purple-300 border-purple-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      개인 참가자
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
                    <Input id="reg-name" type="text" placeholder="홍길동" value={regName} onChange={(e) => setRegName(e.target.value)} className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-slate-300">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input id="reg-email" type="email" placeholder="email@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-slate-300">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input id="reg-password" type={showRegPassword ? "text" : "password"} placeholder="8자 이상" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" required minLength={8} />
                    <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300">
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password-confirm" className="text-slate-300">비밀번호 확인</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input id="reg-password-confirm" type={showRegPassword ? "text" : "password"} placeholder="비밀번호 재입력" value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)} className={`pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 ${regPasswordConfirm && regPassword !== regPasswordConfirm ? "border-red-500" : ""}`} required minLength={8} />
                  </div>
                  {regPasswordConfirm && regPassword !== regPasswordConfirm && (
                    <p className="text-xs text-red-400">비밀번호가 일치하지 않습니다</p>
                  )}
                </div>

                {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

                <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25" disabled={emailRegister.isPending}>
                  {emailRegister.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />가입 중...</> : "회원가입"}
                </Button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-600/50" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-slate-800/50 px-3 text-slate-400">또는</span></div>
              </div>
              <button type="button" onClick={() => { const origin = window.location.origin; window.location.href = `/api/auth/kakao?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}`; }} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all hover:brightness-95" style={{ backgroundColor: '#FEE500', color: '#191919' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.63 5.17l-.93 3.42c-.08.3.26.54.52.37l4.07-2.68c.23.02.47.03.71.03 4.42 0 8-2.79 8-6.21S13.42 1 9 1z" fill="#191919"/></svg>
                카카오로 간편 가입
              </button>

              <div className="mt-4 text-center">
                <p className="text-slate-500 text-sm">이미 계정이 있으신가요?{" "}<button onClick={switchToLogin} className="text-blue-400 hover:text-blue-300 font-medium">로그인</button></p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── REGISTER: Org Step 1 - 기본 정보 + 계정 ── */}
        {tab === "register" && step === "org-step1" && isOrgType && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <button onClick={() => { setStep("type-select"); setError(""); }} className="text-slate-400 hover:text-slate-300 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <CardTitle className="text-xl text-white">
                    {accountType === "organizer" ? "주최자 가입" : accountType === "agency" ? "여행사 가입" : "파트너 가입"}
                  </CardTitle>
                  <CardDescription className="text-slate-400 flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
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
              {/* Step indicator */}
              <div className="flex items-center gap-2 pt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                  <span className="text-xs text-blue-300 font-medium">기본 정보</span>
                </div>
                <div className="flex-1 h-px bg-slate-600" />
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-400 flex items-center justify-center text-xs font-bold">2</div>
                  <span className="text-xs text-slate-500">사업 정보</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 담당자 이름 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">담당자 이름 <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="text" placeholder="홍길동" value={regName} onChange={(e) => setRegName(e.target.value)} className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" required />
                  </div>
                </div>

                {/* 이메일 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">업무 이메일 <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="email" placeholder="business@company.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" required />
                  </div>
                </div>

                {/* 연락처 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">연락처 <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="tel" placeholder="010-1234-5678" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" required />
                  </div>
                </div>

                {/* 조직/회사명 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    {accountType === "organizer" ? "프로젝트/팀 이름" : accountType === "agency" ? "여행사명" : "파트너 회사명"} <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="text" placeholder={accountType === "organizer" ? "예: Alpha 밋업팀" : accountType === "agency" ? "예: 글로벌 트래블" : "예: 서울 호텔"} value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" required />
                  </div>
                </div>

                {/* 비밀번호 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">비밀번호 <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type={showRegPassword ? "text" : "password"} placeholder="8자 이상" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" required minLength={8} />
                    <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300">
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">비밀번호 확인 <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type={showRegPassword ? "text" : "password"} placeholder="비밀번호 재입력" value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)} className={`pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 ${regPasswordConfirm && regPassword !== regPasswordConfirm ? "border-red-500" : ""}`} required minLength={8} />
                  </div>
                  {regPasswordConfirm && regPassword !== regPasswordConfirm && (
                    <p className="text-xs text-red-400">비밀번호가 일치하지 않습니다</p>
                  )}
                </div>

                {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

                <Button
                  type="button"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
                  disabled={!canProceedOrgStep1}
                  onClick={() => { setError(""); setStep("org-step2"); }}
                >
                  다음 단계 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="mt-4 text-center">
                <p className="text-slate-500 text-sm">이미 계정이 있으신가요?{" "}<button onClick={switchToLogin} className="text-blue-400 hover:text-blue-300 font-medium">로그인</button></p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── REGISTER: Org Step 2 - 사업/조직 상세 정보 ── */}
        {tab === "register" && step === "org-step2" && isOrgType && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <button onClick={() => { setStep("org-step1"); setError(""); }} className="text-slate-400 hover:text-slate-300 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <CardTitle className="text-xl text-white">사업/조직 정보</CardTitle>
                  <CardDescription className="text-slate-400 text-sm">
                    상세 정보를 입력해주세요 (선택사항)
                  </CardDescription>
                </div>
              </div>
              {/* Step indicator */}
              <div className="flex items-center gap-2 pt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-emerald-300 font-medium">기본 정보</span>
                </div>
                <div className="flex-1 h-px bg-blue-500" />
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                  <span className="text-xs text-blue-300 font-medium">사업 정보</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                {/* 사업자 등록번호 */}
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> 사업자 등록번호
                  </Label>
                  <Input type="text" placeholder="123-45-67890" value={businessRegistration} onChange={(e) => setBusinessRegistration(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" />
                </div>

                {/* 사업자 유형 */}
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> 사업자 유형
                  </Label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue placeholder="선택해주세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypeOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 업종 카테고리 */}
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> 업종 카테고리
                  </Label>
                  <Select value={industryCategory} onValueChange={setIndustryCategory}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue placeholder="선택해주세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {industryOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 회사 주소 */}
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> 회사 주소
                  </Label>
                  <Input type="text" placeholder="서울시 강남구..." value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" />
                </div>

                {/* 웹사이트 */}
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> 웹사이트
                  </Label>
                  <Input type="url" placeholder="https://www.example.com" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" />
                </div>

                {/* 설립연도 & 직원수 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> 설립연도
                    </Label>
                    <Input type="number" placeholder="2020" min="1900" max="2026" value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-1.5">
                      <UsersRound className="w-3.5 h-3.5" /> 직원 수
                    </Label>
                    <Input type="number" placeholder="10" min="1" value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" />
                  </div>
                </div>

                {/* 주최자 전용: 이벤트 경험 & 연간 예상 이벤트 */}
                {accountType === "organizer" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-slate-300">이벤트/밋업 운영 경험</Label>
                      <Textarea placeholder="이전에 운영한 이벤트나 밋업 경험을 간략히 적어주세요" value={eventExperience} onChange={(e) => setEventExperience(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 min-h-[80px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-slate-300">연간 예상 이벤트 수</Label>
                        <Input type="number" placeholder="12" min="1" value={expectedEventsPerYear} onChange={(e) => setExpectedEventsPerYear(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">팀 규모</Label>
                        <Input type="number" placeholder="5" min="1" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">주요 활동 지역</Label>
                      <Input type="text" placeholder="서울, 방콕, 싱가포르..." value={targetRegions} onChange={(e) => setTargetRegions(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" />
                    </div>
                  </>
                )}

                {/* 여행사 전용 */}
                {accountType === "agency" && (
                  <div className="space-y-2">
                    <Label className="text-slate-300">서비스 지역</Label>
                    <Input type="text" placeholder="동남아, 유럽, 일본..." value={targetRegions} onChange={(e) => setTargetRegions(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" />
                  </div>
                )}

                {/* 파트너 전용 */}
                {accountType === "partner" && (
                  <div className="space-y-2">
                    <Label className="text-slate-300">서비스 지역</Label>
                    <Input type="text" placeholder="방콕, 파타야..." value={targetRegions} onChange={(e) => setTargetRegions(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20" />
                  </div>
                )}

                {/* 회사 소개 */}
                <div className="space-y-2">
                  <Label className="text-slate-300">회사/조직 소개</Label>
                  <Textarea placeholder="회사 또는 조직에 대해 간략히 소개해주세요" value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 min-h-[80px]" />
                </div>

                {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => setStep("org-step1")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> 이전
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25" disabled={emailRegister.isPending}>
                    {emailRegister.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />가입 중...</> : "가입 완료"}
                  </Button>
                </div>

                {/* Skip option */}
                <div className="text-center">
                  <button type="submit" className="text-slate-500 hover:text-slate-400 text-xs transition-colors underline">
                    나중에 입력할게요 (건너뛰기)
                  </button>
                </div>
              </form>
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
