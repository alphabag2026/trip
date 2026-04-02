import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Users, Clock, CheckCircle, XCircle, Globe, MapPin,
  TrendingUp, BarChart3, PieChart,
} from "lucide-react";
import {
  PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#22c55e",
  rejected: "#ef4444",
  completed: "#6366f1",
};

const CATEGORY_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6"];
const NATIONALITY_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#06b6d4"];

export default function AttendeeDashboard() {
  const { t } = useTranslation();

  const [selectedMeetupId, setSelectedMeetupId] = useState<number | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: meetups } = trpc.meetup.list.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.attendeeDashboard.stats.useQuery(
    selectedMeetupId ? { meetupId: selectedMeetupId } : undefined
  );
  const { data: registrations, refetch: refetchRegs } = trpc.registration.list.useQuery(
    selectedMeetupId ? { meetupId: selectedMeetupId } : undefined
  );

  const utils = trpc.useUtils();
  const bulkUpdate = trpc.attendeeDashboard.bulkUpdateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(t("admin.attendeeDashboard.bulkSuccess", { count: data.count }));
      setSelectedIds([]);
      utils.attendeeDashboard.stats.invalidate();
      utils.registration.list.invalidate();
      refetchRegs();
    },
  });

  const handleBulkAction = (status: "approved" | "rejected" | "completed") => {
    if (selectedIds.length === 0) return;
    const statusLabel = t(`admin.attendeeDashboard.${status}`);
    if (confirm(t("admin.attendeeDashboard.confirmBulk", { count: selectedIds.length, status: statusLabel }))) {
      bulkUpdate.mutate({ ids: selectedIds, status });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (!registrations) return;
    if (selectedIds.length === registrations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(registrations.map(r => r.id));
    }
  };

  // Chart data
  const statusData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: t("admin.attendeeDashboard.pending"), value: stats.pending, fill: STATUS_COLORS.pending },
      { name: t("admin.attendeeDashboard.approved"), value: stats.approved, fill: STATUS_COLORS.approved },
      { name: t("admin.attendeeDashboard.rejected"), value: stats.rejected, fill: STATUS_COLORS.rejected },
      { name: t("admin.attendeeDashboard.completed"), value: stats.completed, fill: STATUS_COLORS.completed },
    ].filter(d => d.value > 0);
  }, [stats, t]);

  const locationData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: t("admin.attendeeDashboard.domestic"), value: stats.domestic, fill: "#3b82f6" },
      { name: t("admin.attendeeDashboard.overseas"), value: stats.overseas, fill: "#f97316" },
    ].filter(d => d.value > 0);
  }, [stats, t]);

  const categoryData = useMemo(() => {
    if (!stats?.byCategory) return [];
    return stats.byCategory.map((c: any, i: number) => ({
      name: t(`admin.attendeeDashboard.${c.category}`),
      value: c.count,
      fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [stats, t]);

  const nationalityData = useMemo(() => {
    if (!stats?.byNationality) return [];
    return stats.byNationality.map((n: any) => ({
      name: n.nationality,
      count: n.count,
    }));
  }, [stats]);

  const trendData = useMemo(() => {
    if (!stats?.recentTrend) return [];
    return stats.recentTrend.map((d: any) => ({
      date: typeof d.date === 'string' ? d.date.slice(5) : d.date,
      count: d.count,
    }));
  }, [stats]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      completed: "outline",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {t(`admin.attendeeDashboard.${status}`)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("admin.attendeeDashboard.title")}</h1>
        <Select
          value={selectedMeetupId?.toString() || "all"}
          onValueChange={(v) => {
            setSelectedMeetupId(v === "all" ? undefined : Number(v));
            setSelectedIds([]);
          }}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder={t("admin.attendeeDashboard.selectMeetup")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.attendeeDashboard.allMeetups")}</SelectItem>
            {meetups?.map((m) => (
              <SelectItem key={m.id} value={m.id.toString()}>{m.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: t("admin.attendeeDashboard.totalApplications"), value: stats?.total ?? 0, icon: Users, color: "text-blue-400" },
          { label: t("admin.attendeeDashboard.pending"), value: stats?.pending ?? 0, icon: Clock, color: "text-yellow-400" },
          { label: t("admin.attendeeDashboard.approved"), value: stats?.approved ?? 0, icon: CheckCircle, color: "text-green-400" },
          { label: t("admin.attendeeDashboard.rejected"), value: stats?.rejected ?? 0, icon: XCircle, color: "text-red-400" },
          { label: t("admin.attendeeDashboard.completed"), value: stats?.completed ?? 0, icon: CheckCircle, color: "text-indigo-400" },
          { label: t("admin.attendeeDashboard.domestic"), value: stats?.domestic ?? 0, icon: MapPin, color: "text-purple-400" },
          { label: t("admin.attendeeDashboard.overseas"), value: stats?.overseas ?? 0, icon: Globe, color: "text-cyan-400" },
        ].map((s, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-3">
              <s.icon className={`h-5 w-5 ${s.color} mb-1`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground truncate">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Status Pie */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              {t("admin.attendeeDashboard.statusOverview")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                {t("admin.attendeeDashboard.noData")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Pie */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t("admin.attendeeDashboard.locationDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie data={locationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                    {locationData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                {t("admin.attendeeDashboard.noData")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Bar */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t("admin.attendeeDashboard.categoryDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {categoryData.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                {t("admin.attendeeDashboard.noData")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nationality + Trend Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Nationality Bar */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t("admin.attendeeDashboard.nationalityDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nationalityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={nationalityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {nationalityData.map((_: any, i: number) => <Cell key={i} fill={NATIONALITY_COLORS[i % NATIONALITY_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                {t("admin.attendeeDashboard.noData")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend Line */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t("admin.attendeeDashboard.registrationTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                {t("admin.attendeeDashboard.noData")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Applicant List with Bulk Actions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-sm">{t("admin.attendeeDashboard.applicants")}</CardTitle>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {t("admin.attendeeDashboard.selected", { count: selectedIds.length })}
                </span>
                <Button size="sm" variant="default" onClick={() => handleBulkAction("approved")} disabled={bulkUpdate.isPending}>
                  {t("admin.attendeeDashboard.bulkApprove")}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleBulkAction("rejected")} disabled={bulkUpdate.isPending}>
                  {t("admin.attendeeDashboard.bulkReject")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("completed")} disabled={bulkUpdate.isPending}>
                  {t("admin.attendeeDashboard.bulkComplete")}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left">
                    <Checkbox
                      checked={registrations && registrations.length > 0 && selectedIds.length === registrations.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-2 text-left">{t("admin.attendeeDashboard.name")}</th>
                  <th className="p-2 text-left hidden sm:table-cell">{t("admin.attendeeDashboard.phone")}</th>
                  <th className="p-2 text-left hidden md:table-cell">{t("admin.attendeeDashboard.messenger")}</th>
                  <th className="p-2 text-left">{t("admin.attendeeDashboard.status")}</th>
                  <th className="p-2 text-left hidden lg:table-cell">{t("admin.attendeeDashboard.category")}</th>
                  <th className="p-2 text-left hidden lg:table-cell">{t("admin.attendeeDashboard.location")}</th>
                  <th className="p-2 text-left hidden xl:table-cell">{t("admin.attendeeDashboard.date")}</th>
                </tr>
              </thead>
              <tbody>
                {registrations?.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="p-2">
                      <Checkbox
                        checked={selectedIds.includes(r.id)}
                        onCheckedChange={() => toggleSelect(r.id)}
                      />
                    </td>
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2 hidden sm:table-cell text-muted-foreground">{r.phone}</td>
                    <td className="p-2 hidden md:table-cell text-muted-foreground">{r.messengerId}</td>
                    <td className="p-2">{getStatusBadge(r.status)}</td>
                    <td className="p-2 hidden lg:table-cell">
                      <Badge variant="outline">{t(`admin.attendeeDashboard.${r.category}`)}</Badge>
                    </td>
                    <td className="p-2 hidden lg:table-cell">
                      <Badge variant={r.locationType === "overseas" ? "default" : "secondary"}>
                        {t(`admin.attendeeDashboard.${r.locationType}`)}
                      </Badge>
                    </td>
                    <td className="p-2 hidden xl:table-cell text-muted-foreground">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))}
                {(!registrations || registrations.length === 0) && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      {t("admin.attendeeDashboard.noData")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
