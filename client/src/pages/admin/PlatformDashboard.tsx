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
import { toast } from "sonner";
import {
  Building2, Users, Globe, MapPin, Handshake,
  CalendarDays, UserPlus, Shield, AlertTriangle,
  BarChart3, TrendingUp, Activity, Edit, Trash2,
  Phone, Mail, ExternalLink, Plus
} from "lucide-react";

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
          {/* Background circle */}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/20" />
          {/* Segments */}
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
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{total}</span>
          <span className="text-xs text-muted-foreground">전체</span>
        </div>
      </div>
      {/* Legend */}
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
  const [activeTab, setActiveTab] = useState<"overview" | "organizations" | "users">("overview");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<number | null>(null);
  const [orgForm, setOrgForm] = useState(emptyOrg);
  const [userSearch, setUserSearch] = useState("");

  // 역할 변경 확인 모달 상태
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    open: boolean;
    userId: number;
    userName: string;
    currentRole: string;
    newRole: string;
  }>({ open: false, userId: 0, userName: "", currentRole: "", newRole: "" });

  const utils = trpc.useUtils();
  const statsQuery = trpc.platform.stats.useQuery();
  const orgsQuery = trpc.organization.list.useQuery({ type: orgFilter === "all" ? undefined : orgFilter });
  const usersQuery = trpc.platform.users.useQuery();
  const categoriesQuery = trpc.partnerCategory.list.useQuery();

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
      utils.platform.users.invalidate();
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
      <div className="flex gap-2 border-b pb-2">
        {[
          { key: "overview", label: "대시보드", icon: BarChart3 },
          { key: "organizations", label: "조직 관리", icon: Building2 },
          { key: "users", label: "사용자 관리", icon: Users },
        ].map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.key as any)}
            className="gap-1"
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
                <Card key={org.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted mt-0.5">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
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
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditOrg(org)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => {
                            if (confirm(`"${org.name}" 조직을 삭제하시겠습니까?`)) {
                              deleteOrgMutation.mutate({ id: org.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                      <th className="text-left py-2 px-3">역할 변경</th>
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
                          <Select
                            value={user.role}
                            onValueChange={(role: any) => handleRoleChangeRequest(user, role)}
                          >
                            <SelectTrigger className="w-[140px] h-8">
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
            <p className="text-sm text-muted-foreground">
              다음 사용자의 역할을 변경하시겠습니까?
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">사용자</span>
                <span className="font-semibold">{roleChangeConfirm.userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">현재 역할</span>
                <Badge variant="outline">{roleLabels[roleChangeConfirm.currentRole] || roleChangeConfirm.currentRole}</Badge>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-lg text-muted-foreground">↓</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">변경 역할</span>
                <Badge>{roleLabels[roleChangeConfirm.newRole] || roleChangeConfirm.newRole}</Badge>
              </div>
            </div>
            {(roleChangeConfirm.newRole === "superadmin" || roleChangeConfirm.newRole === "admin") && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  관리자 이상의 권한을 부여하면 해당 사용자가 플랫폼의 주요 설정을 변경할 수 있습니다. 신중하게 결정해 주세요.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeConfirm({ open: false, userId: 0, userName: "", currentRole: "", newRole: "" })}>
              취소
            </Button>
            <Button
              onClick={confirmRoleChange}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? "변경 중..." : "역할 변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
