import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Car, MapPin, Clock, Users, Phone, Navigation, RefreshCw,
  CheckCircle, ArrowLeft, AlertCircle, ChevronRight
} from "lucide-react";
import { Link } from "wouter";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  en_route: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  waiting: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  picked_up: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function DriverDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // Get all meetups to find pickups
  const meetupsQuery = trpc.meetup.list.useQuery();
  const meetups = meetupsQuery.data || [];

  // We'll query pickups for the first meetup (or all)
  const firstMeetupId = meetups[0]?.id;
  const pickupsQuery = trpc.pickup.list.useQuery(
    { meetupId: firstMeetupId! },
    { enabled: !!firstMeetupId, refetchInterval: 30000 }
  );

  const pickups = pickupsQuery.data || [];

  const todayPickups = useMemo(() => {
    const today = new Date().toDateString();
    return pickups.filter((p: any) => {
      if (!p.pickupTime) return true; // show all if no time set
      return new Date(p.pickupTime).toDateString() === today;
    });
  }, [pickups]);

  const pendingCount = todayPickups.filter((p: any) => p.status === "pending" || p.status === "en_route" || p.status === "waiting").length;
  const completedCount = todayPickups.filter((p: any) => p.status === "completed" || p.status === "picked_up").length;
  const totalPassengers = todayPickups.reduce((sum: number, p: any) => {
    const ids = p.assignedRegistrationIds as number[] | null;
    return sum + (ids?.length || 0);
  }, 0);

  function handleRefresh() {
    pickupsQuery.refetch();
    meetupsQuery.refetch();
    setRefreshKey((k) => k + 1);
    toast.success(t("driverDashboard.refreshData"));
  }

  function openMap(location: string) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, "_blank");
  }

  function callPhone(phone: string) {
    window.open(`tel:${phone}`);
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-2xl py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                {t("driverDashboard.title")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("driverDashboard.subtitle")}</p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{todayPickups.length}</div>
              <div className="text-xs text-muted-foreground">{t("driverDashboard.todaySchedule")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-xs text-muted-foreground">{t("driverDashboard.completedTrips")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{totalPassengers}</div>
              <div className="text-xs text-muted-foreground">{t("driverDashboard.totalPassengers")}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Pickups Alert */}
        {pendingCount > 0 && (
          <Card className="mb-4 border-orange-300 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                {pendingCount}건의 픽업이 대기중입니다
              </span>
            </CardContent>
          </Card>
        )}

        {/* Pickup List */}
        <h2 className="font-semibold text-lg mb-3">{t("driverDashboard.todaySchedule")}</h2>
        {todayPickups.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{t("driverDashboard.noTripsToday")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayPickups
              .sort((a: any, b: any) => {
                if (!a.pickupTime) return 1;
                if (!b.pickupTime) return -1;
                return new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime();
              })
              .map((pickup: any) => {
                const passengers = pickup.assignedRegistrationIds as number[] | null;
                const isActive = pickup.status === "en_route" || pickup.status === "waiting";
                return (
                  <Card key={pickup.id} className={`transition-all ${isActive ? "border-primary shadow-md" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={statusColors[pickup.status] || ""}>
                            {t(`driverDashboard.${pickup.status === "en_route" ? "enRoute" : pickup.status === "picked_up" ? "pickedUp" : pickup.status}`)}
                          </Badge>
                          <span className="text-sm font-medium">{pickup.vehicleName}</span>
                        </div>
                        {pickup.pickupTime && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(pickup.pickupTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>

                      {/* Location */}
                      {pickup.pickupLocation && (
                        <div className="flex items-center gap-2 mb-2 text-sm">
                          <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                          <span className="flex-1">{pickup.pickupLocation}</span>
                          <Button variant="outline" size="sm" className="h-7 text-xs"
                            onClick={() => openMap(pickup.pickupLocation)}>
                            <Navigation className="h-3 w-3 mr-1" /> {t("driverDashboard.openMap")}
                          </Button>
                        </div>
                      )}

                      {/* Passengers */}
                      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{passengers?.length || 0} {t("driverDashboard.passengers")}</span>
                        {pickup.vehicleCapacity && (
                          <span className="text-xs">/ {pickup.vehicleCapacity} {t("driverDashboard.vehicleInfo")}</span>
                        )}
                      </div>

                      {/* Driver Phone */}
                      {pickup.driverPhone && (
                        <div className="flex items-center gap-2 mb-3 text-sm">
                          <Phone className="h-3.5 w-3.5 text-green-600" />
                          <span>{pickup.driverPhone}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {pickup.notes && (
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mb-3">{pickup.notes}</p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {pickup.status === "pending" && (
                          <Button size="sm" className="flex-1">
                            <Car className="h-3.5 w-3.5 mr-1" /> {t("driverDashboard.startTrip")}
                          </Button>
                        )}
                        {(pickup.status === "en_route" || pickup.status === "waiting" || pickup.status === "picked_up") && (
                          <Button size="sm" variant="default" className="flex-1 bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> {t("driverDashboard.completeTrip")}
                          </Button>
                        )}
                        {pickup.pickupLocation && (
                          <Button size="sm" variant="outline" onClick={() => openMap(pickup.pickupLocation)}>
                            <Navigation className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
