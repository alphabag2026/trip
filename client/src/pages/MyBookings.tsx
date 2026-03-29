import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plane, Hotel, ArrowLeft, Clock, CheckCircle2, XCircle,
  Copy, ExternalLink, Loader2, DollarSign, AlertCircle, Wallet
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Awaiting Payment", color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-300", icon: XCircle },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700 border-blue-300", icon: CheckCircle2 },
  refunded: { label: "Refunded", color: "bg-gray-100 text-gray-700 border-gray-300", icon: XCircle },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  awaiting: { label: "Awaiting", color: "text-yellow-600" },
  received: { label: "Received", color: "text-blue-600" },
  confirmed: { label: "Confirmed", color: "text-green-600" },
  failed: { label: "Failed", color: "text-red-600" },
};

// Demo USDT wallet address (will be replaced with real wallet)
const USDT_WALLET = "TXyz1234567890ABCDEFGHIJKLMNOPQRSTUVWxyz";

export default function MyBookings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [paymentDialog, setPaymentDialog] = useState<any>(null);
  const [txHash, setTxHash] = useState("");

  const bookings = trpc.travel.myBookings.useQuery(undefined, {
    enabled: !!user,
  });

  const confirmPayment = trpc.travel.confirmPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment submitted! We'll verify your transaction shortly.");
      setPaymentDialog(null);
      setTxHash("");
      bookings.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(USDT_WALLET);
    toast.success("Wallet address copied!");
  };

  const handleSubmitPayment = () => {
    if (!txHash.trim()) {
      toast.error("Please enter the transaction hash");
      return;
    }
    if (!paymentDialog) return;
    confirmPayment.mutate({ bookingId: paymentDialog.id, txHash: txHash.trim() });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <p>Please login to view your bookings</p>
            <Link href="/login">
              <Button>Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">My Bookings</h1>
              <p className="text-sm text-muted-foreground">Manage your hotel and flight bookings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-4">
        {bookings.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !bookings.data?.length ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
                <Wallet className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold">No Bookings Yet</h3>
              <p className="text-muted-foreground text-sm">Start searching for hotels and flights to make your first booking with USDT.</p>
              <Link href="/booking">
                <Button className="gap-2">
                  <Search className="h-4 w-4" />
                  Search Hotels & Flights
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          bookings.data.map((booking: any) => {
            const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
            const paymentStatus = PAYMENT_STATUS_CONFIG[booking.paymentStatus] || PAYMENT_STATUS_CONFIG.awaiting;
            const StatusIcon = status.icon;

            return (
              <Card key={booking.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Booking type icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      booking.bookingType === "hotel" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-indigo-100 dark:bg-indigo-900/30"
                    }`}>
                      {booking.bookingType === "hotel" ? (
                        <Hotel className="h-6 w-6 text-blue-500" />
                      ) : (
                        <Plane className="h-6 w-6 text-indigo-500" />
                      )}
                    </div>

                    {/* Booking info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-lg">
                            {booking.bookingType === "hotel" ? booking.propertyName : `${booking.airline} ${booking.flightNumber}`}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.bookingType === "hotel" ? booking.propertyAddress : `${booking.origin} → ${booking.destination}`}
                          </p>
                        </div>
                        <Badge className={`${status.color} border shrink-0`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                        <span>
                          {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : "-"}
                          {booking.checkOut ? ` → ${new Date(booking.checkOut).toLocaleDateString()}` : ""}
                        </span>
                        <span>Booking #{booking.id}</span>
                      </div>

                      {/* Price info */}
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">₮</span>
                          </div>
                          <span className="text-lg font-bold text-emerald-600">
                            {parseFloat(booking.usdtPrice).toFixed(2)} USDT
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground line-through">
                          ${parseFloat(booking.usdPrice).toFixed(2)} USD
                        </span>
                        {parseFloat(booking.savingsAmount) > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs">
                            Saved ${parseFloat(booking.savingsAmount).toFixed(2)}
                          </Badge>
                        )}
                      </div>

                      {/* Payment status & action */}
                      <div className="flex items-center gap-3 mt-3">
                        <span className={`text-xs font-medium ${paymentStatus.color}`}>
                          Payment: {paymentStatus.label}
                        </span>
                        {booking.paymentTxHash && (
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                            TX: {booking.paymentTxHash}
                          </span>
                        )}
                        {booking.status === "pending" && booking.paymentStatus === "awaiting" && (
                          <Button size="sm" variant="outline" className="gap-1 text-xs ml-auto"
                            onClick={() => setPaymentDialog(booking)}>
                            <Wallet className="h-3 w-3" />
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => { setPaymentDialog(null); setTxHash(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-500" />
              USDT Payment
            </DialogTitle>
            <DialogDescription>
              Send USDT to the wallet address below and submit the transaction hash
            </DialogDescription>
          </DialogHeader>

          {paymentDialog && (
            <div className="space-y-4">
              {/* Amount */}
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {parseFloat(paymentDialog.usdtPrice).toFixed(2)} USDT
                </p>
                <p className="text-xs text-muted-foreground mt-1">TRC20 Network</p>
              </div>

              {/* Wallet address */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Send USDT (TRC20) to:</Label>
                <div className="flex items-center gap-2">
                  <Input value={USDT_WALLET} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={handleCopyWallet}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-amber-600">
                  Only send USDT on TRC20 network. Sending other tokens or using wrong network will result in loss of funds.
                </p>
              </div>

              <Separator />

              {/* TX Hash input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Transaction Hash (TX ID)</Label>
                <Input
                  value={txHash}
                  onChange={e => setTxHash(e.target.value)}
                  placeholder="Enter your transaction hash..."
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  After sending USDT, paste the transaction hash here. We'll verify the payment on-chain.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setPaymentDialog(null); setTxHash(""); }}>Cancel</Button>
            <Button onClick={handleSubmitPayment} disabled={confirmPayment.isPending || !txHash.trim()} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {confirmPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Submit Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Search(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
