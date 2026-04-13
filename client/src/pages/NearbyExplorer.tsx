import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapView } from "@/components/Map";
import {
  ArrowLeft, MapPin, Search, Navigation, Star, Clock, Phone,
  ExternalLink, UtensilsCrossed, Coffee, Hotel, ShoppingBag,
  Landmark, Banknote, Pill, Building2, Loader2, X, ChevronRight,
  Locate, Filter, List, Map as MapIcon, Heart, Share2, Copy, Check,
  MapPinOff, Compass, RefreshCw, Info
} from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════
// Category definitions
// ═══════════════════════════════════════════════════════
type PlaceCategory = {
  id: string;
  icon: any;
  labelKey: string;
  fallbackLabel: string;
  types: string[];
  color: string;
  gradient: string;
  bgColor: string;
};

const CATEGORIES: PlaceCategory[] = [
  { id: "restaurant", icon: UtensilsCrossed, labelKey: "nearby.cat_restaurant", fallbackLabel: "식당", types: ["restaurant", "food"], color: "text-orange-500", gradient: "from-orange-500 to-red-500", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  { id: "cafe", icon: Coffee, labelKey: "nearby.cat_cafe", fallbackLabel: "카페", types: ["cafe"], color: "text-amber-600", gradient: "from-amber-500 to-yellow-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "attraction", icon: Landmark, labelKey: "nearby.cat_attraction", fallbackLabel: "관광지", types: ["tourist_attraction", "museum", "art_gallery"], color: "text-blue-500", gradient: "from-blue-500 to-indigo-500", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "hotel", icon: Hotel, labelKey: "nearby.cat_hotel", fallbackLabel: "호텔", types: ["lodging"], color: "text-rose-500", gradient: "from-rose-500 to-pink-500", bgColor: "bg-rose-50 dark:bg-rose-950/30" },
  { id: "convenience", icon: ShoppingBag, labelKey: "nearby.cat_convenience", fallbackLabel: "편의점", types: ["convenience_store", "supermarket"], color: "text-green-500", gradient: "from-green-500 to-emerald-500", bgColor: "bg-green-50 dark:bg-green-950/30" },
  { id: "atm", icon: Banknote, labelKey: "nearby.cat_atm", fallbackLabel: "ATM", types: ["atm", "bank"], color: "text-emerald-500", gradient: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  { id: "pharmacy", icon: Pill, labelKey: "nearby.cat_pharmacy", fallbackLabel: "약국", types: ["pharmacy", "drugstore"], color: "text-red-500", gradient: "from-red-500 to-rose-500", bgColor: "bg-red-50 dark:bg-red-950/30" },
  { id: "hospital", icon: Building2, labelKey: "nearby.cat_hospital", fallbackLabel: "병원", types: ["hospital", "doctor"], color: "text-sky-500", gradient: "from-sky-500 to-blue-500", bgColor: "bg-sky-50 dark:bg-sky-950/30" },
];

// ═══════════════════════════════════════════════════════
// Place type
// ═══════════════════════════════════════════════════════
type NearbyPlace = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  types: string[];
  photoUrl?: string;
  distance?: number;
};

type PlaceDetail = {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  weekdayText?: string[];
  photoUrls: string[];
  lat: number;
  lng: number;
  priceLevel?: number;
};

// ═══════════════════════════════════════════════════════
// Utility: distance calc
// ═══════════════════════════════════════════════════════
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// ═══════════════════════════════════════════════════════
// Price level display
// ═══════════════════════════════════════════════════════
function PriceLevel({ level }: { level?: number }) {
  if (level === undefined || level === null) return null;
  return (
    <span className="text-xs text-muted-foreground">
      {"$".repeat(level)}
      <span className="opacity-30">{"$".repeat(4 - level)}</span>
    </span>
  );
}

// ═══════════════════════════════════════════════════════
// Star rating display
// ═══════════════════════════════════════════════════════
function StarRating({ rating, count }: { rating?: number; count?: number }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="text-sm font-medium">{rating.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count.toLocaleString()})</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Location Permission Banner
// ═══════════════════════════════════════════════════════
function LocationBanner({
  locationDenied,
  onRetry,
  t,
}: {
  locationDenied: boolean;
  onRetry: () => void;
  t: (key: string, fallback: string) => string;
}) {
  if (!locationDenied) return null;
  return (
    <div className="mx-4 mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
      <MapPinOff className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {t("nearby.location_denied_title", "위치 권한이 거부되었습니다")}
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
          {t("nearby.location_denied_desc", "기본 위치(방콕)를 기준으로 주변 장소를 표시합니다. 정확한 결과를 위해 위치 권한을 허용해주세요.")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
          onClick={onRetry}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          {t("nearby.retry_location", "위치 다시 요청")}
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Empty State Component
// ═══════════════════════════════════════════════════════
function EmptyState({
  searchQuery,
  category,
  onClearSearch,
  onRetry,
  t,
}: {
  searchQuery: string;
  category?: PlaceCategory;
  onClearSearch: () => void;
  onRetry: () => void;
  t: (key: string, fallback: string) => string;
}) {
  const Icon = category?.icon || MapPin;
  return (
    <div className="text-center py-16 px-6">
      <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${category?.bgColor || "bg-muted"} mb-4`}>
        <Icon className={`h-10 w-10 ${category?.color || "text-muted-foreground"} opacity-60`} />
      </div>
      <h3 className="text-base font-semibold mb-1">
        {searchQuery
          ? t("nearby.no_search_results", "검색 결과가 없습니다")
          : t("nearby.no_results", "주변에 장소가 없습니다")}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        {searchQuery
          ? t("nearby.try_different_search", "다른 검색어를 시도하거나 카테고리를 선택해보세요")
          : t("nearby.try_other", "다른 카테고리를 선택하거나 지도를 이동하여 검색해보세요")}
      </p>
      <div className="flex items-center justify-center gap-2 mt-4">
        {searchQuery && (
          <Button variant="outline" size="sm" onClick={onClearSearch}>
            <X className="h-3.5 w-3.5 mr-1" />
            {t("nearby.clear_search", "검색 초기화")}
          </Button>
        )}
        <Button variant="default" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          {t("nearby.retry", "다시 검색")}
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function NearbyExplorer() {
  const { t } = useTranslation();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("restaurant");
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [resultsCount, setResultsCount] = useState(0);

  // Default center (Bangkok - common travel destination)
  const defaultCenter = useMemo(() => ({ lat: 13.7563, lng: 100.5018 }), []);

  // ── Get user location ──
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationLoading(false);
      setLocationDenied(true);
      return;
    }
    setLocationLoading(true);
    setLocationDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
        setLocationDenied(false);
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationDenied(true);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // ── Clear markers ──
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    if (infoWindowRef.current) infoWindowRef.current.close();
  }, []);

  // ── Create custom marker element ──
  const createMarkerContent = useCallback((category: PlaceCategory, isHighlighted = false) => {
    const el = document.createElement("div");
    const size = isHighlighted ? 36 : 28;
    el.innerHTML = `<div style="
      width:${size}px;height:${size}px;
      background:linear-gradient(135deg, var(--from), var(--to));
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;
      transition:transform 0.2s;
      ${isHighlighted ? "transform:scale(1.2);" : ""}
    " class="marker-pin"></div>`;
    // Set CSS custom properties for gradient
    const gradientMap: Record<string, [string, string]> = {
      restaurant: ["#f97316", "#ef4444"],
      cafe: ["#f59e0b", "#ca8a04"],
      attraction: ["#3b82f6", "#6366f1"],
      hotel: ["#f43f5e", "#ec4899"],
      convenience: ["#22c55e", "#10b981"],
      atm: ["#10b981", "#14b8a6"],
      pharmacy: ["#ef4444", "#f43f5e"],
      hospital: ["#0ea5e9", "#3b82f6"],
    };
    const [from, to] = gradientMap[category.id] || ["#6b7280", "#9ca3af"];
    el.style.setProperty("--from", from);
    el.style.setProperty("--to", to);
    return el;
  }, []);

  // ── Search nearby places ──
  const searchNearby = useCallback(
    (category: PlaceCategory, center?: { lat: number; lng: number }) => {
      if (!mapRef.current || !placesServiceRef.current) return;
      const searchCenter = center || userLocation || defaultCenter;

      setLoading(true);
      clearMarkers();

      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(searchCenter.lat, searchCenter.lng),
        radius: 2000,
        type: category.types[0],
      };

      placesServiceRef.current.nearbySearch(request, (results, status) => {
        setLoading(false);
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
          setPlaces([]);
          setResultsCount(0);
          return;
        }

        const mapped: NearbyPlace[] = results
          .filter((r) => r.geometry?.location)
          .map((r) => {
            const lat = r.geometry!.location!.lat();
            const lng = r.geometry!.location!.lng();
            return {
              placeId: r.place_id || "",
              name: r.name || "",
              address: r.vicinity || "",
              lat,
              lng,
              rating: r.rating,
              userRatingsTotal: r.user_ratings_total,
              openNow: r.opening_hours?.isOpen?.(),
              types: r.types || [],
              photoUrl: r.photos?.[0]?.getUrl({ maxWidth: 400 }),
              distance: haversineDistance(searchCenter.lat, searchCenter.lng, lat, lng),
            };
          })
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));

        setPlaces(mapped);
        setResultsCount(mapped.length);

        // Add markers with custom styling
        mapped.forEach((place) => {
          const markerContent = createMarkerContent(category);
          const marker = new google.maps.marker.AdvancedMarkerElement({
            map: mapRef.current!,
            position: { lat: place.lat, lng: place.lng },
            title: place.name,
            content: markerContent,
          });
          marker.addListener("click", () => {
            fetchPlaceDetail(place.placeId);
            mapRef.current?.panTo({ lat: place.lat, lng: place.lng });
          });
          markersRef.current.push(marker);
        });

        // Fit bounds
        if (mapped.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(new google.maps.LatLng(searchCenter.lat, searchCenter.lng));
          mapped.slice(0, 10).forEach((p) => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
          mapRef.current?.fitBounds(bounds, 60);
        }
      });
    },
    [userLocation, defaultCenter, clearMarkers, createMarkerContent]
  );

  // ── Text search ──
  const searchByText = useCallback(
    (query: string) => {
      if (!mapRef.current || !placesServiceRef.current || !query.trim()) return;
      const searchCenter = userLocation || defaultCenter;

      setLoading(true);
      clearMarkers();

      const request: google.maps.places.TextSearchRequest = {
        query,
        location: new google.maps.LatLng(searchCenter.lat, searchCenter.lng),
        radius: 3000,
      };

      placesServiceRef.current.textSearch(request, (results, status) => {
        setLoading(false);
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
          setPlaces([]);
          setResultsCount(0);
          return;
        }

        const mapped: NearbyPlace[] = results
          .filter((r) => r.geometry?.location)
          .map((r) => {
            const lat = r.geometry!.location!.lat();
            const lng = r.geometry!.location!.lng();
            return {
              placeId: r.place_id || "",
              name: r.name || "",
              address: r.formatted_address || "",
              lat,
              lng,
              rating: r.rating,
              userRatingsTotal: r.user_ratings_total,
              openNow: r.opening_hours?.isOpen?.(),
              types: r.types || [],
              photoUrl: r.photos?.[0]?.getUrl({ maxWidth: 400 }),
              distance: haversineDistance(searchCenter.lat, searchCenter.lng, lat, lng),
            };
          })
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));

        setPlaces(mapped);
        setResultsCount(mapped.length);

        mapped.forEach((place) => {
          const marker = new google.maps.marker.AdvancedMarkerElement({
            map: mapRef.current!,
            position: { lat: place.lat, lng: place.lng },
            title: place.name,
          });
          marker.addListener("click", () => {
            fetchPlaceDetail(place.placeId);
            mapRef.current?.panTo({ lat: place.lat, lng: place.lng });
          });
          markersRef.current.push(marker);
        });

        if (mapped.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          mapped.slice(0, 10).forEach((p) => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
          mapRef.current?.fitBounds(bounds, 60);
        }
      });
    },
    [userLocation, defaultCenter, clearMarkers]
  );

  // ── Fetch place detail ──
  const fetchPlaceDetail = useCallback(
    (placeId: string) => {
      if (!placesServiceRef.current) return;
      setDetailLoading(true);

      placesServiceRef.current.getDetails(
        {
          placeId,
          fields: [
            "place_id", "name", "formatted_address", "formatted_phone_number",
            "website", "rating", "user_ratings_total", "opening_hours",
            "photos", "geometry", "price_level", "types",
          ],
        },
        (result, status) => {
          setDetailLoading(false);
          if (status !== google.maps.places.PlacesServiceStatus.OK || !result) return;

          setSelectedPlace({
            placeId: result.place_id || placeId,
            name: result.name || "",
            address: result.formatted_address || "",
            phone: result.formatted_phone_number,
            website: result.website,
            rating: result.rating,
            userRatingsTotal: result.user_ratings_total,
            openNow: result.opening_hours?.isOpen?.(),
            weekdayText: result.opening_hours?.weekday_text,
            photoUrls: result.photos?.slice(0, 5).map((p) => p.getUrl({ maxWidth: 600 })) || [],
            lat: result.geometry?.location?.lat() || 0,
            lng: result.geometry?.location?.lng() || 0,
            priceLevel: result.price_level,
          });
        }
      );
    },
    []
  );

  // ── Map ready handler ──
  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      placesServiceRef.current = new google.maps.places.PlacesService(map);
      infoWindowRef.current = new google.maps.InfoWindow();

      // Add user location marker
      const center = userLocation || defaultCenter;
      map.setCenter(center);
      map.setZoom(15);

      // Blue dot for user location
      if (userLocation) {
        const el = document.createElement("div");
        el.innerHTML = `<div style="width:18px;height:18px;background:#4285F4;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(66,133,244,0.5);animation:pulse 2s infinite"></div>`;
        new google.maps.marker.AdvancedMarkerElement({
          map,
          position: userLocation,
          content: el,
          title: "My Location",
        });
      }

      // Initial search
      const cat = CATEGORIES.find((c) => c.id === selectedCategory);
      if (cat) searchNearby(cat, center);
    },
    [userLocation, defaultCenter, selectedCategory, searchNearby]
  );

  // ── Category change ──
  const handleCategoryChange = useCallback(
    (catId: string) => {
      setSelectedCategory(catId);
      setSearchQuery("");
      const cat = CATEGORIES.find((c) => c.id === catId);
      if (cat) searchNearby(cat);
    },
    [searchNearby]
  );

  // ── Recenter ──
  const handleRecenter = useCallback(() => {
    if (!mapRef.current) return;
    if (userLocation) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(15);
      // Re-search from current location
      const cat = CATEGORIES.find((c) => c.id === selectedCategory);
      if (cat) searchNearby(cat, userLocation);
    } else {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setLocationDenied(false);
          mapRef.current?.panTo(loc);
          mapRef.current?.setZoom(15);
          const cat = CATEGORIES.find((c) => c.id === selectedCategory);
          if (cat) searchNearby(cat, loc);
        },
        () => {
          toast.error(t("nearby.location_error", "위치를 가져올 수 없습니다"));
          setLocationDenied(true);
        }
      );
    }
  }, [userLocation, t, selectedCategory, searchNearby]);

  // ── Copy address ──
  const handleCopyAddress = useCallback((address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    toast.success(t("nearby.address_copied", "주소가 복사되었습니다"));
    setTimeout(() => setCopiedAddress(false), 2000);
  }, [t]);

  // ── Share place ──
  const handleSharePlace = useCallback((place: PlaceDetail) => {
    const url = `https://www.google.com/maps/place/?q=place_id:${place.placeId}`;
    if (navigator.share) {
      navigator.share({ title: place.name, text: `${place.name} - ${place.address}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t("nearby.link_copied", "링크가 복사되었습니다"));
    }
  }, [t]);

  // ── Search submit ──
  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) searchByText(searchQuery.trim());
    },
    [searchQuery, searchByText]
  );

  // ── Clear search and re-search category ──
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    const cat = CATEGORIES.find(c => c.id === selectedCategory);
    if (cat) searchNearby(cat);
  }, [selectedCategory, searchNearby]);

  // ── Retry search ──
  const handleRetrySearch = useCallback(() => {
    if (searchQuery.trim()) {
      searchByText(searchQuery.trim());
    } else {
      const cat = CATEGORIES.find(c => c.id === selectedCategory);
      if (cat) searchNearby(cat);
    }
  }, [searchQuery, selectedCategory, searchByText, searchNearby]);

  const currentCategory = CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="shrink-0 -ml-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold truncate">{t("nearby.title", "주변 탐색")}</h1>
              {!loading && resultsCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
                  {resultsCount}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              {userLocation ? (
                <>
                  <Compass className="h-3 w-3 text-green-500" />
                  {t("nearby.location_found", "현재 위치 기반")}
                </>
              ) : (
                <>
                  <Info className="h-3 w-3 text-amber-500" />
                  {t("nearby.location_default", "기본 위치 (방콕)")}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("map")}
            >
              <MapIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Location denied banner ── */}
        <LocationBanner locationDenied={locationDenied} onRetry={requestLocation} t={t} />

        {/* ── Search bar ── */}
        <div className="px-4 pb-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("nearby.search_placeholder", "장소, 식당, 카페 검색...")}
              className="pl-9 pr-10 h-10 rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </form>
        </div>

        {/* ── Category chips ── */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap active:scale-95 ${
                    isActive
                      ? `bg-gradient-to-r ${cat.gradient} text-white shadow-sm`
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(cat.labelKey, cat.fallbackLabel)}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 relative">
        {/* Map view */}
        {viewMode === "map" && (
          <div className="relative h-[calc(100vh-220px)] md:h-[calc(100vh-200px)]">
            {locationLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("nearby.getting_location", "위치를 확인하는 중...")}</p>
                  <p className="text-xs text-muted-foreground/60">{t("nearby.location_hint", "위치 권한을 허용해주세요")}</p>
                </div>
              </div>
            ) : (
              <MapView
                className="w-full h-full"
                initialCenter={userLocation || defaultCenter}
                initialZoom={15}
                onMapReady={handleMapReady}
              />
            )}

            {/* Recenter button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-24 right-4 z-10 h-11 w-11 rounded-full shadow-lg border"
              onClick={handleRecenter}
              title={t("nearby.recenter", "현재 위치로 이동")}
            >
              <Locate className="h-5 w-5" />
            </Button>

            {/* Bottom place cards (horizontal scroll) */}
            {places.length > 0 && !loading && (
              <div className="absolute bottom-4 left-0 right-0 z-10">
                {/* Scroll hint gradient */}
                <div className="relative px-4 overflow-x-auto scrollbar-hide scroll-smooth">
                  <div className="flex gap-3 min-w-max pb-2 snap-x snap-mandatory">
                    {places.slice(0, 10).map((place) => (
                      <button
                        key={place.placeId}
                        onClick={() => {
                          fetchPlaceDetail(place.placeId);
                          mapRef.current?.panTo({ lat: place.lat, lng: place.lng });
                          mapRef.current?.setZoom(17);
                        }}
                        className="bg-card rounded-xl shadow-lg border p-3 min-w-[220px] max-w-[260px] text-left hover:shadow-xl transition-all active:scale-[0.98] snap-start"
                      >
                        {place.photoUrl && (
                          <img loading="lazy" decoding="async"
                            src={place.photoUrl}
                            alt={place.name}
                            className="w-full h-28 object-cover rounded-lg mb-2"
                          />
                        )}
                        <p className="font-medium text-sm truncate">{place.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating rating={place.rating} count={place.userRatingsTotal} />
                          {place.distance !== undefined && (
                            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-0.5">
                              <Navigation className="h-3 w-3" />
                              {formatDistance(place.distance)}
                            </span>
                          )}
                        </div>
                        {place.openNow !== undefined && (
                          <Badge
                            variant={place.openNow ? "default" : "secondary"}
                            className={`mt-1.5 text-[10px] ${place.openNow ? "bg-green-500/10 text-green-600 border-green-200" : ""}`}
                          >
                            {place.openNow ? t("nearby.open", "영업 중") : t("nearby.closed", "영업 종료")}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 bg-background/30 flex items-center justify-center z-20">
                <div className="bg-card rounded-xl shadow-lg p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">{t("nearby.searching", "검색 중...")}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* List view */}
        {viewMode === "list" && (
          <div className="p-4 space-y-3 pb-24">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-3 flex gap-3">
                    <Skeleton className="w-20 h-20 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : places.length === 0 ? (
              <EmptyState
                searchQuery={searchQuery}
                category={currentCategory}
                onClearSearch={handleClearSearch}
                onRetry={handleRetrySearch}
                t={t}
              />
            ) : (
              <>
                {/* Results summary */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pb-1">
                  <span>
                    {searchQuery
                      ? t("nearby.search_results_for", `"${searchQuery}" 검색 결과`)
                      : `${t(currentCategory?.labelKey || "", currentCategory?.fallbackLabel || "")} ${t("nearby.results", "결과")}`}
                    {" "}({resultsCount}{t("nearby.count_suffix", "개")})
                  </span>
                  {userLocation && (
                    <span className="flex items-center gap-0.5">
                      <Navigation className="h-3 w-3" />
                      {t("nearby.sorted_by_distance", "거리순")}
                    </span>
                  )}
                </div>

                {places.map((place) => (
                  <Card
                    key={place.placeId}
                    className="cursor-pointer hover:shadow-md transition-all active:scale-[0.99] overflow-hidden"
                    onClick={() => fetchPlaceDetail(place.placeId)}
                  >
                    <CardContent className="p-3 flex gap-3">
                      {place.photoUrl ? (
                        <img loading="lazy" decoding="async"
                          src={place.photoUrl}
                          alt={place.name}
                          className="w-20 h-20 object-cover rounded-lg shrink-0"
                        />
                      ) : (
                        <div className={`w-20 h-20 rounded-lg ${currentCategory?.bgColor || "bg-muted"} flex items-center justify-center shrink-0`}>
                          {currentCategory && <currentCategory.icon className={`h-8 w-8 ${currentCategory.color} opacity-50`} />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{place.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{place.address}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <StarRating rating={place.rating} count={place.userRatingsTotal} />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {place.openNow !== undefined && (
                            <Badge
                              variant={place.openNow ? "default" : "secondary"}
                              className={`text-[10px] ${place.openNow ? "bg-green-500/10 text-green-600 border-green-200" : ""}`}
                            >
                              {place.openNow ? t("nearby.open", "영업 중") : t("nearby.closed", "영업 종료")}
                            </Badge>
                          )}
                          {place.distance !== undefined && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Navigation className="h-3 w-3" />
                              {formatDistance(place.distance)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 self-center" />
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Place Detail Dialog ── */}
      <Dialog open={!!selectedPlace} onOpenChange={(open) => !open && setSelectedPlace(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-0">
          {detailLoading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : selectedPlace && (
            <>
              {/* Photos carousel */}
              {selectedPlace.photoUrls.length > 0 && (
                <div className="relative">
                  <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory">
                    <div className="flex min-w-max">
                      {selectedPlace.photoUrls.map((url, i) => (
                        <img loading="lazy" decoding="async"
                          key={i}
                          src={url}
                          alt={`${selectedPlace.name} ${i + 1}`}
                          className="w-full h-52 object-cover shrink-0 snap-start"
                        />
                      ))}
                    </div>
                  </div>
                  {selectedPlace.photoUrls.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {selectedPlace.photoUrls.map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 space-y-4">
                {/* Name & rating */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold leading-tight">{selectedPlace.name}</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 -mr-1"
                      onClick={() => handleSharePlace(selectedPlace)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <StarRating rating={selectedPlace.rating} count={selectedPlace.userRatingsTotal} />
                    <PriceLevel level={selectedPlace.priceLevel} />
                    {selectedPlace.openNow !== undefined && (
                      <Badge
                        variant={selectedPlace.openNow ? "default" : "secondary"}
                        className={`text-[10px] ${selectedPlace.openNow ? "bg-green-500/10 text-green-600 border-green-200" : ""}`}
                      >
                        {selectedPlace.openNow ? t("nearby.open", "영업 중") : t("nearby.closed", "영업 종료")}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm">{selectedPlace.address}</p>
                    <button
                      onClick={() => handleCopyAddress(selectedPlace.address)}
                      className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline"
                    >
                      {copiedAddress ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedAddress ? t("nearby.copied", "복사됨") : t("nearby.copy_address", "주소 복사")}
                    </button>
                  </div>
                </div>

                {/* Phone */}
                {selectedPlace.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedPlace.phone}`} className="text-sm text-primary hover:underline">
                      {selectedPlace.phone}
                    </a>
                  </div>
                )}

                {/* Opening hours */}
                {selectedPlace.weekdayText && selectedPlace.weekdayText.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t("nearby.hours", "영업시간")}</span>
                    </div>
                    <div className="ml-6 space-y-0.5">
                      {selectedPlace.weekdayText.map((text, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{text}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}`,
                        "_blank"
                      )
                    }
                  >
                    <Navigation className="h-4 w-4 mr-1.5" />
                    {t("nearby.directions", "길찾기")}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/place/?q=place_id:${selectedPlace.placeId}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    {t("nearby.google_maps", "Google Maps")}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      window.open(
                        `https://grab.onelink.me/2695613898?af_dp=grab://open?screenType=BOOKING&dropOffLatitude=${selectedPlace.lat}&dropOffLongitude=${selectedPlace.lng}`,
                        "_blank"
                      )
                    }
                  >
                    <Navigation className="h-4 w-4 mr-1.5" />
                    {t("nearby.grab", "Grab")}
                  </Button>
                  {selectedPlace.website && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(selectedPlace.website, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      {t("nearby.website", "웹사이트")}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
