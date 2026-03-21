import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Car, Plus, Wand2, Edit, Trash2, Users, MapPin, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AdminPickups() {
  const { t } = useTranslation();
  const statusLabels: Record<string, string> = { pending: t("admin.pickups.pending"), en_route: t("admin.pickups.enRoute"), waiting: t("admin.pickups.waiting"), picked_up: t("admin.pickups.pickedUp"), completed: t("admin.pickups.completed") };

  const { data: meetups = [] } = trpc.meetup.list.useQuery();
  const [selectedMeetup, setSelectedMeetup] = useState<number | undefined>();
  const { data: pickups = [], refetch } = trpc.pickup.list.useQuery({ meetupId: selectedMeetup });
  const [createOpen, setCreateOpen] = useState(false);

  const createMut = trpc.pickup.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); toast.success(t("admin.pickups.created")); } });
  const updateMut = trpc.pickup.update.useMutation({ onSuccess: () => { refetch(); toast.success(t("admin.pickups.updated")); } });
  const deleteMut = trpc.pickup.delete.useMutation({ onSuccess: () => { refetch(); toast.success(t("admin.pickups.deleted")); } });
  const autoAssignMut = trpc.pickup.autoAssign.useMutation({ onSuccess: (data) => { refetch(); toast.success(t("admin.pickups.autoAssigned", { vehicles: data.vehicleCount, people: data.totalAssigned })); } });

  const [form, setForm] = useState({ vehicleName: "", vehicleCapacity: 4, driverName: "", driverPhone: "", pickupLocation: "", pickupTime: "" });
  const [autoCapacity, setAutoCapacity] = useState(4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Car className="h-6 w-6 text-primary" /> {t("admin.pickups.title")}</h1>
        <div className="flex gap-2">
          <select value={selectedMeetup || ""} onChange={e => setSelectedMeetup(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">{t("admin.pickups.allMeetups")}</option>
            {meetups.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          {selectedMeetup && (
            <Dialog>
              <DialogTrigger asChild><Button variant="outline"><Wand2 className="h-4 w-4 mr-2" /> {t("admin.pickups.autoAssign")}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("admin.pickups.autoAssignTitle")}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t("admin.pickups.autoAssignDesc")}</p>
                  <div><Label>{t("admin.pickups.capacityPerVehicle")}</Label><Input type="number" value={autoCapacity} onChange={e => setAutoCapacity(Number(e.target.value))} min={1} max={20} className="mt-1" /></div>
                  <Button className="w-full" disabled={autoAssignMut.isPending} onClick={() => autoAssignMut.mutate({ meetupId: selectedMeetup!, vehicleCapacity: autoCapacity })}>
                    {autoAssignMut.isPending ? t("admin.pickups.assigning") : t("admin.pickups.runAutoAssign")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> {t("admin.pickups.addVehicle")}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("admin.pickups.registerVehicle")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t("admin.pickups.vehicleName")} *</Label><Input value={form.vehicleName} onChange={e => setForm(p => ({ ...p, vehicleName: e.target.value }))} className="mt-1" /></div>
                  <div><Label>{t("admin.pickups.capacity")}</Label><Input type="number" value={form.vehicleCapacity} onChange={e => setForm(p => ({ ...p, vehicleCapacity: Number(e.target.value) }))} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t("admin.pickups.driverName")}</Label><Input value={form.driverName} onChange={e => setForm(p => ({ ...p, driverName: e.target.value }))} className="mt-1" /></div>
                  <div><Label>{t("admin.pickups.driverPhone")}</Label><Input value={form.driverPhone} onChange={e => setForm(p => ({ ...p, driverPhone: e.target.value }))} className="mt-1" /></div>
                </div>
                <div><Label>{t("admin.pickups.pickupLocation")}</Label><Input value={form.pickupLocation} onChange={e => setForm(p => ({ ...p, pickupLocation: e.target.value }))} className="mt-1" /></div>
                <div><Label>{t("admin.pickups.pickupTime")}</Label><Input type="datetime-local" value={form.pickupTime} onChange={e => setForm(p => ({ ...p, pickupTime: e.target.value }))} className="mt-1" /></div>
                <Button className="w-full" disabled={!form.vehicleName || createMut.isPending} onClick={() => createMut.mutate({
                  ...form, meetupId: selectedMeetup,
                  pickupTime: form.pickupTime ? new Date(form.pickupTime).toISOString() : undefined,
                })}>{createMut.isPending ? t("admin.pickups.registering") : t("admin.pickups.register")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pickups.length === 0 ? (
          <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">{t("admin.pickups.empty")}</CardContent></Card>
        ) : pickups.map((p: any) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Car className="h-4 w-4" /> {p.vehicleName}</span>
                <div className="flex gap-1">
                  <select value={p.status} onChange={e => updateMut.mutate({ id: p.id, status: e.target.value as any })}
                    className="h-7 rounded border border-input bg-background px-2 text-xs">
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteMut.mutate({ id: p.id })}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {p.driverName && <p className="flex items-center gap-1 text-muted-foreground"><Users className="h-3.5 w-3.5" /> {p.driverName} {p.driverPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.driverPhone}</span>}</p>}
              {p.pickupLocation && <p className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {p.pickupLocation}</p>}
              <p className="text-xs text-muted-foreground">{t("admin.pickups.boarding")}: {Array.isArray(p.assignedRegistrationIds) ? (p.assignedRegistrationIds as number[]).length : 0}/{p.vehicleCapacity}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
