import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Copy, MessageCircle, Send, X, Check, ChevronRight,
  Globe, Gift, Rocket, FileText, Sparkles, Pencil, RotateCcw
} from "lucide-react";

interface MeetupData {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  scheduleStart?: string | Date | null;
  scheduleEnd?: string | Date | null;
  maxParticipants?: number | null;
  invitedCountries?: any;
  projectCode?: string | null;
  shareToken?: string | null;
}

interface MeetupShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetup: MeetupData;
  shareUrl: string;
}

interface RecommendTemplate {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  generate: (meetup: MeetupData, shareUrl: string) => string;
}

/**
 * MeetupShareModal - XPLAY 스타일 추천글 선택 + 공유 방법 선택 모달
 * Step 1: 추천글 템플릿 선택
 * Step 2: 공유 방법 선택 (링크 복사, 카카오톡, 텔레그램, 라인, 왓츠앱, X/트위터)
 */
export function MeetupShareModal({ open, onOpenChange, meetup, shareUrl }: MeetupShareModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"select" | "share">("select");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generatedText, setGeneratedText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const formatDate = (d: string | Date | null | undefined) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString();
  };

  const templates: RecommendTemplate[] = useMemo(() => [
    {
      id: "summary",
      icon: <FileText className="h-5 w-5 text-cyan-400" />,
      title: t("meetupShare.templateSummary", "밋업 요약"),
      subtitle: t("meetupShare.templateSummaryDesc", "일정·장소·인원 핵심 정보 한눈에 보기"),
      generate: (m, url) => {
        const lines = [];
        lines.push(`✈️ ${m.title}`);
        lines.push("");
        if (m.location) lines.push(`📍 ${t("meetupShare.location", "장소")}: ${m.location}`);
        if (m.scheduleStart) {
          const period = m.scheduleEnd
            ? `${formatDate(m.scheduleStart)} ~ ${formatDate(m.scheduleEnd)}`
            : formatDate(m.scheduleStart);
          lines.push(`📅 ${t("meetupShare.period", "기간")}: ${period}`);
        }
        if (m.maxParticipants) lines.push(`👥 ${t("meetupShare.maxPeople", "최대 인원")}: ${m.maxParticipants}${t("meetupShare.people", "명")}`);
        if (m.invitedCountries && Array.isArray(m.invitedCountries) && m.invitedCountries.length > 0) {
          lines.push(`🌍 ${t("meetupShare.invitedCountries", "초청국가")}: ${m.invitedCountries.join(", ")}`);
        }
        lines.push("");
        lines.push(`👉 ${t("meetupShare.applyNow", "지금 신청하기")}: ${url}`);
        return lines.join("\n");
      },
    },
    {
      id: "invite",
      icon: <Globe className="h-5 w-5 text-green-400" />,
      title: t("meetupShare.templateInvite", "초대장"),
      subtitle: t("meetupShare.templateInviteDesc", "친구/동료에게 보내는 정중한 초대 메시지"),
      generate: (m, url) => {
        const lines = [];
        lines.push(`🎉 ${t("meetupShare.inviteTitle", "밋업에 초대합니다!")}`)
        lines.push("");
        lines.push(`${t("meetupShare.inviteBody1", "안녕하세요! 아래 밋업에 함께 참석하실 분을 찾고 있습니다.")}`);
        lines.push("");
        lines.push(`📌 ${m.title}`);
        if (m.location) lines.push(`📍 ${m.location}`);
        if (m.scheduleStart) {
          const period = m.scheduleEnd
            ? `${formatDate(m.scheduleStart)} ~ ${formatDate(m.scheduleEnd)}`
            : formatDate(m.scheduleStart);
          lines.push(`📅 ${period}`);
        }
        if (m.description) {
          const desc = m.description.length > 100 ? m.description.slice(0, 100) + "..." : m.description;
          lines.push("");
          lines.push(`💡 ${desc}`);
        }
        lines.push("");
        lines.push(`${t("meetupShare.inviteBody2", "관심 있으시면 아래 링크로 신청해주세요!")}`);
        lines.push(`👉 ${url}`);
        return lines.join("\n");
      },
    },
    {
      id: "event",
      icon: <Gift className="h-5 w-5 text-yellow-400" />,
      title: t("meetupShare.templateEvent", "이벤트 홍보"),
      subtitle: t("meetupShare.templateEventDesc", "SNS 공유에 적합한 짧고 임팩트 있는 문구"),
      generate: (m, url) => {
        const lines = [];
        lines.push(`🔥 ${m.title}`);
        lines.push("");
        if (m.location) lines.push(`📍 ${m.location}`);
        if (m.scheduleStart) lines.push(`📅 ${formatDate(m.scheduleStart)}${m.scheduleEnd ? ` ~ ${formatDate(m.scheduleEnd)}` : ""}`);
        lines.push("");
        lines.push(`✨ ${t("meetupShare.eventBody", "놓치지 마세요! 지금 바로 참여하세요.")}`);
        lines.push("");
        lines.push(`🔗 ${url}`);
        if (m.invitedCountries && Array.isArray(m.invitedCountries) && m.invitedCountries.length > 0) {
          lines.push("");
          lines.push(`#${m.invitedCountries.join(" #")} #meetup #travel`);
        } else {
          lines.push("");
          lines.push(`#meetup #travel #networking`);
        }
        return lines.join("\n");
      },
    },
    {
      id: "ai_recommend",
      icon: <Rocket className="h-5 w-5 text-purple-400" />,
      title: t("meetupShare.templateAI", "AI 추천글"),
      subtitle: t("meetupShare.templateAIDesc", "핵심 기능 요약 — 간결한 소개 문구"),
      generate: (m, url) => {
        const lines = [];
        lines.push(`🚀 ${m.title}`);
        lines.push("");
        lines.push(`${t("meetupShare.aiBody1", "이 밋업은 글로벌 네트워킹과 비즈니스 기회를 제공합니다.")}`);
        lines.push("");
        if (m.description) {
          const desc = m.description.length > 150 ? m.description.slice(0, 150) + "..." : m.description;
          lines.push(desc);
          lines.push("");
        }
        lines.push(`✅ ${t("meetupShare.aiFeature1", "글로벌 참석자와 네트워킹")}`);
        lines.push(`✅ ${t("meetupShare.aiFeature2", "비즈니스 미팅 및 파트너십")}`);
        lines.push(`✅ ${t("meetupShare.aiFeature3", "현지 문화 체험 및 관광")}`);
        lines.push("");
        lines.push(`👉 ${t("meetupShare.applyNow", "지금 신청하기")}: ${url}`);
        return lines.join("\n");
      },
    },
    {
      id: "full_detail",
      icon: <Sparkles className="h-5 w-5 text-cyan-300" />,
      title: t("meetupShare.templateFull", "완전 요약"),
      subtitle: t("meetupShare.templateFullDesc", "모든 정보를 포함한 상세 안내문"),
      generate: (m, url) => {
        const lines = [];
        lines.push(`📋 ${m.title} ${t("meetupShare.fullTitle", "완전 요약")}`);
        lines.push("");
        lines.push(`📍 ${t("meetupShare.location", "장소")}`);
        lines.push(m.location || "-");
        lines.push("");
        if (m.scheduleStart) {
          lines.push(`📅 ${t("meetupShare.period", "기간")}`);
          const period = m.scheduleEnd
            ? `${formatDate(m.scheduleStart)} ~ ${formatDate(m.scheduleEnd)}`
            : formatDate(m.scheduleStart);
          lines.push(period);
          lines.push("");
        }
        if (m.maxParticipants) {
          lines.push(`👥 ${t("meetupShare.maxPeople", "최대 인원")}: ${m.maxParticipants}${t("meetupShare.people", "명")}`);
          lines.push("");
        }
        if (m.invitedCountries && Array.isArray(m.invitedCountries) && m.invitedCountries.length > 0) {
          lines.push(`🌍 ${t("meetupShare.invitedCountries", "초청국가")}: ${m.invitedCountries.join(", ")}`);
          lines.push("");
        }
        if (m.description) {
          lines.push(`💡 ${t("meetupShare.description", "소개")}`);
          lines.push(m.description);
          lines.push("");
        }
        if (m.projectCode) {
          lines.push(`🔑 ${t("meetupShare.projectCode", "프로젝트 코드")}: ${m.projectCode}`);
          lines.push("");
        }
        lines.push(`👉 ${t("meetupShare.applyNow", "지금 신청하기")}`);
        lines.push(url);
        return lines.join("\n");
      },
    },
  ], [t, meetup, shareUrl]);

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      const text = template.generate(meetup, shareUrl);
      setGeneratedText(text);
      setOriginalText(text);
      setIsEditing(false);
      setStep("share");
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleResetText = () => {
    setGeneratedText(originalText);
    setIsEditing(false);
  };

  const handleBack = () => {
    setStep("select");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedText);
    toast.success(t("meetupShare.copied", "추천글이 복사되었습니다"));
  };

  const handleShareKakao = () => {
    // 카카오톡 공유 (모바일 딥링크)
    const encodedText = encodeURIComponent(generatedText);
    const kakaoUrl = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(shareUrl)}&text=${encodedText}`;
    // 모바일에서는 카카오톡 앱으로 직접 공유
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
      window.location.href = `kakaotalk://msg/text?text=${encodedText}`;
    } else {
      window.open(kakaoUrl, "_blank", "width=500,height=600");
    }
  };

  const handleShareTelegram = () => {
    const encodedText = encodeURIComponent(generatedText);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodedText}`, "_blank");
  };

  const handleShareLine = () => {
    const encodedText = encodeURIComponent(generatedText);
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodedText}`, "_blank");
  };

  const handleShareWhatsApp = () => {
    const encodedText = encodeURIComponent(generatedText);
    window.open(`https://wa.me/?text=${encodedText}`, "_blank");
  };

  const handleShareTwitter = () => {
    const text = generatedText.length > 280 ? generatedText.slice(0, 277) + "..." : generatedText;
    const encodedText = encodeURIComponent(text);
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, "_blank");
  };

  const handleClose = () => {
    setStep("select");
    setSelectedTemplate(null);
    setGeneratedText("");
    setOriginalText("");
    setIsEditing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card border-border">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              {step === "select"
                ? t("meetupShare.selectTemplate", "추천글 선택")
                : t("meetupShare.selectMethod", "공유 방법 선택")}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {step === "select" ? (
          /* Step 1: 추천글 템플릿 선택 */
          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 space-y-2">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left hover:bg-accent/50 ${
                    selectedTemplate === tmpl.id
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  }`}
                >
                  <div className="shrink-0 w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                    {tmpl.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{tmpl.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{tmpl.subtitle}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          /* Step 2: 공유 방법 선택 */
          <div className="p-4 space-y-4">
            {/* 생성된 추천글 미리보기 / 편집 */}
            <div className="relative">
              {isEditing ? (
                <Textarea
                  ref={textareaRef}
                  value={generatedText}
                  onChange={(e) => setGeneratedText(e.target.value)}
                  className="min-h-[150px] max-h-[200px] text-xs font-sans leading-relaxed resize-none bg-muted/30 border-primary/50"
                  placeholder={t("meetupShare.editPlaceholder", "추천글을 자유롭게 수정하세요...")}
                />
              ) : (
                <ScrollArea className="max-h-[150px] rounded-lg border border-border bg-muted/30 p-3">
                  <pre className="text-xs whitespace-pre-wrap text-foreground font-sans leading-relaxed">
                    {generatedText}
                  </pre>
                </ScrollArea>
              )}
              {/* 편집/초기화 버튼 */}
              <div className="flex items-center gap-1 mt-2">
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="w-3 h-3" />
                    {t("meetupShare.editText", "수정하기")}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => setIsEditing(false)}
                  >
                    <Check className="w-3 h-3" />
                    {t("meetupShare.doneEdit", "완료")}
                  </Button>
                )}
                {generatedText !== originalText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                    onClick={handleResetText}
                  >
                    <RotateCcw className="w-3 h-3" />
                    {t("meetupShare.resetText", "초기화")}
                  </Button>
                )}
              </div>
            </div>

            {/* 공유 방법 그리드 */}
            <div className="grid grid-cols-3 gap-2">
              <ShareButton
                icon={<Copy className="h-5 w-5" />}
                label={t("meetupShare.copyLink", "링크 복사")}
                onClick={handleCopyLink}
                className="border-cyan-500/30 hover:bg-cyan-500/10"
              />
              <ShareButton
                icon={<MessageCircle className="h-5 w-5 text-yellow-400" />}
                label={t("meetupShare.kakao", "카카오톡")}
                onClick={handleShareKakao}
                className="border-yellow-500/30 hover:bg-yellow-500/10"
              />
              <ShareButton
                icon={<Send className="h-5 w-5 text-blue-400" />}
                label={t("meetupShare.telegram", "텔레그램")}
                onClick={handleShareTelegram}
                className="border-blue-500/30 hover:bg-blue-500/10"
              />
              <ShareButton
                icon={<MessageCircle className="h-5 w-5 text-green-400" />}
                label={t("meetupShare.line", "라인")}
                onClick={handleShareLine}
                className="border-green-500/30 hover:bg-green-500/10"
              />
              <ShareButton
                icon={<MessageCircle className="h-5 w-5 text-green-500" />}
                label={t("meetupShare.whatsapp", "왓츠앱")}
                onClick={handleShareWhatsApp}
                className="border-green-600/30 hover:bg-green-600/10"
              />
              <ShareButton
                icon={<ExternalLinkIcon className="h-5 w-5" />}
                label={t("meetupShare.twitter", "X (트위터)")}
                onClick={handleShareTwitter}
                className="border-gray-500/30 hover:bg-gray-500/10"
              />
            </div>

            {/* 뒤로가기 */}
            <Button variant="ghost" size="sm" onClick={handleBack} className="w-full text-muted-foreground">
              ← {t("meetupShare.backToTemplates", "다른 추천글 선택")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShareButton({ icon, label, onClick, className = "" }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${className}`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15,3 21,3 21,9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default MeetupShareModal;
