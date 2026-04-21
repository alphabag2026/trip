import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plane, Hotel, CheckCircle2, XCircle, Clock, Loader2,
  AlertTriangle, DollarSign, Shield, Users, BarChart3,
  Luggage, ThumbsUp, ThumbsDown, Eye
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  submitted: { label: "Pending Review", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  booked: { label: "Booked", color: "bg-purple-100 text-purple-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500" },
};

export default function SelfBookingAdmin() {
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);
  const [reviewDialog, setReviewDialog] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const meetups = trpc.meetup.list.useQuery();
  const activeMeetupId = selectedMeetupId || meetups.data?.[0]?.id;

  const requests = trpc.selfBooking.listByMeetup.useQuery(
    { meetupId: activeMeetupId! },
    { enabled: !!activeMeetupId }
  );
  const stats = trpc.selfBooking.stats.useQuery(
    { meetupId: activeMeetupId! },
    { enabled: !!activeMeetupId }
  );

  const approve = trpc.selfBooking.approve.useMutation({
    onSuccess: () => { toast.success("Request approved"); setReviewDialog(null); requests.refetch(); stats.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const reject = trpc.selfBooking.reject.useMutation({
    onSuccess: () => { toast.success("Request rejected"); setReviewDialog(null); requests.refetch(); stats.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const requestList = requests.data || [];
  const statsData = stats.data;
  const submitted = requestList.filter((r: any) => r.status === "submitted");
  const processed = requestList.filter((r: any) => r.status !== "submitted" && r.status !== "draft");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Luggage className="w-6 h-6 text-purple-500" />
            Self Booking Requests
          </h1>
          <p className="text-muted-foreground mt-1">참석자 셀프 예약 요청을 검토하고 승인합니다</p>
        </div>
        <Select
          value={String(activeMeetupId || "")}
          onValueChange={(v) => setSelectedMeetupId(Number(v))}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Meetup" />
          </SelectTrigger>
          <SelectContent>
            {meetups.data?.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{statsData.total}</div>
              <div className="text-xs text-blue-600">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{statsData.submitted}</div>
              <div className="text-xs text-amber-600">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{statsData.approved}</div>
              <div className="text-xs text-green-600">Approved</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{statsData.rejected}</div>
              <div className="text-xs text-red-600">Rejected</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-700">{statsData.booked}</div>
              <div className="text-xs text-purple-600">Booked</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-700">{statsData.policyViolations}</div>
              <div className="text-xs text-orange-600">Policy Warnings</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1">
            <Clock className="w-4 h-4" /> Pending ({submitted.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1">
            <Users className="w-4 h-4" /> All ({requestList.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {submitted.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
              No pending requests
            </CardContent></Card>
          ) : (
            submitted.map((req: any) => (
              <RequestCard key={req.id} req={req} onReview={() => setReviewDialog(req)} />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {requestList.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              No booking requests yet
            </CardContent></Card>
          ) : (
            requestList.map((req: any) => (
              <RequestCard key={req.id} req={req} onReview={() => setReviewDialog(req)} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              Review Booking Request #{reviewDialog?.id}
            </DialogTitle>
          </DialogHeader>
          {reviewDialog && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{reviewDialog.bookingType}</span>
                </div>
                {reviewDialog.flightDepartureCity && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Flight:</span>
                      <span>{reviewDialog.flightDepartureCity} → {reviewDialog.flightArrivalCity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dates:</span>
                      <span>{reviewDialog.flightDepartureDate} ~ {reviewDialog.flightReturnDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Class:</span>
                      <span>{reviewDialog.flightClass}</span>
                    </div>
                  </>
                )}
                {reviewDialog.hotelCity && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hotel:</span>
                      <span>{reviewDialog.hotelCity} · {reviewDialog.hotelStarRating}★ · {reviewDialog.hotelRoomType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stay:</span>
                      <span>{reviewDialog.hotelCheckIn} ~ {reviewDialog.hotelCheckOut}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">${Number(reviewDialog.estimatedBudget || 0).toLocaleString()} {reviewDialog.currency}</span>
                </div>
              </div>

              {!reviewDialog.policyCompliant && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Policy Violations:
                  <ul className="list-disc ml-6 mt-1">
                    {(reviewDialog.policyViolations as string[] || []).map((v: string, i: number) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}

              {reviewDialog.status === "submitted" && (
                <>
                  <div className="space-y-2">
                    <Label>Admin Notes (optional)</Label>
                    <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Notes for the requester..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Rejection Reason (required for rejection)</Label>
                    <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." rows={2} />
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Close</Button>
            {reviewDialog?.status === "submitted" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!rejectionReason.trim()) { toast.error("Please provide a rejection reason"); return; }
                    reject.mutate({ id: reviewDialog.id, rejectionReason });
                  }}
                  disabled={reject.isPending}
                  className="gap-1"
                >
                  {reject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
                  Reject
                </Button>
                <Button
                  onClick={() => approve.mutate({ id: reviewDialog.id, adminNotes: adminNotes || undefined })}
                  disabled={approve.isPending}
                  className="gap-1"
                >
                  {approve.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({ req, onReview }: { req: any; onReview: () => void }) {
  const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG.draft;
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onReview}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              req.bookingType === "flight" ? "bg-blue-100" : req.bookingType === "hotel" ? "bg-amber-100" : "bg-purple-100"
            }`}>
              {req.bookingType === "flight" ? <Plane className="w-5 h-5 text-blue-600" /> :
               req.bookingType === "hotel" ? <Hotel className="w-5 h-5 text-amber-600" /> :
               <Luggage className="w-5 h-5 text-purple-600" />}
            </div>
            <div>
              <div className="font-medium text-sm">
                #{req.id} · {req.bookingType === "both" ? "Flight + Hotel" : req.bookingType}
                {!req.policyCompliant && <AlertTriangle className="w-4 h-4 inline ml-2 text-red-500" />}
              </div>
              <div className="text-xs text-muted-foreground">
                {req.flightDepartureCity && `${req.flightDepartureCity} → ${req.flightArrivalCity}`}
                {req.hotelCity && ` · ${req.hotelCity}`}
                {req.estimatedBudget && ` · $${Number(req.estimatedBudget).toLocaleString()}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${statusConfig.color} text-xs`}>{statusConfig.label}</Badge>
            <span className="text-xs text-muted-foreground">{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ""}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
