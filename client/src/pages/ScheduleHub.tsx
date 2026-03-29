import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarDays, Clock, MapPin, ArrowLeft, Bell, ChevronRight,
  AlertTriangle, Filter, Calendar, Users, Sparkles
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { getLoginUrl } from "@/const";

export default function ScheduleHub() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);

  // Fetch all upcoming events
  const { data: upcomingEvents = [], isLoading: eventsLoading } = trpc.schedule.upcoming.useQuery();

  // Fetch meetups for filter
  const { data: meetups = [] } = trpc.meetup.list.useQuery({}, {
    enabled: isAuthenticated,
  });

  const now = Date.now();

  const filteredEvents = useMemo(() => {
    let events = [...upcomingEvents];
    if (selectedMeetupId) {
      events = events.filter((e: any) => e.meetupId === selectedMeetupId);
    }
    return events.sort((a: any, b: any) =>
      new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()
    );
  }, [upcomingEvents, selectedMeetupId]);

  const getTimeUntil = (eventTime: string | Date) => {
    const diff = new Date(eventTime).getTime() - now;
    if (diff < 0) return t("schedule.passed", "종료됨");
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}${t("schedule.days", "일")} ${t("schedule.remaining", "남음")}`;
    }
    if (hours > 0) return `${hours}${t("schedule.hours", "시간")} ${mins}${t("schedule.mins", "분")} ${t("schedule.remaining", "남음")}`;
    return `${mins}${t("schedule.mins", "분")} ${t("schedule.remaining", "남음")}`;
  };

  const getStatusColor = (eventTime: string | Date) => {
    const diff = new Date(eventTime).getTime() - now;
    if (diff < 0) return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    if (diff < 600000) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"; // < 10min
    if (diff < 3600000) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"; // < 1hr
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  };

  const formatTime = (d: string | Date) => {
    const date = new Date(d);
    return date.toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/95">
        <div className="container flex items-center h-14 gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-emerald-500" />
            <h1 className="font-bold text-lg">{t("schedule.hubTitle", "일정표")}</h1>
          </div>
          {isAuthenticated && (
            <div className="ml-auto">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Bell className="h-3.5 w-3.5" />
                {t("schedule.notifications", "알림")}
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="pb-24 md:pb-8">
        {/* Quick Stats */}
        <section className="py-4">
          <div className="container max-w-lg mx-auto px-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white text-center">
                <Calendar className="h-6 w-6 mx-auto mb-1 opacity-80" />
                <div className="text-2xl font-bold">{filteredEvents.length}</div>
                <div className="text-[10px] opacity-80">{t("schedule.upcoming", "예정 일정")}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white text-center">
                <Clock className="h-6 w-6 mx-auto mb-1 opacity-80" />
                <div className="text-2xl font-bold">
                  {filteredEvents.filter((e: any) => new Date(e.eventTime).getTime() - now < 3600000 && new Date(e.eventTime).getTime() > now).length}
                </div>
                <div className="text-[10px] opacity-80">{t("schedule.soonCount", "1시간 이내")}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white text-center">
                <Users className="h-6 w-6 mx-auto mb-1 opacity-80" />
                <div className="text-2xl font-bold">{meetups.length || 0}</div>
                <div className="text-[10px] opacity-80">{t("schedule.meetups", "밋업")}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Meetup Filter */}
        {isAuthenticated && meetups.length > 0 && (
          <section className="py-2">
            <div className="container max-w-lg mx-auto px-4">
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  <Button
                    variant={selectedMeetupId === null ? "default" : "outline"}
                    size="sm"
                    className="rounded-full text-xs whitespace-nowrap"
                    onClick={() => setSelectedMeetupId(null)}
                  >
                    {t("schedule.allMeetups", "전체")}
                  </Button>
                  {meetups.map((m: any) => (
                    <Button
                      key={m.id}
                      variant={selectedMeetupId === m.id ? "default" : "outline"}
                      size="sm"
                      className="rounded-full text-xs whitespace-nowrap"
                      onClick={() => setSelectedMeetupId(m.id)}
                    >
                      {m.title}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </section>
        )}

        {/* Events Timeline */}
        <section className="py-2">
          <div className="container max-w-lg mx-auto px-4">
            {eventsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-muted rounded-xl h-24" />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-16">
                <CalendarDays className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("schedule.noEvents", "예정된 일정이 없습니다")}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {isAuthenticated
                    ? t("schedule.noEventsAuth", "밋업에 참여하면 일정이 여기에 표시됩니다.")
                    : t("schedule.noEventsGuest", "로그인하면 참여 중인 밋업의 일정을 확인할 수 있습니다.")}
                </p>
                {!isAuthenticated && (
                  <a href={getLoginUrl()}>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                      {t("schedule.loginToView", "로그인하여 일정 보기")}
                    </Button>
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((event: any, idx: number) => {
                  const isImminent = new Date(event.eventTime).getTime() - now < 600000 && new Date(event.eventTime).getTime() > now;
                  return (
                    <Card
                      key={event.id || idx}
                      className={`overflow-hidden transition-all hover:shadow-md cursor-pointer ${isImminent ? "ring-2 ring-red-400 animate-pulse" : ""}`}
                      onClick={() => event.meetupId && navigate(`/schedule/${event.meetupId}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Time indicator */}
                          <div className="flex flex-col items-center min-w-[48px]">
                            <div className="text-xs font-bold text-primary">
                              {new Date(event.eventTime).toLocaleString(undefined, { month: "short" })}
                            </div>
                            <div className="text-2xl font-bold leading-none">
                              {new Date(event.eventTime).getDate()}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(event.eventTime).toLocaleString(undefined, { weekday: "short" })}
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="w-px h-16 bg-border/50 self-center" />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm truncate">{event.title}</h4>
                              {isImminent && (
                                <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 animate-bounce">
                                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                  SOON
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span>{formatTime(event.eventTime)}</span>
                              {event.endTime && (
                                <span>~ {new Date(event.endTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                              )}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={`text-[10px] px-2 py-0.5 ${getStatusColor(event.eventTime)}`}>
                              {getTimeUntil(event.eventTime)}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        {isAuthenticated && (
          <section className="py-4">
            <div className="container max-w-lg mx-auto px-4">
              <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{t("schedule.shareSched", "일정 공유")}</div>
                        <div className="text-[10px] text-muted-foreground">{t("schedule.shareSchedDesc", "팀원과 일정 동기화")}</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/community">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{t("schedule.askManager", "매니저 문의")}</div>
                        <div className="text-[10px] text-muted-foreground">{t("schedule.askManagerDesc", "채팅으로 빠른 소통")}</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
