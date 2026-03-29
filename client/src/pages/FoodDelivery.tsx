import { useState, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  UtensilsCrossed, MapPin, Search, Loader2, Star, Clock,
  ShoppingCart, Plus, Minus, Trash2, ArrowLeft, ChevronRight,
  TrendingDown, Sparkles, Flame, Leaf, Timer, Package,
  CheckCircle2, Store, Filter, X, DollarSign, Bike
} from "lucide-react";
import { Link } from "wouter";

const COUNTRIES = [
  { code: "TH", name: "Thailand", city: "Bangkok", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", city: "Ho Chi Minh City", flag: "🇻🇳" },
  { code: "SG", name: "Singapore", city: "Singapore", flag: "🇸🇬" },
  { code: "PH", name: "Philippines", city: "Manila", flag: "🇵🇭" },
  { code: "JP", name: "Japan", city: "Tokyo", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", city: "Seoul", flag: "🇰🇷" },
];

const CATEGORY_ICONS: Record<string, { icon: string; label: string }> = {
  all: { icon: "🍽️", label: "All" },
  thai: { icon: "🍜", label: "Thai" },
  vietnamese: { icon: "🍲", label: "Vietnamese" },
  chinese: { icon: "🥡", label: "Chinese" },
  japanese: { icon: "🍣", label: "Japanese" },
  korean: { icon: "🥘", label: "Korean" },
  western: { icon: "🍔", label: "Western" },
  malay: { icon: "🍚", label: "Malay" },
  dessert: { icon: "🍰", label: "Dessert" },
  local: { icon: "🍛", label: "Local" },
};

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

export default function FoodDelivery() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const restaurantsQuery = trpc.delivery.restaurants.useQuery({
    city: selectedCountry.city,
    countryCode: selectedCountry.code,
    category: selectedCategory,
  });

  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const currentRestaurant = selectedRestaurant;
  const deliveryFee = currentRestaurant?.deliveryFee || 0;

  const pricingQuery = trpc.delivery.calculatePrice.useQuery({
    subtotal: cartSubtotal,
    deliveryFee,
    countryCode: selectedCountry.code,
  }, { enabled: cartSubtotal > 0 });

  const orderMutation = trpc.delivery.order.useMutation({
    onSuccess: (data) => {
      setOrderResult(data);
      setShowCartDialog(false);
      setShowOrderConfirm(true);
      setCart([]);
      toast.success("Order placed successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const myOrdersQuery = trpc.delivery.myOrders.useQuery(undefined, {
    enabled: isAuthenticated && activeTab === "orders",
  });

  const addToCart = (menuItem: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === menuItem.id);
      if (existing) {
        return prev.map(i => i.menuItemId === menuItem.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { menuItemId: menuItem.id, name: menuItem.name, price: menuItem.price, qty: 1 }];
    });
    toast.success(`Added ${menuItem.name} to cart`);
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.menuItemId === menuItemId) {
        const newQty = i.qty + delta;
        return newQty <= 0 ? i : { ...i, qty: newQty };
      }
      return i;
    }));
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => prev.filter(i => i.menuItemId !== menuItemId));
  };

  const handlePlaceOrder = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to place an order");
      window.location.href = "/login";
      return;
    }
    if (!deliveryAddress) {
      toast.error("Please enter a delivery address");
      return;
    }
    if (!pricingQuery.data) return;
    const p = pricingQuery.data;

    orderMutation.mutate({
      orderType: "food",
      pickupAddress: currentRestaurant?.name || "Restaurant",
      pickupPlaceName: currentRestaurant?.name,
      deliveryAddress,
      deliveryPhone,
      deliveryInstructions: deliveryNotes,
      restaurantName: currentRestaurant?.name,
      restaurantCategory: currentRestaurant?.category,
      orderItems: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal: cartSubtotal,
      deliveryFee,
      priceLocal: p.totalLocal,
      localCurrency: p.localCurrency,
      priceUsd: p.totalUsd,
      priceUsdt: p.totalUsdt,
      vatAmount: p.vatAmount,
      vatSaved: p.vatSaved,
      platformMarkup: p.platformMarkup,
      countryCode: selectedCountry.code,
    });
  };

  const filteredRestaurants = useMemo(() => {
    if (!restaurantsQuery.data?.restaurants) return [];
    if (!searchQuery) return restaurantsQuery.data.restaurants;
    const q = searchQuery.toLowerCase();
    return restaurantsQuery.data.restaurants.filter((r: any) =>
      r.name.toLowerCase().includes(q) || r.nameLocal.includes(q) ||
      r.tags.some((t: string) => t.toLowerCase().includes(q))
    );
  }, [restaurantsQuery.data, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white rounded-full -translate-x-1/4 translate-y-1/4" />
        </div>
        <div className="container py-8 md:py-12 relative">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shadow-lg">
              🍕
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Food Delivery
              </h1>
              <p className="text-white/70 text-sm mt-0.5">
                Order local cuisine. Pay with USDT. Save on VAT.
              </p>
            </div>
          </div>
          <div className="flex gap-6 mt-6 text-white/80 text-xs">
            <div className="flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" />
              <span>100+ Restaurants</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bike className="h-3.5 w-3.5" />
              <span>30 min avg delivery</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Save 10-15%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center gap-2" disabled={!selectedRestaurant}>
              <UtensilsCrossed className="h-4 w-4" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Orders
            </TabsTrigger>
          </TabsList>

          {/* ── Browse Tab ── */}
          <TabsContent value="browse">
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex gap-3 flex-wrap">
                <Select
                  value={selectedCountry.code}
                  onValueChange={(v) => {
                    const c = COUNTRIES.find(c => c.code === v);
                    if (c) setSelectedCountry(c);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">{c.flag} {c.city}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search restaurants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category Chips */}
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {Object.entries(CATEGORY_ICONS).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                        selectedCategory === key
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Restaurant List */}
              {restaurantsQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !filteredRestaurants.length ? (
                <Card className="border-0 shadow-md">
                  <CardContent className="py-12 text-center">
                    <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium">No restaurants found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try a different category or city</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRestaurants.map((restaurant: any) => (
                    <Card
                      key={restaurant.id}
                      className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] group overflow-hidden"
                      onClick={() => {
                        setSelectedRestaurant(restaurant);
                        setActiveTab("menu");
                      }}
                    >
                      {/* Restaurant Image Placeholder */}
                      <div className="h-36 bg-gradient-to-br from-orange-100 to-rose-100 dark:from-orange-950/30 dark:to-rose-950/30 relative flex items-center justify-center">
                        <span className="text-5xl">{CATEGORY_ICONS[restaurant.category]?.icon || "🍽️"}</span>
                        {restaurant.isFeatured && (
                          <Badge className="absolute top-2 left-2 bg-amber-500 text-white text-[10px]">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Featured
                          </Badge>
                        )}
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 dark:bg-black/70 rounded-full px-2 py-0.5 text-xs font-medium">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          {restaurant.rating}
                        </div>
                      </div>
                      <CardContent className="pt-3 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                              {restaurant.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{restaurant.nameLocal}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">{restaurant.priceRange}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {restaurant.deliveryTime} min</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {restaurant.distance}</span>
                          <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {restaurant.reviewCount} reviews</span>
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          {restaurant.tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground">{tag}</span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Menu Tab ── */}
          <TabsContent value="menu">
            {selectedRestaurant && (
              <div className="space-y-4">
                {/* Restaurant Header */}
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="h-32 bg-gradient-to-br from-orange-100 to-rose-100 dark:from-orange-950/30 dark:to-rose-950/30 flex items-center justify-center relative">
                    <span className="text-6xl">{CATEGORY_ICONS[selectedRestaurant.category]?.icon || "🍽️"}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-3 left-3 bg-white/80 dark:bg-black/60"
                      onClick={() => {
                        setSelectedRestaurant(null);
                        setActiveTab("browse");
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                  </div>
                  <CardContent className="pt-3 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold">{selectedRestaurant.name}</h2>
                        <p className="text-sm text-muted-foreground">{selectedRestaurant.nameLocal}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {selectedRestaurant.rating} ({selectedRestaurant.reviewCount})</span>
                          <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {selectedRestaurant.deliveryTime} min</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {selectedRestaurant.distance}</span>
                          <Badge variant="outline" className="text-[10px]">{selectedRestaurant.priceRange}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Menu Items */}
                <div className="grid gap-3">
                  {selectedRestaurant.menu.map((item: any) => {
                    const inCart = cart.find(c => c.menuItemId === item.id);
                    return (
                      <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="py-3">
                          <div className="flex items-center gap-4">
                            {/* Item image placeholder */}
                            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-950/20 dark:to-rose-950/20 flex items-center justify-center text-2xl flex-shrink-0">
                              {item.isSpicy ? "🌶️" : item.isVegetarian ? "🥬" : CATEGORY_ICONS[selectedRestaurant.category]?.icon || "🍽️"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.name}</span>
                                {item.isPopular && (
                                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">
                                    <Flame className="h-2.5 w-2.5 mr-0.5" /> Popular
                                  </Badge>
                                )}
                                {item.isVegetarian && (
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                                    <Leaf className="h-2.5 w-2.5 mr-0.5" /> Veg
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.nameLocal}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-semibold">
                                {restaurantsQuery.data?.currency} {item.price.toLocaleString()}
                              </div>
                              {inCart ? (
                                <div className="flex items-center gap-2 mt-1.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); updateCartQty(item.id, -1); }}
                                    className="h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <span className="text-sm font-semibold w-5 text-center">{inCart.qty}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); updateCartQty(item.id, 1); }}
                                    className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-1.5 h-7 text-xs"
                                  onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Floating Cart Button */}
                {cart.length > 0 && (
                  <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40">
                    <Button
                      size="lg"
                      className="rounded-full shadow-2xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 px-6 h-12"
                      onClick={() => setShowCartDialog(true)}
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      View Cart ({cart.reduce((s, i) => s + i.qty, 0)} items)
                      <span className="ml-2 font-bold">
                        {restaurantsQuery.data?.currency} {cartSubtotal.toLocaleString()}
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Orders Tab ── */}
          <TabsContent value="orders">
            {!isAuthenticated ? (
              <Card className="border-0 shadow-md">
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium mb-2">Sign in to view your order history</p>
                  <p className="text-sm text-muted-foreground mb-4">You can browse restaurants and menus without signing in. Sign in to place orders and track deliveries.</p>
                  <Link href="/login"><Button size="sm" className="gap-2">Sign In <ChevronRight className="h-3.5 w-3.5" /></Button></Link>
                </CardContent>
              </Card>
            ) : myOrdersQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !myOrdersQuery.data?.length ? (
              <Card className="border-0 shadow-md">
                <CardContent className="py-12 text-center">
                  <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">No orders yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Browse restaurants and place your first order!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {myOrdersQuery.data.map((order: any) => {
                  const statusColors: Record<string, string> = {
                    confirmed: "bg-blue-100 text-blue-700",
                    preparing: "bg-amber-100 text-amber-700",
                    picked_up: "bg-cyan-100 text-cyan-700",
                    in_transit: "bg-purple-100 text-purple-700",
                    delivered: "bg-emerald-100 text-emerald-700",
                    cancelled: "bg-red-100 text-red-700",
                  };
                  return (
                    <Card key={order.id} className="border-0 shadow-sm">
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-100 to-rose-100 dark:from-orange-950/30 dark:to-rose-950/30 flex items-center justify-center text-lg">
                            🍕
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{order.restaurantName || "Food Order"}</span>
                              <Badge className={`text-[10px] ${statusColors[order.status || 'confirmed'] || 'bg-muted'}`}>
                                {order.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                              {order.deliveryAddress}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">${parseFloat(order.priceUsdt || '0').toFixed(2)}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString()}
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

      {/* ── Cart / Checkout Dialog ── */}
      <Dialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Your Cart
            </DialogTitle>
            <DialogDescription>
              {currentRestaurant?.name} - {cart.reduce((s, i) => s + i.qty, 0)} items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Cart Items */}
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.menuItemId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {restaurantsQuery.data?.currency} {item.price.toLocaleString()} x {item.qty}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQty(item.menuItemId, -1)}
                      className="h-6 w-6 rounded-full bg-muted flex items-center justify-center"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-semibold w-4 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateCartQty(item.menuItemId, 1)}
                      className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.menuItemId)}
                      className="h-6 w-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center ml-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Delivery Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Delivery Details</h4>
              <Input
                placeholder="Delivery address *"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
              <Input
                placeholder="Phone number"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
              />
              <Input
                placeholder="Special instructions (optional)"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
            </div>

            <Separator />

            {/* Pricing Breakdown */}
            {pricingQuery.data && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{pricingQuery.data.localCurrency} {pricingQuery.data.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>{pricingQuery.data.localCurrency} {pricingQuery.data.deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Fee (5%)</span>
                  <span>{pricingQuery.data.localCurrency} {pricingQuery.data.serviceFee.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Local Total</span>
                  <span className="line-through text-muted-foreground">
                    {pricingQuery.data.localCurrency} {pricingQuery.data.totalLocal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>VAT Saved ({pricingQuery.data.vatRate}%)</span>
                  <span>-${pricingQuery.data.vatSaved.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">USDT Price</span>
                  <span className="text-xl font-bold text-primary">${pricingQuery.data.totalUsdt.toFixed(2)}</span>
                </div>
                <Badge className="w-full justify-center bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 py-1">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Save {pricingQuery.data.savingsPercent}% vs local price
                </Badge>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCartDialog(false)}>Continue Shopping</Button>
            {isAuthenticated ? (
              <Button
                onClick={handlePlaceOrder}
                disabled={orderMutation.isPending || !deliveryAddress}
                className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
              >
                {orderMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Placing order...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Place Order</>
                )}
              </Button>
            ) : (
              <Link href="/login">
                <Button className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 gap-2">
                  Sign in to Order <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Order Confirmation Dialog ── */}
      <Dialog open={showOrderConfirm} onOpenChange={setShowOrderConfirm}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-4">
            <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold mb-1">Order Confirmed!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your food is being prepared. Estimated delivery in {orderResult?.estimatedMinutes || 30} minutes.
            </p>
            {orderResult && (
              <div className="p-3 rounded-xl bg-muted/50 text-left space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono font-medium">#{orderResult.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-blue-100 text-blue-700 text-[10px]">{orderResult.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ETA</span>
                  <span>{orderResult.estimatedMinutes} min</span>
                </div>
              </div>
            )}
            <Button
              className="w-full mt-4"
              onClick={() => {
                setShowOrderConfirm(false);
                setActiveTab("orders");
                setSelectedRestaurant(null);
              }}
            >
              View My Orders
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
