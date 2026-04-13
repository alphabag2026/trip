import { useState, useMemo, lazy, Suspense } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { Users, Clock, CheckCircle, XCircle, Globe, MapPin, TrendingUp, Calendar, Loader2 } from "lucide-react";

const OverviewTab = lazy(() => import("./attendee-dashboard/OverviewTab"));
const ComparisonTab = lazy(() => import("./attendee-dashboard/ComparisonTab"));
const ApplicantsTab = lazy(() => import("./attendee-dashboard/ApplicantsTab"));

const TabLoader = () => (<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>);
type DateRange = "week" | "month" | "quarter" | "year" | "all";

export default function AttendeeDashboard() {
  const { t } = useTranslation();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [activeTab, setActiveTab] = useState("overview");
  const { data: meetups } = trpc.meetup.list.useQuery();
  const { data: stats } = trpc.attendeeDashboard.statsWithDateRange.useQuery({ meetupId: selectedMeetupId, dateRange });
  const { data: comparisonData } = trpc.attendeeDashboard.meetupComparison.useQuery(undefined, { enabled: activeTab === "comparison" });
  const approvalRate = useMemo(() => (!stats || stats.total === 0) ? 0 : Math.round((stats.approved / stats.total) * 100), [stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">{t("admin.attendeeDashboard.title")}</h1><p className="text-sm text-muted-foreground mt-1">{t("admin.attendeeDashboard.subtitle")}</p></div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}><SelectTrigger className="w-[160px]"><Calendar className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="week">{t("admin.attendeeDashboard.dateRangeWeek")}</SelectItem><SelectItem value="month">{t("admin.attendeeDashboard.dateRangeMonth")}</SelectItem><SelectItem value="quarter">{t("admin.attendeeDashboard.dateRangeQuarter")}</SelectItem><SelectItem value="year">{t("admin.attendeeDashboard.dateRangeYear")}</SelectItem><SelectItem value="all">{t("admin.attendeeDashboard.dateRangeAll")}</SelectItem></SelectContent></Select>
          <Select value={selectedMeetupId?.toString() || "all"} onValueChange={(v) => setSelectedMeetupId(v === "all" ? undefined : Number(v))}><SelectTrigger className="w-[280px]"><SelectValue placeholder={t("admin.attendeeDashboard.selectMeetup")} /></SelectTrigger><SelectContent><SelectItem value="all">{t("admin.attendeeDashboard.allMeetups")}</SelectItem>{meetups?.map((m) => <SelectItem key={m.id} value={m.id.toString()}>{m.title}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
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
          <Card key={i} className="bg-card border-border"><CardContent className="p-3"><div className={`inline-flex p-1.5 rounded-lg ${s.bg} mb-2`}><s.icon className={`h-4 w-4 ${s.color}`} /></div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground truncate">{s.label}</p></CardContent></Card>
        ))}
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t("admin.attendeeDashboard.tabOverview")}</TabsTrigger>
          <TabsTrigger value="comparison">{t("admin.attendeeDashboard.tabComparison")}</TabsTrigger>
          <TabsTrigger value="applicants">{t("admin.attendeeDashboard.tabApplicants")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><Suspense fallback={<TabLoader />}><OverviewTab stats={stats} dateRange={dateRange} /></Suspense></TabsContent>
        <TabsContent value="comparison" className="mt-4"><Suspense fallback={<TabLoader />}><ComparisonTab comparisonData={comparisonData} /></Suspense></TabsContent>
        <TabsContent value="applicants" className="mt-4"><Suspense fallback={<TabLoader />}><ApplicantsTab selectedMeetupId={selectedMeetupId} /></Suspense></TabsContent>
      </Tabs>
    </div>
  );
}
