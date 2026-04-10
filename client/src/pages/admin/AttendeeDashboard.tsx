import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Users, Clock, CheckCircle, XCircle, Globe, MapPin,
  TrendingUp, BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Download,
} from "lucide-react";
import {
  PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Area, AreaChart,
  ComposedChart,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#22c55e",
  rejected: "#ef4444",
  completed: "#6366f1",
};

const CATEGORY_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6"];
const NATIONALITY_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#06b6d4"];
const MEETUP_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

type DateRange = "week" | "month" | "quarter" | "year" | "all";

export default function AttendeeDashboard() {
  const { t } = useTranslation();

  const [selectedMeetupId, setSelectedMeetupId] = useState<number | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: meetups } = trpc.meetup.list.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.attendeeDashboard.statsWithDateRange.useQuery(
    { meetupId: selectedMeetupId, dateRange }
  );
  const { data: comparisonData } = trpc.attendeeDashboard.meetupComparison.useQuery(
    undefined,
    { enabled: activeTab === "comparison" }
  );
  const { data: registrations, refetch: refetchRegs } = trpc.registration.list.useQuery(
    selectedMeetupId ? { meetupId: selectedMeetupId } : undefined,
    { enabled: activeTab === "applicants" }
  );

  const utils = trpc.useUtils();
  const bulkUpdate = trpc.attendeeDashboard.bulkUpdateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(t("admin.attendeeDashboard.bulkSuccess", { count: data.count }));
      setSelectedIds([]);
      utils.attendeeDashboard.statsWithDateRange.invalidate();
      utils.attendeeDashboard.meetupComparison.invalidate();
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

  // Meetup comparison chart data
  const comparisonChartData = useMemo(() => {
    if (!comparisonData) return [];
    return comparisonData.map((m: any) => ({
      name: m.meetupTitle.length > 12 ? m.meetupTitle.slice(0, 12) + "..." : m.meetupTitle,
      fullName: m.meetupTitle,
      total: m.total,
      pending: m.pending,
      approved: m.approved,
      rejected: m.rejected,
      completed: m.completed,
    }));
  }, [comparisonData]);

  const comparisonLocationData = useMemo(() => {
    if (!comparisonData) return [];
    return comparisonData.map((m: any) => ({
      name: m.meetupTitle.length > 12 ? m.meetupTitle.slice(0, 12) + "..." : m.meetupTitle,
      fullName: m.meetupTitle,
      domestic: m.domestic,
      overseas: m.overseas,
    }));
  }, [comparisonData]);

  // Approval rate calculation
  const approvalRate = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.approved / stats.total) * 100);
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

  const dateRangeLabel = (range: DateRange) => {
    const labels: Record<DateRange, string> = {
      week: t("admin.attendeeDashboard.dateRangeWeek"),
      month: t("admin.attendeeDashboard.dateRangeMonth"),
      quarter: t("admin.attendeeDashboard.dateRangeQuarter"),
      year: t("admin.attendeeDashboard.dateRangeYear"),
      all: t("admin.attendeeDashboard.dateRangeAll"),
    };
    return labels[range];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.attendeeDashboard.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.attendeeDashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Range Filter */}
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t("admin.attendeeDashboard.dateRangeWeek")}</SelectItem>
              <SelectItem value="month">{t("admin.attendeeDashboard.dateRangeMonth")}</SelectItem>
              <SelectItem value="quarter">{t("admin.attendeeDashboard.dateRangeQuarter")}</SelectItem>
              <SelectItem value="year">{t("admin.attendeeDashboard.dateRangeYear")}</SelectItem>
              <SelectItem value="all">{t("admin.attendeeDashboard.dateRangeAll")}</SelectItem>
            </SelectContent>
          </Select>
          {/* Meetup Filter */}
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: t("admin.attendeeDashboard.totalApplications"), value: stats?.total ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: t("admin.attendeeDashboard.pending"), value: stats?.pending ?? 0, icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: t("admin.attendeeDashboard.approved"), value: stats?.approved ?? 0, icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10" },
          { label: t("admin.attendeeDashboard.rejected"), value: stats?.rejected ?? 0, icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
          { label: t("admin.attendeeDashboard.completed"), value: stats?.completed ?? 0, icon: CheckCircle, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { label: t("admin.attendeeDashboard.domestic"), value: stats?.domestic ?? 0, icon: MapPin, color: "text-purple-400", bg: "bg-purple-500/10" },
          { label: t("admin.attendeeDashboard.overseas"), value: stats?.overseas ?? 0, icon: Globe, color: "text-cyan-400", bg: "bg-cyan-500/10" },
          { label: t("admin.attendeeDashboard.approvalRate"), value: `${approvalRate}%`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        ].map((s, i) => (
          <Card key={i} className="bg-card border-border hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className={`inline-flex p-1.5 rounded-lg ${s.bg} mb-2`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground truncate">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t("admin.attendeeDashboard.tabOverview")}</TabsTrigger>
          <TabsTrigger value="comparison">{t("admin.attendeeDashboard.tabComparison")}</TabsTrigger>
          <TabsTrigger value="applicants">{t("admin.attendeeDashboard.tabApplicants")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Charts Row 1 */}
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
                  <ResponsiveContainer width="100%" height={220}>
                    <RechartsPie>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} label={({ name, value }) => `${name}: ${value}`}>
                        {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
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
                  <ResponsiveContainer width="100%" height={220}>
                    <RechartsPie>
                      <Pie data={locationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} label={({ name, value }) => `${name}: ${value}`}>
                        {locationData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
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
                  <ResponsiveContainer width="100%" height={220}>
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
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                    {t("admin.attendeeDashboard.noData")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
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
                  <ResponsiveContainer width="100%" height={260}>
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
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                    {t("admin.attendeeDashboard.noData")}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trend Area Chart */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t("admin.attendeeDashboard.registrationTrend")}
                  <Badge variant="outline" className="ml-auto text-xs">{dateRangeLabel(dateRange)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#trendGradient)" dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                    {t("admin.attendeeDashboard.noData")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4 mt-4">
          {comparisonChartData.length > 0 ? (
            <>
              {/* Stacked Bar: Status by Meetup */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {t("admin.attendeeDashboard.meetupStatusComparison")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={comparisonChartData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const item = payload[0]?.payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
                              <p className="font-semibold mb-1">{item?.fullName || label}</p>
                              {payload.map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded" style={{ backgroundColor: p.color }} />
                                  <span>{p.name}: {p.value}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend />
                      <Bar dataKey="pending" name={t("admin.attendeeDashboard.pending")} stackId="a" fill={STATUS_COLORS.pending} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="approved" name={t("admin.attendeeDashboard.approved")} stackId="a" fill={STATUS_COLORS.approved} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="rejected" name={t("admin.attendeeDashboard.rejected")} stackId="a" fill={STATUS_COLORS.rejected} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="completed" name={t("admin.attendeeDashboard.completed")} stackId="a" fill={STATUS_COLORS.completed} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Location Comparison */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t("admin.attendeeDashboard.meetupLocationComparison")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonLocationData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const item = payload[0]?.payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
                              <p className="font-semibold mb-1">{item?.fullName || label}</p>
                              {payload.map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded" style={{ backgroundColor: p.color }} />
                                  <span>{p.name}: {p.value}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend />
                      <Bar dataKey="domestic" name={t("admin.attendeeDashboard.domestic")} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="overseas" name={t("admin.attendeeDashboard.overseas")} fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Summary Table */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("admin.attendeeDashboard.meetupSummaryTable")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="p-2 text-left">{t("admin.attendeeDashboard.meetupName")}</th>
                          <th className="p-2 text-right">{t("admin.attendeeDashboard.totalApplications")}</th>
                          <th className="p-2 text-right">{t("admin.attendeeDashboard.pending")}</th>
                          <th className="p-2 text-right">{t("admin.attendeeDashboard.approved")}</th>
                          <th className="p-2 text-right">{t("admin.attendeeDashboard.rejected")}</th>
                          <th className="p-2 text-right">{t("admin.attendeeDashboard.completed")}</th>
                          <th className="p-2 text-right">{t("admin.attendeeDashboard.approvalRate")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData?.map((m: any) => (
                          <tr key={m.meetupId} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                            <td className="p-2 font-medium">{m.meetupTitle}</td>
                            <td className="p-2 text-right font-semibold">{m.total}</td>
                            <td className="p-2 text-right"><span className="text-yellow-400">{m.pending}</span></td>
                            <td className="p-2 text-right"><span className="text-green-400">{m.approved}</span></td>
                            <td className="p-2 text-right"><span className="text-red-400">{m.rejected}</span></td>
                            <td className="p-2 text-right"><span className="text-indigo-400">{m.completed}</span></td>
                            <td className="p-2 text-right">
                              <Badge variant={m.total > 0 && (m.approved / m.total) >= 0.7 ? "default" : "secondary"}>
                                {m.total > 0 ? Math.round((m.approved / m.total) * 100) : 0}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {(!comparisonData || comparisonData.length === 0) && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                              {t("admin.attendeeDashboard.noData")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center text-muted-foreground">
                {t("admin.attendeeDashboard.noData")}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Applicants Tab */}
        <TabsContent value="applicants" className="mt-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
