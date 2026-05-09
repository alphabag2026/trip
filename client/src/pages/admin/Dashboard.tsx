import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Users, Plane, Clock, Globe, CheckCircle, FileText, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ExcelDownloadButton, fetchTrpcQuery } from "@/components/ExcelButtons";

export default function AdminDashboard() {
  const { data: stats } = trpc.registration.stats.useQuery();
  const { t } = useTranslation();

  const statCards = [
    { label: t("admin.dashboard.totalApps"), value: stats?.total ?? 0, icon: Users, color: "text-blue-400" },
    { label: t("admin.dashboard.pending"), value: stats?.pending ?? 0, icon: Clock, color: "text-yellow-400" },
    { label: t("admin.dashboard.approved"), value: stats?.approved ?? 0, icon: CheckCircle, color: "text-green-400" },
    { label: t("admin.dashboard.domestic"), value: stats?.domestic ?? 0, icon: Plane, color: "text-purple-400" },
    { label: t("admin.dashboard.overseas"), value: stats?.overseas ?? 0, icon: Globe, color: "text-cyan-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t("admin.dashboard.title")}</h1>
        <ExcelDownloadButton
          icon="export"
          fetchData={() => fetchTrpcQuery("excelExport.exportStats")}
          label={t("admin.excel.exportStats", "통계 엑셀 내보내기")}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((s, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-4">
              <s.icon className={`h-6 w-6 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle>{t("admin.dashboard.recentApps")}</CardTitle></CardHeader>
        <RecentRegistrations />
      </Card>
    </div>
  );
}

function RecentRegistrations() {
  const { data: regs } = trpc.registration.list.useQuery({ });
  const { t } = useTranslation();
  const [viewImage, setViewImage] = useState<string | null>(null);

  if (!regs || regs.length === 0) {
    return <CardContent className="text-muted-foreground text-sm">{t("admin.dashboard.noApps")}</CardContent>;
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      approved: t("admin.dashboard.statusApproved"),
      pending: t("admin.dashboard.statusPending"),
      rejected: t("admin.dashboard.statusRejected"),
      completed: t("admin.dashboard.statusCompleted"),
    };
    return map[s] || s;
  };

  return (
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-2 px-2 w-8"></th>
              <th className="text-left py-2 px-2">{t("admin.dashboard.colName")}</th>
              <th className="text-left py-2 px-2">{t("admin.dashboard.colType")}</th>
              <th className="text-left py-2 px-2">국가/지역</th>
              <th className="text-left py-2 px-2">여권</th>
              <th className="text-left py-2 px-2">{t("admin.dashboard.colPhone")}</th>
              <th className="text-left py-2 px-2">{t("admin.dashboard.colStatus")}</th>
              <th className="text-left py-2 px-2">{t("admin.dashboard.colDate")}</th>
            </tr>
          </thead>
          <tbody>
            {regs.slice(0, 20).map((r: any) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30">
                {/* Profile Photo */}
                <td className="py-2 px-2">
                  {r.profilePhotoUrl ? (
                    <img
                      src={r.profilePhotoUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover cursor-pointer hover:ring-2 ring-blue-500"
                      onClick={() => setViewImage(r.profilePhotoUrl)}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </td>
                <td className="py-2 px-2 font-medium">{r.name}</td>
                <td className="py-2 px-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${r.locationType === "overseas" ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400"}`}>
                    {r.locationType === "overseas" ? t("admin.dashboard.overseas") : t("admin.dashboard.domestic")}
                  </span>
                </td>
                {/* Nationality / Region */}
                <td className="py-2 px-2">
                  <div className="flex flex-col">
                    {r.nationality && <span className="text-xs font-medium">{r.nationality}</span>}
                    {r.region && <span className="text-[10px] text-muted-foreground">{r.region}</span>}
                    {!r.nationality && !r.region && <span className="text-xs text-muted-foreground">-</span>}
                  </div>
                </td>
                {/* Passport Image */}
                <td className="py-2 px-2">
                  {r.passportImageUrl ? (
                    <button
                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline"
                      onClick={() => setViewImage(r.passportImageUrl)}
                    >
                      <FileText className="h-3 w-3" /> 보기
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="py-2 px-2">{r.phone || "-"}</td>
                <td className="py-2 px-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    r.status === "approved" ? "bg-green-500/20 text-green-400" :
                    r.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                    r.status === "rejected" ? "bg-red-500/20 text-red-400" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {statusLabel(r.status)}
                  </span>
                </td>
                <td className="py-2 px-2 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
        <DialogContent className="max-w-2xl p-2">
          {viewImage && (
            <img src={viewImage} alt="Document" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </CardContent>
  );
}
