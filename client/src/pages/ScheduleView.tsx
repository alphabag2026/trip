import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, MapPin, Clock, Plane, AlertTriangle } from "lucide-react";

export default function ScheduleView() {
  const { meetupId } = useParams<{ meetupId: string }>();
  const mid = Number(meetupId);
  const { data: meetup } = trpc.meetup.getById.useQuery({ id: mid }, { enabled: !!mid });
  const { data: events = [] } = trpc.schedule.list.useQuery({ meetupId: mid }, { enabled: !!mid });

  if (!meetup) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">로딩 중...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <h1 className="text-xl font-bold text-foreground">{meetup.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meetup.scheduleStart && new Date(meetup.scheduleStart).toLocaleDateString("ko-KR")}
            {meetup.scheduleEnd && ` ~ ${new Date(meetup.scheduleEnd).toLocaleDateString("ko-KR")}`}
            {meetup.location && ` | ${meetup.location}`}
          </p>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" /> 일정표
        </h2>

        {events.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">등록된 일정이 없습니다.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {events.map((event, idx) => {
              const eventTime = new Date(event.eventTime);
              const isUpcoming = eventTime.getTime() - Date.now() < 10 * 60 * 1000 && eventTime.getTime() > Date.now();
              return (
                <Card key={event.id} className={`transition-all ${isUpcoming ? "ring-2 ring-yellow-500 bg-yellow-500/5" : ""}`}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{event.title}</h3>
                          {isUpcoming && <Badge variant="outline" className="text-yellow-500 border-yellow-500 text-xs">곧 시작</Badge>}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {eventTime.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {event.location}
                            </span>
                          )}
                        </div>
                        {event.description && <p className="text-sm text-muted-foreground mt-2">{event.description}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
