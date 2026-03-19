import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plane, ArrowLeft, Search, Calendar, MapPin, Hotel, Clock, AlertTriangle, Edit, Car, Send } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";

export default function Lookup() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);

  const { data: regs, isLoading, refetch } = trpc.registration.lookup.useQuery(
    { name, phone }, { enabled: false }
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setSearched(true);
    refetch();
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <Plane className="h-5 w-5 text-primary" />
            <span className="font-semibold">{t("lookup.title")}</span>
          </Link>
          <LanguageSelector />
        </div>
      </header>

      <div className="container max-w-2xl py-8">
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> {t("lookup.verify")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Label htmlFor="lookup-name">{t("lookup.name")}</Label>
                <Input id="lookup-name" value={name} onChange={e => setName(e.target.value)} placeholder={t("lookup.namePh")} required />
              </div>
              <div>
                <Label htmlFor="lookup-phone">{t("lookup.phone")}</Label>
                <Input id="lookup-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("lookup.phonePh")} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("lookup.searching") : t("lookup.search")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {searched && regs && regs.length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>{t("lookup.noResult")}</p>
              <p className="text-sm mt-2">{t("lookup.noResultHint")}</p>
            </CardContent>
          </Card>
        )}

        {regs && regs.length > 0 && (
          <div className="space-y-4">
            {regs.map(reg => (
              <RegistrationCard key={reg.id} reg={reg} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RegistrationCard({ reg }: { reg: any }) {
  const { t } = useTranslation();
  const { data: itineraryList } = trpc.itinerary.getByRegistration.useQuery({ registrationId: reg.id });
  const { data: flights = [] } = trpc.flight.getByRegistration.useQuery({ registrationId: reg.id });
  const { data: modRequests = [] } = trpc.modRequest.list.useQuery({ registrationId: reg.id });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            {reg.name} - {reg.locationType === "overseas" ? t("lookup.overseas") : t("lookup.domestic")}
          </span>
          <Badge variant={reg.status === "approved" ? "default" : reg.status === "pending" ? "secondary" : "destructive"}>
            {reg.status === "approved" ? t("lookup.approved") : reg.status === "pending" ? t("lookup.pending") : reg.status === "rejected" ? t("lookup.rejected") : t("lookup.completed")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">{t("lookup.phone")}:</span> {reg.phone}</div>
          <div><span className="text-muted-foreground">{t("lookup.messenger")}:</span> {reg.messengerId}</div>
          {reg.scheduleStart && (
            <div className="flex items-center gap-1 col-span-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{new Date(reg.scheduleStart).toLocaleDateString()}</span>
              {reg.scheduleEnd && <span>~ {new Date(reg.scheduleEnd).toLocaleDateString()}</span>}
            </div>
          )}
          {reg.teamName && <div><span className="text-muted-foreground">{t("lookup.team")}:</span> {reg.teamName}</div>}
        </div>

        {reg.meetupId && (
          <div className="flex gap-2">
            <Link href={`/schedule/${reg.meetupId}`}>
              <Button variant="outline" size="sm"><Calendar className="h-3.5 w-3.5 mr-1" /> {t("lookup.viewSchedule")}</Button>
            </Link>
            <Link href={`/pickup/${reg.meetupId}`}>
              <Button variant="outline" size="sm"><Car className="h-3.5 w-3.5 mr-1" /> {t("lookup.pickupBoard")}</Button>
            </Link>
          </div>
        )}

        {flights.length > 0 && (
          <div className="border-t border-border pt-3">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary" /> {t("lookup.flightInfo")}
            </h4>
            {flights.map((f: any) => (
              <div key={f.id} className="bg-secondary/50 rounded-lg p-3 mb-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{f.flightNo} ({f.airline || ""})</span>
                  <Badge variant={f.flightStatus === "delayed" ? "destructive" : f.flightStatus === "landed" ? "default" : "secondary"} className="text-xs">
                    {f.flightStatus === "scheduled" ? t("lookup.fs_scheduled") : f.flightStatus === "delayed" ? t("lookup.fs_delayed") : f.flightStatus === "landed" ? t("lookup.fs_landed") : f.flightStatus === "departed" ? t("lookup.fs_departed") : f.flightStatus === "in_air" ? t("lookup.fs_inair") : f.flightStatus === "cancelled" ? t("lookup.fs_cancelled") : f.flightStatus}
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-1">
                  {f.departureAirport} → {f.arrivalAirport}
                </div>
                {f.scheduledDeparture && (
                  <div className="text-muted-foreground text-xs mt-1">
                    {t("lookup.scheduled")}: {new Date(f.scheduledDeparture).toLocaleString()}
                  </div>
                )}
                {(f.delayMinutes ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-yellow-500 text-xs mt-1">
                    <AlertTriangle className="h-3 w-3" /> {f.delayMinutes}{t("lookup.minDelay")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {itineraryList && itineraryList.length > 0 && (
          <div className="border-t border-border pt-3">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> {t("lookup.itinerary")}
            </h4>
            {itineraryList.map((it: any) => (
              <div key={it.id} className="bg-secondary/50 rounded-lg p-3 mb-2 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{it.title}</p>
                  <ModificationDialog registrationId={reg.id} itineraryId={it.id} />
                </div>
                {it.departureFlightNo && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Plane className="h-3 w-3" />
                    <span>{t("lookup.departure")}: {it.departureFlightNo} ({it.departureAirport})</span>
                    {it.departureTime && <span className="text-xs">{new Date(it.departureTime).toLocaleString()}</span>}
                  </div>
                )}
                {it.returnFlightNo && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Plane className="h-3 w-3 rotate-180" />
                    <span>{t("lookup.return")}: {it.returnFlightNo} ({it.returnDepartureAirport})</span>
                    {it.returnDepartureTime && <span className="text-xs">{new Date(it.returnDepartureTime).toLocaleString()}</span>}
                  </div>
                )}
                {it.hotelName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hotel className="h-3 w-3" /> <span>{it.hotelName}</span>
                  </div>
                )}
                {it.scheduleDetails && Array.isArray(it.scheduleDetails) && (
                  <div className="mt-2 space-y-1">
                    {(it.scheduleDetails as any[]).map((day: any, i: number) => (
                      <div key={i} className="pl-4 border-l-2 border-primary/30">
                        <p className="font-medium text-xs text-primary">Day {day.day}</p>
                        {day.items?.map((item: any, j: number) => (
                          <div key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> <span>{item.time} - {item.activity}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {modRequests.length > 0 && (
          <div className="border-t border-border pt-3">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Edit className="h-4 w-4 text-primary" /> {t("lookup.modHistory")}
            </h4>
            {modRequests.map((mr: any) => (
              <div key={mr.id} className="bg-secondary/50 rounded-lg p-3 mb-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>{mr.requestType === "flight_change" ? t("lookup.mod_flight") : mr.requestType === "hotel_change" ? t("lookup.mod_hotel") : mr.requestType === "schedule_change" ? t("lookup.mod_schedule") : t("lookup.mod_other")}</span>
                  <Badge variant={mr.status === "approved" ? "default" : mr.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                    {mr.status === "pending" ? t("lookup.pending") : mr.status === "approved" ? t("lookup.approved") : mr.status === "rejected" ? t("lookup.rejected") : t("lookup.completed")}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs mt-1">{mr.description}</p>
                {mr.adminNotes && <p className="text-xs text-primary mt-1">{t("lookup.admin")}: {mr.adminNotes}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModificationDialog({ registrationId, itineraryId }: { registrationId: number; itineraryId: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState<"flight_change" | "hotel_change" | "schedule_change" | "other">("other");
  const [description, setDescription] = useState("");
  const [requestedValue, setRequestedValue] = useState("");
  const utils = trpc.useUtils();
  const createMutation = trpc.modRequest.create.useMutation({
    onSuccess: () => {
      toast.success(t("lookup.modSuccess"));
      setOpen(false); setDescription(""); setRequestedValue("");
      utils.modRequest.list.invalidate();
    },
    onError: () => toast.error(t("lookup.modError")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs"><Edit className="h-3 w-3 mr-1" /> {t("lookup.modRequest")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("lookup.modTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("lookup.modType")}</Label>
            <select value={requestType} onChange={e => setRequestType(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1">
              <option value="flight_change">{t("lookup.mod_flight")}</option>
              <option value="hotel_change">{t("lookup.mod_hotel")}</option>
              <option value="schedule_change">{t("lookup.mod_schedule")}</option>
              <option value="other">{t("lookup.mod_other")}</option>
            </select>
          </div>
          <div>
            <Label>{t("lookup.modDesc")}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t("lookup.modDescPh")} rows={3} className="mt-1" />
          </div>
          <div>
            <Label>{t("lookup.modValue")}</Label>
            <Input value={requestedValue} onChange={e => setRequestedValue(e.target.value)} placeholder={t("lookup.modValuePh")} className="mt-1" />
          </div>
          <Button className="w-full" disabled={!description || createMutation.isPending}
            onClick={() => createMutation.mutate({ registrationId, itineraryId, requestType, description, requestedValue })}>
            <Send className="h-4 w-4 mr-2" /> {createMutation.isPending ? t("lookup.modSubmitting") : t("lookup.modSubmit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
