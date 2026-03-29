import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plane, Hotel, MapPin, Search, ArrowRight, ArrowLeft,
  Globe, Star, Loader2, Sparkles, TrendingDown, Shield,
  Clock, Wifi, Coffee, Car, DollarSign, Percent,
  CheckCircle2, Copy, ChevronDown, ChevronUp, Users, Bed,
  Luggage, AlertCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

// Country options for search
const COUNTRIES = [
  { code: "KR", name: "South Korea", nameKo: "한국", currency: "KRW" },
  { code: "JP", name: "Japan", nameKo: "일본", currency: "JPY" },
  { code: "TH", name: "Thailand", nameKo: "태국", currency: "THB" },
  { code: "SG", name: "Singapore", nameKo: "싱가포르", currency: "SGD" },
  { code: "VN", name: "Vietnam", nameKo: "베트남", currency: "VND" },
  { code: "PH", name: "Philippines", nameKo: "필리핀", currency: "PHP" },
  { code: "ID", name: "Indonesia", nameKo: "인도네시아", currency: "IDR" },
  { code: "MY", name: "Malaysia", nameKo: "말레이시아", currency: "MYR" },
  { code: "CN", name: "China", nameKo: "중국", currency: "CNY" },
  { code: "TW", name: "Taiwan", nameKo: "대만", currency: "TWD" },
  { code: "HK", name: "Hong Kong", nameKo: "홍콩", currency: "HKD" },
  { code: "AU", name: "Australia", nameKo: "호주", currency: "AUD" },
  { code: "US", name: "USA", nameKo: "미국", currency: "USD" },
  { code: "GB", name: "UK", nameKo: "영국", currency: "GBP" },
  { code: "FR", name: "France", nameKo: "프랑스", currency: "EUR" },
  { code: "DE", name: "Germany", nameKo: "독일", currency: "EUR" },
];

const DESTINATIONS: Record<string, string[]> = {
  KR: ["Seoul", "Busan", "Jeju"],
  JP: ["Tokyo", "Osaka", "Kyoto"],
  TH: ["Bangkok", "Phuket", "Chiang Mai"],
  SG: ["Singapore"],
  VN: ["Ho Chi Minh", "Hanoi", "Da Nang"],
  PH: ["Manila", "Cebu", "Boracay"],
  ID: ["Bali", "Jakarta"],
  MY: ["Kuala Lumpur", "Penang"],
  CN: ["Shanghai", "Beijing", "Guangzhou"],
  TW: ["Taipei", "Kaohsiung"],
  HK: ["Hong Kong"],
  AU: ["Sydney", "Melbourne"],
  US: ["New York", "Los Angeles", "Las Vegas"],
  GB: ["London", "Manchester"],
  FR: ["Paris", "Nice"],
  DE: ["Berlin", "Munich"],
};

const AIRPORT_CODES: Record<string, string> = {
  Seoul: "ICN", Busan: "PUS", Jeju: "CJU",
  Tokyo: "NRT", Osaka: "KIX", Kyoto: "KIX",
  Bangkok: "BKK", Phuket: "HKT", "Chiang Mai": "CNX",
  Singapore: "SIN", "Ho Chi Minh": "SGN", Hanoi: "HAN", "Da Nang": "DAD",
  Manila: "MNL", Cebu: "CEB", Boracay: "KLO",
  Bali: "DPS", Jakarta: "CGK", "Kuala Lumpur": "KUL", Penang: "PEN",
  Shanghai: "PVG", Beijing: "PEK", Guangzhou: "CAN",
  Taipei: "TPE", Kaohsiung: "KHH", "Hong Kong": "HKG",
  Sydney: "SYD", Melbourne: "MEL",
  "New York": "JFK", "Los Angeles": "LAX", "Las Vegas": "LAS",
  London: "LHR", Manchester: "MAN", Paris: "CDG", Nice: "NCE",
  Berlin: "BER", Munich: "MUC",
};

function formatCurrency(amount: number, currency: string): string {
  const formatters: Record<string, Intl.NumberFormatOptions> = {
    KRW: { style: "currency", currency: "KRW", maximumFractionDigits: 0 },
    JPY: { style: "currency", currency: "JPY", maximumFractionDigits: 0 },
    VND: { style: "currency", currency: "VND", maximumFractionDigits: 0 },
    IDR: { style: "currency", currency: "IDR", maximumFractionDigits: 0 },
  };
  try {
    return new Intl.NumberFormat("en-US", formatters[currency] || { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

// Price comparison display component
function PriceComparison({ localPrice, localCurrency, usdPrice, usdtPrice, savings, savingsPercent }: {
  localPrice: number; localCurrency: string; usdPrice: number; usdtPrice: number; savings: number; savingsPercent: number;
}) {
  return (
    <div className="space-y-2">
      {/* Local price (crossed out) */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="line-through">{formatCurrency(localPrice, localCurrency)}</span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">VAT incl.</Badge>
      </div>
      {/* USD price */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <DollarSign className="h-3 w-3" />
        <span>${usdPrice.toFixed(2)} USD</span>
      </div>
      {/* USDT price (highlighted) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">₮</span>
          </div>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {usdtPrice.toFixed(2)} USDT
          </span>
        </div>
      </div>
      {/* Savings badge */}
      {savings > 0 && (
        <div className="flex items-center gap-1.5">
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
            <TrendingDown className="h-3 w-3 mr-1" />
            Save ${savings.toFixed(2)} ({savingsPercent.toFixed(1)}%)
          </Badge>
        </div>
      )}
    </div>
  );
}

// Star rating display
function StarRating({ stars, rating, reviewCount }: { stars: number; rating: number; reviewCount: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={`h-3.5 w-3.5 ${i < stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
        ))}
      </div>
      <span className="text-sm font-medium">{rating}</span>
      <span className="text-xs text-muted-foreground">({reviewCount.toLocaleString()} reviews)</span>
    </div>
  );
}

export default function BookingCenter() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("hotel");
  const [bookingDialog, setBookingDialog] = useState<any>(null);
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);

  // Country selection
  const [selectedCountry, setSelectedCountry] = useState("TH");

  // Hotel search state
  const [hotelDestination, setHotelDestination] = useState("Bangkok");
  const [checkIn, setCheckIn] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 10);
    return d.toISOString().split("T")[0];
  });
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);

  // Flight search state
  const [flightOrigin, setFlightOrigin] = useState("ICN");
  const [flightDest, setFlightDest] = useState("BKK");
  const [departDate, setDepartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [cabinClass, setCabinClass] = useState<"economy" | "premium_economy" | "business" | "first">("economy");

  // Search results
  const [hotelSearchEnabled, setHotelSearchEnabled] = useState(false);
  const [flightSearchEnabled, setFlightSearchEnabled] = useState(false);

  const hotelSearch = trpc.travel.searchHotels.useQuery(
    { destination: hotelDestination, countryCode: selectedCountry, checkIn, checkOut, guests, rooms },
    { enabled: hotelSearchEnabled, refetchOnWindowFocus: false }
  );

  const flightSearch = trpc.travel.searchFlights.useQuery(
    { origin: flightOrigin, destination: flightDest, departDate, returnDate: returnDate || undefined, passengers, cabinClass, countryCode: selectedCountry },
    { enabled: flightSearchEnabled, refetchOnWindowFocus: false }
  );

  const createBooking = trpc.travel.createBooking.useMutation({
    onSuccess: (data) => {
      toast.success("Booking created! Please complete USDT payment.");
      setBookingDialog(null);
      navigate("/my-bookings");
    },
    onError: (err) => {
      if (err.message.includes("UNAUTHORIZED")) {
        toast.error("Please login to make a booking");
        navigate("/login");
      } else {
        toast.error(err.message);
      }
    },
  });

  const handleHotelSearch = () => {
    if (!hotelDestination || !checkIn || !checkOut) {
      toast.error("Please fill in all search fields");
      return;
    }
    setHotelSearchEnabled(true);
  };

  const handleFlightSearch = () => {
    if (!flightDest || !departDate) {
      toast.error("Please fill in all search fields");
      return;
    }
    setFlightSearchEnabled(true);
  };

  const handleBookHotel = (hotel: any) => {
    if (!user) {
      toast.error("Please login to make a booking");
      navigate("/login");
      return;
    }
    setBookingDialog({
      type: "hotel",
      ...hotel,
    });
  };

  const handleBookFlight = (flight: any) => {
    if (!user) {
      toast.error("Please login to make a booking");
      navigate("/login");
      return;
    }
    setBookingDialog({
      type: "flight",
      ...flight,
    });
  };

  const confirmBooking = () => {
    if (!bookingDialog) return;
    const d = bookingDialog;
    if (d.type === "hotel") {
      createBooking.mutate({
        bookingType: "hotel",
        propertyName: d.name,
        propertyAddress: d.address,
        checkIn: d.checkIn,
        checkOut: d.checkOut,
        guests: d.guests || guests,
        rooms: d.rooms || rooms,
        localPrice: d.localPrice,
        localCurrency: d.localCurrency,
        usdPrice: d.usdPrice,
        usdtPrice: d.usdtPrice,
        vatAmount: d.vatAmount,
        vatRate: d.savingsPercent,
        savingsAmount: d.savings,
        countryCode: selectedCountry,
        imageUrl: d.imageUrl,
        paymentMethod: "usdt_trc20",
      });
    } else {
      createBooking.mutate({
        bookingType: "flight",
        flightNumber: d.flightNumber,
        airline: d.airline,
        origin: d.origin,
        destination: d.destination,
        checkIn: d.departureTime,
        checkOut: d.arrivalTime,
        guests: passengers,
        localPrice: d.localPrice,
        localCurrency: d.localCurrency,
        usdPrice: d.usdPrice,
        usdtPrice: d.usdtPrice,
        vatAmount: d.vatAmount,
        vatRate: d.savingsPercent,
        savingsAmount: d.savings,
        countryCode: selectedCountry,
        imageUrl: d.imageUrl,
        paymentMethod: "usdt_trc20",
      });
    }
  };

  const destinations = DESTINATIONS[selectedCountry] || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-background dark:from-blue-950/20">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTMwVjBoLTEydjRoMTJ6TTI0IDI0aDEydi0ySDI0djJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="container py-8 relative">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <Globe className="h-7 w-7" />
                Alpha Trip Booking
              </h1>
              <p className="text-white/80 text-sm mt-1">
                Pay with USDT and save up to 25% on VAT — powered by Hong Kong jurisdiction
              </p>
            </div>
          </div>

          {/* Value proposition badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-white/15 border-white/25 text-white text-xs">
              <Shield className="h-3 w-3 mr-1" /> 0% VAT (HK/BVI)
            </Badge>
            <Badge className="bg-white/15 border-white/25 text-white text-xs">
              <Percent className="h-3 w-3 mr-1" /> Save 10-25%
            </Badge>
            <Badge className="bg-white/15 border-white/25 text-white text-xs">
              <DollarSign className="h-3 w-3 mr-1" /> USDT Payment
            </Badge>
            <Badge className="bg-white/15 border-white/25 text-white text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> 150K+ Hotels
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* How it works - compact */}
        <Card className="border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 font-bold text-sm">1</div>
                <span className="text-xs font-medium">Search Hotels/Flights</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 font-bold text-sm">2</div>
                <span className="text-xs font-medium">Compare 3 Prices</span>
                <span className="text-[10px] text-muted-foreground">Local + USD + USDT</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 font-bold text-sm">3</div>
                <span className="text-xs font-medium">Pay with USDT</span>
                <span className="text-[10px] text-muted-foreground">TRC20 / ERC20 / BEP20</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 font-bold text-sm">4</div>
                <span className="text-xs font-medium">Get Confirmed</span>
                <span className="text-[10px] text-muted-foreground">Instant e-ticket/voucher</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Country selector */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium whitespace-nowrap">Destination Country:</Label>
          <Select value={selectedCountry} onValueChange={(v) => {
            setSelectedCountry(v);
            const dests = DESTINATIONS[v];
            if (dests?.length) {
              setHotelDestination(dests[0]);
              setFlightDest(AIRPORT_CODES[dests[0]] || "");
            }
            setHotelSearchEnabled(false);
            setFlightSearchEnabled(false);
          }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.nameKo} ({c.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setHotelSearchEnabled(false); setFlightSearchEnabled(false); }}>
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto h-11">
            <TabsTrigger value="hotel" className="gap-2 text-sm">
              <Hotel className="h-4 w-4" /> Hotel Search
            </TabsTrigger>
            <TabsTrigger value="flight" className="gap-2 text-sm">
              <Plane className="h-4 w-4" /> Flight Search
            </TabsTrigger>
          </TabsList>

          {/* ── Hotel Search Tab ── */}
          <TabsContent value="hotel" className="mt-4">
            <Card className="border-blue-200 dark:border-blue-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hotel className="h-5 w-5 text-blue-500" />
                  Hotel Search
                  <Badge variant="outline" className="ml-2 text-[10px]">DEMO MODE</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs">Destination</Label>
                    <Select value={hotelDestination} onValueChange={setHotelDestination}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Check-in</Label>
                    <Input type="date" className="h-9" value={checkIn} onChange={e => { setCheckIn(e.target.value); setHotelSearchEnabled(false); }} />
                  </div>
                  <div>
                    <Label className="text-xs">Check-out</Label>
                    <Input type="date" className="h-9" value={checkOut} onChange={e => { setCheckOut(e.target.value); setHotelSearchEnabled(false); }} />
                  </div>
                  <div>
                    <Label className="text-xs">Guests</Label>
                    <Input type="number" className="h-9" min={1} max={10} value={guests} onChange={e => setGuests(parseInt(e.target.value) || 2)} />
                  </div>
                  <div>
                    <Label className="text-xs">Rooms</Label>
                    <Input type="number" className="h-9" min={1} max={10} value={rooms} onChange={e => setRooms(parseInt(e.target.value) || 1)} />
                  </div>
                </div>
                <Button onClick={handleHotelSearch} disabled={hotelSearch.isFetching} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                  {hotelSearch.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search Hotels in {hotelDestination}
                </Button>
              </CardContent>
            </Card>

            {/* Hotel Results */}
            {hotelSearch.data && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    <h2 className="text-lg font-bold">{hotelDestination} Hotels</h2>
                    <Badge variant="secondary">{hotelSearch.data.total} results</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    VAT Rate: {hotelSearch.data.vatRate}% | 1 USD = {hotelSearch.data.exchangeRate} {hotelSearch.data.currency}
                  </div>
                </div>

                <div className="space-y-4">
                  {hotelSearch.data.hotels.map((hotel: any) => (
                    <Card key={hotel.id} className="overflow-hidden hover:shadow-lg transition-all group">
                      <div className="flex flex-col md:flex-row">
                        {/* Hotel Image */}
                        <div className="md:w-72 h-48 md:h-auto relative overflow-hidden">
                          <img
                            src={hotel.imageUrl}
                            alt={hotel.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {hotel.freeCancellation && (
                            <Badge className="absolute top-2 left-2 bg-green-500 text-white text-[10px]">
                              Free Cancellation
                            </Badge>
                          )}
                        </div>

                        {/* Hotel Info */}
                        <div className="flex-1 p-4 flex flex-col">
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-bold text-lg group-hover:text-blue-600 transition-colors">
                                  {hotel.name}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{hotel.nameLocal}</p>
                                <StarRating stars={hotel.stars} rating={hotel.rating} reviewCount={hotel.reviewCount} />
                              </div>
                              <div className="text-right shrink-0">
                                <PriceComparison
                                  localPrice={hotel.localPrice}
                                  localCurrency={hotel.localCurrency}
                                  usdPrice={hotel.usdPrice}
                                  usdtPrice={hotel.usdtPrice}
                                  savings={hotel.savings}
                                  savingsPercent={hotel.savingsPercent}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {hotel.distanceFromCenter} from center
                              </span>
                              <span className="flex items-center gap-1">
                                <Bed className="h-3 w-3" /> {hotel.roomType}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {hotel.nights} nights
                              </span>
                            </div>

                            {/* Amenities */}
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {hotel.amenities.slice(0, 5).map((a: string) => (
                                <Badge key={a} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {a === "Free WiFi" && <Wifi className="h-2.5 w-2.5 mr-0.5" />}
                                  {a === "Pool" && <span className="mr-0.5">🏊</span>}
                                  {a === "Restaurant" && <Coffee className="h-2.5 w-2.5 mr-0.5" />}
                                  {a === "Parking" && <Car className="h-2.5 w-2.5 mr-0.5" />}
                                  {a}
                                </Badge>
                              ))}
                              {hotel.amenities.length > 5 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  +{hotel.amenities.length - 5} more
                                </Badge>
                              )}
                            </div>

                            {hotel.breakfastIncluded && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                                <Coffee className="h-3 w-3" /> Breakfast included
                              </div>
                            )}
                          </div>

                          {/* Book button */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t">
                            <div className="text-xs text-muted-foreground">
                              Total for {hotel.nights} nights, {rooms} room(s)
                            </div>
                            <Button onClick={() => handleBookHotel(hotel)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                              <span className="text-sm font-bold">Book with USDT</span>
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Flight Search Tab ── */}
          <TabsContent value="flight" className="mt-4">
            <Card className="border-indigo-200 dark:border-indigo-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plane className="h-5 w-5 text-indigo-500" />
                  Flight Search
                  <Badge variant="outline" className="ml-2 text-[10px]">DEMO MODE</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div>
                    <Label className="text-xs">From</Label>
                    <Select value={flightOrigin} onValueChange={setFlightOrigin}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ICN">ICN - Seoul</SelectItem>
                        <SelectItem value="NRT">NRT - Tokyo</SelectItem>
                        <SelectItem value="HKG">HKG - Hong Kong</SelectItem>
                        <SelectItem value="SIN">SIN - Singapore</SelectItem>
                        <SelectItem value="BKK">BKK - Bangkok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">To</Label>
                    <Select value={flightDest} onValueChange={(v) => { setFlightDest(v); setFlightSearchEnabled(false); }}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map(d => {
                          const code = AIRPORT_CODES[d];
                          return code ? (
                            <SelectItem key={code} value={code}>{code} - {d}</SelectItem>
                          ) : null;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Departure</Label>
                    <Input type="date" className="h-9" value={departDate} onChange={e => { setDepartDate(e.target.value); setFlightSearchEnabled(false); }} />
                  </div>
                  <div>
                    <Label className="text-xs">Return (opt.)</Label>
                    <Input type="date" className="h-9" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Passengers</Label>
                    <Input type="number" className="h-9" min={1} max={9} value={passengers} onChange={e => setPassengers(parseInt(e.target.value) || 1)} />
                  </div>
                  <div>
                    <Label className="text-xs">Class</Label>
                    <Select value={cabinClass} onValueChange={(v: any) => { setCabinClass(v); setFlightSearchEnabled(false); }}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economy">Economy</SelectItem>
                        <SelectItem value="premium_economy">Premium</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="first">First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleFlightSearch} disabled={flightSearch.isFetching} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
                  {flightSearch.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search Flights
                </Button>
              </CardContent>
            </Card>

            {/* Flight Results */}
            {flightSearch.data && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-indigo-500" />
                    <h2 className="text-lg font-bold">{flightOrigin} → {flightDest}</h2>
                    <Badge variant="secondary">{flightSearch.data.total} flights</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    VAT Rate: {flightSearch.data.vatRate}% | 1 USD = {flightSearch.data.exchangeRate} {flightSearch.data.currency}
                  </div>
                </div>

                <div className="space-y-3">
                  {flightSearch.data.flights.map((flight: any, idx: number) => (
                    <Card key={flight.id} className="overflow-hidden hover:shadow-lg transition-all">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          {/* Airline info */}
                          <div className="flex items-center gap-3 md:w-40">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold">
                              {flight.airlineCode}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{flight.airline}</p>
                              <p className="text-xs text-muted-foreground">{flight.flightNumber}</p>
                            </div>
                          </div>

                          {/* Flight times */}
                          <div className="flex-1 flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-lg font-bold">{new Date(flight.departureTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                              <p className="text-xs text-muted-foreground">{flight.originCode}</p>
                            </div>
                            <div className="flex-1 flex flex-col items-center">
                              <p className="text-xs text-muted-foreground">{flight.duration}</p>
                              <div className="w-full flex items-center gap-1">
                                <div className="h-px flex-1 bg-gray-300 dark:bg-gray-600" />
                                <Plane className="h-3 w-3 text-muted-foreground rotate-90" />
                                <div className="h-px flex-1 bg-gray-300 dark:bg-gray-600" />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {flight.stops === 0 ? (
                                  <span className="text-emerald-600">Direct</span>
                                ) : (
                                  <span className="text-orange-500">{flight.stops} stop{flight.stops > 1 ? "s" : ""} ({flight.stopCities.join(", ")})</span>
                                )}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold">{new Date(flight.arrivalTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                              <p className="text-xs text-muted-foreground">{flight.destinationCode}</p>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground md:w-32">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Luggage className="h-3 w-3" /> {flight.baggageIncluded}
                              </div>
                              <div className="flex items-center gap-1">
                                <Plane className="h-3 w-3" /> {flight.aircraft.split(" ").slice(0, 2).join(" ")}
                              </div>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="md:w-56 md:text-right">
                            <PriceComparison
                              localPrice={flight.localPrice}
                              localCurrency={flight.localCurrency}
                              usdPrice={flight.usdPrice}
                              usdtPrice={flight.usdtPrice}
                              savings={flight.savings}
                              savingsPercent={flight.savingsPercent}
                            />
                            <Button onClick={() => handleBookFlight(flight)} className="mt-2 gap-2 bg-emerald-600 hover:bg-emerald-700 w-full md:w-auto" size="sm">
                              Book with USDT
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Info footer */}
        <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-amber-700 dark:text-amber-400">Demo Mode</p>
                <p>Currently showing demo data. Real hotel/flight data will be available once Amadeus API integration is complete. Prices shown are simulated based on actual VAT rates and exchange rates.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Confirmation Dialog */}
      <Dialog open={!!bookingDialog} onOpenChange={() => setBookingDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bookingDialog?.type === "hotel" ? <Hotel className="h-5 w-5 text-blue-500" /> : <Plane className="h-5 w-5 text-indigo-500" />}
              Confirm Booking
            </DialogTitle>
            <DialogDescription>
              Review your booking details and proceed to USDT payment
            </DialogDescription>
          </DialogHeader>

          {bookingDialog && (
            <div className="space-y-4">
              {/* Booking details */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-bold">{bookingDialog.type === "hotel" ? bookingDialog.name : `${bookingDialog.airline} ${bookingDialog.flightNumber}`}</h4>
                {bookingDialog.type === "hotel" ? (
                  <>
                    <div className="text-sm text-muted-foreground">{bookingDialog.address}</div>
                    <div className="flex gap-4 text-sm">
                      <span>Check-in: {bookingDialog.checkIn}</span>
                      <span>Check-out: {bookingDialog.checkOut}</span>
                    </div>
                    <div className="text-sm">{bookingDialog.nights} nights, {rooms} room(s), {guests} guest(s)</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm">{bookingDialog.originCode} → {bookingDialog.destinationCode}</div>
                    <div className="text-sm">{new Date(bookingDialog.departureTime).toLocaleString()}</div>
                    <div className="text-sm">{bookingDialog.duration} | {bookingDialog.cabinClass} | {bookingDialog.baggageIncluded}</div>
                  </>
                )}
              </div>

              {/* Price breakdown */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-bold text-sm">Price Breakdown</h4>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Local Price (VAT incl.)</span>
                  <span className="line-through">{formatCurrency(bookingDialog.localPrice, bookingDialog.localCurrency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">USD Equivalent</span>
                  <span>${bookingDialog.usdPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>VAT Removed</span>
                  <span>-${bookingDialog.vatAmount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">₮</span>
                    </div>
                    USDT Total
                  </span>
                  <span className="text-emerald-600">{bookingDialog.usdtPrice.toFixed(2)} USDT</span>
                </div>
                <div className="text-xs text-emerald-600 text-right">
                  You save ${bookingDialog.savings.toFixed(2)} ({bookingDialog.savingsPercent.toFixed(1)}%)
                </div>
              </div>

              {/* Payment method info */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-xs">
                <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">USDT Payment (TRC20)</p>
                <p className="text-muted-foreground">After confirming, you'll receive a wallet address to send USDT. Your booking will be confirmed once payment is verified on-chain.</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBookingDialog(null)}>Cancel</Button>
            <Button onClick={confirmBooking} disabled={createBooking.isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {createBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm & Pay with USDT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
