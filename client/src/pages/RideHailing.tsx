import { useState, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Car, MapPin, Navigation, Search, Loader2, Star, Clock,
  Users, Shield, Wifi, Zap, ChevronRight, ArrowLeft, ArrowRight,
  Phone, CheckCircle2, XCircle, TrendingDown, DollarSign,
  Sparkles, Route, Timer, Battery, Droplets, Crown,
  Truck, CircleDot, MapPinned
} from "lucide-react";
import { Link } from "wouter";
import { MapView } from "@/components/Map";

const COUNTRIES = [
  { code: "TH", name: "Thailand", city: "Bangkok", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", city: "Ho Chi Minh City", flag: "🇻🇳" },
  { code: "SG", name: "Singapore", city: "Singapore", flag: "🇸🇬" },
  { code: "PH", name: "Philippines", city: "Manila", flag: "🇵🇭" },
  { code: "JP", name: "Japan", city: "Tokyo", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", city: "Seoul", flag: "🇰🇷" },
];

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  Bangkok: { lat: 13.7563, lng: 100.5018 },
  "Ho Chi Minh City": { lat: 10.8231, lng: 106.6297 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
  Manila: { lat: 14.5995, lng: 120.9842 },
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  Seoul: { lat: 37.5665, lng: 126.978 },
};

const VEHICLE_CONFIGS: Record<string, { icon: string; gradient: string; label: string; desc: string }> = {
  economy: { icon: "🚗", gradient: "from-blue-500 to-cyan-500", label: "Economy", desc: "Affordable & reliable" },
  comfort: { icon: "🚙", gradient: "from-emerald-500 to-teal-500", label: "Comfort", desc: "Extra legroom & AC" },
  premium: { icon: "🏎️", gradient: "from-amber-500 to-orange-500", label: "Premium", desc: "Luxury experience" },
  van: { icon: "🚐", gradient: "from-purple-500 to-violet-500", label: "Van", desc: "Group travel" },
  suv: { icon: "🚘", gradient: "from-rose-500 to-pink-500", label: "SUV", desc: "Spacious & powerful" },
};

export default function RideHailing() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("search");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pickupMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const dropoffMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const searchMutation = trpc.ride.search.useMutation({
    onSuccess: (data) => {
      setSearchResults(data);
      setActiveTab("results");
      toast.success(`${data.options.length} ride options found!`);
    },
    onError: (err) => toast.error(err.message),
  });

  const bookMutation = trpc.ride.book.useMutation({
    onSuccess: (data) => {
      setBookingResult(data);
      setShowBookingDialog(false);
      setShowConfirmation(true);
      toast.success("Ride booked successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const myBookingsQuery = trpc.ride.myBookings.useQuery(undefined, {
    enabled: isAuthenticated && activeTab === "history",
  });

  const handleSearch = () => {
    if (!pickupAddress || !dropoffAddress) {
      toast.error("Please enter pickup and drop-off locations");
      return;
    }
    const center = CITY_CENTERS[selectedCountry.city];
    // Generate slight offset for demo
    const pickupLat = center.lat + (Math.random() - 0.5) * 0.02;
    const pickupLng = center.lng + (Math.random() - 0.5) * 0.02;
    const dropoffLat = center.lat + (Math.random() - 0.5) * 0.05;
    const dropoffLng = center.lng + (Math.random() - 0.5) * 0.05;

    searchMutation.mutate({
      pickupLat, pickupLng, pickupAddress,
      dropoffLat, dropoffLng, dropoffAddress,
      city: selectedCountry.city,
      countryCode: selectedCountry.code,
      passengers,
    });
  };

  const handleBook = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to book a ride");
      window.location.href = "/login";
      return;
    }
    if (!selectedRide) return;
    const center = CITY_CENTERS[selectedCountry.city];
    bookMutation.mutate({
      rideOptionId: selectedRide.id,
      pickupLat: center.lat + (Math.random() - 0.5) * 0.02,
      pickupLng: center.lng + (Math.random() - 0.5) * 0.02,
      pickupAddress,
      dropoffLat: center.lat + (Math.random() - 0.5) * 0.05,
      dropoffLng: center.lng + (Math.random() - 0.5) * 0.05,
      dropoffAddress,
      vehicleType: selectedRide.vehicleType,
      vehicleName: selectedRide.vehicleName,
      providerName: selectedRide.provider,
      priceLocal: selectedRide.priceLocal,
      localCurrency: selectedRide.localCurrency,
      priceUsd: selectedRide.priceUsd,
      priceUsdt: selectedRide.priceUsdt,
      vatAmount: selectedRide.vatAmount,
      vatSaved: selectedRide.vatSaved,
      platformMarkup: selectedRide.platformMarkup,
      distanceKm: selectedRide.distanceKm,
      estimatedMinutes: selectedRide.estimatedMinutes,
      passengers,
      countryCode: selectedCountry.code,
    });
  };

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    const center = CITY_CENTERS[selectedCountry.city];
    map.setCenter(center);
    map.setZoom(13);
  }, [selectedCountry.city]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="container py-8 md:py-12 relative">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shadow-lg">
              🚕
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Ride-Hailing
              </h1>
              <p className="text-white/70 text-sm mt-0.5">
                Book rides worldwide. Pay with USDT. Save on VAT.
              </p>
            </div>
          </div>
          {/* Stats bar */}
          <div className="flex gap-6 mt-6 text-white/80 text-xs">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span>6 Countries</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5" />
              <span>2,500+ Fleets</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Save 10-18%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              <span>USDT Payment</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2" disabled={!searchResults}>
              <Car className="h-4 w-4" />
              Results {searchResults && <Badge variant="secondary" className="ml-1 text-[10px]">{searchResults.options.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* ── Search Tab ── */}
          <TabsContent value="search">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Search Form */}
              <div className="space-y-4">
                <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Navigation className="h-5 w-5 text-primary" />
                      Where to?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Country Select */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">City / Country</label>
                      <Select
                        value={selectedCountry.code}
                        onValueChange={(v) => {
                          const c = COUNTRIES.find(c => c.code === v);
                          if (c) {
                            setSelectedCountry(c);
                            if (mapRef.current) {
                              const center = CITY_CENTERS[c.city];
                              mapRef.current.setCenter(center);
                            }
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>
                              <span className="flex items-center gap-2">
                                <span>{c.flag}</span>
                                <span>{c.city}, {c.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Pickup & Dropoff */}
                    <div className="relative">
                      <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-gradient-to-b from-emerald-500 to-rose-500 rounded-full" />
                      <div className="space-y-3 pl-8">
                        <div className="relative">
                          <CircleDot className="absolute -left-[26px] top-2.5 h-4 w-4 text-emerald-500" />
                          <Input
                            placeholder="Pickup location"
                            value={pickupAddress}
                            onChange={(e) => setPickupAddress(e.target.value)}
                            className="bg-muted/50 border-0 h-10"
                          />
                        </div>
                        <div className="relative">
                          <MapPinned className="absolute -left-[26px] top-2.5 h-4 w-4 text-rose-500" />
                          <Input
                            placeholder="Drop-off location"
                            value={dropoffAddress}
                            onChange={(e) => setDropoffAddress(e.target.value)}
                            className="bg-muted/50 border-0 h-10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Passengers */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Passengers</label>
                      <div className="flex items-center gap-3">
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <button
                            key={n}
                            onClick={() => setPassengers(n)}
                            className={`h-10 w-10 rounded-xl text-sm font-semibold transition-all ${
                              passengers === n
                                ? "bg-primary text-primary-foreground shadow-md scale-105"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg"
                      onClick={handleSearch}
                      disabled={searchMutation.isPending}
                    >
                      {searchMutation.isPending ? (
                        <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Searching rides...</>
                      ) : (
                        <><Search className="h-5 w-5 mr-2" /> Find Rides</>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Vehicle Types Preview */}
                <Card className="border-0 shadow-md bg-card/60 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Available Vehicle Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-2">
                      {Object.entries(VEHICLE_CONFIGS).map(([key, v]) => (
                        <div key={key} className="text-center p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-default">
                          <div className="text-2xl mb-1">{v.icon}</div>
                          <div className="text-[10px] font-medium">{v.label}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Map */}
              <div className="h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-lg border border-border/50">
                <MapView
                  initialCenter={CITY_CENTERS[selectedCountry.city]}
                  initialZoom={13}
                  onMapReady={handleMapReady}
                />
              </div>
            </div>
          </TabsContent>

          {/* ── Results Tab ── */}
          <TabsContent value="results">
            {searchResults && (
              <div className="space-y-4">
                {/* Route Summary */}
                <Card className="border-0 shadow-md bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CircleDot className="h-4 w-4 text-emerald-500" />
                          <span className="font-medium truncate max-w-[150px]">{pickupAddress}</span>
                        </div>
                        <Route className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center gap-2 text-sm">
                          <MapPinned className="h-4 w-4 text-rose-500" />
                          <span className="font-medium truncate max-w-[150px]">{dropoffAddress}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Route className="h-3.5 w-3.5" /> {searchResults.distanceKm} km</span>
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {passengers} pax</span>
                        <Badge variant="outline" className="text-[10px]">VAT {searchResults.vatRate}%</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ride Options */}
                <div className="grid gap-3">
                  {searchResults.options.map((option: any, idx: number) => {
                    const config = VEHICLE_CONFIGS[option.vehicleType] || VEHICLE_CONFIGS.economy;
                    const isSelected = selectedRide?.id === option.id;
                    return (
                      <Card
                        key={option.id}
                        className={`border-0 shadow-md cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] ${
                          isSelected ? "ring-2 ring-primary shadow-primary/20" : ""
                        }`}
                        onClick={() => {
                          setSelectedRide(option);
                          setShowBookingDialog(true);
                        }}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-center gap-4">
                            {/* Vehicle Icon */}
                            <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-2xl shadow-md flex-shrink-0`}>
                              {config.icon}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-semibold">{option.vehicleName}</span>
                                <Badge variant="outline" className="text-[10px]">{option.provider}</Badge>
                                {option.surge > 1 && (
                                  <Badge variant="destructive" className="text-[10px]">
                                    <Zap className="h-2.5 w-2.5 mr-0.5" />{option.surge}x
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {option.capacity} seats</span>
                                <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {option.estimatedMinutes} min</span>
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ETA {option.eta} min</span>
                                <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" /> {option.rating}</span>
                              </div>
                              {/* Features */}
                              <div className="flex gap-1.5 mt-1.5">
                                {option.features.slice(0, 3).map((f: string) => (
                                  <span key={f} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground">{f}</span>
                                ))}
                              </div>
                            </div>

                            {/* Price */}
                            <div className="text-right flex-shrink-0">
                              <div className="text-lg font-bold text-primary">${option.priceUsdt.toFixed(2)}</div>
                              <div className="text-[10px] text-muted-foreground line-through">
                                ${option.priceUsd.toFixed(2)} USD
                              </div>
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] mt-0.5">
                                <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                                Save {option.savingsPercent}%
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── History Tab ── */}
          <TabsContent value="history">
            {!isAuthenticated ? (
              <Card className="border-0 shadow-md">
                <CardContent className="py-12 text-center">
                  <Car className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium mb-2">Sign in to view your ride history</p>
                  <p className="text-sm text-muted-foreground mb-4">You can search and compare rides without signing in. Sign in to book and track your rides.</p>
                  <Link href="/login"><Button size="sm" className="gap-2">Sign In <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
                </CardContent>
              </Card>
            ) : myBookingsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !myBookingsQuery.data?.length ? (
              <Card className="border-0 shadow-md">
                <CardContent className="py-12 text-center">
                  <Car className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">No rides yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Book your first ride to get started!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {myBookingsQuery.data.map((booking: any) => {
                  const config = VEHICLE_CONFIGS[booking.vehicleType] || VEHICLE_CONFIGS.economy;
                  const statusColors: Record<string, string> = {
                    confirmed: "bg-blue-100 text-blue-700",
                    driver_assigned: "bg-cyan-100 text-cyan-700",
                    in_progress: "bg-amber-100 text-amber-700",
                    completed: "bg-emerald-100 text-emerald-700",
                    cancelled: "bg-red-100 text-red-700",
                  };
                  return (
                    <Card key={booking.id} className="border-0 shadow-sm">
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-lg`}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{booking.vehicleName || config.label}</span>
                              <Badge className={`text-[10px] ${statusColors[booking.status || 'confirmed'] || 'bg-muted'}`}>
                                {booking.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                              {booking.pickupAddress} → {booking.dropoffAddress}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">${parseFloat(booking.priceUsdt || '0').toFixed(2)}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(booking.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Booking Dialog ── */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-md">
          {selectedRide && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="text-2xl">{VEHICLE_CONFIGS[selectedRide.vehicleType]?.icon}</span>
                  Confirm Ride
                </DialogTitle>
                <DialogDescription>Review your ride details before booking</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Route */}
                <div className="p-3 rounded-xl bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CircleDot className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span className="truncate">{pickupAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPinned className="h-4 w-4 text-rose-500 flex-shrink-0" />
                    <span className="truncate">{dropoffAddress}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-muted/30 text-center">
                    <div className="text-xs text-muted-foreground">Vehicle</div>
                    <div className="font-medium text-sm">{selectedRide.vehicleName}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 text-center">
                    <div className="text-xs text-muted-foreground">Provider</div>
                    <div className="font-medium text-sm">{selectedRide.provider}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 text-center">
                    <div className="text-xs text-muted-foreground">Distance</div>
                    <div className="font-medium text-sm">{selectedRide.distanceKm} km</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 text-center">
                    <div className="text-xs text-muted-foreground">ETA</div>
                    <div className="font-medium text-sm">{selectedRide.estimatedMinutes} min</div>
                  </div>
                </div>

                <Separator />

                {/* Pricing Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Local Price</span>
                    <span className="line-through text-muted-foreground">
                      {selectedRide.localCurrency} {selectedRide.priceLocal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">USD Equivalent</span>
                    <span className="line-through text-muted-foreground">${selectedRide.priceUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>VAT Saved</span>
                    <span>-${selectedRide.vatSaved.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">USDT Price</span>
                    <span className="text-xl font-bold text-primary">${selectedRide.priceUsdt.toFixed(2)}</span>
                  </div>
                  <Badge className="w-full justify-center bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 py-1">
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    You save {selectedRide.savingsPercent}% compared to local price
                  </Badge>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowBookingDialog(false)}>Cancel</Button>
                {isAuthenticated ? (
                  <Button
                    onClick={handleBook}
                    disabled={bookMutation.isPending}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                  >
                    {bookMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Booking...</>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4 mr-2" /> Book Ride</>
                    )}
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 gap-2">
                      Sign in to Book <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Confirmation Dialog ── */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-4">
            <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold mb-1">Ride Confirmed!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your driver is on the way. Estimated arrival in {bookingResult?.driverEta || 5} minutes.
            </p>
            {bookingResult && (
              <div className="p-3 rounded-xl bg-muted/50 text-left space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID</span>
                  <span className="font-mono font-medium">#{bookingResult.bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-blue-100 text-blue-700 text-[10px]">{bookingResult.status}</Badge>
                </div>
              </div>
            )}
            <Button
              className="w-full mt-4"
              onClick={() => {
                setShowConfirmation(false);
                setActiveTab("history");
                setSearchResults(null);
                setSelectedRide(null);
                setPickupAddress("");
                setDropoffAddress("");
              }}
            >
              View My Rides
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
