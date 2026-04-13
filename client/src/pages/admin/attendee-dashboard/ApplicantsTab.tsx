import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ApplicantsTabProps { selectedMeetupId: number | undefined; }

export default function ApplicantsTab({ selectedMeetupId }: ApplicantsTabProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { data: registrations, refetch: refetchRegs } = trpc.registration.list.useQuery(selectedMeetupId ? { meetupId: selectedMeetupId } : undefined);
  const utils = trpc.useUtils();
  const bulkUpdate = trpc.attendeeDashboard.bulkUpdateStatus.useMutation({
    onSuccess: (data) => { toast.success(t("admin.attendeeDashboard.bulkSuccess", { count: data.count })); setSelectedIds([]); utils.attendeeDashboard.statsWithDateRange.invalidate(); utils.attendeeDashboard.meetupComparison.invalidate(); utils.registration.list.invalidate(); refetchRegs(); },
  });
  const handleBulkAction = (status: "approved" | "rejected" | "completed") => {
    if (selectedIds.length === 0) return;
    if (confirm(t("admin.attendeeDashboard.confirmBulk", { count: selectedIds.length, status: t(`admin.attendeeDashboard.${status}`) }))) bulkUpdate.mutate({ ids: selectedIds, status });
  };
  const toggleSelect = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => { if (!registrations) return; setSelectedIds(prev => prev.length === registrations.length ? [] : registrations.map(r => r.id)); };
  const getStatusBadge = (status: string) => {
    const v: Record<string, "default" | "secondary" | "destructive" | "outline"> = { pending: "secondary", approved: "default", rejected: "destructive", completed: "outline" };
    return <Badge variant={v[status] || "secondary"}>{t(`admin.attendeeDashboard.${status}`)}</Badge>;
  };
  return (
    <Card className="bg-card border-border"><CardHeader className="pb-2"><div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"><CardTitle className="text-sm">{t("admin.attendeeDashboard.applicants")}</CardTitle>{selectedIds.length > 0 && (<div className="flex items-center gap-2 flex-wrap"><span className="text-sm text-muted-foreground">{t("admin.attendeeDashboard.selected", { count: selectedIds.length })}</span><Button size="sm" variant="default" onClick={() => handleBulkAction("approved")} disabled={bulkUpdate.isPending}>{t("admin.attendeeDashboard.bulkApprove")}</Button><Button size="sm" variant="destructive" onClick={() => handleBulkAction("rejected")} disabled={bulkUpdate.isPending}>{t("admin.attendeeDashboard.bulkReject")}</Button><Button size="sm" variant="outline" onClick={() => handleBulkAction("completed")} disabled={bulkUpdate.isPending}>{t("admin.attendeeDashboard.bulkComplete")}</Button></div>)}</div></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="p-2 text-left"><Checkbox checked={registrations && registrations.length > 0 && selectedIds.length === registrations.length} onCheckedChange={toggleSelectAll} /></th><th className="p-2 text-left">{t("admin.attendeeDashboard.name")}</th><th className="p-2 text-left hidden sm:table-cell">{t("admin.attendeeDashboard.phone")}</th><th className="p-2 text-left hidden md:table-cell">{t("admin.attendeeDashboard.messenger")}</th><th className="p-2 text-left">{t("admin.attendeeDashboard.status")}</th><th className="p-2 text-left hidden lg:table-cell">{t("admin.attendeeDashboard.category")}</th><th className="p-2 text-left hidden lg:table-cell">{t("admin.attendeeDashboard.location")}</th><th className="p-2 text-left hidden xl:table-cell">{t("admin.attendeeDashboard.date")}</th></tr></thead><tbody>{registrations?.map((r) => (<tr key={r.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors"><td className="p-2"><Checkbox checked={selectedIds.includes(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></td><td className="p-2 font-medium">{r.name}</td><td className="p-2 hidden sm:table-cell text-muted-foreground">{r.phone}</td><td className="p-2 hidden md:table-cell text-muted-foreground">{r.messengerId}</td><td className="p-2">{getStatusBadge(r.status)}</td><td className="p-2 hidden lg:table-cell"><Badge variant="outline">{t(`admin.attendeeDashboard.${r.category}`)}</Badge></td><td className="p-2 hidden lg:table-cell"><Badge variant={r.locationType === "overseas" ? "default" : "secondary"}>{t(`admin.attendeeDashboard.${r.locationType}`)}</Badge></td><td className="p-2 hidden xl:table-cell text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-"}</td></tr>))}{(!registrations || registrations.length === 0) && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{t("admin.attendeeDashboard.noData")}</td></tr>}</tbody></table></div></CardContent></Card>
  );
}
