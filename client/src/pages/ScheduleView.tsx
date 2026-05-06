import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Clock, Bell, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslateButton } from "@/components/TranslateButton";

export default function ScheduleView() {
  const { t } = useTranslation();
  const { meetupId } = useParams<{ meetupId: string }>();
  const mid = Number(meetupId);
  const { data: meetup } = trpc.meetup.getById.useQuery({ id: mid }, { enabled: !!mid });
  const { data: events = [] } = trpc.schedule.list.useQuery(
    { meetupId: mid },
    { enabled: !!mid, refetchInterval: 5000 }
  );

  const checkNotify = trpc.schedule.checkAndNotify.useMutation();
  const [lastNotifyCheck, setLastNotifyCheck] = useState<Date | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      checkNotify.mutate(undefined, {
        onSuccess: (result) => {
          setLastNotifyCheck(new Date());
        },
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const now = Date.now();
  const upcomingEvents = events
    .filter((e: any) => new Date(e.eventTime).getTime() > now)
    .sort((a: any, b: any) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
  const nextEvent = upcomingEvents[0];
  const nextEventMinutes = nextEvent
    ? Math.floor((new Date(nextEvent.eventTime).getTime() - now) / 60000)
    : null;

  if (!meetup) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{meetup.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {meetup.scheduleStart && new Date(meetup.scheduleStart).toLocaleDateString()}
              {meetup.scheduleEnd && ` ~ ${new Date(meetup.scheduleEnd).toLocaleDateString()}`}
              {meetup.location && ` | ${meetup.location}`}
            </p>
          </div>
          <Badge variant="outline" className="ml-auto text-xs">{t("schedule.autoRefresh")}</Badge>
        </div>
      </header>

      <main className="container py-6 max-w-3xl mx-auto space-y-4">
        {nextEvent && nextEventMinutes !== null && nextEventMinutes <= 15 && (
          <div className={`p-4 rounded-lg border-2 ${
            nextEventMinutes <= 5 ? "border-red-500 bg-red-500/10" :
            nextEventMinutes <= 10 ? "border-yellow-500 bg-yellow-500/10" :
            "border-blue-500 bg-blue-500/10"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                nextEventMinutes <= 5 ? "bg-red-500/20" :
                nextEventMinutes <= 10 ? "bg-yellow-500/20" :
                "bg-blue-500/20"
              }`}>
                {nextEventMinutes <= 5 ? (
                  <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                ) : (
                  <Bell className="h-5 w-5 text-yellow-500" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm">
                  {nextEventMinutes <= 0 ? t("schedule.startingNow") :
                   nextEventMinutes <= 5 ? t("schedule.startingIn", { min: nextEventMinutes }) :
                   t("schedule.nextIn", { min: nextEventMinutes })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {nextEvent.title} {nextEvent.location ? `| ${nextEvent.location}` : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" /> {t("schedule.scheduleTitle")}
        </h2>

        {events.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">{t("schedule.empty")}</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {events.map((event: any, idx: number) => {
              const eventTime = new Date(event.eventTime);
              const minutesUntil = Math.floor((eventTime.getTime() - now) / 60000);
              const isPast = eventTime.getTime() < now;
              const isUpcoming = minutesUntil > 0 && minutesUntil <= 10;
              const isSoon = minutesUntil > 0 && minutesUntil <= 5;
              const isNow = minutesUntil <= 0 && minutesUntil > -30;

              return (
                <Card key={event.id} className={`transition-all ${
                  isSoon ? "ring-2 ring-red-500 bg-red-500/5" :
                  isUpcoming ? "ring-2 ring-yellow-500 bg-yellow-500/5" :
                  isNow ? "ring-1 ring-green-500 bg-green-500/5" :
                  isPast ? "opacity-60" : ""
                }`}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                        isNow ? "bg-green-500/20 text-green-500" :
                        isSoon ? "bg-red-500/20 text-red-500 animate-pulse" :
                        isUpcoming ? "bg-yellow-500/20 text-yellow-500" :
                        isPast ? "bg-muted text-muted-foreground" :
                        "bg-primary/10 text-primary"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{event.title}</h3>
                          {isNow && <Badge className="bg-green-500 text-white text-xs">{t("schedule.inProgress")}</Badge>}
                          {isSoon && <Badge className="bg-red-500 text-white text-xs animate-pulse">{t("schedule.minAfter", { min: minutesUntil })}</Badge>}
                          {isUpcoming && !isSoon && <Badge variant="outline" className="text-yellow-500 border-yellow-500 text-xs">{t("schedule.minAfter", { min: minutesUntil })}</Badge>}
                          {isPast && !isNow && <Badge variant="outline" className="text-muted-foreground text-xs">{t("schedule.done")}</Badge>}
                          {event.notified && <Bell className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {eventTime.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {event.endTime && (
                            <span className="text-xs">
                              ~ {new Date(event.endTime).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {event.location}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <div>
                            <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                            <TranslateButton text={event.description} variant="icon" className="mt-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-2">
              <Link href="/flight-pickup">
                <Button variant="outline" size="sm">{t("schedule.flightPickupGuide")}</Button>
              </Link>
              <Link href="/lookup">
                <Button variant="outline" size="sm">{t("schedule.itineraryLookup")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
