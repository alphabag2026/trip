import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  DollarSign, TrendingUp, BarChart3, PieChart, Settings, Plus,
  Loader2, ExternalLink, Calendar, ArrowUpRight, ArrowDownRight,
  CheckCircle2, Clock, XCircle, CreditCard, MousePointerClick
} from "lucide-react";

export default function AffiliateRevenue() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Add revenue form state
  const [newPlatform, setNewPlatform] = useState("trip_com");
  const [newType, setNewType] = useState("flight");
  const [newBookingAmount, setNewBookingAmount] = useState("");
  const [newCommRate, setNewCommRate] = useState("");
  const [newCommAmount, setNewCommAmount] = useState("");
  const [newStatus, setNewStatus] = useState("pending");
  const [newMonth, setNewMonth] = useState(new Date().toISOString().slice(0, 7));
  const [newNotes, setNewNotes] = useState("");

  // Affiliate settings state
  const [settings, setSettings] = useState<Record<string, { affiliateId: string; apiKey: string; marker: string; active: boolean }>>({
    trip_com: { affiliateId: "", apiKey: "", marker: "", active: true },
    booking_com: { affiliateId: "", apiKey: "", marker: "", active: true },
    agoda: { affiliateId: "", apiKey: "", marker: "", active: true },
    skyscanner: { affiliateId: "", apiKey: "", marker: "", active: false },
    travelpayouts: { affiliateId: "", apiKey: "", marker: "", active: false },
  });

  const revenueData = trpc.affiliate.stats.useQuery();
  const breakdownData = trpc.affiliate.breakdown.useQuery();
  const revenueList = trpc.affiliate.revenue.useQuery({});
  const addRevenueMut = trpc.affiliate.addRevenue.useMutation({
    onSuccess: () => {
      toast.success(t("admin.revenue.saved"));
      setAddDialogOpen(false);
      revenueData.refetch();
      revenueList.refetch();
      setNewBookingAmount("");
      setNewCommRate("");
      setNewCommAmount("");
      setNewNotes("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleAddRevenue = () => {
    addRevenueMut.mutate({
      platform: newPlatform as any,
      revenueType: newType as any,
      bookingAmount: newBookingAmount || undefined,
      commissionRate: newCommRate || undefined,
      commissionAmount: newCommAmount || "0",
      status: newStatus as any,
      revenueMonth: newMonth || undefined,
      notes: newNotes || undefined,
    });
  };

  const stats = revenueData.data;

  const statusIcon = (status: string) => {
    switch (status) {
      case "confirmed": return <CheckCircle2 className="h-3 w-3 text-green-400" />;
      case "paid": return <DollarSign className="h-3 w-3 text-blue-400" />;
      case "cancelled": return <XCircle className="h-3 w-3 text-red-400" />;
      default: return <Clock className="h-3 w-3 text-yellow-400" />;
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
      paid: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return (
      <Badge className={colors[status] || colors.pending}>
        {statusIcon(status)}
        <span className="ml-1">{t(`admin.revenue.${status}`)}</span>
      </Badge>
    );
  };

  const platformLabel = (p: string) => {
    const labels: Record<string, string> = {
      trip_com: "Trip.com",
      booking_com: "Booking.com",
      agoda: "Agoda",
      skyscanner: "Skyscanner",
      travelpayouts: "Travelpayouts",
    };
    return labels[p] || p;
  };

  const platformColor = (p: string) => {
    const colors: Record<string, string> = {
      trip_com: "bg-blue-500",
      booking_com: "bg-blue-800",
      agoda: "bg-purple-500",
      skyscanner: "bg-sky-500",
      travelpayouts: "bg-orange-500",
    };
    return colors[p] || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-green-500" />
            {t("admin.revenue.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.revenue.subtitle")}</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("admin.revenue.addRevenue")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.revenue.addRevenue")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("admin.revenue.platform")}</Label>
                  <Select value={newPlatform} onValueChange={setNewPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trip_com">Trip.com</SelectItem>
                      <SelectItem value="booking_com">Booking.com</SelectItem>
                      <SelectItem value="agoda">Agoda</SelectItem>
                      <SelectItem value="skyscanner">Skyscanner</SelectItem>
                      <SelectItem value="travelpayouts">Travelpayouts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("admin.revenue.type")}</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flight">Flight</SelectItem>
                      <SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="tour">Tour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>{t("admin.revenue.bookingAmount")}</Label>
                  <Input type="number" value={newBookingAmount} onChange={e => setNewBookingAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label>{t("admin.revenue.commissionRate")} (%)</Label>
                  <Input type="number" value={newCommRate} onChange={e => setNewCommRate(e.target.value)} placeholder="0.0" />
                </div>
                <div>
                  <Label>{t("admin.revenue.commissionAmount")}</Label>
                  <Input type="number" value={newCommAmount} onChange={e => setNewCommAmount(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("admin.revenue.month")}</Label>
                  <Input type="month" value={newMonth} onChange={e => setNewMonth(e.target.value)} />
                </div>
                <div>
                  <Label>{t("admin.revenue.status")}</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t("admin.revenue.pending")}</SelectItem>
                      <SelectItem value="confirmed">{t("admin.revenue.confirmed")}</SelectItem>
                      <SelectItem value="paid">{t("admin.revenue.paid")}</SelectItem>
                      <SelectItem value="cancelled">{t("admin.revenue.cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t("admin.revenue.notes")}</Label>
                <Input value={newNotes} onChange={e => setNewNotes(e.target.value)} />
              </div>
              <Button onClick={handleAddRevenue} disabled={addRevenueMut.isPending} className="w-full">
                {addRevenueMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("admin.revenue.save")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              {t("admin.revenue.totalRevenue")}
            </div>
            <div className="text-2xl font-bold">${parseFloat(stats?.totalRevenue || "0").toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              {t("admin.revenue.pendingRevenue")}
            </div>
            <div className="text-2xl font-bold text-yellow-400">${parseFloat(stats?.pendingRevenue || "0").toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CreditCard className="h-4 w-4 text-blue-500" />
              {t("admin.revenue.totalBookings")}
            </div>
            <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MousePointerClick className="h-4 w-4 text-green-500" />
              {t("admin.revenue.totalClicks")}
            </div>
            <div className="text-2xl font-bold">{stats?.totalClicks || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" /> {t("admin.revenue.byPlatform")}
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <CreditCard className="h-4 w-4" /> {t("admin.revenue.revenueList")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" /> {t("admin.revenue.settings")}
          </TabsTrigger>
        </TabsList>

        {/* Platform Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.revenue.byPlatform")}</CardTitle>
            </CardHeader>
            <CardContent>
              {breakdownData.data && breakdownData.data.length > 0 ? (
                <div className="space-y-4">
                  {breakdownData.data.map((p: any) => {
                    const maxRevenue = Math.max(...breakdownData.data!.map((x: any) => x.totalCommission || 1));
                    const pct = ((p.totalCommission || 0) / maxRevenue) * 100;
                    return (
                      <div key={p.platform} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${platformColor(p.platform)}`} />
                            <span className="font-medium">{platformLabel(p.platform)}</span>
                            <Badge variant="outline" className="text-xs">{p.count} bookings</Badge>
                          </div>
                          <span className="font-bold">${p.totalCommission?.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${platformColor(p.platform)} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">{t("admin.revenue.noData")}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue List */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              {revenueList.data && revenueList.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 px-2">{t("admin.revenue.month")}</th>
                        <th className="text-left py-2 px-2">{t("admin.revenue.platform")}</th>
                        <th className="text-left py-2 px-2">{t("admin.revenue.type")}</th>
                        <th className="text-right py-2 px-2">{t("admin.revenue.bookingAmount")}</th>
                        <th className="text-right py-2 px-2">{t("admin.revenue.commissionRate")}</th>
                        <th className="text-right py-2 px-2">{t("admin.revenue.commissionAmount")}</th>
                        <th className="text-center py-2 px-2">{t("admin.revenue.status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueList.data.map((r: any) => (
                        <tr key={r.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2">{r.month}</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${platformColor(r.platform)}`} />
                              {platformLabel(r.platform)}
                            </div>
                          </td>
                          <td className="py-2 px-2 capitalize">{r.type}</td>
                          <td className="py-2 px-2 text-right">${r.bookingAmount?.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right">{r.commissionRate}%</td>
                          <td className="py-2 px-2 text-right font-medium">${r.commissionAmount?.toFixed(2)}</td>
                          <td className="py-2 px-2 text-center">{statusBadge(r.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">{t("admin.revenue.noData")}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Affiliate Settings */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.revenue.settings")}</CardTitle>
              <CardDescription>{t("admin.revenue.settingsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(settings).map(([platform, config]) => (
                <div key={platform} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${platformColor(platform)}`} />
                      <h3 className="font-semibold">{platformLabel(platform)}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {config.active ? t("admin.revenue.active") : t("admin.revenue.inactive")}
                      </span>
                      <Switch
                        checked={config.active}
                        onCheckedChange={(checked) =>
                          setSettings(prev => ({ ...prev, [platform]: { ...prev[platform], active: checked } }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">{t("admin.revenue.affiliateId")}</Label>
                      <Input
                        className="h-8 text-sm"
                        value={config.affiliateId}
                        onChange={e => setSettings(prev => ({ ...prev, [platform]: { ...prev[platform], affiliateId: e.target.value } }))}
                        placeholder="e.g. 12345"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("admin.revenue.apiKey")}</Label>
                      <Input
                        className="h-8 text-sm"
                        type="password"
                        value={config.apiKey}
                        onChange={e => setSettings(prev => ({ ...prev, [platform]: { ...prev[platform], apiKey: e.target.value } }))}
                        placeholder="API Key"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("admin.revenue.marker")}</Label>
                      <Input
                        className="h-8 text-sm"
                        value={config.marker}
                        onChange={e => setSettings(prev => ({ ...prev, [platform]: { ...prev[platform], marker: e.target.value } }))}
                        placeholder="Tracking marker"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button className="w-full" onClick={() => toast.success(t("admin.revenue.saved"))}>
                {t("admin.revenue.save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
