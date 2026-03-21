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
import { CalendarDays, Plus, Edit, Trash2, Bell, MapPin, Clock, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AdminScheduleEvents() {
  const { t } = useTranslation();
  const { data: meetups = [] } = trpc.meetup.list.useQuery();
  const [selectedMeetup, setSelectedMeetup] = useState<number | undefined>();
  const { data: events = [], refetch } = trpc.schedule.list.useQuery({ meetupId: selectedMeetup! }, { enabled: !!selectedMeetup });
  const [createOpen, setCreateOpen] = useState(false);

  const createMut = trpc.schedule.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); toast.success(t("admin.scheduleEvents.created")); } });
  const updateMut = trpc.schedule.update.useMutation({ onSuccess: () => { refetch(); toast.success(t("admin.scheduleEvents.updated")); } });
  const deleteMut = trpc.schedule.delete.useMutation({ onSuccess: () => { refetch(); toast.success(t("admin.scheduleEvents.deleted")); } });
  const notifyMut = trpc.schedule.triggerNotifications.useMutation({ onSuccess: () => toast.success(t("admin.scheduleEvents.notifSent")), onError: () => toast.error(t("admin.scheduleEvents.notifFail")) });

  const [form, setForm] = useState({ title: "", description: "", location: "", eventTime: "", eventType: "meetup" as string, notifyBefore: 10 });

  const eventTypeLabels: Record<string, string> = {
    meetup: t("admin.scheduleEvents.typeMeetup"), transfer: t("admin.scheduleEvents.typeTransfer"),
    meal: t("admin.scheduleEvents.typeMeal"), meeting: t("admin.scheduleEvents.typeMeeting"),
    free_time: t("admin.scheduleEvents.typeFreeTime"), departure: t("admin.scheduleEvents.typeDeparture"),
    arrival: t("admin.scheduleEvents.typeArrival"), other: t("admin.scheduleEvents.typeOther"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" /> {t("admin.scheduleEvents.title")}</h1>
        <div className="flex gap-2">
          <select value={selectedMeetup || ""} onChange={e => setSelectedMeetup(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">{t("admin.scheduleEvents.selectMeetup")}</option>
            {meetups.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          {selectedMeetup && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> {t("admin.scheduleEvents.addEvent")}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("admin.scheduleEvents.createTitle")}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>{t("admin.scheduleEvents.eventTitle")} *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>{t("admin.scheduleEvents.eventType")}</Label>
                      <select value={form.eventType} onChange={e => setForm(p => ({ ...p, eventType: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                        {Object.entries(eventTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div><Label>{t("admin.scheduleEvents.time")} *</Label><Input type="datetime-local" value={form.eventTime} onChange={e => setForm(p => ({ ...p, eventTime: e.target.value }))} className="mt-1" /></div>
                  </div>
                  <div><Label>{t("admin.scheduleEvents.location")}</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="mt-1" /></div>
                  <div><Label>{t("admin.scheduleEvents.description")}</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1" /></div>
                  <div><Label>{t("admin.scheduleEvents.notifyBefore")}</Label><Input type="number" value={form.notifyBefore} onChange={e => setForm(p => ({ ...p, notifyBefore: Number(e.target.value) }))} className="mt-1" /></div>
                  <Button className="w-full" disabled={!form.title || !form.eventTime || createMut.isPending} onClick={() => createMut.mutate({
                    ...form, meetupId: selectedMeetup!, eventTime: new Date(form.eventTime).toISOString(),
                  })}>{createMut.isPending ? "..." : t("admin.scheduleEvents.register")}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!selectedMeetup ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">{t("admin.scheduleEvents.selectMeetup")}</CardContent></Card>
      ) : events.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">{t("admin.scheduleEvents.empty")}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {events.map((event: any, idx: number) => {
            const eventTime = new Date(event.eventTime);
            const isUpcoming = eventTime.getTime() - Date.now() < (event.notifyBefore || 10) * 60 * 1000 && eventTime.getTime() > Date.now();
            return (
              <Card key={event.id} className={isUpcoming ? "ring-2 ring-yellow-500/50" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{idx + 1}</div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{event.title}</h3>
                          <Badge variant="outline" className="text-xs">{eventTypeLabels[event.eventType] || event.eventType}</Badge>
                          {isUpcoming && <Badge variant="secondary" className="text-xs text-yellow-500"><Bell className="h-3 w-3 mr-1" />{t("admin.scheduleEvents.starting")}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{eventTime.toLocaleString()}</span>
                          {event.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
                        </div>
                        {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => notifyMut.mutate()}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => deleteMut.mutate({ id: event.id })}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
