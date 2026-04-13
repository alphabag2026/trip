import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  History, Loader2, MapPin, Calendar, ExternalLink, Download,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

function TripCalendarButtons({ meetupId }: { meetupId: number }) {
  const { t } = useTranslation();
  const { data, isLoading } = trpc.calendar.generateIcs.useQuery(
    { meetupId },
    { enabled: !!meetupId }
  );

  const handleDownloadIcs = () => {
    if (!data?.ics) return;
    const blob = new Blob([data.ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meetup-${meetupId}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("myPage.icsDownloaded", "캘린더 파일이 다운로드되었습니다"));
  };

  const handleGoogleCalendar = () => {
    if (!data?.gcalUrl) return;
    window.open(data.gcalUrl, "_blank");
  };

  if (isLoading || !data) return null;

  return (
    <div className="flex items-center gap-1 mt-2">
      <Calendar className="w-3 h-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground mr-1">{t("myPage.addToCalendar", "캘린더:")}</span>
      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-1.5" onClick={handleGoogleCalendar}>
        <ExternalLink className="w-3 h-3" /> Google
      </Button>
      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-1.5" onClick={handleDownloadIcs}>
        <Download className="w-3 h-3" /> .ics
      </Button>
    </div>
  );
}

export default function TripsTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const tripQuery = trpc.tripHistory.list.useQuery(undefined, { enabled: !!user });
  const trips = tripQuery.data || [];

  return (
    <div className="space-y-4">
      {tripQuery.isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : !trips.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t("myPage.noTrips")}</CardContent></Card>
      ) : trips.map((trip: any) => (
        <Card key={trip.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4" />
                {trip.meetupTitle || t("myPage.trip")}
              </CardTitle>
              <Badge variant={trip.status === "completed" ? "default" : "secondary"}>{trip.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {trip.destination && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{trip.destination}</span>
              </div>
            )}
            {(trip.startDate || trip.endDate) && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{trip.startDate || ""} ~ {trip.endDate || ""}</span>
              </div>
            )}
            {trip.meetupId && <TripCalendarButtons meetupId={trip.meetupId} />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
