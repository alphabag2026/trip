import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Plane, Hotel, Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function AdminItineraries() {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const { data: itineraries, refetch } = trpc.itinerary.list.useQuery();
  const createMutation = trpc.itinerary.create.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); toast.success(t("admin.itineraries.created")); },
  });
  const deleteMutation = trpc.itinerary.delete.useMutation({
    onSuccess: () => { refetch(); toast.success(t("admin.itineraries.deleted")); },
  });
  const updateMutation = trpc.itinerary.update.useMutation({
    onSuccess: () => { refetch(); toast.success(t("admin.itineraries.sentUpdated")); },
  });

  const [form, setForm] = useState({
    registrationId: 0, title: "",
    departureFlightNo: "", departureAirport: "", departureTime: "",
    arrivalFlightNo: "", arrivalAirport: "", arrivalTime: "",
    returnFlightNo: "", returnDepartureAirport: "", returnDepartureTime: "",
    returnArrivalAirport: "", returnArrivalTime: "",
    hotelName: "", hotelAddress: "", hotelCheckIn: "", hotelCheckOut: "",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.itineraries.title")}</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />{t("admin.itineraries.newItinerary")}</Button>
      </div>

      <div className="grid gap-4">
        {itineraries?.map((it: any) => (
          <Card key={it.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="font-semibold">{it.title}</h3>
                  <p className="text-xs text-muted-foreground">{t("admin.itineraries.regId")}: {it.registrationId}</p>
                  {it.departureFlightNo && (
                    <div className="flex items-center gap-2 text-sm">
                      <Plane className="h-3 w-3 text-primary" />
                      <span>{t("admin.itineraries.departure")}: {it.departureFlightNo} ({it.departureAirport})</span>
                    </div>
                  )}
                  {it.returnFlightNo && (
                    <div className="flex items-center gap-2 text-sm">
                      <Plane className="h-3 w-3 text-primary rotate-180" />
                      <span>{t("admin.itineraries.returnFlight")}: {it.returnFlightNo} ({it.returnDepartureAirport})</span>
                    </div>
                  )}
                  {it.hotelName && (
                    <div className="flex items-center gap-2 text-sm">
                      <Hotel className="h-3 w-3 text-primary" />
                      <span>{it.hotelName}</span>
                    </div>
                  )}
                  <div className="flex gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded ${it.sentViaWeb ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {t("admin.itineraries.web")} {it.sentViaWeb ? t("admin.itineraries.sent") : t("admin.itineraries.notSent")}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${it.sentViaMessenger ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {t("admin.itineraries.messenger")} {it.sentViaMessenger ? t("admin.itineraries.sent") : t("admin.itineraries.notSent")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ id: it.id, sentViaWeb: true })}>
                    <Send className="h-3 w-3 mr-1" />{t("admin.itineraries.send")}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate({ id: it.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!itineraries || itineraries.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">{t("admin.itineraries.empty")}</div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.itineraries.createTitle")}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate({
            ...form,
            registrationId: Number(form.registrationId),
            departureFlightNo: form.departureFlightNo || undefined,
            departureAirport: form.departureAirport || undefined,
            departureTime: form.departureTime || undefined,
            arrivalFlightNo: form.arrivalFlightNo || undefined,
            arrivalAirport: form.arrivalAirport || undefined,
            arrivalTime: form.arrivalTime || undefined,
            returnFlightNo: form.returnFlightNo || undefined,
            returnDepartureAirport: form.returnDepartureAirport || undefined,
            returnDepartureTime: form.returnDepartureTime || undefined,
            returnArrivalAirport: form.returnArrivalAirport || undefined,
            returnArrivalTime: form.returnArrivalTime || undefined,
            hotelName: form.hotelName || undefined,
            hotelAddress: form.hotelAddress || undefined,
            hotelCheckIn: form.hotelCheckIn || undefined,
            hotelCheckOut: form.hotelCheckOut || undefined,
          }); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("admin.itineraries.regId")} *</Label><Input type="number" value={form.registrationId || ""} onChange={e => setForm(p => ({...p, registrationId: Number(e.target.value)}))} required /></div>
              <div><Label>{t("admin.itineraries.itineraryTitle")} *</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required /></div>
            </div>
            <h4 className="font-semibold text-sm text-primary pt-2">{t("admin.itineraries.departureFlight")}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("admin.itineraries.flightNo")}</Label><Input value={form.departureFlightNo} onChange={e => setForm(p => ({...p, departureFlightNo: e.target.value}))} placeholder="KE001" /></div>
              <div><Label>{t("admin.itineraries.airport")}</Label><Input value={form.departureAirport} onChange={e => setForm(p => ({...p, departureAirport: e.target.value}))} placeholder="ICN" /></div>
              <div><Label>{t("admin.itineraries.departureTime")}</Label><Input type="datetime-local" value={form.departureTime} onChange={e => setForm(p => ({...p, departureTime: e.target.value}))} /></div>
              <div><Label>{t("admin.itineraries.arrivalAirport")}</Label><Input value={form.arrivalAirport} onChange={e => setForm(p => ({...p, arrivalAirport: e.target.value}))} /></div>
            </div>
            <h4 className="font-semibold text-sm text-primary pt-2">{t("admin.itineraries.returnFlight")}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("admin.itineraries.flightNo")}</Label><Input value={form.returnFlightNo} onChange={e => setForm(p => ({...p, returnFlightNo: e.target.value}))} /></div>
              <div><Label>{t("admin.itineraries.departureAirport")}</Label><Input value={form.returnDepartureAirport} onChange={e => setForm(p => ({...p, returnDepartureAirport: e.target.value}))} /></div>
              <div><Label>{t("admin.itineraries.departureTime")}</Label><Input type="datetime-local" value={form.returnDepartureTime} onChange={e => setForm(p => ({...p, returnDepartureTime: e.target.value}))} /></div>
              <div><Label>{t("admin.itineraries.arrivalAirport")}</Label><Input value={form.returnArrivalAirport} onChange={e => setForm(p => ({...p, returnArrivalAirport: e.target.value}))} /></div>
            </div>
            <h4 className="font-semibold text-sm text-primary pt-2">{t("admin.itineraries.hotel")}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("admin.itineraries.hotelName")}</Label><Input value={form.hotelName} onChange={e => setForm(p => ({...p, hotelName: e.target.value}))} /></div>
              <div><Label>{t("admin.itineraries.address")}</Label><Input value={form.hotelAddress} onChange={e => setForm(p => ({...p, hotelAddress: e.target.value}))} /></div>
              <div><Label>{t("admin.itineraries.checkIn")}</Label><Input type="datetime-local" value={form.hotelCheckIn} onChange={e => setForm(p => ({...p, hotelCheckIn: e.target.value}))} /></div>
              <div><Label>{t("admin.itineraries.checkOut")}</Label><Input type="datetime-local" value={form.hotelCheckOut} onChange={e => setForm(p => ({...p, hotelCheckOut: e.target.value}))} /></div>
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>{t("admin.itineraries.create")}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
