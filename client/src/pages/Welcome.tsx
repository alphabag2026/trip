import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  UserCircle,
  CalendarPlus,
  Building2,
  Briefcase,
  Hotel,
  Users,
  ArrowRight,
  Sparkles,
  Globe,
  FileText,
  MapPin,
  Shield,
  MessageSquare,
  Plane,
  Star,
  Handshake,
  ClipboardList,
  Circle,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import confetti from "canvas-confetti";

type AccountType = "personal" | "organizer" | "agency" | "partner";

interface StepGuide {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  linkText: string;
  priority: "required" | "recommended" | "optional";
  progressKey?: string; // maps to onboarding_progress column
}

const typeConfig: Record<
  AccountType,
  {
    icon: typeof Users;
    gradient: string;
    accentColor: string;
    badgeBg: string;
    badgeText: string;
    label: string;
  }
> = {
  personal: {
    icon: Users,
    gradient: "from-purple-600 to-violet-600",
    accentColor: "text-purple-500",
    badgeBg: "bg-purple-100 dark:bg-purple-500/10",
    badgeText: "text-purple-700 dark:text-purple-300",
    label: "개인 참가자",
  },
  organizer: {
    icon: Briefcase,
    gradient: "from-blue-600 to-indigo-600",
    accentColor: "text-blue-500",
    badgeBg: "bg-blue-100 dark:bg-blue-500/10",
    badgeText: "text-blue-700 dark:text-blue-300",
    label: "주최자",
  },
  agency: {
    icon: Building2,
    gradient: "from-emerald-600 to-teal-600",
    accentColor: "text-emerald-500",
    badgeBg: "bg-emerald-100 dark:bg-emerald-500/10",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    label: "여행사",
  },
  partner: {
    icon: Hotel,
    gradient: "from-amber-600 to-orange-600",
    accentColor: "text-amber-500",
    badgeBg: "bg-amber-100 dark:bg-amber-500/10",
    badgeText: "text-amber-700 dark:text-amber-300",
    label: "파트너",
  },
};

function getStepGuides(type: AccountType, t: (key: string) => string): StepGuide[] {
  const emailStep: StepGuide = {
    icon: <Mail className="w-6 h-6" />,
    title: t("welcomePage.steps.verifyEmail"),
    description: t("welcomePage.steps.verifyEmailDesc"),
    link: "/my-page",
    linkText: t("welcomePage.steps.goVerifyEmail"),
    priority: "required",
    progressKey: "emailVerified",
  };

  const profileStep: StepGuide = {
    icon: <UserCircle className="w-6 h-6" />,
    title: t("welcomePage.steps.setupProfile"),
    description: t("welcomePage.steps.setupProfileDesc"),
    link: "/onboarding",
    linkText: t("welcomePage.steps.goSetup"),
    priority: "required",
    progressKey: "profileCompleted",
  };

  const byType: Record<AccountType, StepGuide[]> = {
    personal: [
      emailStep,
      profileStep,
      {
        icon: <FileText className="w-6 h-6" />,
        title: t("welcomePage.steps.scanPassport"),
        description: t("welcomePage.steps.scanPassportDesc"),
        link: "/onboarding",
        linkText: t("welcomePage.steps.goScan"),
        priority: "recommended",
        progressKey: "passportRegistered",
      },
      {
        icon: <CalendarPlus className="w-6 h-6" />,
        title: t("welcomePage.steps.applyMeetup"),
        description: t("welcomePage.steps.applyMeetupDesc"),
        link: "/register",
        linkText: t("welcomePage.steps.goApply"),
        priority: "recommended",
        progressKey: "firstMeetupJoined",
      },
      {
        icon: <Plane className="w-6 h-6" />,
        title: t("welcomePage.steps.bookTravel"),
        description: t("welcomePage.steps.bookTravelDesc"),
        link: "/booking",
        linkText: t("welcomePage.steps.goBook"),
        priority: "optional",
        progressKey: "firstBooking",
      },
      {
        icon: <MessageSquare className="w-6 h-6" />,
        title: t("welcomePage.steps.joinCommunity"),
        description: t("welcomePage.steps.joinCommunityDesc"),
        link: "/community",
        linkText: t("welcomePage.steps.goJoin"),
        priority: "optional",
      },
    ],
    organizer: [
      emailStep,
      profileStep,
      {
        icon: <Building2 className="w-6 h-6" />,
        title: t("welcomePage.steps.setupOrg"),
        description: t("welcomePage.steps.setupOrgDesc"),
        link: "/dashboard",
        linkText: t("welcomePage.steps.goSetupOrg"),
        priority: "required",
        progressKey: "orgSetupCompleted",
      },
      {
        icon: <CalendarPlus className="w-6 h-6" />,
        title: t("welcomePage.steps.createMeetup"),
        description: t("welcomePage.steps.createMeetupDesc"),
        link: "/admin/meetups",
        linkText: t("welcomePage.steps.goCreate"),
        priority: "required",
        progressKey: "firstMeetupCreated",
      },
      {
        icon: <Users className="w-6 h-6" />,
        title: t("welcomePage.steps.inviteMembers"),
        description: t("welcomePage.steps.inviteMembersDesc"),
        link: "/dashboard",
        linkText: t("welcomePage.steps.goInvite"),
        priority: "recommended",
      },
      {
        icon: <Globe className="w-6 h-6" />,
        title: t("welcomePage.steps.setupTelegram"),
        description: t("welcomePage.steps.setupTelegramDesc"),
        link: "/admin/telegram",
        linkText: t("welcomePage.steps.goSetupTelegram"),
        priority: "optional",
      },
    ],
    agency: [
      emailStep,
      profileStep,
      {
        icon: <Building2 className="w-6 h-6" />,
        title: t("welcomePage.steps.setupOrg"),
        description: t("welcomePage.steps.setupOrgDesc"),
        link: "/dashboard",
        linkText: t("welcomePage.steps.goSetupOrg"),
        priority: "required",
        progressKey: "orgSetupCompleted",
      },
      {
        icon: <MapPin className="w-6 h-6" />,
        title: t("welcomePage.steps.registerServices"),
        description: t("welcomePage.steps.registerServicesDesc"),
        link: "/dashboard",
        linkText: t("welcomePage.steps.goRegister"),
        priority: "required",
      },
      {
        icon: <Handshake className="w-6 h-6" />,
        title: t("welcomePage.steps.connectPartners"),
        description: t("welcomePage.steps.connectPartnersDesc"),
        link: "/admin/partners",
        linkText: t("welcomePage.steps.goConnect"),
        priority: "recommended",
      },
      {
        icon: <Users className="w-6 h-6" />,
        title: t("welcomePage.steps.inviteTeam"),
        description: t("welcomePage.steps.inviteTeamDesc"),
        link: "/dashboard",
        linkText: t("welcomePage.steps.goInviteTeam"),
        priority: "optional",
      },
    ],
    partner: [
      emailStep,
      profileStep,
      {
        icon: <Star className="w-6 h-6" />,
        title: t("welcomePage.steps.registerBusiness"),
        description: t("welcomePage.steps.registerBusinessDesc"),
        link: "/dashboard",
        linkText: t("welcomePage.steps.goRegisterBiz"),
        priority: "required",
      },
      {
        icon: <Shield className="w-6 h-6" />,
        title: t("welcomePage.steps.verifyBusiness"),
        description: t("welcomePage.steps.verifyBusinessDesc"),
        link: "/dashboard",
        linkText: t("welcomePage.steps.goVerify"),
        priority: "recommended",
      },
      {
        icon: <MessageSquare className="w-6 h-6" />,
        title: t("welcomePage.steps.joinPartnerChat"),
        description: t("welcomePage.steps.joinPartnerChatDesc"),
        link: "/community",
        linkText: t("welcomePage.steps.goChat"),
        priority: "optional",
      },
    ],
  };

  return byType[type] || byType.personal;
}

export default function Welcome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const typeParam = params.get("type") as AccountType | null;
  const accountType: AccountType = typeParam && typeParam in typeConfig ? typeParam : "personal";
  const config = typeConfig[accountType];
  const TypeIcon = config.icon;
  const steps = getStepGuides(accountType, t);

  const [showContent, setShowContent] = useState(false);

  // Fetch onboarding progress from server
  const progressQuery = trpc.auth.getOnboardingProgress.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });

  const progress = progressQuery.data;

  // Calculate completion percentage
  const completedSteps = steps.filter((step) => {
    if (!step.progressKey || !progress) return false;
    return (progress as any)[step.progressKey] === true;
  }).length;
  const trackableSteps = steps.filter((s) => !!s.progressKey).length;
  const progressPercent = trackableSteps > 0 ? Math.round((completedSteps / trackableSteps) * 100) : 0;

  useEffect(() => {
    // Fire confetti on mount
    const duration = 2000;
    const end = Date.now() + duration;
    const colors = ["#6366f1", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    // Stagger content animation
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const priorityLabel = (p: StepGuide["priority"]) => {
    switch (p) {
      case "required":
        return { text: t("welcomePage.priority.required"), cls: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" };
      case "recommended":
        return { text: t("welcomePage.priority.recommended"), cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" };
      case "optional":
        return { text: t("welcomePage.priority.optional"), cls: "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400" };
    }
  };

  const isStepCompleted = (step: StepGuide): boolean => {
    if (!step.progressKey || !progress) return false;
    return (progress as any)[step.progressKey] === true;
  };

  const userName = user?.name || params.get("name") || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br ${config.gradient} opacity-10 blur-3xl`} />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-10 blur-3xl" />
        </div>

        <div className="relative max-w-2xl mx-auto px-4 pt-16 pb-8 text-center">
          {/* Success checkmark */}
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${config.gradient} shadow-xl shadow-blue-500/20 mb-6 transition-all duration-700 ${
              showContent ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>

          {/* Welcome message */}
          <div
            className={`transition-all duration-700 delay-100 ${
              showContent ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {userName
                ? t("welcomePage.titleWithName", { name: userName })
                : t("welcomePage.title")}
            </h1>

            {/* Account type badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border mb-4"
              style={{ background: "var(--card)" }}>
              <TypeIcon className={`w-4 h-4 ${config.accentColor}`} />
              <span className={`text-sm font-medium ${config.badgeText}`}>
                {t(`welcomePage.types.${accountType}`)}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            </div>

            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              {t(`welcomePage.subtitle.${accountType}`)}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar Section */}
      {user && (
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <div
            className={`transition-all duration-700 delay-200 ${
              showContent ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${config.badgeBg} flex items-center justify-center`}>
                    <CheckCircle2 className={`w-4 h-4 ${config.accentColor}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("welcomePage.progressTitle")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("welcomePage.progressDesc", { completed: completedSteps, total: trackableSteps })}
                    </p>
                  </div>
                </div>
                <span className={`text-2xl font-bold ${config.accentColor}`}>
                  {progressPercent}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-2.5" />
              {progressPercent === 100 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("welcomePage.allComplete")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Steps Guide */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <div
          className={`transition-all duration-700 delay-300 ${
            showContent ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {t("welcomePage.nextSteps")}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {t("welcomePage.nextStepsDesc")}
          </p>

          <div className="space-y-3">
            {steps.map((step, idx) => {
              const badge = priorityLabel(step.priority);
              const completed = isStepCompleted(step);
              return (
                <div
                  key={idx}
                  className={`group relative bg-card border rounded-xl p-4 sm:p-5 transition-all duration-300 ${
                    completed
                      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
                      : "border-border hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800"
                  }`}
                  style={{ transitionDelay: `${400 + idx * 80}ms` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Step number + icon */}
                    <div className="flex-shrink-0">
                      <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center ${
                        completed
                          ? "bg-emerald-100 dark:bg-emerald-500/20"
                          : config.badgeBg
                      }`}>
                        {completed ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <span className={config.accentColor}>{step.icon}</span>
                        )}
                        <span className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          completed
                            ? "bg-emerald-600 text-white"
                            : "bg-foreground text-background"
                        }`}>
                          {completed ? "✓" : idx + 1}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className={`font-semibold text-sm sm:text-base ${
                          completed ? "text-emerald-700 dark:text-emerald-300 line-through" : "text-foreground"
                        }`}>
                          {step.title}
                        </h3>
                        {completed ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                            {t("welcomePage.completed")}
                          </span>
                        ) : (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
                            {badge.text}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm mb-3 leading-relaxed ${
                        completed ? "text-emerald-600/70 dark:text-emerald-400/70" : "text-muted-foreground"
                      }`}>
                        {step.description}
                      </p>
                      {!completed && (
                        <Link href={step.link}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          >
                            {step.linkText}
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="mt-8 text-center space-y-3">
            {progressPercent < 100 ? (
              <Link href={steps.find(s => !isStepCompleted(s))?.link || "/onboarding"}>
                <Button
                  size="lg"
                  className={`bg-gradient-to-r ${config.gradient} text-white shadow-lg hover:shadow-xl transition-shadow px-8`}
                >
                  {t("welcomePage.startNow")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link href="/my-page">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:shadow-xl transition-shadow px-8"
                >
                  {t("welcomePage.goToMyPage")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
            <div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  {t("welcomePage.goHome")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
