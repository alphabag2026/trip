import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users, ClipboardList, Plane, Globe, Send, Search, Home, Car, Hotel, CalendarDays, Edit, MessageCircle, FileText, Megaphone, Luggage, UtensilsCrossed, DoorOpen, Cloud, Handshake, CreditCard, Ticket, ShoppingCart, TrendingUp, Key, Upload, BookOpen, ShieldCheck, Receipt, Shield, Image, ChevronDown, MapPin, Navigation, Route, Target, type LucideIcon } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

// ── Role-based menu definitions ──
// roles: which user roles can see this menu item
// "all" = visible to admin, superadmin, organizer
type MenuItemDef = {
  icon: LucideIcon;
  labelKey: string;
  path: string;
  roles: ("admin" | "superadmin" | "organizer" | "all")[];
};

type MenuGroup = {
  labelKey: string;
  items: MenuItemDef[];
  roles: ("admin" | "superadmin" | "organizer" | "all")[];
};

// ────────────────────────────────────────────────────────────────
// 대메뉴 / 소메뉴 구조로 재정렬 (편리성 기준)
// ────────────────────────────────────────────────────────────────
const menuGroups: MenuGroup[] = [
  // ─── 1. 대시보드 ───
  {
    labelKey: "admin.sidebarGroup.overview",
    roles: ["all"],
    items: [
      { icon: LayoutDashboard, labelKey: "admin.sidebar.dashboard", path: "/", roles: ["all"] },
      { icon: Users, labelKey: "admin.sidebar.attendeeDashboard", path: "/attendee-dashboard", roles: ["all"] },
    ],
  },
  // ─── 2. 밋업 & 참가자 ───
  {
    labelKey: "admin.sidebarGroup.meetupParticipants",
    roles: ["all"],
    items: [
      { icon: Plane, labelKey: "admin.sidebar.meetups", path: "/meetups", roles: ["all"] },
      { icon: ClipboardList, labelKey: "admin.sidebar.registrations", path: "/registrations", roles: ["all"] },
      { icon: Edit, labelKey: "admin.sidebar.modRequests", path: "/mod-requests", roles: ["all"] },
      { icon: ClipboardList, labelKey: "admin.sidebar.surveys", path: "/surveys", roles: ["all"] },
      { icon: CreditCard, labelKey: "admin.sidebar.invitation", path: "/invitation", roles: ["all"] },
    ],
  },
  // ─── 3. 교통 & 숙소 ───
  {
    labelKey: "admin.sidebarGroup.transportAccom",
    roles: ["all"],
    items: [
      { icon: Plane, labelKey: "admin.sidebar.flights", path: "/flights", roles: ["all"] },
      { icon: Car, labelKey: "admin.sidebar.pickups", path: "/pickups", roles: ["all"] },
      { icon: Hotel, labelKey: "admin.sidebar.accommodations", path: "/accommodations", roles: ["all"] },
    ],
  },
  // ─── 4. 일정 & 여정 ───
  {
    labelKey: "admin.sidebarGroup.scheduleItinerary",
    roles: ["all"],
    items: [
      { icon: CalendarDays, labelKey: "admin.sidebar.scheduleEvents", path: "/schedule-events", roles: ["all"] },
      { icon: MapPin, labelKey: "admin.sidebar.itineraries", path: "/itineraries", roles: ["all"] },
      { icon: Globe, labelKey: "admin.sidebar.travelInfo", path: "/travel-info", roles: ["all"] },
    ],
  },
  // ─── 5. 현장 운영 ───
  {
    labelKey: "admin.sidebarGroup.onsite",
    roles: ["all"],
    items: [
      { icon: Luggage, labelKey: "admin.sidebar.baggageCheckin", path: "/baggage-checkin", roles: ["all"] },
      { icon: UtensilsCrossed, labelKey: "admin.sidebar.mealDashboard", path: "/meal-dashboard", roles: ["all"] },
      { icon: DoorOpen, labelKey: "admin.sidebar.hotelRooms", path: "/hotel-rooms", roles: ["all"] },
      { icon: ShieldCheck, labelKey: "admin.sidebar.passportList", path: "/passport-list", roles: ["all"] },
      { icon: Receipt, labelKey: "admin.sidebar.expenses", path: "/expenses", roles: ["all"] },
      { icon: Navigation, labelKey: "admin.sidebar.locationTracker", path: "/location-tracker", roles: ["all"] },
      { icon: Target, labelKey: "admin.sidebar.geofence", path: "/geofence", roles: ["all"] },
      { icon: Route, labelKey: "admin.sidebar.locationHistory", path: "/location-history", roles: ["all"] },
    ],
  },
  // ─── 6. 소통 & 알림 ───
  {
    labelKey: "admin.sidebarGroup.commNotify",
    roles: ["all"],
    items: [
      { icon: MessageCircle, labelKey: "admin.sidebar.channels", path: "/channels", roles: ["all"] },
      { icon: MessageCircle, labelKey: "admin.sidebar.chat", path: "/chat", roles: ["all"] },
      { icon: Send, labelKey: "admin.sidebar.telegram", path: "/telegram", roles: ["all"] },
      { icon: Megaphone, labelKey: "admin.sidebar.broadcast", path: "/broadcast", roles: ["all"] },
    ],
  },
  // ─── 7. 문서 & 발급 ───
  {
    labelKey: "admin.sidebarGroup.documents",
    roles: ["all"],
    items: [
      { icon: FileText, labelKey: "admin.sidebar.vouchers", path: "/vouchers", roles: ["all"] },
      { icon: CreditCard, labelKey: "admin.sidebar.hotelVouchers", path: "/hotel-vouchers", roles: ["all"] },
      { icon: Ticket, labelKey: "admin.sidebar.flightTickets", path: "/flight-tickets", roles: ["all"] },
    ],
  },
  // ─── 8. 플랫폼 관리 (슈퍼관리자 전용) ───
  {
    labelKey: "admin.sidebarGroup.platformAdmin",
    roles: ["admin", "superadmin"],
    items: [
      { icon: Cloud, labelKey: "admin.sidebar.platform", path: "/platform", roles: ["admin", "superadmin"] },
      { icon: Handshake, labelKey: "admin.sidebar.partners", path: "/partners", roles: ["admin", "superadmin"] },
      { icon: ShoppingCart, labelKey: "admin.sidebar.bookingSearch", path: "/booking-search", roles: ["admin", "superadmin"] },
      { icon: TrendingUp, labelKey: "admin.sidebar.affiliateRevenue", path: "/affiliate-revenue", roles: ["admin", "superadmin"] },
      { icon: Image, labelKey: "admin.sidebar.adBanners", path: "/ad-banners", roles: ["admin", "superadmin"] },
      { icon: Key, labelKey: "admin.sidebar.apiKeys", path: "/api-keys", roles: ["admin", "superadmin"] },
      { icon: Upload, labelKey: "admin.sidebar.telegramUploads", path: "/telegram-uploads", roles: ["admin", "superadmin"] },
      { icon: BookOpen, labelKey: "admin.sidebar.apiDocs", path: "/api-docs", roles: ["admin", "superadmin"] },
    ],
  },
  // ─── 9. 설정 ───
  {
    labelKey: "admin.sidebarGroup.settings",
    roles: ["all"],
    items: [
      { icon: Search, labelKey: "admin.sidebar.search", path: "/search", roles: ["all"] },
      { icon: Shield, labelKey: "admin.sidebar.2faSettings", path: "/2fa-settings", roles: ["all"] },
      { icon: Home, labelKey: "admin.sidebar.goHome", path: "~/", roles: ["all"] },
    ],
  },
];

// Flatten for activeMenuItem lookup
const allMenuItems = menuGroups.flatMap(g => g.items);

function canSee(roles: ("admin" | "superadmin" | "organizer" | "all")[], userRole: string): boolean {
  if (roles.includes("all")) return true;
  return roles.includes(userRole as any);
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              {t("admin.loginRequired")}
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {t("admin.loginRequiredDesc")}
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = "/login";
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            {t("admin.loginBtn")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const userRole = (user as any)?.role || "user";

  // Track collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("sidebar-collapsed-groups");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed-groups", JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeMenuItem = allMenuItems.find(item => {
    if (item.path.startsWith("~/")) return false;
    return location === item.path;
  });

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <a href="/" className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                  <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-7 w-7 rounded-md flex-shrink-0" />
                  <span className="font-semibold tracking-tight truncate text-primary" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Alpha Trip
                  </span>
                </a>
              ) : (
                <a href="/" className="hover:opacity-80 transition-opacity">
                  <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-7 w-7 rounded-md" />
                </a>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            {menuGroups.map((group) => {
              if (!canSee(group.roles, userRole)) return null;
              const visibleItems = group.items.filter(item => canSee(item.roles, userRole));
              if (visibleItems.length === 0) return null;
              const groupKey = group.labelKey;
              const isGroupCollapsed = collapsedGroups[groupKey] ?? false;

              return (
                <div key={groupKey} className="px-2">
                  {/* Group header - collapsible */}
                  {!isCollapsed && (
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className="flex items-center justify-between w-full px-2 py-2 mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                    >
                      <span>{t(groupKey)}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${isGroupCollapsed ? "-rotate-90" : ""}`} />
                    </button>
                  )}

                  {/* Group items */}
                  {(!isGroupCollapsed || isCollapsed) && (
                    <SidebarMenu className="py-0.5">
                      {visibleItems.map(item => {
                        const isActive = item.path.startsWith("~/") ? false : location === item.path;
                        const label = t(item.labelKey);
                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              isActive={isActive}
                              onClick={() => setLocation(item.path)}
                              tooltip={label}
                              className="h-9 transition-all font-normal"
                            >
                              <item.icon
                                className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                              />
                              <span>{label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  )}
                </div>
              );
            })}
          </SidebarContent>

          <SidebarFooter className="p-3">
            {!isCollapsed && (
              <div className="flex items-center justify-center mb-2">
                <ThemeToggle />
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.role === "superadmin" || user?.role === "admin" ? "Super Admin" : user?.role === "organizer" ? "Organizer" : user?.role || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("admin.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem ? t(activeMenuItem.labelKey) : "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
