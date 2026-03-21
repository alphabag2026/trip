import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, CheckCircle, XCircle, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AdminModRequests() {
  const { t } = useTranslation();
  const typeLabels: Record<string, string> = { flight_change: t("admin.modRequests.flightChange"), hotel_change: t("admin.modRequests.hotelChange"), schedule_change: t("admin.modRequests.scheduleChange"), other: t("admin.modRequests.other") };
  const statusLabels: Record<string, string> = { pending: t("admin.modRequests.pending"), approved: t("admin.modRequests.approved"), rejected: t("admin.modRequests.rejected"), completed: t("admin.modRequests.completed") };

  const { data: requests = [], refetch } = trpc.modRequest.list.useQuery();
  const updateMut = trpc.modRequest.process.useMutation({ onSuccess: () => { refetch(); toast.success(t("admin.modRequests.processed")); } });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const handleAction = (id: number, status: "approved" | "rejected") => {
    updateMut.mutate({ id, status, adminNotes });
    setSelectedId(null);
    setAdminNotes("");
  };

  const pendingCount = requests.filter((r: any) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Edit className="h-6 w-6 text-primary" /> {t("admin.modRequests.title")}
          {pendingCount > 0 && <Badge variant="destructive" className="ml-2">{t("admin.modRequests.pendingCount", { count: pendingCount })}</Badge>}
        </h1>
      </div>

      {requests.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">{t("admin.modRequests.empty")}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <Card key={req.id} className={req.status === "pending" ? "border-yellow-500/30" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{typeLabels[req.requestType] || req.requestType}</Badge>
                      <Badge variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                        {statusLabels[req.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{t("admin.modRequests.regId")}: {req.registrationId}</span>
                    </div>
                    <p className="text-sm text-foreground mt-2">{req.description}</p>
                    {req.requestedValue && <p className="text-xs text-muted-foreground mt-1">{t("admin.modRequests.requested")}: {req.requestedValue}</p>}
                    {req.adminNotes && <p className="text-xs text-primary mt-1">{t("admin.modRequests.adminNote")}: {req.adminNotes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(req.createdAt).toLocaleString()}</p>
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2 ml-4">
                      <Dialog open={selectedId === req.id} onOpenChange={open => { if (open) setSelectedId(req.id); else { setSelectedId(null); setAdminNotes(""); } }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm"><Clock className="h-3.5 w-3.5 mr-1" /> {t("admin.modRequests.process")}</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>{t("admin.modRequests.processTitle")}</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                              <p className="font-medium">{typeLabels[req.requestType]}</p>
                              <p className="text-muted-foreground mt-1">{req.description}</p>
                              {req.requestedValue && <p className="text-muted-foreground mt-1">{t("admin.modRequests.requested")}: {req.requestedValue}</p>}
                            </div>
                            <div>
                              <Label>{t("admin.modRequests.adminNote")}</Label>
                              <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder={t("admin.modRequests.notePlaceholder")} rows={3} className="mt-1" />
                            </div>
                            <div className="flex gap-2">
                              <Button className="flex-1" onClick={() => handleAction(req.id, "approved")} disabled={updateMut.isPending}>
                                <CheckCircle className="h-4 w-4 mr-2" /> {t("admin.modRequests.approve")}
                              </Button>
                              <Button variant="destructive" className="flex-1" onClick={() => handleAction(req.id, "rejected")} disabled={updateMut.isPending}>
                                <XCircle className="h-4 w-4 mr-2" /> {t("admin.modRequests.reject")}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
