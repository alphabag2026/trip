import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Building2, Users, Globe, MapPin, Handshake,
  CalendarDays, UserPlus, Shield, AlertTriangle,
  BarChart3, TrendingUp, Activity, Edit, Trash2,
  Phone, Mail, ExternalLink, Plus, ScrollText,
  ArrowRightLeft, UserCog, Power, ChevronDown, ChevronUp,
  ClipboardCheck, CheckCircle2, XCircle, Clock, PieChart, MousePointerClick
} from "lucide-react";
import { useTranslation } from "react-i18next";

const orgTypeLabels: Record<string, string> = {
  platform: "클라우드 본사",
  organizer: "행사/여행 주최자",
  agency: "지역 에이전시",
  partner: "파트너 업체",
};

const orgTypeBadgeColors: Record<string, string> = {
  platform: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  organizer: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  agency: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  partner: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

const orgTypeColors: Record<string, string> = {
  platform: "#a855f7",
  organizer: "#3b82f6",
  agency: "#22c55e",
  partner: "#f97316",
};

const roleLabels: Record<string, string> = {
  user: "일반 사용자",
  admin: "관리자",
  superadmin: "슈퍼관리자",
  organizer: "주최자",
  agency: "에이전시",
  partner: "파트너",
};

const memberRoleLabels: Record<string, string> = {
  owner: "소유자",
  manager: "관리자",
  staff: "스태프",
  viewer: "열람자",
};

const auditActionLabels: Record<string, string> = {
  role_change: "역할 변경",
  org_create: "조직 생성",
  org_update: "조직 수정",
  org_delete: "조직 삭제",
  org_toggle_active: "조직 활성화 변경",
  member_add: "멤버 추가",
  member_remove: "멤버 제거",
  member_role_change: "멤버 역할 변경",
  ownership_transfer: "소유권 이전",
  user_ban: "사용자 차단",
  user_unban: "사용자 차단 해제",
  settings_change: "설정 변경",
  data_export: "데이터 내보내기",
  data_delete: "데이터 삭제",
};

const emptyOrg = {
  name: "", type: "organizer" as const, region: "", country: "",
  contactName: "", contactPhone: "", contactEmail: "",
  address: "", description: "", website: "", telegramChatId: "",
};

// ═══════════════════════════════════════════════════════════════
// DonutChart - SVG 기반 도넛 차트 컴포넌트
// ═══════════════════════════════════════════════════════════════
function DonutChart({ data, size = 200, strokeWidth = 32 }: {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  strokeWidth?: number;
}) {
  const { t } = useTranslation();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativeOffset = 0;
  const segments = data.map((d) => {
    const pct = d.value / total;
    const dashArray = pct * circumference;
    const dashOffset = -cumulativeOffset * circumference;
    cumulativeOffset += pct;
    return { ...d, pct, dashArray, dashOffset };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/20" />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={center} cy={center} r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dashArray} ${circumference - seg.dashArray}`}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${center} ${center})`}
              className="transition-all duration-500"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{total}</span>
          <span className="text-xs text-muted-foreground">{t("admin.platformDashboard.t1", "전체")}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="font-semibold ml-auto">{seg.value}</span>
            <span className="text-xs text-muted-foreground">({Math.round(seg.pct * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlatformDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"overview" | "organizations" | "users" | "accounts" | "audit" | "approvals" | "analytics">("overview");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<number | null>(null);
  const [orgForm, setOrgForm] = useState(emptyOrg);
  const [userSearch, setUserSearch] = useState("");
  const [expandedOrgId, setExpandedOrgId] = useState<number | null>(null);

  // 역할 변경 확인 모달 상태
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    open: boolean;
    userId: number;
    userName: string;
    currentRole: string;
    newRole: string;
  }>({ open: false, userId: 0, userName: "", currentRole: "", newRole: "" });

  // 소유권 이전 모달
  const [transferDialog, setTransferDialog] = useState<{
    open: boolean;
    organizationId: number;
    orgName: string;
    currentOwnerId: number;
    currentOwnerName: string;
  }>({ open: false, organizationId: 0, orgName: "", currentOwnerId: 0, currentOwnerName: "" });
  const [transferToUserId, setTransferToUserId] = useState<string>("");

  // 멤버 추가 모달
  const [addMemberDialog, setAddMemberDialog] = useState<{
    open: boolean;
    organizationId: number;
    orgName: string;
  }>({ open: false, organizationId: 0, orgName: "" });
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"owner" | "manager" | "staff" | "viewer">("staff");

  // 감사 로그 필터
  const [auditFilter, setAuditFilter] = useState<string>("all");
  const [auditPage, setAuditPage] = useState(0);

  // 계정 생성 폼
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    email: "", name: "", password: "", role: "organizer" as "organizer" | "agency" | "partner",
    organizationName: "", organizationType: "organizer" as "organizer" | "agency" | "partner",
    contactEmail: "", contactPhone: "", description: "", website: "",
  });
  // 비밀번호 초기화 모달
  const [resetPwDialog, setResetPwDialog] = useState<{ open: boolean; userId: number; userName: string }>({ open: false, userId: 0, userName: "" });
  const [newPassword, setNewPassword] = useState("");

  const utils = trpc.useUtils();
  const statsQuery = trpc.platform.stats.useQuery();
  const orgsQuery = trpc.organization.list.useQuery({ type: orgFilter === "all" ? undefined : orgFilter });
  const usersQuery = trpc.platform.usersWithOrgs.useQuery();
  const categoriesQuery = trpc.partnerCategory.list.useQuery();
  const allOrgsQuery = trpc.organization.list.useQuery({});

  // 계정 생성 mutation
  const createAccountMutation = trpc.superAdmin.createOrganizerAccount.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t138", "계정이 성공적으로 생성되었습니다"));
      utils.platform.usersWithOrgs.invalidate();
      utils.platform.stats.invalidate();
      utils.organization.list.invalidate();
      utils.platform.auditLogs.invalidate();
      setShowCreateAccount(false);
      setAccountForm({ email: "", name: "", password: "", role: "organizer", organizationName: "", organizationType: "organizer", contactEmail: "", contactPhone: "", description: "", website: "" });
    },
    onError: (e) => toast.error(e.message),
  });
  const delegateRoleMutation = trpc.superAdmin.delegateRole.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t139", "권한이 위임되었습니다"));
      utils.platform.usersWithOrgs.invalidate();
      utils.platform.auditLogs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const resetPasswordMutation = trpc.superAdmin.resetPassword.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t140", "비밀번호가 초기화되었습니다"));
      setResetPwDialog({ open: false, userId: 0, userName: "" });
      setNewPassword("");
    },
    onError: (e) => toast.error(e.message),
  });
  const delegationHistoryQuery = trpc.superAdmin.delegationHistory.useQuery({ limit: 50 });

  // 감사 로그 쿼리
  const auditLogsQuery = trpc.platform.auditLogs.useQuery({
    action: auditFilter === "all" ? undefined : auditFilter,
    limit: 20,
    offset: auditPage * 20,
  });

  const createOrgMutation = trpc.organization.create.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t141", "조직이 생성되었습니다"));
      utils.organization.list.invalidate();
      utils.platform.stats.invalidate();
      closeOrgDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateOrgMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t142", "조직 정보가 수정되었습니다"));
      utils.organization.list.invalidate();
      utils.platform.stats.invalidate();
      closeOrgDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMutation = trpc.platform.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t143", "역할이 변경되었습니다"));
      utils.platform.usersWithOrgs.invalidate();
      utils.platform.auditLogs.invalidate();
      setRoleChangeConfirm({ open: false, userId: 0, userName: "", currentRole: "", newRole: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const seedCategoriesMutation = trpc.platform.seedCategories.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count}개 기본 카테고리가 생성되었습니다`);
      utils.partnerCategory.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteOrgMutation = trpc.organization.delete.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t144", "조직이 삭제되었습니다"));
      utils.organization.list.invalidate();
      utils.platform.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleOrgActiveMutation = trpc.platform.toggleOrgActive.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t145", "조직 상태가 변경되었습니다"));
      utils.organization.list.invalidate();
      utils.platform.auditLogs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const assignUserOrgMutation = trpc.platform.assignUserOrg.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t146", "조직이 배정되었습니다"));
      utils.platform.usersWithOrgs.invalidate();
      utils.platform.auditLogs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addOrgMemberMutation = trpc.orgMember.add.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t147", "멤버가 추가되었습니다"));
      utils.platform.orgMembers.invalidate();
      setAddMemberDialog({ open: false, organizationId: 0, orgName: "" });
      setNewMemberUserId("");
      setNewMemberRole("staff");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeOrgMemberMutation = trpc.orgMember.remove.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t148", "멤버가 제거되었습니다"));
      utils.platform.orgMembers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateOrgMemberRoleMutation = trpc.platform.updateOrgMemberRole.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t149", "멤버 역할이 변경되었습니다"));
      utils.platform.orgMembers.invalidate();
      utils.platform.auditLogs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const transferOwnershipMutation = trpc.platform.transferOwnership.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t150", "소유권이 이전되었습니다"));
      utils.platform.orgMembers.invalidate();
      utils.platform.auditLogs.invalidate();
      setTransferDialog({ open: false, organizationId: 0, orgName: "", currentOwnerId: 0, currentOwnerName: "" });
      setTransferToUserId("");
    },
    onError: (e) => toast.error(e.message),
  });

  function closeOrgDialog() {
    setShowOrgDialog(false);
    setEditingOrgId(null);
    setOrgForm(emptyOrg);
  }

  function openEditOrg(org: any) {
    setOrgForm({
      name: org.name || "",
      type: org.type || "organizer",
      region: org.region || "",
      country: org.country || "",
      contactName: org.contactName || "",
      contactPhone: org.contactPhone || "",
      contactEmail: org.contactEmail || "",
      address: org.address || "",
      description: org.description || "",
      website: org.website || "",
      telegramChatId: org.telegramChatId || "",
    });
    setEditingOrgId(org.id);
    setShowOrgDialog(true);
  }

  function handleOrgSubmit() {
    if (editingOrgId) {
      updateOrgMutation.mutate({ id: editingOrgId, ...orgForm });
    } else {
      createOrgMutation.mutate(orgForm);
    }
  }

  function handleRoleChangeRequest(user: any, newRole: string) {
    if (user.role === newRole) return;
    setRoleChangeConfirm({
      open: true,
      userId: user.id,
      userName: user.name || "이름 없음",
      currentRole: user.role,
      newRole,
    });
  }

  function confirmRoleChange() {
    updateRoleMutation.mutate({
      userId: roleChangeConfirm.userId,
      role: roleChangeConfirm.newRole as "user" | "admin" | "superadmin" | "organizer" | "agency" | "partner",
    });
  }

  const stats = statsQuery.data;
  const filteredUsers = usersQuery.data?.filter((u: any) =>
    !userSearch ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  ) || [];

  // 도넛 차트 데이터
  const donutData = useMemo(() => {
    if (!stats?.orgByType || stats.orgByType.length === 0) return [];
    return stats.orgByType.map((item: any) => ({
      label: orgTypeLabels[item.type] || item.type,
      value: Number(item.count) || 0,
      color: orgTypeColors[item.type] || "#6b7280",
    }));
  }, [stats?.orgByType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-7 w-7 text-purple-600" />
            {t("admin.platformDashboard.t2", "클라우드 플랫폼 관리")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("admin.platformDashboard.t3", "전체 플랫폼 조직, 파트너, 사용자를 관리합니다")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {[
          { key: "overview", label: "대시보드", icon: BarChart3 },
          { key: "organizations", label: "조직 관리", icon: Building2 },
          { key: "users", label: "사용자 관리", icon: Users },
          { key: "accounts", label: "계정 생성/위임", icon: UserPlus },
          { key: "approvals", label: "주최자 승인", icon: ClipboardCheck },
          { key: "analytics", label: "통계/분석", icon: PieChart },
          { key: "audit", label: "감사 로그", icon: ScrollText },
        ].map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.key as any)}
            className="gap-1 shrink-0"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ════════════════════ Overview Tab ════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("organizations")}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10"><Building2 className="h-5 w-5 text-purple-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalOrganizations || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("admin.platformDashboard.t4", "조직")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10"><Handshake className="h-5 w-5 text-blue-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalPartners || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("admin.platformDashboard.t5", "파트너")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10"><CalendarDays className="h-5 w-5 text-green-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalMeetups || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("admin.platformDashboard.t6", "밋업")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10"><UserPlus className="h-5 w-5 text-amber-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalRegistrations || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("admin.platformDashboard.t7", "신청")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("users")}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10"><Shield className="h-5 w-5 text-red-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("admin.platformDashboard.t8", "사용자")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Donut Chart + Partner Categories */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> {t("admin.platformDashboard.t9", "조직 유형별 분포")}</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                {donutData.length > 0 ? (
                  <DonutChart data={donutData} size={220} strokeWidth={36} />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">{t("admin.platformDashboard.t10", "등록된 조직이 없습니다")}</p>
                    <Button size="sm" className="mt-2" onClick={() => setActiveTab("organizations")}>
                      {t("admin.platformDashboard.t11", "조직 등록하기")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" /> {t("admin.platformDashboard.t12", "파트너 카테고리")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoriesQuery.data && categoriesQuery.data.length > 0 ? (
                  <div className="space-y-2">
                    {categoriesQuery.data.map((cat: any) => (
                      <div key={cat.id} className="flex items-center justify-between py-1">
                        <span className="text-sm">{cat.nameKo || cat.name}</span>
                        <Badge variant="outline">{cat.name}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm mb-3">{t("admin.platformDashboard.t13", "카테고리가 없습니다")}</p>
                    <Button
                      size="sm"
                      onClick={() => seedCategoriesMutation.mutate()}
                      disabled={seedCategoriesMutation.isPending}
                    >
                      {seedCategoriesMutation.isPending ? "생성 중..." : "기본 카테고리 생성"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 파트너 카테고리별 통계 */}
          {stats?.partnerByCategory && stats.partnerByCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Handshake className="h-4 w-4" /> {t("admin.platformDashboard.t14", "파트너 카테고리별 분포")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {stats.partnerByCategory.map((item: any) => {
                    const cat = categoriesQuery.data?.find((c: any) => c.id === item.categoryId);
                    return (
                      <div key={item.categoryId || "none"} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">{cat?.nameKo || cat?.name || "미분류"}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ════════════════════ Organizations Tab ════════════════════ */}
      {activeTab === "organizations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.platformDashboard.t15", "전체 유형")}</SelectItem>
                  <SelectItem value="platform">{t("admin.platformDashboard.t16", "클라우드 본사")}</SelectItem>
                  <SelectItem value="organizer">{t("admin.platformDashboard.t17", "행사/여행 주최자")}</SelectItem>
                  <SelectItem value="agency">{t("admin.platformDashboard.t18", "지역 에이전시")}</SelectItem>
                  <SelectItem value="partner">{t("admin.platformDashboard.t19", "파트너 업체")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setOrgForm(emptyOrg); setEditingOrgId(null); setShowOrgDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> {t("admin.platformDashboard.t20", "조직 등록")}
            </Button>
          </div>

          {/* Organization List */}
          <div className="space-y-3">
            {orgsQuery.data && orgsQuery.data.length > 0 ? (
              orgsQuery.data.map((org: any) => (
                <OrgCard
                  key={org.id}
                  org={org}
                  expanded={expandedOrgId === org.id}
                  onToggleExpand={() => setExpandedOrgId(expandedOrgId === org.id ? null : org.id)}
                  onEdit={() => openEditOrg(org)}
                  onDelete={() => {
                    if (confirm(`"${org.name}" 조직을 삭제하시겠습니까?`)) {
                      deleteOrgMutation.mutate({ id: org.id });
                    }
                  }}
                  onToggleActive={(isActive) => toggleOrgActiveMutation.mutate({ id: org.id, isActive })}
                  onAddMember={() => setAddMemberDialog({ open: true, organizationId: org.id, orgName: org.name })}
                  onTransferOwnership={(ownerId, ownerName) => setTransferDialog({
                    open: true, organizationId: org.id, orgName: org.name,
                    currentOwnerId: ownerId, currentOwnerName: ownerName,
                  })}
                  onRemoveMember={(id) => {
                    if (confirm("이 멤버를 제거하시겠습니까?")) removeOrgMemberMutation.mutate({ id });
                  }}
                  onUpdateMemberRole={(id, role) => updateOrgMemberRoleMutation.mutate({ id, memberRole: role as "owner" | "manager" | "staff" | "viewer" })}
                />
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{t("admin.platformDashboard.t21", "등록된 조직이 없습니다")}</p>
                  <Button className="mt-3" onClick={() => { setOrgForm(emptyOrg); setEditingOrgId(null); setShowOrgDialog(true); }}>
                    {t("admin.platformDashboard.t22", "첫 조직 등록하기")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════ Accounts Tab ════════════════════ */}
      {activeTab === "accounts" && (
        <div className="space-y-6">
          {/* Create Account Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-500" />
                  {t("admin.platformDashboard.t23", "주최자/에이전시/파트너 계정 생성")}
                </CardTitle>
                <Button size="sm" onClick={() => setShowCreateAccount(!showCreateAccount)}>
                  <Plus className="h-4 w-4 mr-1" />
                  {!showCreateAccount ? "새 계정 생성" : "닫기"}
                </Button>
              </div>
            </CardHeader>
            {showCreateAccount && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">{t("admin.platformDashboard.t24", "계정 정보")}</h4>
                    <div><Label>{t("admin.platformDashboard.t25", "이름 *")}</Label><Input value={accountForm.name} onChange={e => setAccountForm({...accountForm, name: e.target.value})} placeholder={t("admin.platformDashboard.t153", "담당자 이름")} /></div>
                    <div><Label>{t("admin.platformDashboard.t26", "이메일 *")}</Label><Input type="email" value={accountForm.email} onChange={e => setAccountForm({...accountForm, email: e.target.value})} placeholder={t("admin.platformDashboard.t154", "로그인용 이메일")} /></div>
                    <div><Label>{t("admin.platformDashboard.t27", "비밀번호 *")}</Label><Input type="password" value={accountForm.password} onChange={e => setAccountForm({...accountForm, password: e.target.value})} placeholder={t("admin.platformDashboard.t155", "최소 6자")} /></div>
                    <div>
                      <Label>{t("admin.platformDashboard.t28", "역할 *")}</Label>
                      <Select value={accountForm.role} onValueChange={(v: any) => setAccountForm({...accountForm, role: v, organizationType: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="organizer">{t("admin.platformDashboard.t29", "행사/여행 주최자")}</SelectItem>
                          <SelectItem value="agency">{t("admin.platformDashboard.t30", "지역 에이전시")}</SelectItem>
                          <SelectItem value="partner">{t("admin.platformDashboard.t31", "파트너 업체")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">{t("admin.platformDashboard.t32", "조직 정보")}</h4>
                    <div><Label>{t("admin.platformDashboard.t33", "조직명 *")}</Label><Input value={accountForm.organizationName} onChange={e => setAccountForm({...accountForm, organizationName: e.target.value})} placeholder={t("admin.platformDashboard.t156", "회사/단체명")} /></div>
                    <div><Label>{t("admin.platformDashboard.t34", "연락처 이메일")}</Label><Input type="email" value={accountForm.contactEmail} onChange={e => setAccountForm({...accountForm, contactEmail: e.target.value})} /></div>
                    <div><Label>{t("admin.platformDashboard.t35", "연락처 전화")}</Label><Input value={accountForm.contactPhone} onChange={e => setAccountForm({...accountForm, contactPhone: e.target.value})} /></div>
                    <div><Label>{t("admin.platformDashboard.t36", "웹사이트")}</Label><Input value={accountForm.website} onChange={e => setAccountForm({...accountForm, website: e.target.value})} /></div>
                    <div><Label>{t("admin.platformDashboard.t37", "설명")}</Label><Textarea value={accountForm.description} onChange={e => setAccountForm({...accountForm, description: e.target.value})} rows={2} /></div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowCreateAccount(false)}>{t("admin.platformDashboard.t38", "취소")}</Button>
                  <Button
                    disabled={!accountForm.email || !accountForm.name || !accountForm.password || !accountForm.organizationName || createAccountMutation.isPending}
                    onClick={() => createAccountMutation.mutate(accountForm)}
                  >
                    {createAccountMutation.isPending ? "생성 중..." : "계정 생성"}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Delegation History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />
                {t("admin.platformDashboard.t39", "권한 위임 이력")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {delegationHistoryQuery.data && delegationHistoryQuery.data.length > 0 ? (
                  delegationHistoryQuery.data.map((d: any) => (
                    <div key={d.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="p-1.5 rounded-md bg-muted shrink-0 mt-0.5">
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {d.delegationType === "admin_grant" ? "계정 생성" : d.delegationType === "role_change" ? "역할 변경" : d.delegationType}
                          </Badge>
                          {d.fromRole && d.toRole && (
                            <span className="text-xs text-muted-foreground">
                              {roleLabels[d.fromRole] || d.fromRole} → {roleLabels[d.toRole] || d.toRole}
                            </span>
                          )}
                        </div>
                        {d.notes && <p className="text-sm mt-1">{d.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {d.createdAt ? new Date(d.createdAt).toLocaleString("ko-KR") : ""}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">{t("admin.platformDashboard.t40", "권한 위임 이력이 없습니다")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════════ Users Tab ════════════════════ */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("admin.platformDashboard.t157", "이름 또는 이메일로 검색...")}
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
          </div>
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">{t("admin.platformDashboard.t41", "사용자")}</th>
                      <th className="text-left py-2 px-3">{t("admin.platformDashboard.t42", "현재 역할")}</th>
                      <th className="text-left py-2 px-3">{t("admin.platformDashboard.t43", "소속 조직")}</th>
                      <th className="text-left py-2 px-3">{t("admin.platformDashboard.t44", "역할 변경")}</th>
                      <th className="text-left py-2 px-3">{t("admin.platformDashboard.t45", "조직 배정")}</th>
                      <th className="text-left py-2 px-3">{t("admin.platformDashboard.t46", "액션")}</th>
                      <th className="text-left py-2 px-3">{t("admin.platformDashboard.t47", "가입일")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user: any) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3">
                          <div>
                            <span className="font-medium">{user.name || "이름 없음"}</span>
                            {user.email && <span className="text-muted-foreground ml-2 text-xs">{user.email}</span>}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="outline">{roleLabels[user.role] || user.role}</Badge>
                        </td>
                        <td className="py-2 px-3">
                          {user.orgName ? (
                            <Badge className={orgTypeBadgeColors[user.orgType] || ""} variant="secondary">
                              {user.orgName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">{t("admin.platformDashboard.t48", "미배정")}</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <Select
                            value={user.role}
                            onValueChange={(role: any) => handleRoleChangeRequest(user, role)}
                          >
                            <SelectTrigger className="w-[130px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">{t("admin.platformDashboard.t49", "일반 사용자")}</SelectItem>
                              <SelectItem value="admin">{t("admin.platformDashboard.t50", "관리자")}</SelectItem>
                              <SelectItem value="superadmin">{t("admin.platformDashboard.t51", "슈퍼관리자")}</SelectItem>
                              <SelectItem value="organizer">{t("admin.platformDashboard.t52", "주최자")}</SelectItem>
                              <SelectItem value="agency">{t("admin.platformDashboard.t53", "에이전시")}</SelectItem>
                              <SelectItem value="partner">{t("admin.platformDashboard.t54", "파트너")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 px-3">
                          <Select
                            value={user.organizationId?.toString() || "none"}
                            onValueChange={(val) => {
                              assignUserOrgMutation.mutate({
                                userId: user.id,
                                organizationId: val === "none" ? null : Number(val),
                              });
                            }}
                          >
                            <SelectTrigger className="w-[150px] h-8">
                              <SelectValue placeholder={t("admin.platformDashboard.t158", "조직 선택")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("admin.platformDashboard.t55", "미배정")}</SelectItem>
                              {allOrgsQuery.data?.map((org: any) => (
                                <SelectItem key={org.id} value={org.id.toString()}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 px-3">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setResetPwDialog({ open: true, userId: user.id, userName: user.name || "이름 없음" }); setNewPassword(""); }}>
                            {t("admin.platformDashboard.t56", "PW 초기화")}
                          </Button>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ko-KR") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    {userSearch ? "검색 결과가 없습니다" : "등록된 사용자가 없습니다"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════════ Organizer Approvals Tab ════════════════════ */}
      {activeTab === "approvals" && <OrganizerApprovalsTab />}

      {/* ════════════════════ Analytics Tab ════════════════════ */}
      {activeTab === "analytics" && <AnalyticsTab />}

      {/* ════════════════════ Audit Log Tab ════════════════════ */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={auditFilter} onValueChange={(v) => { setAuditFilter(v); setAuditPage(0); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder={t("admin.platformDashboard.t159", "전체 작업")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.platformDashboard.t57", "전체 작업")}</SelectItem>
                <SelectItem value="role_change">{t("admin.platformDashboard.t58", "역할 변경")}</SelectItem>
                <SelectItem value="org_toggle_active">{t("admin.platformDashboard.t59", "조직 활성화 변경")}</SelectItem>
                <SelectItem value="member_role_change">{t("admin.platformDashboard.t60", "멤버 역할 변경")}</SelectItem>
                <SelectItem value="ownership_transfer">{t("admin.platformDashboard.t61", "소유권 이전")}</SelectItem>
                <SelectItem value="settings_change">{t("admin.platformDashboard.t62", "설정 변경")}</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              총 {auditLogsQuery.data?.total || 0}건
            </span>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {auditLogsQuery.data?.logs && auditLogsQuery.data.logs.length > 0 ? (
                  auditLogsQuery.data.logs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="p-1.5 rounded-md bg-muted shrink-0 mt-0.5">
                        <ScrollText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {auditActionLabels[log.action] || log.action}
                          </Badge>
                          <span className="text-sm font-medium">{log.userName || "시스템"}</span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-sm">{log.targetName || `ID: ${log.targetId}`}</span>
                        </div>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.createdAt).toLocaleString("ko-KR")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground">{t("admin.platformDashboard.t63", "감사 로그가 없습니다")}</p>
                )}
              </div>

              {/* Pagination */}
              {(auditLogsQuery.data?.total || 0) > 20 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline" size="sm"
                    disabled={auditPage === 0}
                    onClick={() => setAuditPage(p => p - 1)}
                  >
                    {t("admin.platformDashboard.t64", "이전")}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {auditPage + 1} / {Math.ceil((auditLogsQuery.data?.total || 0) / 20)}
                  </span>
                  <Button
                    variant="outline" size="sm"
                    disabled={(auditPage + 1) * 20 >= (auditLogsQuery.data?.total || 0)}
                    onClick={() => setAuditPage(p => p + 1)}
                  >
                    {t("admin.platformDashboard.t65", "다음")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════════ Organization Create/Edit Dialog ════════════════════ */}
      <Dialog open={showOrgDialog} onOpenChange={(open) => { if (!open) closeOrgDialog(); else setShowOrgDialog(true); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrgId ? "조직 수정" : "새 조직 등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("admin.platformDashboard.t66", "조직명 *")}</Label>
              <Input value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} placeholder={t("admin.platformDashboard.t160", "조직/업체명을 입력하세요")} />
            </div>
            <div>
              <Label>{t("admin.platformDashboard.t67", "유형 *")}</Label>
              <Select value={orgForm.type} onValueChange={(v: any) => setOrgForm({ ...orgForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">{t("admin.platformDashboard.t68", "클라우드 본사")}</SelectItem>
                  <SelectItem value="organizer">{t("admin.platformDashboard.t69", "행사/여행 주최자")}</SelectItem>
                  <SelectItem value="agency">{t("admin.platformDashboard.t70", "지역 에이전시")}</SelectItem>
                  <SelectItem value="partner">{t("admin.platformDashboard.t71", "파트너 업체")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("admin.platformDashboard.t72", "지역")}</Label><Input value={orgForm.region} onChange={e => setOrgForm({ ...orgForm, region: e.target.value })} placeholder={t("admin.platformDashboard.t161", "예: 동남아시아")} /></div>
              <div><Label>{t("admin.platformDashboard.t73", "국가")}</Label><Input value={orgForm.country} onChange={e => setOrgForm({ ...orgForm, country: e.target.value })} placeholder={t("admin.platformDashboard.t162", "예: 태국")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("admin.platformDashboard.t74", "담당자명")}</Label><Input value={orgForm.contactName} onChange={e => setOrgForm({ ...orgForm, contactName: e.target.value })} /></div>
              <div><Label>{t("admin.platformDashboard.t75", "연락처")}</Label><Input value={orgForm.contactPhone} onChange={e => setOrgForm({ ...orgForm, contactPhone: e.target.value })} /></div>
            </div>
            <div><Label>{t("admin.platformDashboard.t76", "이메일")}</Label><Input value={orgForm.contactEmail} onChange={e => setOrgForm({ ...orgForm, contactEmail: e.target.value })} /></div>
            <div><Label>{t("admin.platformDashboard.t77", "주소")}</Label><Input value={orgForm.address} onChange={e => setOrgForm({ ...orgForm, address: e.target.value })} /></div>
            <div><Label>{t("admin.platformDashboard.t78", "웹사이트")}</Label><Input value={orgForm.website} onChange={e => setOrgForm({ ...orgForm, website: e.target.value })} /></div>
            <div><Label>{t("admin.platformDashboard.t79", "텔레그램 Chat ID")}</Label><Input value={orgForm.telegramChatId} onChange={e => setOrgForm({ ...orgForm, telegramChatId: e.target.value })} /></div>
            <div><Label>{t("admin.platformDashboard.t80", "설명")}</Label><Textarea value={orgForm.description} onChange={e => setOrgForm({ ...orgForm, description: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeOrgDialog}>{t("admin.platformDashboard.t81", "취소")}</Button>
            <Button
              disabled={!orgForm.name || createOrgMutation.isPending || updateOrgMutation.isPending}
              onClick={handleOrgSubmit}
            >
              {createOrgMutation.isPending || updateOrgMutation.isPending ? "처리 중..." : editingOrgId ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════ Role Change Confirmation Dialog ════════════════════ */}
      <Dialog open={roleChangeConfirm.open} onOpenChange={(open) => { if (!open) setRoleChangeConfirm({ open: false, userId: 0, userName: "", currentRole: "", newRole: "" }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("admin.platformDashboard.t82", "역할 변경 확인")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{t("admin.platformDashboard.t83", "다음 사용자의 역할을 변경하시겠습니까?")}</p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("admin.platformDashboard.t84", "사용자")}</span>
                <span className="font-semibold">{roleChangeConfirm.userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("admin.platformDashboard.t85", "현재 역할")}</span>
                <Badge variant="outline">{roleLabels[roleChangeConfirm.currentRole] || roleChangeConfirm.currentRole}</Badge>
              </div>
              <div className="flex items-center justify-center"><span className="text-lg text-muted-foreground">↓</span></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("admin.platformDashboard.t86", "변경 역할")}</span>
                <Badge>{roleLabels[roleChangeConfirm.newRole] || roleChangeConfirm.newRole}</Badge>
              </div>
            </div>
            {(roleChangeConfirm.newRole === "superadmin" || roleChangeConfirm.newRole === "admin") && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t("admin.platformDashboard.t87", "관리자 이상의 권한을 부여하면 해당 사용자가 플랫폼의 주요 설정을 변경할 수 있습니다.")}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeConfirm({ open: false, userId: 0, userName: "", currentRole: "", newRole: "" })}>{t("admin.platformDashboard.t88", "취소")}</Button>
            <Button onClick={confirmRoleChange} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? "변경 중..." : "역할 변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════ Add Member Dialog ════════════════════ */}
      <Dialog open={addMemberDialog.open} onOpenChange={(open) => { if (!open) setAddMemberDialog({ open: false, organizationId: 0, orgName: "" }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>멤버 추가 - {addMemberDialog.orgName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("admin.platformDashboard.t89", "사용자 선택")}</Label>
              <Select value={newMemberUserId} onValueChange={setNewMemberUserId}>
                <SelectTrigger><SelectValue placeholder={t("admin.platformDashboard.t163", "사용자를 선택하세요")} /></SelectTrigger>
                <SelectContent>
                  {usersQuery.data?.map((u: any) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name || "이름 없음"} ({u.email || u.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("admin.platformDashboard.t90", "역할")}</Label>
              <Select value={newMemberRole} onValueChange={(v: any) => setNewMemberRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t("admin.platformDashboard.t91", "소유자")}</SelectItem>
                  <SelectItem value="manager">{t("admin.platformDashboard.t92", "관리자")}</SelectItem>
                  <SelectItem value="staff">{t("admin.platformDashboard.t93", "스태프")}</SelectItem>
                  <SelectItem value="viewer">{t("admin.platformDashboard.t94", "열람자")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberDialog({ open: false, organizationId: 0, orgName: "" })}>{t("admin.platformDashboard.t95", "취소")}</Button>
            <Button
              disabled={!newMemberUserId || addOrgMemberMutation.isPending}
              onClick={() => addOrgMemberMutation.mutate({
                organizationId: addMemberDialog.organizationId,
                userId: Number(newMemberUserId),
                memberRole: newMemberRole,
              })}
            >
              {addOrgMemberMutation.isPending ? "추가 중..." : "멤버 추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════ Reset Password Dialog ════════════════════ */}
      <Dialog open={resetPwDialog.open} onOpenChange={(open) => { if (!open) setResetPwDialog({ open: false, userId: 0, userName: "" }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>비밀번호 초기화 - {resetPwDialog.userName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("admin.platformDashboard.t96", "새 비밀번호")}</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t("admin.platformDashboard.t164", "최소 6자")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPwDialog({ open: false, userId: 0, userName: "" })}>{t("admin.platformDashboard.t97", "취소")}</Button>
            <Button
              disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
              onClick={() => resetPasswordMutation.mutate({ userId: resetPwDialog.userId, newPassword })}
            >
              {resetPasswordMutation.isPending ? "초기화 중..." : "비밀번호 초기화"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════ Transfer Ownership Dialog ════════════════════ */}
      <Dialog open={transferDialog.open} onOpenChange={(open) => { if (!open) setTransferDialog({ open: false, organizationId: 0, orgName: "", currentOwnerId: 0, currentOwnerName: "" }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-amber-500" />
              소유권 이전 - {transferDialog.orgName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("admin.platformDashboard.t98", "현재 소유자")}</span>
                <span className="font-semibold">{transferDialog.currentOwnerName}</span>
              </div>
            </div>
            <div>
              <Label>{t("admin.platformDashboard.t99", "새 소유자 선택")}</Label>
              <Select value={transferToUserId} onValueChange={setTransferToUserId}>
                <SelectTrigger><SelectValue placeholder={t("admin.platformDashboard.t165", "사용자를 선택하세요")} /></SelectTrigger>
                <SelectContent>
                  {usersQuery.data?.filter((u: any) => u.id !== transferDialog.currentOwnerId).map((u: any) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name || "이름 없음"} ({u.email || u.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t("admin.platformDashboard.t100", "소유권을 이전하면 현재 소유자는 관리자 역할로 변경됩니다. 이 작업은 되돌릴 수 없습니다.")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog({ open: false, organizationId: 0, orgName: "", currentOwnerId: 0, currentOwnerName: "" })}>{t("admin.platformDashboard.t101", "취소")}</Button>
            <Button
              variant="destructive"
              disabled={!transferToUserId || transferOwnershipMutation.isPending}
              onClick={() => transferOwnershipMutation.mutate({
                organizationId: transferDialog.organizationId,
                fromUserId: transferDialog.currentOwnerId,
                toUserId: Number(transferToUserId),
              })}
            >
              {transferOwnershipMutation.isPending ? "이전 중..." : "소유권 이전"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OrgCard - 조직 카드 (멤버 관리 확장 포함)
// ═══════════════════════════════════════════════════════════════
function OrgCard({
  org, expanded, onToggleExpand, onEdit, onDelete, onToggleActive,
  onAddMember, onTransferOwnership, onRemoveMember, onUpdateMemberRole,
}: {
  org: any;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (isActive: boolean) => void;
  onAddMember: () => void;
  onTransferOwnership: (ownerId: number, ownerName: string) => void;
  onRemoveMember: (id: number) => void;
  onUpdateMemberRole: (id: number, role: string) => void;
}) {
  const { t } = useTranslation();
  const membersQuery = trpc.platform.orgMembers.useQuery(
    { organizationId: org.id },
    { enabled: expanded }
  );

  const owner = membersQuery.data?.find((m: any) => m.memberRole === "owner");

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-muted mt-0.5">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{org.name}</span>
                <Badge className={orgTypeBadgeColors[org.type] || ""} variant="secondary">
                  {orgTypeLabels[org.type] || org.type}
                </Badge>
                {!org.isActive && <Badge variant="destructive">{t("admin.platformDashboard.t102", "비활성")}</Badge>}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                {(org.region || org.country) && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[org.region, org.country].filter(Boolean).join(", ")}</span>
                )}
                {org.contactName && (
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{org.contactName}</span>
                )}
                {org.contactPhone && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{org.contactPhone}</span>
                )}
                {org.contactEmail && (
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{org.contactEmail}</span>
                )}
              </div>
              {org.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">{org.description}</p>
              )}
              {org.website && (
                <a href={org.website} target="_blank" rel="noopener" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />{org.website}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-2 mr-2">
              <Switch
                checked={org.isActive}
                onCheckedChange={(checked) => onToggleActive(checked)}
              />
              <Power className={`h-4 w-4 ${org.isActive ? "text-green-500" : "text-muted-foreground"}`} />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleExpand}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded: Members */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1">
                <UserCog className="h-4 w-4" /> {t("admin.platformDashboard.t103", "조직 멤버")}
              </h4>
              <div className="flex gap-2">
                {owner && (
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => onTransferOwnership(owner.userId, owner.userName || "Unknown")}>
                    <ArrowRightLeft className="h-3 w-3" /> {t("admin.platformDashboard.t104", "소유권 이전")}
                  </Button>
                )}
                <Button size="sm" className="gap-1" onClick={onAddMember}>
                  <UserPlus className="h-3 w-3" /> {t("admin.platformDashboard.t105", "멤버 추가")}
                </Button>
              </div>
            </div>

            {membersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("admin.platformDashboard.t106", "로딩 중...")}</p>
            ) : membersQuery.data && membersQuery.data.length > 0 ? (
              <div className="space-y-2">
                {membersQuery.data.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {(member.userName || "?")[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-medium">{member.userName || "이름 없음"}</span>
                        {member.userEmail && <span className="text-xs text-muted-foreground ml-2">{member.userEmail}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.memberRole}
                        onValueChange={(role) => onUpdateMemberRole(member.id, role)}
                      >
                        <SelectTrigger className="w-[100px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">{t("admin.platformDashboard.t107", "소유자")}</SelectItem>
                          <SelectItem value="manager">{t("admin.platformDashboard.t108", "관리자")}</SelectItem>
                          <SelectItem value="staff">{t("admin.platformDashboard.t109", "스태프")}</SelectItem>
                          <SelectItem value="viewer">{t("admin.platformDashboard.t110", "열람자")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemoveMember(member.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t("admin.platformDashboard.t111", "등록된 멤버가 없습니다")}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ════════════════════ Organizer Approvals Tab Component ════════════════════
function OrganizerApprovalsTab() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<string>("pending");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const approvalsQuery = trpc.organizerApproval.list.useQuery(
    filter === "all" ? undefined : { status: filter as any }
  );
  const utils = trpc.useUtils();

  const approveMutation = trpc.organizerApproval.approve.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t151", "주최자 승인이 완료되었습니다"));
      utils.organizerApproval.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.organizerApproval.reject.useMutation({
    onSuccess: () => {
      toast.success(t("admin.platformDashboard.t152", "주최자 신청이 거절되었습니다"));
      setRejectingId(null);
      setRejectNote("");
      utils.organizerApproval.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"><Clock className="h-3 w-3 mr-1" />{t("admin.platformDashboard.t112", "대기중")}</Badge>;
      case "approved": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />{t("admin.platformDashboard.t113", "승인됨")}</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"><XCircle className="h-3 w-3 mr-1" />{t("admin.platformDashboard.t114", "거절됨")}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "organizer": return "주최자";
      case "agency": return "여행사";
      case "partner": return "파트너";
      default: return role;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{t("admin.platformDashboard.t115", "대기중")}</SelectItem>
            <SelectItem value="approved">{t("admin.platformDashboard.t116", "승인됨")}</SelectItem>
            <SelectItem value="rejected">{t("admin.platformDashboard.t117", "거절됨")}</SelectItem>
            <SelectItem value="all">{t("admin.platformDashboard.t118", "전체")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          총 {approvalsQuery.data?.length || 0}건
        </span>
      </div>

      <div className="space-y-3">
        {approvalsQuery.isLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">{t("admin.platformDashboard.t119", "로딩 중...")}</CardContent></Card>
        ) : approvalsQuery.data && approvalsQuery.data.length > 0 ? (
          approvalsQuery.data.map((approval: any) => (
            <Card key={approval.id} className="overflow-hidden">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {statusBadge(approval.status)}
                      <Badge variant="outline">{roleLabel(approval.userRole)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(approval.createdAt).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm">{approval.userName}</h4>
                    <p className="text-xs text-muted-foreground">{approval.userEmail}</p>
                    {approval.organizationName && (
                      <p className="text-xs mt-1"><Building2 className="h-3 w-3 inline mr-1" />{approval.organizationName}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {approval.businessNumber && <span>사업자번호: {approval.businessNumber}</span>}
                      {approval.businessType && <span>업종: {approval.businessType}</span>}
                      {approval.experience && <span>경험: {approval.experience}</span>}
                      {approval.teamSize && <span>팀 규모: {approval.teamSize}명</span>}
                    </div>
                    {approval.reviewNote && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <span className="font-medium">{t("admin.platformDashboard.t120", "검토 메모:")}</span> {approval.reviewNote}
                      </div>
                    )}
                  </div>
                  {approval.status === "pending" && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <div className="space-y-1">
                        <Input
                          placeholder={t("admin.platformDashboard.t166", "승인 메모 (선택)")}
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          className="h-7 text-xs w-48"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="gap-1 bg-green-600 hover:bg-green-700"
                        onClick={() => approveMutation.mutate({ id: approval.id, reviewNote: reviewNote || undefined })}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3" />{t("admin.platformDashboard.t121", "승인")}
                      </Button>
                      {rejectingId === approval.id ? (
                        <div className="space-y-1">
                          <Input
                            placeholder={t("admin.platformDashboard.t167", "거절 사유 (필수)")}
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            className="h-7 text-xs w-48"
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm" variant="destructive" className="gap-1 flex-1 text-xs h-7"
                              onClick={() => rejectMutation.mutate({ id: approval.id, reviewNote: rejectNote })}
                              disabled={!rejectNote.trim() || rejectMutation.isPending}
                            >
                              {t("admin.platformDashboard.t122", "확인")}
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="text-xs h-7"
                              onClick={() => { setRejectingId(null); setRejectNote(""); }}
                            >
                              {t("admin.platformDashboard.t123", "취소")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30"
                          onClick={() => setRejectingId(approval.id)}
                        >
                          <XCircle className="h-3 w-3" />{t("admin.platformDashboard.t124", "거절")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card><CardContent className="py-8 text-center text-muted-foreground">{t("admin.platformDashboard.t125", "승인 요청이 없습니다")}</CardContent></Card>
        )}
      </div>
    </div>
  );
}

// ════════════════════ Analytics Tab Component ════════════════════
function AnalyticsTab() {
  const { t } = useTranslation();
  const kpisQuery = trpc.dashboardStats.kpis.useQuery();
  const registrationQuery = trpc.dashboardStats.registrationTrend.useQuery();
  const roleQuery = trpc.dashboardStats.roleDistribution.useQuery();
  const adStatsQuery = trpc.dashboardStats.adBannerStats.useQuery();

  const positionLabel = (pos: string) => {
    switch (pos) {
      case "hero_top": return "히어로 상단";
      case "middle_left": return "중간 좌측";
      case "middle_right": return "중간 우측";
      case "bottom": return "하단";
      case "sidebar": return "사이드바";
      default: return pos;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("admin.platformDashboard.t126", "전체 사용자")}</p>
                <p className="text-xl font-bold">{kpisQuery.data?.totalUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40">
                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("admin.platformDashboard.t127", "활성 밋업")}</p>
                <p className="text-xl font-bold">{kpisQuery.data?.activeMeetups || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("admin.platformDashboard.t128", "신규 가입 (7일)")}</p>
                <p className="text-xl font-bold">{kpisQuery.data?.newSignups || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40">
                <ClipboardCheck className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("admin.platformDashboard.t129", "승인 대기")}</p>
                <p className="text-xl font-bold">{kpisQuery.data?.pendingApprovals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registration Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t("admin.platformDashboard.t130", "최근 30일 가입 추이")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {registrationQuery.data && registrationQuery.data.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-end gap-1 h-32">
                {registrationQuery.data.map((item: any, idx: number) => {
                  const maxCount = Math.max(...registrationQuery.data!.map((d: any) => Number(d.count)));
                  const height = maxCount > 0 ? (Number(item.count) / maxCount) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1" title={`${item.date}: ${item.count}명`}>
                      <span className="text-[10px] text-muted-foreground">{Number(item.count)}</span>
                      <div
                        className="w-full bg-blue-500 dark:bg-blue-400 rounded-t-sm min-h-[2px] transition-all"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{registrationQuery.data[0]?.date}</span>
                <span>{registrationQuery.data[registrationQuery.data.length - 1]?.date}</span>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground text-sm">{t("admin.platformDashboard.t131", "데이터가 없습니다")}</p>
          )}
        </CardContent>
      </Card>

      {/* Role Distribution + Ad Banner Stats */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              {t("admin.platformDashboard.t132", "사용자 역할 분포")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roleQuery.data && roleQuery.data.length > 0 ? (
              <div className="space-y-2">
                {roleQuery.data.map((item: any, idx: number) => {
                  const total = roleQuery.data!.reduce((sum: number, d: any) => sum + Number(d.count), 0);
                  const pct = total > 0 ? ((Number(item.count) / total) * 100).toFixed(1) : "0";
                  const colors = ["bg-blue-500", "bg-green-500", "bg-amber-500", "bg-purple-500", "bg-red-500", "bg-cyan-500"];
                  const roleLabels: Record<string, string> = {
                    user: "일반 사용자", admin: "관리자", superadmin: "슈퍼관리자",
                    organizer: "주최자", agency: "여행사", partner: "파트너",
                  };
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`} />
                      <span className="text-sm flex-1">{roleLabels[item.role] || item.role}</span>
                      <span className="text-sm font-medium">{Number(item.count)}명</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">{t("admin.platformDashboard.t133", "데이터가 없습니다")}</p>
            )}
          </CardContent>
        </Card>

        {/* Ad Banner Click Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              {t("admin.platformDashboard.t134", "광고 배너 클릭 통계")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adStatsQuery.data && adStatsQuery.data.length > 0 ? (
              <div className="space-y-3">
                {adStatsQuery.data.map((ad: any) => (
                  <div key={ad.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ad.title || "제목 없음"}</p>
                      <p className="text-xs text-muted-foreground">{positionLabel(ad.position)}</p>
                    </div>
                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div>
                        <p className="text-sm font-bold">{Number(ad.clickCount).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{t("admin.platformDashboard.t135", "클릭")}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{Number(ad.impressionCount).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{t("admin.platformDashboard.t136", "노출")}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{ad.ctr}%</p>
                        <p className="text-[10px] text-muted-foreground">CTR</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">{t("admin.platformDashboard.t137", "광고 데이터가 없습니다")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
