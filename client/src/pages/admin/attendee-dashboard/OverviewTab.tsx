import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { Globe, BarChart3, PieChart, TrendingUp } from "lucide-react";
import {
  PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Area, AreaChart,
} from "recharts";

const STATUS_COLORS: Record<string, string> = { pending: "#f59e0b", approved: "#22c55e", rejected: "#ef4444", completed: "#6366f1" };
const CATEGORY_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6"];
const NATIONALITY_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#06b6d4"];
type DateRange = "week" | "month" | "quarter" | "year" | "all";

interface OverviewTabProps { stats: any; dateRange: DateRange; }

export default function OverviewTab({ stats, dateRange }: OverviewTabProps) {
  const { t } = useTranslation();
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
    return stats.byCategory.map((c: any, i: number) => ({ name: t(`admin.attendeeDashboard.${c.category}`), value: c.count, fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
  }, [stats, t]);
  const nationalityData = useMemo(() => stats?.byNationality?.map((n: any) => ({ name: n.nationality, count: n.count })) || [], [stats]);
  const trendData = useMemo(() => stats?.recentTrend?.map((d: any) => ({ date: typeof d.date === 'string' ? d.date.slice(5) : d.date, count: d.count })) || [], [stats]);
  const dateRangeLabel = (range: DateRange) => {
    const labels: Record<DateRange, string> = { week: t("admin.attendeeDashboard.dateRangeWeek"), month: t("admin.attendeeDashboard.dateRangeMonth"), quarter: t("admin.attendeeDashboard.dateRangeQuarter"), year: t("admin.attendeeDashboard.dateRangeYear"), all: t("admin.attendeeDashboard.dateRangeAll") };
    return labels[range];
  };
  const NoData = () => <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">{t("admin.attendeeDashboard.noData")}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-card border-border"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4" />{t("admin.attendeeDashboard.statusOverview")}</CardTitle></CardHeader><CardContent>{statusData.length > 0 ? (<ResponsiveContainer width="100%" height={220}><RechartsPie><Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} label={({ name, value }) => `${name}: ${value}`}>{statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip /></RechartsPie></ResponsiveContainer>) : <NoData />}</CardContent></Card>
        <Card className="bg-card border-border"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" />{t("admin.attendeeDashboard.locationDistribution")}</CardTitle></CardHeader><CardContent>{locationData.length > 0 ? (<ResponsiveContainer width="100%" height={220}><RechartsPie><Pie data={locationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} label={({ name, value }) => `${name}: ${value}`}>{locationData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip /></RechartsPie></ResponsiveContainer>) : <NoData />}</CardContent></Card>
        <Card className="bg-card border-border"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />{t("admin.attendeeDashboard.categoryDistribution")}</CardTitle></CardHeader><CardContent>{categoryData.length > 0 ? (<ResponsiveContainer width="100%" height={220}><BarChart data={categoryData}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{categoryData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart></ResponsiveContainer>) : <NoData />}</CardContent></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" />{t("admin.attendeeDashboard.nationalityDistribution")}</CardTitle></CardHeader><CardContent>{nationalityData.length > 0 ? (<ResponsiveContainer width="100%" height={260}><BarChart data={nationalityData} layout="vertical"><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>{nationalityData.map((_: any, i: number) => <Cell key={i} fill={NATIONALITY_COLORS[i % NATIONALITY_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>) : <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">{t("admin.attendeeDashboard.noData")}</div>}</CardContent></Card>
        <Card className="bg-card border-border"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />{t("admin.attendeeDashboard.registrationTrend")}<Badge variant="outline" className="ml-auto text-xs">{dateRangeLabel(dateRange)}</Badge></CardTitle></CardHeader><CardContent>{trendData.length > 0 ? (<ResponsiveContainer width="100%" height={260}><AreaChart data={trendData}><defs><linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#trendGradient)" dot={{ r: 3 }} /></AreaChart></ResponsiveContainer>) : <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">{t("admin.attendeeDashboard.noData")}</div>}</CardContent></Card>
      </div>
    </div>
  );
}
