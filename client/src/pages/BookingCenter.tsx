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
import { toast } from "sonner";
import {
  Plane, Hotel, MapPin, Search, ExternalLink, ArrowRight,
  Globe, Star, Loader2, ArrowLeft, Sparkles, TrendingDown
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function BookingCenter() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("flight");

  // Flight search state
  const [origin, setOrigin] = useState("ICN");
  const [destination, setDestination] = useState("");
  const [depDate, setDepDate] = useState("");
  const [retDate, setRetDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [cabin, setCabin] = useState<"economy" | "business" | "first">("economy");

  // Hotel search state
  const [hotelCity, setHotelCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState(1);
  const [guests, setGuests] = useState(2);

  // Results
  const [flightResults, setFlightResults] = useState<any>(null);
  const [hotelResults, setHotelResults] = useState<any>(null);

  const airports = trpc.booking.airports.useQuery();

  const searchFlights = trpc.booking.searchFlights.useMutation({
    onSuccess: (data) => {
      setFlightResults(data);
      toast.success(t("booking.center.comparePrices"));
    },
    onError: (err) => toast.error(err.message),
  });

  const searchHotels = trpc.booking.searchHotels.useMutation({
    onSuccess: (data) => {
      setHotelResults(data);
      toast.success(t("booking.center.comparePrices"));
    },
    onError: (err) => toast.error(err.message),
  });

  const trackClick = trpc.booking.trackClick.useMutation();

  const handleFlightSearch = () => {
    if (!destination || !depDate) {
      toast.error(t("admin.booking.fillRequired"));
      return;
    }
    searchFlights.mutate({
      origin, destination, departureDate: depDate,
      returnDate: retDate || undefined, passengers, cabinClass: cabin,
      source: "mypage",
    });
  };

  const handleHotelSearch = () => {
    if (!hotelCity || !checkIn || !checkOut) {
      toast.error(t("admin.booking.fillRequired"));
      return;
    }
    searchHotels.mutate({
      city: hotelCity, checkIn, checkOut, rooms, guests,
      source: "mypage",
    });
  };

  const handlePlatformClick = (linkId: number | undefined, url: string) => {
    if (linkId) trackClick.mutate({ linkId });
    window.open(url, "_blank");
  };

  const airportOptions = useMemo(() => {
    return airports.data?.map(a => ({ value: a.code, label: `${a.code} - ${a.cityKo}` })) || [];
  }, [airports.data]);

  const platformColors: Record<string, { bg: string; text: string; border: string }> = {
    trip_com: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
    booking_com: { bg: "bg-blue-900/20", text: "text-blue-300", border: "border-blue-800/30" },
    agoda: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
    skyscanner: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
    travelpayouts: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link href="/my-page">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                {t("booking.center.title")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("booking.center.subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Search Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-sm mx-auto">
            <TabsTrigger value="flight" className="gap-2">
              <Plane className="h-4 w-4" /> {t("booking.center.flightTab")}
            </TabsTrigger>
            <TabsTrigger value="hotel" className="gap-2">
              <Hotel className="h-4 w-4" /> {t("booking.center.hotelTab")}
            </TabsTrigger>
          </TabsList>

          {/* Flight Search */}
          <TabsContent value="flight">
            <Card className="border-blue-500/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plane className="h-5 w-5 text-blue-500" />
                  {t("admin.booking.flightSearch")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{t("admin.booking.origin")}</Label>
                    <Select value={origin} onValueChange={setOrigin}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {airportOptions.map(a => (
                          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("admin.booking.destination")}</Label>
                    <Select value={destination} onValueChange={setDestination}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t("admin.booking.selectDestination")} />
                      </SelectTrigger>
                      <SelectContent>
                        {airportOptions.map(a => (
                          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">{t("admin.booking.departureDate")}</Label>
                    <Input type="date" className="h-9" value={depDate} onChange={e => setDepDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("admin.booking.returnDate")}</Label>
                    <Input type="date" className="h-9" value={retDate} onChange={e => setRetDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("admin.booking.passengers")}</Label>
                    <Input type="number" className="h-9" min={1} max={9} value={passengers} onChange={e => setPassengers(parseInt(e.target.value) || 1)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("admin.booking.cabinClass")}</Label>
                    <Select value={cabin} onValueChange={(v: any) => setCabin(v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economy">{t("admin.booking.economy")}</SelectItem>
                        <SelectItem value="business">{t("admin.booking.business")}</SelectItem>
                        <SelectItem value="first">{t("admin.booking.first")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleFlightSearch} disabled={searchFlights.isPending} className="w-full gap-2">
                  {searchFlights.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {t("admin.booking.searchFlights")}
                </Button>
              </CardContent>
            </Card>

            {/* Flight Results */}
            {flightResults && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  {flightResults.origin.cityKo}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  {flightResults.destination.cityKo}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {flightResults.platforms.map((p: any, i: number) => {
                    const colors = platformColors[p.platform] || { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30" };
                    return (
                      <Card key={i} className={`${colors.border} border hover:shadow-lg transition-all cursor-pointer group`}
                        onClick={() => handlePlatformClick(undefined, p.url)}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                <Plane className={`h-4 w-4 ${colors.text}`} />
                              </div>
                              <h3 className="font-bold">{p.platformName}</h3>
                            </div>
                            {i === 0 && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {t("booking.center.bestDeal")}
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-1">
                            {p.features.slice(0, 2).map((f: string, fi: number) => (
                              <div key={fi} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Star className="h-3 w-3 text-yellow-500 shrink-0" />
                                {f}
                              </div>
                            ))}
                          </div>

                          <Button className="w-full gap-2 group-hover:bg-primary/90" size="sm">
                            <ExternalLink className="h-3 w-3" />
                            {t("booking.center.bookNow")}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Hotel Search */}
          <TabsContent value="hotel">
            <Card className="border-purple-500/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hotel className="h-5 w-5 text-purple-500" />
                  {t("admin.booking.hotelSearch")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">{t("admin.booking.city")}</Label>
                    <Input className="h-9" value={hotelCity} onChange={e => setHotelCity(e.target.value)} placeholder={t("admin.booking.cityPlaceholder")} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">{t("admin.booking.checkIn")}</Label>
                    <Input type="date" className="h-9" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("admin.booking.checkOut")}</Label>
                    <Input type="date" className="h-9" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("admin.booking.rooms")}</Label>
                    <Input type="number" className="h-9" min={1} max={20} value={rooms} onChange={e => setRooms(parseInt(e.target.value) || 1)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("admin.booking.guests")}</Label>
                    <Input type="number" className="h-9" min={1} max={50} value={guests} onChange={e => setGuests(parseInt(e.target.value) || 2)} />
                  </div>
                </div>

                <Button onClick={handleHotelSearch} disabled={searchHotels.isPending} className="w-full gap-2">
                  {searchHotels.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {t("admin.booking.searchHotels")}
                </Button>
              </CardContent>
            </Card>

            {/* Hotel Results */}
            {hotelResults && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <MapPin className="h-5 w-5 text-purple-500" />
                  {hotelCity}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hotelResults.platforms.map((p: any, i: number) => {
                    const colors = platformColors[p.platform] || { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30" };
                    return (
                      <Card key={i} className={`${colors.border} border hover:shadow-lg transition-all cursor-pointer group`}
                        onClick={() => handlePlatformClick(undefined, p.url)}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                <Hotel className={`h-4 w-4 ${colors.text}`} />
                              </div>
                              <h3 className="font-bold">{p.platformName}</h3>
                            </div>
                            {i === 0 && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {t("booking.center.bestDeal")}
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-1">
                            {p.features.slice(0, 2).map((f: string, fi: number) => (
                              <div key={fi} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Star className="h-3 w-3 text-yellow-500 shrink-0" />
                                {f}
                              </div>
                            ))}
                          </div>

                          <Button className="w-full gap-2 group-hover:bg-primary/90" size="sm">
                            <ExternalLink className="h-3 w-3" />
                            {t("booking.center.bookNow")}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Powered by footer */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          {t("booking.center.poweredBy")} Trip.com, Booking.com, Agoda, Skyscanner
        </div>
      </div>
    </div>
  );
}
