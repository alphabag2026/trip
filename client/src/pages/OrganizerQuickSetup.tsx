import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Building2, CalendarPlus, Users, ArrowRight, ArrowLeft,
  CheckCircle2, Loader2, Sparkles, UserPlus, Send,
  Rocket, PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import confetti from "canvas-confetti";

const STEPS = [
  { id: 1, title: "조직 정보", icon: Building2, description: "회사/단체 기본 정보를 입력하세요" },
  { id: 2, title: "첫 밋업 생성", icon: CalendarPlus, description: "첫 번째 밋업을 만들어보세요" },
  { id: 3, title: "팀 초대", icon: Users, description: "함께 일할 팀원을 초대하세요" },
];

const MEETUP_TYPES = [
  { value: "meetup", label: "밋업/네트워킹" },
  { value: "event", label: "이벤트/컨퍼런스" },
  { value: "pre_visit", label: "사전방문" },
  { value: "meeting", label: "미팅" },
  { value: "other", label: "기타" },
];

export default function OrganizerQuickSetup() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState<number[]>([]);

  // Step 1: Organization
  const [orgForm, setOrgForm] = useState({
    name: "", description: "", website: "", contactPhone: "",
    contactEmail: "", address: "", country: "한국", contactName: "",
  });

  // Step 2: Meetup
  const [meetupForm, setMeetupForm] = useState({
    title: "", description: "", type: "meetup" as string,
    location: "", country: "", city: "",
    startDate: "", endDate: "", maxAttendees: "50",
  });

  // Step 3: Team
  const [teamEmails, setTeamEmails] = useState<string[]>([""]);
  const [teamRoles, setTeamRoles] = useState<string[]>(["staff"]);

  const createOrg = trpc.organization.create.useMutation();
  const createMeetup = trpc.meetup.create.useMutation();

  // AI prompt for meetup
  const aiParseMeetup = trpc.aiMeetup.parsePrompt.useMutation();
  const [aiPrompt, setAiPrompt] = useState("");

  const progressPercent = Math.round((completed.length / STEPS.length) * 100);

  function markCompleted(stepId: number) {
    setCompleted(prev => prev.includes(stepId) ? prev : [...prev, stepId]);
  }

  async function handleOrgSubmit() {
    if (!orgForm.name.trim()) { toast.error("조직명을 입력해주세요"); return; }
    try {
      await createOrg.mutateAsync({
        name: orgForm.name,
        type: "organizer",
        description: orgForm.description || undefined,
        website: orgForm.website || undefined,
        contactPhone: orgForm.contactPhone || undefined,
        contactEmail: orgForm.contactEmail || undefined,
        contactName: orgForm.contactName || undefined,
        address: orgForm.address || undefined,
        country: orgForm.country || undefined,
      });
      toast.success("조직이 등록되었습니다!");
      markCompleted(1);
      setStep(2);
    } catch (e: any) {
      toast.error(e.message || "조직 등록 실패");
    }
  }

  async function handleAiMeetup() {
    if (!aiPrompt.trim()) return;
    const result = await aiParseMeetup.mutateAsync({ prompt: aiPrompt });
    if (result.success && result.data) {
      const d = result.data;
      setMeetupForm(prev => ({
        ...prev,
        title: d.title || prev.title,
        description: d.description || prev.description,
        type: d.type || prev.type,
        location: d.location || prev.location,
        startDate: d.scheduleStart || prev.startDate,
        endDate: d.scheduleEnd || prev.endDate,
        maxAttendees: d.maxParticipants ? String(d.maxParticipants) : prev.maxAttendees,
      }));
      toast.success("AI가 밋업 정보를 자동으로 채웠습니다");
    }
  }

  async function handleMeetupSubmit() {
    if (!meetupForm.title.trim()) { toast.error("밋업 제목을 입력해주세요"); return; }
    try {
      await createMeetup.mutateAsync({
        title: meetupForm.title,
        description: meetupForm.description || undefined,
        type: meetupForm.type as any,
        location: meetupForm.location || undefined,
        scheduleStart: meetupForm.startDate || undefined,
        scheduleEnd: meetupForm.endDate || undefined,
        maxParticipants: meetupForm.maxAttendees ? Number(meetupForm.maxAttendees) : undefined,
      });
      toast.success("밋업이 생성되었습니다!");
      markCompleted(2);
      setStep(3);
    } catch (e: any) {
      toast.error(e.message || "밋업 생성 실패");
    }
  }

  function handleTeamSubmit() {
    const validEmails = teamEmails.filter(e => e.trim());
    if (validEmails.length > 0) {
      toast.success(`${validEmails.length}명에게 초대 이메일이 발송됩니다`);
    }
    markCompleted(3);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }

  function addTeamMember() {
    setTeamEmails(prev => [...prev, ""]);
    setTeamRoles(prev => [...prev, "staff"]);
  }

  function removeTeamMember(idx: number) {
    setTeamEmails(prev => prev.filter((_, i) => i !== idx));
    setTeamRoles(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20 mb-4">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            주최자 퀵 셋업
          </h1>
          <p className="text-muted-foreground">
            3단계로 밋업 운영을 시작하세요
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">진행률</span>
            <span className="text-sm font-semibold text-blue-600">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between mt-3">
            {STEPS.map((s) => {
              const StepIcon = s.icon;
              const isCompleted = completed.includes(s.id);
              const isCurrent = step === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isCompleted
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : isCurrent
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <StepIcon className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 1: Organization */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                조직 정보 등록
              </CardTitle>
              <CardDescription>회사 또는 단체의 기본 정보를 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>조직명 *</Label>
                  <Input value={orgForm.name} onChange={e => setOrgForm(p => ({ ...p, name: e.target.value }))} placeholder="예: Alpha Trip Inc." />
                </div>
                <div className="sm:col-span-2">
                  <Label>소개</Label>
                  <Textarea value={orgForm.description} onChange={e => setOrgForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="조직에 대한 간단한 소개" />
                </div>
                <div>
                  <Label>웹사이트</Label>
                  <Input value={orgForm.website} onChange={e => setOrgForm(p => ({ ...p, website: e.target.value }))} placeholder="https://" />
                </div>
                <div>
                  <Label>담당자 이름</Label>
                  <Input value={orgForm.contactName} onChange={e => setOrgForm(p => ({ ...p, contactName: e.target.value }))} placeholder="홍길동" />
                </div>
                <div>
                  <Label>이메일</Label>
                  <Input type="email" value={orgForm.contactEmail} onChange={e => setOrgForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="contact@company.com" />
                </div>
                <div>
                  <Label>전화번호</Label>
                  <Input value={orgForm.contactPhone} onChange={e => setOrgForm(p => ({ ...p, contactPhone: e.target.value }))} placeholder="+82-10-0000-0000" />
                </div>
                <div>
                  <Label>국가</Label>
                  <Input value={orgForm.country} onChange={e => setOrgForm(p => ({ ...p, country: e.target.value }))} />
                </div>
                <div>
                  <Label>주소</Label>
                  <Input value={orgForm.address} onChange={e => setOrgForm(p => ({ ...p, address: e.target.value }))} placeholder="상세 주소" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => { markCompleted(1); setStep(2); }}>
                  건너뛰기
                </Button>
                <Button onClick={handleOrgSubmit} disabled={createOrg.isPending}>
                  {createOrg.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  다음: 밋업 생성
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Create Meetup */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarPlus className="h-5 w-5 text-emerald-500" />
                첫 밋업 생성
              </CardTitle>
              <CardDescription>AI로 빠르게 밋업을 만들어보세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* AI Prompt */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/5 dark:to-purple-500/5 border border-violet-200 dark:border-violet-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-medium text-violet-700 dark:text-violet-300">AI 자동 입력</span>
                </div>
                <Textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={2}
                  placeholder="예: 서울에서 5월 1일부터 3일까지 Web3 밋업, 일본/베트남 초청, 50명 규모"
                  className="mb-2"
                />
                <Button size="sm" variant="outline" onClick={handleAiMeetup} disabled={aiParseMeetup.isPending}>
                  {aiParseMeetup.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  AI로 채우기
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>밋업 제목 *</Label>
                  <Input value={meetupForm.title} onChange={e => setMeetupForm(p => ({ ...p, title: e.target.value }))} placeholder="예: Web3 Seoul Meetup 2026" />
                </div>
                <div className="sm:col-span-2">
                  <Label>설명</Label>
                  <Textarea value={meetupForm.description} onChange={e => setMeetupForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                </div>
                <div>
                  <Label>유형</Label>
                  <Select value={meetupForm.type} onValueChange={v => setMeetupForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEETUP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>최대 인원</Label>
                  <Input type="number" value={meetupForm.maxAttendees} onChange={e => setMeetupForm(p => ({ ...p, maxAttendees: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>장소</Label>
                  <Input value={meetupForm.location} onChange={e => setMeetupForm(p => ({ ...p, location: e.target.value }))} placeholder="예: 코엑스 컨벤션센터" />
                </div>
                <div>
                  <Label>시작일</Label>
                  <Input type="date" value={meetupForm.startDate} onChange={e => setMeetupForm(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div>
                  <Label>종료일</Label>
                  <Input type="date" value={meetupForm.endDate} onChange={e => setMeetupForm(p => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-between gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> 이전
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => { markCompleted(2); setStep(3); }}>
                    건너뛰기
                  </Button>
                  <Button onClick={handleMeetupSubmit} disabled={createMeetup.isPending}>
                    {createMeetup.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    다음: 팀 초대
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Team Invite */}
        {step === 3 && !completed.includes(3) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                팀원 초대
              </CardTitle>
              <CardDescription>함께 밋업을 운영할 팀원의 이메일을 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamEmails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type="email"
                      value={email}
                      onChange={e => {
                        const newEmails = [...teamEmails];
                        newEmails[idx] = e.target.value;
                        setTeamEmails(newEmails);
                      }}
                      placeholder="team@company.com"
                    />
                  </div>
                  <Select value={teamRoles[idx]} onValueChange={v => {
                    const newRoles = [...teamRoles];
                    newRoles[idx] = v;
                    setTeamRoles(newRoles);
                  }}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">관리자</SelectItem>
                      <SelectItem value="staff">스태프</SelectItem>
                      <SelectItem value="viewer">뷰어</SelectItem>
                    </SelectContent>
                  </Select>
                  {teamEmails.length > 1 && (
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeTeamMember(idx)}>
                      &times;
                    </Button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addTeamMember}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> 팀원 추가
              </Button>
              <div className="flex justify-between gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> 이전
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => markCompleted(3)}>
                    건너뛰기
                  </Button>
                  <Button onClick={handleTeamSubmit}>
                    <Send className="h-4 w-4 mr-1" /> 초대 발송
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion */}
        {completed.includes(3) && step === 3 && (
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl mb-6">
                <PartyPopper className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">셋업 완료!</h2>
              <p className="text-muted-foreground mb-6">
                모든 초기 설정이 완료되었습니다. 이제 백오피스에서 밋업을 관리하세요.
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={() => navigate("/admin/dashboard")} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  백오피스로 이동
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  홈으로
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
