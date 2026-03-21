import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plane, Plus, AlertTriangle, Edit, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const statusColors: Record<string, string> = {
  scheduled: "secondary", boarding: "default", departed: "default", in_air: "default", landed: "default", delayed: "destructive", cancelled: "destructive",
};

export default function AdminFlights() {
  const { t } = useTranslation();
  const statusLabels: Record<string, string> = {
    scheduled: t("admin.flights.scheduled"), boarding: t("admin.flights.boarding"), departed: t("admin.flights.departed"),
    in_air: t("admin.flights.inAir"), landed: t("admin.flights.landed"), delayed: t("admin.flights.delayed"), cancelled: t("admin.flights.cancelled"),
  };

  const [meetupFilter] = useState<number | undefined>();
  const { data: flights = [], refetch } = trpc.flight.list.useQuery({ meetupId: meetupFilter });
  const { data: delayed = [] } = trpc.flight.delayed.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const createMut = trpc.flight.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); toast.success(t("admin.flights.created")); } });
  const updateMut = trpc.flight.update.useMutation({ onSuccess: () => { refetch(); setEditId(null); toast.success(t("admin.flights.updated")); } });
  const deleteMut = trpc.flight.delete.useMutation({ onSuccess: () => { refetch(); toast.success(t("admin.flights.deleted")); } });

  const [form, setForm] = useState({ flightNo: "", airline: "", departureAirport: "", arrivalAirport: "", scheduledDeparture: "", scheduledArrival: "", direction: "outbound" as "outbound" | "return", registrationId: "", meetupId: "" });
  const [editForm, setEditForm] = useState({ flightStatus: "scheduled", delayMinutes: 0, actualDeparture: "", actualArrival: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Plane className="h-6 w-6 text-primary" /> {t("admin.flights.title")}</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> {t("admin.flights.addFlight")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("admin.flights.registerFlight")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("admin.flights.flightNo")} *</Label><Input value={form.flightNo} onChange={e => setForm(p => ({ ...p, flightNo: e.target.value }))} placeholder="KE651" className="mt-1" /></div>
                <div><Label>{t("admin.flights.airline")}</Label><Input value={form.airline} onChange={e => setForm(p => ({ ...p, airline: e.target.value }))} className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("admin.flights.departureAirport")}</Label><Input value={form.departureAirport} onChange={e => setForm(p => ({ ...p, departureAirport: e.target.value }))} placeholder="ICN" className="mt-1" /></div>
                <div><Label>{t("admin.flights.arrivalAirport")}</Label><Input value={form.arrivalAirport} onChange={e => setForm(p => ({ ...p, arrivalAirport: e.target.value }))} placeholder="BKK" className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("admin.flights.departureTime")}</Label><Input type="datetime-local" value={form.scheduledDeparture} onChange={e => setForm(p => ({ ...p, scheduledDeparture: e.target.value }))} className="mt-1" /></div>
                <div><Label>{t("admin.flights.arrivalTime")}</Label><Input type="datetime-local" value={form.scheduledArrival} onChange={e => setForm(p => ({ ...p, scheduledArrival: e.target.value }))} className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("admin.flights.direction")}</Label>
                  <select value={form.direction} onChange={e => setForm(p => ({ ...p, direction: e.target.value as any }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="outbound">{t("admin.flights.outbound")}</option><option value="return">{t("admin.flights.return")}</option>
                  </select>
                </div>
                <div><Label>{t("admin.flights.regId")}</Label><Input value={form.registrationId} onChange={e => setForm(p => ({ ...p, registrationId: e.target.value }))} className="mt-1" /></div>
              </div>
              <Button className="w-full" disabled={!form.flightNo || createMut.isPending} onClick={() => createMut.mutate({
                ...form, registrationId: form.registrationId ? Number(form.registrationId) : undefined,
                meetupId: form.meetupId ? Number(form.meetupId) : undefined,
                scheduledDeparture: form.scheduledDeparture ? new Date(form.scheduledDeparture).toISOString() : undefined,
                scheduledArrival: form.scheduledArrival ? new Date(form.scheduledArrival).toISOString() : undefined,
              })}>{createMut.isPending ? "..." : t("admin.flights.register")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {delayed.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-500 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {t("admin.flights.delayedFlights")} ({delayed.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {delayed.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{f.flightNo} ({f.departureAirport} → {f.arrivalAirport})</span>
                  <Badge variant="destructive" className="text-xs">{t("admin.flights.delayMin", { min: f.delayMinutes })}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {flights.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">{t("admin.flights.empty")}</CardContent></Card>
        ) : flights.map((f: any) => (
          <Card key={f.id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{f.flightNo}</span>
                    {f.airline && <span className="text-sm text-muted-foreground">({f.airline})</span>}
                    <Badge variant={statusColors[f.flightStatus] as any} className="text-xs">{statusLabels[f.flightStatus]}</Badge>
                    <Badge variant="outline" className="text-xs">{f.direction === "outbound" ? t("admin.flights.outbound") : t("admin.flights.return")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{f.departureAirport} → {f.arrivalAirport}</p>
                  {f.scheduledDeparture && <p className="text-xs text-muted-foreground">{t("admin.flights.scheduledLabel")}: {new Date(f.scheduledDeparture).toLocaleString()}</p>}
                  {(f.delayMinutes ?? 0) > 0 && <p className="text-xs text-yellow-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {t("admin.flights.delayMin", { min: f.delayMinutes })}</p>}
                </div>
                <div className="flex gap-2">
                  <Dialog open={editId === f.id} onOpenChange={open => { if (open) { setEditId(f.id); setEditForm({ flightStatus: f.flightStatus, delayMinutes: f.delayMinutes || 0, actualDeparture: "", actualArrival: "" }); } else setEditId(null); }}>
                    <DialogTrigger asChild><Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{t("admin.flights.updateStatus")}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>{t("admin.flights.status")}</Label>
                          <select value={editForm.flightStatus} onChange={e => setEditForm(p => ({ ...p, flightStatus: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div><Label>{t("admin.flights.delayMinutes")}</Label><Input type="number" value={editForm.delayMinutes} onChange={e => setEditForm(p => ({ ...p, delayMinutes: Number(e.target.value) }))} className="mt-1" /></div>
                        <div><Label>{t("admin.flights.actualDeparture")}</Label><Input type="datetime-local" value={editForm.actualDeparture} onChange={e => setEditForm(p => ({ ...p, actualDeparture: e.target.value }))} className="mt-1" /></div>
                        <div><Label>{t("admin.flights.actualArrival")}</Label><Input type="datetime-local" value={editForm.actualArrival} onChange={e => setEditForm(p => ({ ...p, actualArrival: e.target.value }))} className="mt-1" /></div>
                        <Button className="w-full" disabled={updateMut.isPending} onClick={() => updateMut.mutate({
                          id: f.id, flightStatus: editForm.flightStatus as any, delayMinutes: editForm.delayMinutes,
                          actualDeparture: editForm.actualDeparture ? new Date(editForm.actualDeparture).toISOString() : undefined,
                          actualArrival: editForm.actualArrival ? new Date(editForm.actualArrival).toISOString() : undefined,
                        })}>{t("admin.flights.update")}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" onClick={() => deleteMut.mutate({ id: f.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
