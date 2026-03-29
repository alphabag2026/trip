import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Calendar, ChevronLeft, ChevronRight, Plus, MapPin, Clock, Users,
  Edit, Trash2, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

type ViewMode = "month" | "week" | "list";

export default function TeamSchedule() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formEventTime, setFormEventTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");

  const meetupsQuery = trpc.meetup.list.useQuery();
  const schedulesQuery = trpc.teamSchedule.list.useQuery(
    { meetupId: selectedMeetupId! },
    { enabled: !!selectedMeetupId }
  );

  const createMutation = trpc.teamSchedule.create.useMutation({
    onSuccess: () => {
      toast.success(t("teamSchedule.created"));
      schedulesQuery.refetch();
      resetForm();
      setShowCreateDialog(false);
    },
  });

  const updateMutation = trpc.teamSchedule.update.useMutation({
    onSuccess: () => {
      toast.success(t("teamSchedule.updated"));
      schedulesQuery.refetch();
      resetForm();
      setEditingEvent(null);
    },
  });

  const deleteMutation = trpc.teamSchedule.delete.useMutation({
    onSuccess: () => {
      toast.success(t("teamSchedule.deleted"));
      schedulesQuery.refetch();
    },
  });

  function resetForm() {
    setFormTitle("");
    setFormDescription("");
    setFormLocation("");
    setFormEventTime("");
    setFormEndTime("");
  }

  function handleCreate() {
    if (!selectedMeetupId || !formTitle || !formEventTime) return;
    createMutation.mutate({
      meetupId: selectedMeetupId,
      title: formTitle,
      description: formDescription || undefined,
      location: formLocation || undefined,
      eventTime: formEventTime,
      endTime: formEndTime || undefined,
    });
  }

  function handleUpdate() {
    if (!editingEvent) return;
    updateMutation.mutate({
      id: editingEvent.id,
      title: formTitle || undefined,
      description: formDescription || undefined,
      location: formLocation || undefined,
      eventTime: formEventTime || undefined,
      endTime: formEndTime || undefined,
    });
  }

  function startEdit(event: any) {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description || "");
    setFormLocation(event.location || "");
    setFormEventTime(new Date(event.eventTime).toISOString().slice(0, 16));
    setFormEndTime(event.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : "");
  }

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const schedules = schedulesQuery.data || [];

  const eventsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    schedules.forEach((s: any) => {
      const d = new Date(s.eventTime);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [schedules]);

  function getEventsForDay(day: number) {
    return eventsByDay[`${year}-${month}-${day}`] || [];
  }

  const todayEvents = useMemo(() => {
    const now = new Date();
    return schedules.filter((s: any) => {
      const d = new Date(s.eventTime);
      return d.toDateString() === now.toDateString();
    });
  }, [schedules]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return schedules
      .filter((s: any) => new Date(s.eventTime) > now)
      .sort((a: any, b: any) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime())
      .slice(0, 5);
  }, [schedules]);

  const dayNames = [
    t("teamSchedule.sun"), t("teamSchedule.mon"), t("teamSchedule.tue"),
    t("teamSchedule.wed"), t("teamSchedule.thu"), t("teamSchedule.fri"), t("teamSchedule.sat")
  ];

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const isToday = (day: number) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
  };

  // Meetup selection
  if (!selectedMeetupId) {
    const meetups = meetupsQuery.data || [];
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl py-8">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{t("teamSchedule.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("teamSchedule.selectMeetup")}</p>
            </div>
          </div>
          <div className="grid gap-3">
            {meetups.map((m: any) => (
              <Card key={m.id} className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedMeetupId(m.id)}>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{m.title}</h3>
                  <p className="text-sm text-muted-foreground">{m.location}</p>
                </CardContent>
              </Card>
            ))}
            {meetups.length === 0 && (
              <p className="text-center text-muted-foreground py-12">{t("teamSchedule.noEvents")}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-4xl py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedMeetupId(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {t("teamSchedule.title")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("teamSchedule.subtitle")}</p>
            </div>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-1" /> {t("teamSchedule.newEvent")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("teamSchedule.newEvent")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder={t("teamSchedule.eventTitle")} value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)} />
                <Input placeholder={t("teamSchedule.eventLocation")} value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{t("teamSchedule.eventTime")}</label>
                    <Input type="datetime-local" value={formEventTime}
                      onChange={(e) => setFormEventTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t("teamSchedule.endTime")}</label>
                    <Input type="datetime-local" value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)} />
                  </div>
                </div>
                <Textarea placeholder={t("teamSchedule.description")} value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)} rows={3} />
                <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                  {t("teamSchedule.save")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1 w-fit">
          {(["month", "week", "list"] as ViewMode[]).map((mode) => (
            <Button key={mode} variant={viewMode === mode ? "default" : "ghost"} size="sm"
              onClick={() => setViewMode(mode)}>
              {t(`teamSchedule.${mode === "month" ? "month" : mode === "week" ? "week" : "list"}`)}
            </Button>
          ))}
        </div>

        {/* Today's Events Summary */}
        {todayEvents.length > 0 && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm text-primary mb-2">
                {t("teamSchedule.today")} ({todayEvents.length})
              </h3>
              <div className="space-y-2">
                {todayEvents.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-3 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{new Date(e.eventTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="font-medium">{e.title}</span>
                    {e.location && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{e.location}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar View */}
        {viewMode === "month" && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon"
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">
                  {monthNames[month]} {year}
                </CardTitle>
                <Button variant="ghost" size="icon"
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {dayNames.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {calendarDays.map((day, i) => {
                  const events = day ? getEventsForDay(day) : [];
                  const today = day ? isToday(day) : false;
                  return (
                    <div key={i}
                      className={`min-h-[80px] p-1 bg-background cursor-pointer hover:bg-muted/50 transition-colors
                        ${!day ? "bg-muted/20" : ""} ${today ? "ring-2 ring-primary ring-inset" : ""}
                        ${selectedDay && day && selectedDay.getDate() === day && selectedDay.getMonth() === month ? "bg-primary/10" : ""}`}
                      onClick={() => day && setSelectedDay(new Date(year, month, day))}>
                      {day && (
                        <>
                          <div className={`text-xs font-medium mb-1 ${today ? "text-primary font-bold" : "text-foreground"}`}>
                            {day}
                          </div>
                          {events.slice(0, 2).map((e: any) => (
                            <div key={e.id}
                              className="text-[10px] leading-tight bg-primary/15 text-primary rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer"
                              onClick={(ev) => { ev.stopPropagation(); startEdit(e); }}>
                              {new Date(e.eventTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {e.title}
                            </div>
                          ))}
                          {events.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">+{events.length - 2}</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Week View */}
        {viewMode === "week" && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon"
                  onClick={() => setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">
                  {t("teamSchedule.week")}
                </CardTitle>
                <Button variant="ghost" size="icon"
                  onClick={() => setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const startOfWeek = new Date(currentDate);
                  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + i);
                  const dayEvents = schedules.filter((s: any) => {
                    const d = new Date(s.eventTime);
                    return d.toDateString() === startOfWeek.toDateString();
                  });
                  const today = startOfWeek.toDateString() === new Date().toDateString();
                  return (
                    <div key={i} className={`flex gap-3 p-3 rounded-lg ${today ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`}>
                      <div className="w-16 text-center flex-shrink-0">
                        <div className="text-xs text-muted-foreground">{dayNames[i]}</div>
                        <div className={`text-lg font-bold ${today ? "text-primary" : ""}`}>{startOfWeek.getDate()}</div>
                      </div>
                      <div className="flex-1 space-y-1">
                        {dayEvents.length === 0 && (
                          <p className="text-xs text-muted-foreground">{t("teamSchedule.noEventsToday")}</p>
                        )}
                        {dayEvents.map((e: any) => (
                          <div key={e.id} className="flex items-center gap-2 text-sm bg-background rounded p-2 cursor-pointer hover:bg-muted/50"
                            onClick={() => startEdit(e)}>
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(e.eventTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="font-medium text-sm">{e.title}</span>
                            {e.location && <Badge variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{e.location}</Badge>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="space-y-3">
            {upcomingEvents.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{t("teamSchedule.noEvents")}</p>
                </CardContent>
              </Card>
            )}
            {schedules
              .sort((a: any, b: any) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime())
              .map((e: any) => {
                const eventDate = new Date(e.eventTime);
                const isPast = eventDate < new Date();
                return (
                  <Card key={e.id} className={isPast ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{e.title}</h3>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {eventDate.toLocaleDateString()} {eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {e.endTime && ` ~ ${new Date(e.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                            </span>
                            {e.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />{e.location}
                              </span>
                            )}
                            {e.memberIds && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />{(e.memberIds as number[]).length} {t("teamSchedule.members")}
                              </span>
                            )}
                          </div>
                          {e.description && <p className="text-sm text-muted-foreground mt-2">{e.description}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(e)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            onClick={() => deleteMutation.mutate({ id: e.id })}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}

        {/* Selected Day Detail */}
        {selectedDay && viewMode === "month" && (
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedDay.toLocaleDateString()} {t("teamSchedule.list")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getEventsForDay(selectedDay.getDate()).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("teamSchedule.noEventsToday")}</p>
              ) : (
                <div className="space-y-2">
                  {getEventsForDay(selectedDay.getDate()).map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <div className="font-medium">{e.title}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {new Date(e.eventTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {e.location && <><MapPin className="h-3 w-3 ml-2" />{e.location}</>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(e)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("teamSchedule.editEvent")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder={t("teamSchedule.eventTitle")} value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)} />
              <Input placeholder={t("teamSchedule.eventLocation")} value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">{t("teamSchedule.eventTime")}</label>
                  <Input type="datetime-local" value={formEventTime}
                    onChange={(e) => setFormEventTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t("teamSchedule.endTime")}</label>
                  <Input type="datetime-local" value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)} />
                </div>
              </div>
              <Textarea placeholder={t("teamSchedule.description")} value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)} rows={3} />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {t("teamSchedule.save")}
                </Button>
                <Button variant="destructive" onClick={() => {
                  deleteMutation.mutate({ id: editingEvent.id });
                  setEditingEvent(null);
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
