import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plane, Hotel, ArrowLeft, Calendar, MapPin, Star,
  CheckCircle2, XCircle, Clock, Loader2, AlertTriangle,
  DollarSign, Shield, Send, Bed, Luggage
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: Clock },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700", icon: Send },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  booked: { label: "Booked", color: "bg-purple-100 text-purple-700", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500", icon: XCircle },
};

export default function SelfBookingPortal() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [bookingType, setBookingType] = useState<"flight" | "hotel" | "both">("both");
  const [form, setForm] = useState({
    flightDepartureCity: "",
    flightArrivalCity: "",
    flightDepartureDate: "",
    flightReturnDate: "",
    flightClass: "economy" as "economy" | "premium_economy" | "business" | "first",
    flightPreferences: "",
    hotelCity: "",
    hotelCheckIn: "",
    hotelCheckOut: "",
    hotelStarRating: 3,
    hotelRoomType: "standard",
    hotelPreferences: "",
    estimatedBudget: "",
    currency: "USD",
  });

  const myRequests = trpc.selfBooking.myRequests.useQuery(undefined, { enabled: !!user });
  const createRequest = trpc.selfBooking.create.useMutation({
    onSuccess: (result) => {
      if (result.policyCompliant) {
        toast.success("Booking request submitted! Awaiting admin approval.");
      } else {
        toast.warning(`Request submitted with policy warnings: ${result.violations.join(", ")}`);
      }
      setShowForm(false);
      myRequests.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const requests = myRequests.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container max-w-4xl py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/my-page">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Self Booking Portal</h1>
              <p className="text-sm text-muted-foreground">정책 범위 내에서 항공편/호텔을 직접 요청하세요</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plane className="w-4 h-4" /> New Request
          </Button>
        </div>
      </div>

      <div className="container max-w-4xl py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{requests.length}</div>
              <div className="text-xs text-muted-foreground">Total Requests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{requests.filter(r => r.status === "submitted").length}</div>
              <div className="text-xs text-muted-foreground">Pending Approval</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{requests.filter(r => r.status === "approved" || r.status === "booked").length}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{requests.filter(r => r.status === "rejected").length}</div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </CardContent>
          </Card>
        </div>

        {/* Request List */}
        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Plane className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No Booking Requests Yet</h3>
              <p className="text-muted-foreground mb-4">항공편이나 호텔 예약을 요청하세요. 관리자가 검토 후 승인합니다.</p>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plane className="w-4 h-4" /> Create First Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((req: any) => {
              const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG.draft;
              const StatusIcon = statusConfig.icon;
              return (
                <Card key={req.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          req.bookingType === "flight" ? "bg-blue-100" : req.bookingType === "hotel" ? "bg-amber-100" : "bg-purple-100"
                        }`}>
                          {req.bookingType === "flight" ? <Plane className="w-5 h-5 text-blue-600" /> :
                           req.bookingType === "hotel" ? <Hotel className="w-5 h-5 text-amber-600" /> :
                           <Luggage className="w-5 h-5 text-purple-600" />}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {req.bookingType === "both" ? "Flight + Hotel" : req.bookingType === "flight" ? "Flight" : "Hotel"}
                            <Badge className={`${statusConfig.color} text-xs`}>
                              <StatusIcon className="w-3 h-3 mr-1" />{statusConfig.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            {(req.bookingType === "flight" || req.bookingType === "both") && req.flightDepartureCity && (
                              <div className="flex items-center gap-1">
                                <Plane className="w-3 h-3" />
                                {req.flightDepartureCity} → {req.flightArrivalCity}
                                {req.flightDepartureDate && ` · ${req.flightDepartureDate}`}
                                {req.flightClass && ` · ${req.flightClass}`}
                              </div>
                            )}
                            {(req.bookingType === "hotel" || req.bookingType === "both") && req.hotelCity && (
                              <div className="flex items-center gap-1">
                                <Hotel className="w-3 h-3" />
                                {req.hotelCity}
                                {req.hotelCheckIn && ` · ${req.hotelCheckIn} ~ ${req.hotelCheckOut}`}
                                {req.hotelStarRating && ` · ${req.hotelStarRating}★`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {req.estimatedBudget && (
                          <div className="text-sm font-medium flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {Number(req.estimatedBudget).toLocaleString()} {req.currency}
                          </div>
                        )}
                        {!req.policyCompliant && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Policy Warning
                          </Badge>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ""}
                        </div>
                      </div>
                    </div>
                    {req.rejectionReason && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                        <XCircle className="w-4 h-4 inline mr-1" /> Rejection reason: {req.rejectionReason}
                      </div>
                    )}
                    {req.adminNotes && (
                      <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-700">
                        Admin note: {req.adminNotes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* New Request Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-blue-500" />
              New Booking Request
            </DialogTitle>
            <DialogDescription>
              여행 정책에 맞는 항공편/호텔을 요청하세요. 관리자가 검토 후 승인합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Booking Type</Label>
              <Select value={bookingType} onValueChange={(v) => setBookingType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flight">Flight Only</SelectItem>
                  <SelectItem value="hotel">Hotel Only</SelectItem>
                  <SelectItem value="both">Flight + Hotel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(bookingType === "flight" || bookingType === "both") && (
              <>
                <Separator />
                <h4 className="font-medium flex items-center gap-2"><Plane className="w-4 h-4 text-blue-500" /> Flight Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Departure City</Label>
                    <Input value={form.flightDepartureCity} onChange={(e) => setForm(f => ({...f, flightDepartureCity: e.target.value}))} placeholder="Seoul" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Arrival City</Label>
                    <Input value={form.flightArrivalCity} onChange={(e) => setForm(f => ({...f, flightArrivalCity: e.target.value}))} placeholder="Ho Chi Minh" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Departure Date</Label>
                    <Input type="date" value={form.flightDepartureDate} onChange={(e) => setForm(f => ({...f, flightDepartureDate: e.target.value}))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Return Date</Label>
                    <Input type="date" value={form.flightReturnDate} onChange={(e) => setForm(f => ({...f, flightReturnDate: e.target.value}))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Flight Class</Label>
                  <Select value={form.flightClass} onValueChange={(v) => setForm(f => ({...f, flightClass: v as any}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">Economy</SelectItem>
                      <SelectItem value="premium_economy">Premium Economy</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="first">First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Preferences (optional)</Label>
                  <Textarea value={form.flightPreferences} onChange={(e) => setForm(f => ({...f, flightPreferences: e.target.value}))} placeholder="Preferred airlines, time preferences..." rows={2} />
                </div>
              </>
            )}

            {(bookingType === "hotel" || bookingType === "both") && (
              <>
                <Separator />
                <h4 className="font-medium flex items-center gap-2"><Hotel className="w-4 h-4 text-amber-500" /> Hotel Details</h4>
                <div className="space-y-1">
                  <Label className="text-xs">City</Label>
                  <Input value={form.hotelCity} onChange={(e) => setForm(f => ({...f, hotelCity: e.target.value}))} placeholder="Ho Chi Minh" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Check-in</Label>
                    <Input type="date" value={form.hotelCheckIn} onChange={(e) => setForm(f => ({...f, hotelCheckIn: e.target.value}))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Check-out</Label>
                    <Input type="date" value={form.hotelCheckOut} onChange={(e) => setForm(f => ({...f, hotelCheckOut: e.target.value}))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Min Star Rating</Label>
                    <Select value={String(form.hotelStarRating)} onValueChange={(v) => setForm(f => ({...f, hotelStarRating: Number(v)}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3★</SelectItem>
                        <SelectItem value="4">4★</SelectItem>
                        <SelectItem value="5">5★</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Room Type</Label>
                    <Select value={form.hotelRoomType} onValueChange={(v) => setForm(f => ({...f, hotelRoomType: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="deluxe">Deluxe</SelectItem>
                        <SelectItem value="suite">Suite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Special Requests (optional)</Label>
                  <Textarea value={form.hotelPreferences} onChange={(e) => setForm(f => ({...f, hotelPreferences: e.target.value}))} placeholder="High floor, quiet room, near venue..." rows={2} />
                </div>
              </>
            )}

            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Estimated Budget</Label>
                <Input type="number" value={form.estimatedBudget} onChange={(e) => setForm(f => ({...f, estimatedBudget: e.target.value}))} placeholder="1500" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm(f => ({...f, currency: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="KRW">KRW</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="VND">VND</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 shrink-0" />
              <div>요청은 여행 정책에 따라 자동 검증됩니다. 정책 위반 시 경고가 표시되며 관리자 승인이 필요합니다.</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              onClick={() => {
                createRequest.mutate({
                  meetupId: 360005, // TODO: dynamic meetup selection
                  registrationId: 0, // will be resolved server-side
                  bookingType,
                  ...form,
                });
              }}
              disabled={createRequest.isPending}
              className="gap-2"
            >
              {createRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
