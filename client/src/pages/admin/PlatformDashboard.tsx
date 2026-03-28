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
  ArrowRightLeft, UserCog, Power, ChevronDown, ChevronUp
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
          <span className="text-xs text-muted-foreground">전체</span>
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
  const [activeTab, setActiveTab] = useState<"overview" | "organizations" | "users" | "accounts" | "audit">("overview");
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
      toast.success("계정이 성공적으로 생성되었습니다");
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
      toast.success("권한이 위임되었습니다");
      utils.platform.usersWithOrgs.invalidate();
      utils.platform.auditLogs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const resetPasswordMutation = trpc.superAdmin.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("비밀번호가 초기화되었습니다");
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
      toast.success("조직이 생성되었습니다");
      utils.organization.list.invalidate();
      utils.platform.stats.invalidate();
      closeOrgDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateOrgMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success("조직 정보가 수정되었습니다");
      utils.organization.list.invalidate();
      utils.platform.stats.invalidate();
      closeOrgDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMutation = trpc.platform.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("역할이 변경되었습니다");
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
      toast.success("조직이 삭제되었습니다");
      utils.organization.list.invalidate();
      utils.platform.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleOrgActiveMutation = trpc.platform.toggleOrgActive.useMutation({
    onSuccess: () => {
      toast.success("조직 상태가 변경되었습니다");
      utils.organization.list.invalidate();
      utils.platform.auditLogs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const assignUserOrgMutation = trpc.platform.assignUserOrg.useMutation({
    onSuccess: () => {
      toast.success("조직이 배정되었습니다");
      utils.platform.usersWithOrgs.invalidate();
      utils.platform.auditLogs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addOrgMemberMutation = trpc.orgMember.add.useMutation({
    onSuccess: () => {
      toast.success("멤버가 추가되었습니다");
      utils.platform.orgMembers.invalidate();
      setAddMemberDialog({ open: false, organizationId: 0, orgName: "" });
      setNewMemberUserId("");
      setNewMemberRole("staff");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeOrgMemberMutation = trpc.orgMember.remove.useMutation({
    onSuccess: () => {
      toast.success("멤버가 제거되었습니다");
      utils.platform.orgMembers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateOrgMemberRoleMutation = trpc.platform.updateOrgMemberRole.useMutation({
    onSuccess: () => {
      toast.success("멤버 역할이 변경되었습니다");
      utils.platform.orgMembers.invalidate();
      utils.platform.auditLogs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const transferOwnershipMutation = trpc.platform.transferOwnership.useMutation({
    onSuccess: () => {
      toast.success("소유권이 이전되었습니다");
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
            클라우드 플랫폼 관리
          </h1>
          <p className="text-muted-foreground mt-1">전체 플랫폼 조직, 파트너, 사용자를 관리합니다</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {[
          { key: "overview", label: "대시보드", icon: BarChart3 },
          { key: "organizations", label: "조직 관리", icon: Building2 },
          { key: "users", label: "사용자 관리", icon: Users },
          { key: "accounts", label: "계정 생성/위임", icon: UserPlus },
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
                    <p className="text-xs text-muted-foreground">조직</p>
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
                    <p className="text-xs text-muted-foreground">파트너</p>
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
                    <p className="text-xs text-muted-foreground">밋업</p>
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
                    <p className="text-xs text-muted-foreground">신청</p>
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
                    <p className="text-xs text-muted-foreground">사용자</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Donut Chart + Partner Categories */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> 조직 유형별 분포</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                {donutData.length > 0 ? (
                  <DonutChart data={donutData} size={220} strokeWidth={36} />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">등록된 조직이 없습니다</p>
                    <Button size="sm" className="mt-2" onClick={() => setActiveTab("organizations")}>
                      조직 등록하기
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" /> 파트너 카테고리
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
                    <p className="text-muted-foreground text-sm mb-3">카테고리가 없습니다</p>
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
                  <Handshake className="h-4 w-4" /> 파트너 카테고리별 분포
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
                  <SelectItem value="all">전체 유형</SelectItem>
                  <SelectItem value="platform">클라우드 본사</SelectItem>
                  <SelectItem value="organizer">행사/여행 주최자</SelectItem>
                  <SelectItem value="agency">지역 에이전시</SelectItem>
                  <SelectItem value="partner">파트너 업체</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setOrgForm(emptyOrg); setEditingOrgId(null); setShowOrgDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> 조직 등록
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
                  <p className="text-muted-foreground">등록된 조직이 없습니다</p>
                  <Button className="mt-3" onClick={() => { setOrgForm(emptyOrg); setEditingOrgId(null); setShowOrgDialog(true); }}>
                    첫 조직 등록하기
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
                  주최자/에이전시/파트너 계정 생성
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
                    <h4 className="font-semibold text-sm text-muted-foreground">계정 정보</h4>
                    <div><Label>이름 *</Label><Input value={accountForm.name} onChange={e => setAccountForm({...accountForm, name: e.target.value})} placeholder="담당자 이름" /></div>
                    <div><Label>이메일 *</Label><Input type="email" value={accountForm.email} onChange={e => setAccountForm({...accountForm, email: e.target.value})} placeholder="로그인용 이메일" /></div>
                    <div><Label>비밀번호 *</Label><Input type="password" value={accountForm.password} onChange={e => setAccountForm({...accountForm, password: e.target.value})} placeholder="최소 6자" /></div>
                    <div>
                      <Label>역할 *</Label>
                      <Select value={accountForm.role} onValueChange={(v: any) => setAccountForm({...accountForm, role: v, organizationType: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="organizer">행사/여행 주최자</SelectItem>
                          <SelectItem value="agency">지역 에이전시</SelectItem>
                          <SelectItem value="partner">파트너 업체</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">조직 정보</h4>
                    <div><Label>조직명 *</Label><Input value={accountForm.organizationName} onChange={e => setAccountForm({...accountForm, organizationName: e.target.value})} placeholder="회사/단체명" /></div>
                    <div><Label>연락처 이메일</Label><Input type="email" value={accountForm.contactEmail} onChange={e => setAccountForm({...accountForm, contactEmail: e.target.value})} /></div>
                    <div><Label>연락처 전화</Label><Input value={accountForm.contactPhone} onChange={e => setAccountForm({...accountForm, contactPhone: e.target.value})} /></div>
                    <div><Label>웹사이트</Label><Input value={accountForm.website} onChange={e => setAccountForm({...accountForm, website: e.target.value})} /></div>
                    <div><Label>설명</Label><Textarea value={accountForm.description} onChange={e => setAccountForm({...accountForm, description: e.target.value})} rows={2} /></div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowCreateAccount(false)}>취소</Button>
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
                권한 위임 이력
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
                  <p className="text-sm text-muted-foreground text-center py-6">권한 위임 이력이 없습니다</p>
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
              placeholder="이름 또는 이메일로 검색..."
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
                      <th className="text-left py-2 px-3">사용자</th>
                      <th className="text-left py-2 px-3">현재 역할</th>
                      <th className="text-left py-2 px-3">소속 조직</th>
                      <th className="text-left py-2 px-3">역할 변경</th>
                      <th className="text-left py-2 px-3">조직 배정</th>
                      <th className="text-left py-2 px-3">액션</th>
                      <th className="text-left py-2 px-3">가입일</th>
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
                            <span className="text-muted-foreground text-xs">미배정</span>
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
                              <SelectItem value="user">일반 사용자</SelectItem>
                              <SelectItem value="admin">관리자</SelectItem>
                              <SelectItem value="superadmin">슈퍼관리자</SelectItem>
                              <SelectItem value="organizer">주최자</SelectItem>
                              <SelectItem value="agency">에이전시</SelectItem>
                              <SelectItem value="partner">파트너</SelectItem>
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
                              <SelectValue placeholder="조직 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">미배정</SelectItem>
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
                            PW 초기화
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

      {/* ════════════════════ Audit Log Tab ════════════════════ */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={auditFilter} onValueChange={(v) => { setAuditFilter(v); setAuditPage(0); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="전체 작업" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 작업</SelectItem>
                <SelectItem value="role_change">역할 변경</SelectItem>
                <SelectItem value="org_toggle_active">조직 활성화 변경</SelectItem>
                <SelectItem value="member_role_change">멤버 역할 변경</SelectItem>
                <SelectItem value="ownership_transfer">소유권 이전</SelectItem>
                <SelectItem value="settings_change">설정 변경</SelectItem>
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
                  <p className="text-center py-8 text-muted-foreground">감사 로그가 없습니다</p>
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
                    이전
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {auditPage + 1} / {Math.ceil((auditLogsQuery.data?.total || 0) / 20)}
                  </span>
                  <Button
                    variant="outline" size="sm"
                    disabled={(auditPage + 1) * 20 >= (auditLogsQuery.data?.total || 0)}
                    onClick={() => setAuditPage(p => p + 1)}
                  >
                    다음
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
              <Label>조직명 *</Label>
              <Input value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} placeholder="조직/업체명을 입력하세요" />
            </div>
            <div>
              <Label>유형 *</Label>
              <Select value={orgForm.type} onValueChange={(v: any) => setOrgForm({ ...orgForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">클라우드 본사</SelectItem>
                  <SelectItem value="organizer">행사/여행 주최자</SelectItem>
                  <SelectItem value="agency">지역 에이전시</SelectItem>
                  <SelectItem value="partner">파트너 업체</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>지역</Label><Input value={orgForm.region} onChange={e => setOrgForm({ ...orgForm, region: e.target.value })} placeholder="예: 동남아시아" /></div>
              <div><Label>국가</Label><Input value={orgForm.country} onChange={e => setOrgForm({ ...orgForm, country: e.target.value })} placeholder="예: 태국" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>담당자명</Label><Input value={orgForm.contactName} onChange={e => setOrgForm({ ...orgForm, contactName: e.target.value })} /></div>
              <div><Label>연락처</Label><Input value={orgForm.contactPhone} onChange={e => setOrgForm({ ...orgForm, contactPhone: e.target.value })} /></div>
            </div>
            <div><Label>이메일</Label><Input value={orgForm.contactEmail} onChange={e => setOrgForm({ ...orgForm, contactEmail: e.target.value })} /></div>
            <div><Label>주소</Label><Input value={orgForm.address} onChange={e => setOrgForm({ ...orgForm, address: e.target.value })} /></div>
            <div><Label>웹사이트</Label><Input value={orgForm.website} onChange={e => setOrgForm({ ...orgForm, website: e.target.value })} /></div>
            <div><Label>텔레그램 Chat ID</Label><Input value={orgForm.telegramChatId} onChange={e => setOrgForm({ ...orgForm, telegramChatId: e.target.value })} /></div>
            <div><Label>설명</Label><Textarea value={orgForm.description} onChange={e => setOrgForm({ ...orgForm, description: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeOrgDialog}>취소</Button>
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
              역할 변경 확인
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">다음 사용자의 역할을 변경하시겠습니까?</p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">사용자</span>
                <span className="font-semibold">{roleChangeConfirm.userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">현재 역할</span>
                <Badge variant="outline">{roleLabels[roleChangeConfirm.currentRole] || roleChangeConfirm.currentRole}</Badge>
              </div>
              <div className="flex items-center justify-center"><span className="text-lg text-muted-foreground">↓</span></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">변경 역할</span>
                <Badge>{roleLabels[roleChangeConfirm.newRole] || roleChangeConfirm.newRole}</Badge>
              </div>
            </div>
            {(roleChangeConfirm.newRole === "superadmin" || roleChangeConfirm.newRole === "admin") && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  관리자 이상의 권한을 부여하면 해당 사용자가 플랫폼의 주요 설정을 변경할 수 있습니다.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeConfirm({ open: false, userId: 0, userName: "", currentRole: "", newRole: "" })}>취소</Button>
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
              <Label>사용자 선택</Label>
              <Select value={newMemberUserId} onValueChange={setNewMemberUserId}>
                <SelectTrigger><SelectValue placeholder="사용자를 선택하세요" /></SelectTrigger>
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
              <Label>역할</Label>
              <Select value={newMemberRole} onValueChange={(v: any) => setNewMemberRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">소유자</SelectItem>
                  <SelectItem value="manager">관리자</SelectItem>
                  <SelectItem value="staff">스태프</SelectItem>
                  <SelectItem value="viewer">열람자</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberDialog({ open: false, organizationId: 0, orgName: "" })}>취소</Button>
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
              <Label>새 비밀번호</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="최소 6자" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPwDialog({ open: false, userId: 0, userName: "" })}>취소</Button>
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
                <span className="text-sm text-muted-foreground">현재 소유자</span>
                <span className="font-semibold">{transferDialog.currentOwnerName}</span>
              </div>
            </div>
            <div>
              <Label>새 소유자 선택</Label>
              <Select value={transferToUserId} onValueChange={setTransferToUserId}>
                <SelectTrigger><SelectValue placeholder="사용자를 선택하세요" /></SelectTrigger>
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
                소유권을 이전하면 현재 소유자는 관리자 역할로 변경됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog({ open: false, organizationId: 0, orgName: "", currentOwnerId: 0, currentOwnerName: "" })}>취소</Button>
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
                {!org.isActive && <Badge variant="destructive">비활성</Badge>}
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
                <UserCog className="h-4 w-4" /> 조직 멤버
              </h4>
              <div className="flex gap-2">
                {owner && (
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => onTransferOwnership(owner.userId, owner.userName || "Unknown")}>
                    <ArrowRightLeft className="h-3 w-3" /> 소유권 이전
                  </Button>
                )}
                <Button size="sm" className="gap-1" onClick={onAddMember}>
                  <UserPlus className="h-3 w-3" /> 멤버 추가
                </Button>
              </div>
            </div>

            {membersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">로딩 중...</p>
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
                          <SelectItem value="owner">소유자</SelectItem>
                          <SelectItem value="manager">관리자</SelectItem>
                          <SelectItem value="staff">스태프</SelectItem>
                          <SelectItem value="viewer">열람자</SelectItem>
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
              <p className="text-sm text-muted-foreground text-center py-4">등록된 멤버가 없습니다</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
