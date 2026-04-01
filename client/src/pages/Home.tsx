import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plane, ClipboardList, Search, Shield, MapPin, Globe,
  MessageCircle, Car, Hotel, Luggage, User, LayoutDashboard,
  UserPlus, LogIn, ArrowRight, CheckCircle2, Building2, Users, Briefcase, LogOut, AlertCircle,
  Ticket, Bot, MoreHorizontal, Timer, Sparkles, Star, ChevronRight, ExternalLink, Play,
  UtensilsCrossed, Bike, ChevronDown, Map, Headphones, Smartphone, Settings, DollarSign,
  Compass, Ship, BookOpen, Gift, CalendarDays, Video, Share2, Train, Phone, UserCheck,
  StickyNote, Languages, Megaphone, BarChart3, FileText, Bus, Anchor, Wallet,
  Bell, Navigation, Coffee, ShoppingBag, Clock, PenTool, Mic, Plus
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";
import { useState, useMemo } from "react";
import { getLoginUrl } from "@/const";
import PromoCarousel from "@/components/PromoCarousel";
import OrganizerHome from "@/pages/OrganizerHome";

// CDN Image URLs
const IMAGES = {
  heroBanner: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/hero-banner-main-RHKBHr3tmWcbadw6sfeo2v.webp",
  promoUsdt: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/promo-banner-usdt-kQn6mhiJvcWnPHjC44srGS.webp",
  promoVat: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/promo-banner-vat-LnDugwMhVaD9R7wgrjvPuZ.webp",
  promoRide: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/promo-banner-ride-nGA7EfthDNqzYb4nUSwJVE.webp",
  promoDelivery: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/promo-banner-delivery-NaofzccrxbAWFgmzkSvJnX.webp",
  promoCruise: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/promo-banner-cruise-NLWr8Bie5pCQKeZSeLvDR6.webp",
  adTravel: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/ad-banner-travel-hQHohRtnBqxSohmoBcK87V.webp",
};

type ServiceIcon = {
  icon: any;
  label: string;
  href: string;
  gradient: string;
  ring: string;
  badge?: string;
};

// ═══════════════════════════════════════════════════════
// 일반 유저(참석자) - 출장 플로우 중심
// ═══════════════════════════════════════════════════════
const USER_ROW1: ServiceIcon[] = [
  { icon: ClipboardList, label: "home.u_apply", href: "/register", gradient: "from-blue-500 to-indigo-600", ring: "ring-blue-200 dark:ring-blue-900" },
  { icon: Ticket, label: "home.u_transport", href: "/my-page", gradient: "from-violet-500 to-purple-600", ring: "ring-violet-200 dark:ring-violet-900" },
  { icon: CalendarDays, label: "home.u_schedule", href: "/schedule", gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-200 dark:ring-emerald-900" },
  { icon: MessageCircle, label: "home.u_team_chat", href: "/community", gradient: "from-sky-500 to-cyan-600", ring: "ring-sky-200 dark:ring-sky-900" },
];

const USER_ROW2: ServiceIcon[] = [
  { icon: Hotel, label: "home.u_hotel_info", href: "/booking", gradient: "from-rose-500 to-pink-600", ring: "ring-rose-200 dark:ring-rose-900" },
  { icon: Car, label: "home.u_ride", href: "/ride", gradient: "from-purple-500 to-fuchsia-600", ring: "ring-purple-200 dark:ring-purple-900", badge: "NEW" },
  { icon: Map, label: "home.u_map", href: "/booking", gradient: "from-teal-500 to-green-600", ring: "ring-teal-200 dark:ring-teal-900" },
];

const USER_EXTRA: ServiceIcon[] = [
  { icon: StickyNote, label: "home.u_memo", href: "/notes", gradient: "from-yellow-500 to-amber-600", ring: "ring-yellow-200 dark:ring-yellow-900", badge: "NEW" },
  { icon: Languages, label: "home.u_translator", href: "/translator", gradient: "from-cyan-500 to-blue-600", ring: "ring-cyan-200 dark:ring-cyan-900", badge: "NEW" },
  { icon: Bot, label: "home.u_ai", href: "/chatbot", gradient: "from-indigo-500 to-violet-600", ring: "ring-indigo-200 dark:ring-indigo-900" },
  { icon: Share2, label: "home.u_share", href: "/dashboard", gradient: "from-amber-500 to-orange-600", ring: "ring-amber-200 dark:ring-amber-900" },
  { icon: Video, label: "home.u_video", href: "/community", gradient: "from-pink-500 to-rose-600", ring: "ring-pink-200 dark:ring-pink-900" },
  { icon: Shield, label: "home.u_passport", href: "/my-page", gradient: "from-slate-500 to-gray-600", ring: "ring-slate-200 dark:ring-slate-900" },
  { icon: Compass, label: "home.u_guide", href: "/immigration-checklist", gradient: "from-lime-500 to-green-600", ring: "ring-lime-200 dark:ring-lime-900" },
  { icon: Luggage, label: "home.u_baggage", href: "/flight-tracker", gradient: "from-stone-500 to-neutral-600", ring: "ring-stone-200 dark:ring-stone-900" },
];

// ═══════════════════════════════════════════════════════
// 관계자(organizer/agency/admin/superadmin) - 관리 중심
// ═══════════════════════════════════════════════════════
const ORG_ROW1: ServiceIcon[] = [
  { icon: Plus, label: "home.o_create_meetup", href: "/admin/meetups", gradient: "from-blue-600 to-indigo-600", ring: "ring-blue-300 dark:ring-blue-800", badge: "NEW" },
  { icon: Users, label: "home.o_attendees", href: "/lookup", gradient: "from-indigo-500 to-blue-600", ring: "ring-indigo-200 dark:ring-indigo-900" },
  { icon: Plane, label: "home.o_flights", href: "/booking", gradient: "from-blue-500 to-sky-600", ring: "ring-blue-200 dark:ring-blue-900" },
  { icon: Hotel, label: "home.o_hotels", href: "/booking", gradient: "from-rose-500 to-pink-600", ring: "ring-rose-200 dark:ring-rose-900" },
];

const ORG_ROW2: ServiceIcon[] = [
  { icon: Train, label: "home.o_rail", href: "/booking", gradient: "from-slate-500 to-gray-600", ring: "ring-slate-200 dark:ring-slate-900" },
  { icon: Car, label: "home.o_vehicle", href: "/ride", gradient: "from-purple-500 to-fuchsia-600", ring: "ring-purple-200 dark:ring-purple-900" },
  { icon: Megaphone, label: "home.o_announce", href: "/community", gradient: "from-amber-500 to-orange-600", ring: "ring-amber-200 dark:ring-amber-900" },
  { icon: MessageCircle, label: "home.o_comms", href: "/community", gradient: "from-sky-500 to-cyan-600", ring: "ring-sky-200 dark:ring-sky-900" },
];

const ORG_EXTRA: ServiceIcon[] = [
  { icon: Languages, label: "home.o_translator", href: "/translator", gradient: "from-cyan-500 to-blue-600", ring: "ring-cyan-200 dark:ring-cyan-900", badge: "NEW" },
  { icon: StickyNote, label: "home.o_memo", href: "/notes", gradient: "from-yellow-500 to-amber-600", ring: "ring-yellow-200 dark:ring-yellow-900", badge: "NEW" },
  { icon: UtensilsCrossed, label: "home.o_catering", href: "/delivery", gradient: "from-orange-500 to-red-600", ring: "ring-orange-200 dark:ring-orange-900" },
  { icon: BarChart3, label: "home.o_report", href: "/admin", gradient: "from-teal-500 to-green-600", ring: "ring-teal-200 dark:ring-teal-900" },
  { icon: Wallet, label: "home.o_settlement", href: "/admin", gradient: "from-green-500 to-emerald-600", ring: "ring-green-200 dark:ring-green-900" },
  { icon: Map, label: "home.o_map", href: "/booking", gradient: "from-teal-500 to-cyan-600", ring: "ring-teal-200 dark:ring-teal-900" },
  { icon: Bot, label: "home.o_ai", href: "/chatbot", gradient: "from-indigo-500 to-violet-600", ring: "ring-indigo-200 dark:ring-indigo-900" },
  { icon: Shield, label: "home.o_immigration", href: "/immigration-checklist", gradient: "from-lime-500 to-green-600", ring: "ring-lime-200 dark:ring-lime-900" },
];

// ═══════════════════════════════════════════════════════
// 기사(driver) - 배차 현황 중심
// ═══════════════════════════════════════════════════════
const DRIVER_ROW1: ServiceIcon[] = [
  { icon: Car, label: "home.d_today_pickup", href: "/ride", gradient: "from-blue-500 to-indigo-600", ring: "ring-blue-200 dark:ring-blue-900" },
  { icon: Navigation, label: "home.d_route", href: "/ride", gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-200 dark:ring-emerald-900" },
  { icon: CalendarDays, label: "home.d_schedule", href: "/schedule", gradient: "from-violet-500 to-purple-600", ring: "ring-violet-200 dark:ring-violet-900" },
  { icon: Phone, label: "home.d_contact", href: "/community", gradient: "from-sky-500 to-cyan-600", ring: "ring-sky-200 dark:ring-sky-900" },
];

const DRIVER_ROW2: ServiceIcon[] = [
  { icon: Users, label: "home.d_passengers", href: "/lookup", gradient: "from-rose-500 to-pink-600", ring: "ring-rose-200 dark:ring-rose-900" },
  { icon: Map, label: "home.d_map", href: "/booking", gradient: "from-teal-500 to-green-600", ring: "ring-teal-200 dark:ring-teal-900" },
  { icon: StickyNote, label: "home.d_memo", href: "/notes", gradient: "from-yellow-500 to-amber-600", ring: "ring-yellow-200 dark:ring-yellow-900" },
  { icon: Languages, label: "home.d_translator", href: "/translator", gradient: "from-cyan-500 to-blue-600", ring: "ring-cyan-200 dark:ring-cyan-900" },
];

// ═══════════════════════════════════════════════════════
// 통역사(interpreter) - 통역 요청 중심
// ═══════════════════════════════════════════════════════
const INTERP_ROW1: ServiceIcon[] = [
  { icon: Languages, label: "home.i_requests", href: "/translator", gradient: "from-cyan-500 to-blue-600", ring: "ring-cyan-200 dark:ring-cyan-900" },
  { icon: CalendarDays, label: "home.i_schedule", href: "/schedule", gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-200 dark:ring-emerald-900" },
  { icon: Users, label: "home.i_team", href: "/lookup", gradient: "from-violet-500 to-purple-600", ring: "ring-violet-200 dark:ring-violet-900" },
  { icon: MessageCircle, label: "home.i_chat", href: "/community", gradient: "from-sky-500 to-cyan-600", ring: "ring-sky-200 dark:ring-sky-900" },
];

const INTERP_ROW2: ServiceIcon[] = [
  { icon: Mic, label: "home.i_voice", href: "/translator", gradient: "from-rose-500 to-pink-600", ring: "ring-rose-200 dark:ring-rose-900", badge: "NEW" },
  { icon: StickyNote, label: "home.i_memo", href: "/notes", gradient: "from-yellow-500 to-amber-600", ring: "ring-yellow-200 dark:ring-yellow-900" },
  { icon: Map, label: "home.i_map", href: "/booking", gradient: "from-teal-500 to-green-600", ring: "ring-teal-200 dark:ring-teal-900" },
  { icon: Phone, label: "home.i_contact", href: "/community", gradient: "from-orange-500 to-red-600", ring: "ring-orange-200 dark:ring-orange-900" },
];

// ═══════════════════════════════════════════════════════
// 비로그인 - 플랫폼 소개 + 서비스 체험
// ═══════════════════════════════════════════════════════
const GUEST_ROW1: ServiceIcon[] = [
  { icon: ClipboardList, label: "home.g_apply", href: "/register", gradient: "from-blue-500 to-indigo-600", ring: "ring-blue-200 dark:ring-blue-900" },
  { icon: UserCheck, label: "home.g_lookup", href: "/lookup", gradient: "from-violet-500 to-purple-600", ring: "ring-violet-200 dark:ring-violet-900" },
  { icon: CalendarDays, label: "home.g_schedule", href: "/schedule", gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-200 dark:ring-emerald-900" },
  { icon: MessageCircle, label: "home.g_community", href: "/community", gradient: "from-sky-500 to-cyan-600", ring: "ring-sky-200 dark:ring-sky-900" },
];

const GUEST_ROW2: ServiceIcon[] = [
  { icon: Car, label: "home.g_ride", href: "/ride", gradient: "from-purple-500 to-fuchsia-600", ring: "ring-purple-200 dark:ring-purple-900" },
  { icon: Bot, label: "home.g_ai", href: "/chatbot", gradient: "from-cyan-500 to-blue-600", ring: "ring-cyan-200 dark:ring-cyan-900" },
  { icon: Map, label: "home.g_map", href: "/booking", gradient: "from-teal-500 to-green-600", ring: "ring-teal-200 dark:ring-teal-900" },
];

// ═══════════════════════════════════════════════════════
// Helper: role → menu config
// ═══════════════════════════════════════════════════════
function getMenuConfig(role: string | undefined, isAuthenticated: boolean) {
  if (!isAuthenticated) {
    return {
      row1: GUEST_ROW1,
      row2: GUEST_ROW2,
      extra: [],
      cat1: "home.cat_guest_main",
      cat1Default: "서비스 체험",
      cat2: "home.cat_guest_more",
      cat2Default: "더 알아보기",
      catExtra: "",
      catExtraDefault: "",
    };
  }

  if (role === "organizer" || role === "agency" || role === "admin" || role === "superadmin") {
    return {
      row1: ORG_ROW1,
      row2: ORG_ROW2,
      extra: ORG_EXTRA,
      cat1: "home.cat_org_core",
      cat1Default: "참석자/예약 관리",
      cat2: "home.cat_org_ops",
      cat2Default: "운영 지원",
      catExtra: "home.cat_org_extra",
      catExtraDefault: "부가 기능",
    };
  }

  if (role === "driver") {
    return {
      row1: DRIVER_ROW1,
      row2: DRIVER_ROW2,
      extra: [],
      cat1: "home.cat_driver_core",
      cat1Default: "오늘의 배차",
      cat2: "home.cat_driver_support",
      cat2Default: "지원 도구",
      catExtra: "",
      catExtraDefault: "",
    };
  }

  if (role === "interpreter") {
    return {
      row1: INTERP_ROW1,
      row2: INTERP_ROW2,
      extra: [],
      cat1: "home.cat_interp_core",
      cat1Default: "통역 요청",
      cat2: "home.cat_interp_support",
      cat2Default: "지원 도구",
      catExtra: "",
      catExtraDefault: "",
    };
  }

  // Default: user, partner
  return {
    row1: USER_ROW1,
    row2: USER_ROW2,
    extra: USER_EXTRA,
    cat1: "home.cat_user_core",
    cat1Default: "출장 핵심",
    cat2: "home.cat_user_onsite",
    cat2Default: "현장 서비스",
    catExtra: "home.cat_user_extra",
    catExtraDefault: "편의 기능",
  };
}

// ═══════════════════════════════════════════════════════
// Service menu list configs per role
// ═══════════════════════════════════════════════════════
function getServiceMenus(role: string | undefined, isAuthenticated: boolean, t: any) {
  if (!isAuthenticated) {
    return [
      {
        color: "bg-blue-500",
        title: t("home.svc_guest_title", "서비스 둘러보기"),
        desc: t("home.svc_guest_desc", "로그인 없이 체험해보세요"),
        items: [
          { icon: ClipboardList, color: "text-blue-500", label: t("home.u_apply"), href: "/register" },
          { icon: Car, color: "text-purple-500", label: t("home.g_ride"), href: "/ride", badge: "NEW" },
          { icon: UtensilsCrossed, color: "text-orange-500", label: t("home.g_delivery"), href: "/delivery", badge: "NEW" },
          { icon: Bot, color: "text-cyan-500", label: t("home.g_ai"), href: "/chatbot" },
        ],
      },
    ];
  }

  if (role === "driver") {
    return [
      {
        color: "bg-blue-500",
        title: t("home.svc_driver_pickup_title", "오늘의 픽업"),
        desc: t("home.svc_driver_pickup_desc", "배정된 픽업 스케줄"),
        items: [
          { icon: Car, color: "text-blue-500", label: t("home.d_today_pickup", "오늘 배차"), href: "/ride" },
          { icon: Navigation, color: "text-emerald-500", label: t("home.d_route", "경로 안내"), href: "/ride" },
          { icon: Users, color: "text-rose-500", label: t("home.d_passengers", "탑승자 목록"), href: "/lookup" },
          { icon: CalendarDays, color: "text-violet-500", label: t("home.d_schedule", "일정"), href: "/schedule" },
        ],
      },
      {
        color: "bg-teal-500",
        title: t("home.svc_driver_support_title", "지원 도구"),
        desc: t("home.svc_driver_support_desc", "지도, 메모, 통역"),
        items: [
          { icon: Map, color: "text-teal-500", label: t("home.d_map", "지도"), href: "/booking" },
          { icon: StickyNote, color: "text-yellow-500", label: t("home.d_memo", "메모"), href: "/notes" },
          { icon: Languages, color: "text-cyan-500", label: t("home.d_translator", "통역"), href: "/translator" },
          { icon: Phone, color: "text-sky-500", label: t("home.d_contact", "연락처"), href: "/community" },
        ],
      },
    ];
  }

  if (role === "interpreter") {
    return [
      {
        color: "bg-cyan-500",
        title: t("home.svc_interp_request_title", "통역 요청"),
        desc: t("home.svc_interp_request_desc", "대기 중인 통역 요청"),
        items: [
          { icon: Languages, color: "text-cyan-500", label: t("home.i_requests", "통역"), href: "/translator" },
          { icon: Mic, color: "text-rose-500", label: t("home.i_voice", "음성 통역"), href: "/translator", badge: "NEW" },
          { icon: CalendarDays, color: "text-emerald-500", label: t("home.i_schedule", "일정"), href: "/schedule" },
          { icon: Users, color: "text-violet-500", label: t("home.i_team", "담당 팀"), href: "/lookup" },
        ],
      },
      {
        color: "bg-amber-500",
        title: t("home.svc_interp_support_title", "지원 도구"),
        desc: t("home.svc_interp_support_desc", "메모, 지도, 연락"),
        items: [
          { icon: StickyNote, color: "text-yellow-500", label: t("home.i_memo", "메모"), href: "/notes" },
          { icon: Map, color: "text-teal-500", label: t("home.i_map", "지도"), href: "/booking" },
          { icon: MessageCircle, color: "text-sky-500", label: t("home.i_chat", "채팅"), href: "/community" },
          { icon: Phone, color: "text-orange-500", label: t("home.i_contact", "연락처"), href: "/community" },
        ],
      },
    ];
  }

  if (role === "organizer" || role === "agency" || role === "admin" || role === "superadmin") {
    return [
      {
        color: "bg-indigo-500",
        title: t("home.svc_org_manage_title", "참석자/예약 관리"),
        desc: t("home.svc_org_manage_desc", "초청 인원과 예약을 한눈에"),
        items: [
          { icon: Users, color: "text-indigo-500", label: t("home.o_attendees"), href: "/lookup" },
          { icon: Plane, color: "text-blue-500", label: t("home.o_flights"), href: "/booking" },
          { icon: Hotel, color: "text-rose-500", label: t("home.o_hotels"), href: "/booking" },
          { icon: Train, color: "text-slate-500", label: t("home.o_rail"), href: "/booking" },
          { icon: CalendarDays, color: "text-emerald-500", label: t("home.o_schedule"), href: "/schedule" },
        ],
      },
      {
        color: "bg-amber-500",
        title: t("home.svc_org_ops_title", "운영 도구"),
        desc: t("home.svc_org_ops_desc", "차량, 소통, 공지를 관리"),
        items: [
          { icon: Car, color: "text-purple-500", label: t("home.o_vehicle"), href: "/ride" },
          { icon: Megaphone, color: "text-amber-500", label: t("home.o_announce"), href: "/community" },
          { icon: MessageCircle, color: "text-sky-500", label: t("home.o_comms"), href: "/community" },
          { icon: Languages, color: "text-cyan-500", label: t("home.o_translator"), href: "/translator", badge: "NEW" },
          { icon: BarChart3, color: "text-teal-500", label: t("home.o_report"), href: "/admin" },
        ],
      },
    ];
  }

  // user / partner
  return [
    {
      color: "bg-blue-500",
      title: t("home.svc_user_trip_title", "출장 관리"),
      desc: t("home.svc_user_trip_desc", "신청부터 일정까지 한 곳에서"),
      items: [
        { icon: ClipboardList, color: "text-blue-500", label: t("home.u_apply"), href: "/register" },
        { icon: Ticket, color: "text-violet-500", label: t("home.u_transport"), href: "/my-page" },
        { icon: CalendarDays, color: "text-emerald-500", label: t("home.u_schedule"), href: "/schedule" },
        { icon: MessageCircle, color: "text-sky-500", label: t("home.u_team_chat"), href: "/community" },
        { icon: Share2, color: "text-amber-500", label: t("home.u_share"), href: "/dashboard" },
      ],
    },
    {
      color: "bg-purple-500",
      title: t("home.svc_user_onsite_title", "현장 서비스"),
      desc: t("home.svc_user_onsite_desc", "도착 후 필요한 모든 것"),
      items: [
        { icon: Car, color: "text-purple-500", label: t("home.u_ride"), href: "/ride", badge: "NEW" },
        { icon: UtensilsCrossed, color: "text-orange-500", label: t("home.u_delivery"), href: "/delivery", badge: "NEW" },
        { icon: Hotel, color: "text-rose-500", label: t("home.u_hotel_info"), href: "/booking" },
        { icon: Map, color: "text-teal-500", label: t("home.u_map"), href: "/booking" },
      ],
    },
    {
      color: "bg-amber-500",
      title: t("home.svc_user_util_title", "편의 도구"),
      desc: t("home.svc_user_util_desc", "메모, 통역, AI 도우미"),
      items: [
        { icon: StickyNote, color: "text-yellow-500", label: t("home.u_memo"), href: "/notes", badge: "NEW" },
        { icon: Languages, color: "text-cyan-500", label: t("home.u_translator"), href: "/translator", badge: "NEW" },
        { icon: Bot, color: "text-indigo-500", label: t("home.u_ai"), href: "/chatbot" },
        { icon: Compass, color: "text-lime-500", label: t("home.u_guide"), href: "/immigration-checklist" },
      ],
    },
  ];
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [showMoreServices, setShowMoreServices] = useState(false);

  const userRole = user?.role as string | undefined;
  const menuConfig = useMemo(() => getMenuConfig(userRole, isAuthenticated), [userRole, isAuthenticated]);
  const serviceMenus = useMemo(() => getServiceMenus(userRole, isAuthenticated, t), [userRole, isAuthenticated, t]);

  // DB에서 활성 광고 배너 불러오기
  const { data: adBanners } = trpc.adBanner.list.useQuery(
    { activeOnly: true },
    { refetchOnWindowFocus: false }
  );
  const trackClick = trpc.adBanner.trackClick.useMutation();
  const getAdByPosition = (pos: string) => (adBanners || []).find((b: any) => b.position === pos);

  const { data: onboardingStatus } = trpc.userProfile.onboardingStatus.useQuery(
    undefined,
    { enabled: isAuthenticated, retry: false, refetchOnWindowFocus: false }
  );
  const needsOnboarding = isAuthenticated && onboardingStatus && !onboardingStatus.onboardingCompleted;

  const { data: profileData } = trpc.userProfile.get.useQuery(undefined, {
    enabled: isAuthenticated, retry: false, refetchOnWindowFocus: false,
  });
  const { data: passportData } = trpc.passport.get.useQuery(undefined, {
    enabled: isAuthenticated, retry: false, refetchOnWindowFocus: false,
  });

  const profileCompletion = (() => {
    if (!isAuthenticated) return 0;
    let total = 0, filled = 0;
    total += 1; filled += 1;
    const fields = ['phone', 'nationality', 'birthDate', 'gender', 'organization', 'position'];
    fields.forEach(f => { total += 1; if (profileData && (profileData as any)[f]) filled += 1; });
    total += 1; if (passportData?.passportNumber) filled += 1;
    total += 1; if (onboardingStatus?.onboardingCompleted) filled += 1;
    return Math.round((filled / total) * 100);
  })();

  // Role label for header
  const roleLabel = useMemo(() => {
    if (!isAuthenticated) return null;
    const labels: Record<string, string> = {
      superadmin: t("home.role_superadmin", "슈퍼관리자"),
      admin: t("home.role_admin", "관리자"),
      organizer: t("home.role_organizer", "주최자"),
      agency: t("home.role_agency", "에이전시"),
      partner: t("home.role_partner", "파트너"),
      driver: t("home.role_driver", "기사"),
      interpreter: t("home.role_interpreter", "통역사"),
      user: t("home.role_user", "참석자"),
    };
    return labels[userRole || "user"] || labels.user;
  }, [userRole, isAuthenticated, t]);

  // Icon grid renderer
  const renderIconGrid = (icons: ServiceIcon[]) => (
    <div className="grid grid-cols-4 gap-y-4 gap-x-2">
      {icons.map((svc, i) => (
        <Link key={i} href={svc.href}>
          <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
            <div className={`relative w-[52px] h-[52px] md:w-[60px] md:h-[60px] rounded-2xl bg-gradient-to-br ${svc.gradient} flex items-center justify-center shadow-lg ring-2 ${svc.ring} group-hover:scale-110 group-hover:shadow-xl transition-all duration-200`}>
              <svc.icon className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow" />
              {svc.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full leading-none">{svc.badge}</span>
              )}
            </div>
            <span className="text-[11px] font-medium text-foreground text-center leading-tight">{t(svc.label)}</span>
          </div>
        </Link>
      ))}
    </div>
  );

  // 주최자 역할이면 전용 홈 화면으로 분기
  if (isAuthenticated && (userRole === "organizer" || userRole === "admin" || userRole === "superadmin")) {
    return <OrganizerHome />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ===== HEADER ===== */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/95">
        <div className="container flex items-center justify-between h-14 gap-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-lg hidden sm:inline" style={{ fontFamily: 'Inter, sans-serif' }}>Alpha Trip</span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-2 cursor-pointer" onClick={() => navigate("/booking")}>
            <div className="flex items-center gap-2 bg-muted/60 hover:bg-muted rounded-full px-4 py-2 transition-colors border border-border/50">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{t("home.searchPlaceholder", "어디로 가세요?")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <LanguageSelector />
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">{user?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Role badge */}
                  <div className="px-2 py-1.5 border-b border-border/50 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{roleLabel}</Badge>
                      <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                    </div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/my-page" className="cursor-pointer"><User className="h-4 w-4 mr-2" />{t("nav.myProfile")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/notes" className="cursor-pointer"><StickyNote className="h-4 w-4 mr-2" />{t("home.u_memo", "메모")}</Link>
                  </DropdownMenuItem>
                  {(userRole === "admin" || userRole === "superadmin" || userRole === "organizer" || userRole === "agency") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer"><LayoutDashboard className="h-4 w-4 mr-2" />{t("nav.backoffice")}</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer"><LayoutDashboard className="h-4 w-4 mr-2" />{t("nav.dashboard", "대시보드")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/community" className="cursor-pointer"><MessageCircle className="h-4 w-4 mr-2" />{t("nav.community", "커뮤니티")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={async () => { await logout(); window.location.href = "/"; }}>
                    <LogOut className="h-4 w-4 mr-2" />{t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">{t("home.loginBtn")}</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Onboarding Banner */}
      {needsOnboarding && (
        <section className="bg-primary/10 border-b border-primary/20">
          <div className="container py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-foreground">{t("home.onboardingBanner", "프로필 설정을 완료하면 모든 기능을 이용할 수 있습니다.")}</span>
            </div>
            <Link href="/onboarding">
              <Button size="sm" variant="default" className="gap-1 whitespace-nowrap">
                {t("home.completeOnboarding", "프로필 설정하기")}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className="pb-20 md:pb-0">

        {/* ── Role-based Icon Grid ── */}
        <section className="pt-5 pb-2">
          <div className="container max-w-lg mx-auto px-4">

            {/* Row 1 */}
            <div className="mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                {t(menuConfig.cat1, menuConfig.cat1Default)}
              </span>
            </div>
            <div className="mb-5">
              {renderIconGrid(menuConfig.row1)}
            </div>

            {/* Row 2 */}
            <div className="mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400">
                {t(menuConfig.cat2, menuConfig.cat2Default)}
              </span>
            </div>
            <div className="mb-4">
              {renderIconGrid(menuConfig.row2)}
            </div>

            {/* Extra (toggle) - only for authenticated users */}
            {menuConfig.extra.length > 0 && (
              <>
                {showMoreServices && (
                  <>
                    <div className="mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-500 dark:text-purple-400">
                        {t(menuConfig.catExtra, menuConfig.catExtraDefault)}
                      </span>
                    </div>
                    <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      {renderIconGrid(menuConfig.extra)}
                    </div>
                  </>
                )}

                <div className="flex items-center justify-center mt-2">
                  <button
                    onClick={() => setShowMoreServices(!showMoreServices)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-3 rounded-full hover:bg-muted/50"
                  >
                    {showMoreServices ? t("home.showLess", "접기") : t("home.showMore", "더 보기")}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showMoreServices ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Promo Carousel ── */}
        <section className="py-4">
          <div className="container max-w-lg mx-auto px-4">
            <PromoCarousel
              slides={[
                { id: "usdt", imageUrl: IMAGES.promoUsdt, href: "/booking" },
                { id: "vat", imageUrl: IMAGES.promoVat, href: "/ride" },
                { id: "ride", imageUrl: IMAGES.promoRide, href: "/ride" },
                { id: "delivery", imageUrl: IMAGES.promoDelivery, href: "/delivery" },
                { id: "cruise", imageUrl: IMAGES.promoCruise, href: "/booking" },
              ]}
              autoPlayInterval={4000}
            />

            {/* CTA Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Link href="/booking">
                <Button variant="outline" className="w-full h-11 text-sm font-semibold rounded-xl border-2 border-foreground/20 hover:border-primary hover:bg-primary/5">
                  {t("home.promoSearchBtn", "예약 검색")}
                </Button>
              </Link>
              {isAuthenticated ? (
                <Link href="/my-page">
                  <Button className="w-full h-11 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                    {t("home.promoMyPageBtn", "마이페이지")}
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button className="w-full h-11 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                    {t("home.promoLoginBtn", "로그인/회원가입")}
                  </Button>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ── Profile Completion (authenticated only) ── */}
        {isAuthenticated && (
          <section className="py-2">
            <div className="container max-w-lg mx-auto px-4">
              <div className="bg-card border border-border/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t("home.profileCompletion", "프로필 완성도")}</span>
                    <Badge variant="secondary" className="text-[10px]">{roleLabel}</Badge>
                  </div>
                  <span className="text-sm font-bold text-primary">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="h-2 mb-2" />
                {profileCompletion < 100 && (
                  <Link href="/my-page" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />{t("home.completeProfile", "프로필 완성하기")}
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Ad Banner ── */}
        {(() => {
          const ad1 = getAdByPosition("hero_top");
          const imgSrc = ad1?.imageUrl || IMAGES.adTravel;
          const linkUrl = ad1?.linkUrl || "https://www.trip.com";
          const title = ad1?.title || t("home.ad_travel_title", "꿈의 여행지를 찾아보세요");
          return (
            <section className="py-3">
              <div className="container max-w-lg mx-auto px-4">
                <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block relative rounded-xl overflow-hidden group cursor-pointer" onClick={() => ad1 && trackClick.mutate({ id: ad1.id })}>
                  <img src={imgSrc} alt={title} className="w-full h-36 md:h-44 object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
                    <div className="px-6">
                      <Badge className="bg-amber-500 text-white mb-2 text-xs">AD</Badge>
                      <h3 className="text-white text-lg font-bold mb-0.5">{title}</h3>
                    </div>
                  </div>
                </a>
              </div>
            </section>
          );
        })()}

        {/* ── Quick Info Bar ── */}
        <section className="py-3">
          <div className="container max-w-lg mx-auto px-4">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>{t("home.infoBar1", "24시간 고객센터")}</span>
              </div>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-amber-500" />
                <span>{t("home.infoBar2", "예약할 때마다 쌓이는 혜택")}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Platform Introduction (guest only) ── */}
        {!isAuthenticated && (
          <section className="py-6">
            <div className="container max-w-lg mx-auto px-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 rounded-full bg-blue-500" />
                  <h3 className="text-lg font-bold text-foreground">{t("home.platform_title", "Alpha Trip이란?")}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {t("home.platform_desc", "Alpha Trip은 글로벌 밋업과 비즈니스 출장을 하나의 플랫폼에서 관리하는 올인원 서비스입니다. 밋업 신청부터 항공권·호텔 예약, 현장 차량 호출, 음식 배달, 실시간 통역까지 — 출장의 모든 과정을 Alpha Trip 하나로 해결하세요.")}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("home.platform_desc2", "주최자, 에이전시, 파트너, 기사, 통역사 등 각 역할에 맞는 전용 대시보드를 제공하여 효율적인 협업이 가능합니다. USDT 결제를 지원하며, 19개 언어 실시간 번역과 AI 챗봇으로 언어 장벽 없는 글로벌 비즈니스를 경험하세요.")}
                </p>
              </div>

              {/* Feature Cards */}
              <div className="mt-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                  {t("home.features_title", "주요 기능")}
                </h4>

                {/* Feature 1: Meetup Management */}
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold mb-1">{t("home.feat1_title", "밋업 신청 & 관리")}</h5>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t("home.feat1_desc", "밋업에 간편하게 신청하고, 승인 후 팀 스케줄이 자동으로 등록됩니다. 팀원 합류 시 실시간 알림을 받아 빠르게 소통할 수 있습니다.")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 2: Transport & Hotel */}
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Plane className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold mb-1">{t("home.feat2_title", "항공권 · 호텔 · 교통편")}</h5>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t("home.feat2_desc", "항공권, 철도, 고속버스, 호텔을 한 곳에서 검색하고 예약하세요. 배정된 교통편과 숙소 정보를 실시간으로 확인할 수 있습니다.")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 3: On-site Services */}
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                      <Car className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold mb-1">{t("home.feat3_title", "현장 차량 호출 & 음식 배달")}</h5>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t("home.feat3_desc", "행사장 도착 후 전용 차량 호출과 음식 배달 서비스를 이용하세요. 기사님 전용 대시보드로 실시간 배차 현황을 관리합니다.")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 4: Translation & Memo */}
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                      <Languages className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold mb-1">{t("home.feat4_title", "실시간 통역 & 메모")}</h5>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t("home.feat4_desc", "19개 언어 AI 실시간 번역과 음성 인식 통역 기능으로 언어 장벽을 허물어보세요. 출장 중 중요한 내용은 메모 기능으로 바로 기록하세요.")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 5: Team Schedule */}
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold mb-1">{t("home.feat5_title", "팀 스케줄 & 소통")}</h5>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t("home.feat5_desc", "팀원들과 모임 장소·시간을 캘린더로 공유하고, 팀 공지와 실시간 채팅으로 원활하게 소통하세요. 밋업 신청 시 팀 스케줄이 자동으로 등록됩니다.")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 6: Role-based Dashboard */}
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <LayoutDashboard className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold mb-1">{t("home.feat6_title", "역할별 전용 대시보드")}</h5>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t("home.feat6_desc", "참석자, 주최자, 기사, 통역사, 에이전시, 파트너 등 각 역할에 최적화된 전용 화면을 제공합니다. 필요한 정보만 한눈에 확인하세요.")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Settings Section ── */}
        <section className="py-2">
          <div className="container max-w-lg mx-auto px-4">
            <div className="border-t border-border/50 pt-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">{t("home.settingsTitle", "설정")}</h4>
              <div className="space-y-0">
                <div className="flex items-center gap-3 py-3 border-b border-border/30">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm flex-1">{t("home.settingLang", "한국어")}</span>
                  <LanguageSelector />
                </div>
                <div className="flex items-center gap-3 py-3 border-b border-border/30">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm flex-1">{t("home.settingCurrency", "USDT")}</span>
                  <span className="text-xs text-muted-foreground">Tether</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Role-based Service Menu Lists ── */}
        {serviceMenus.map((menu, idx) => (
          <section key={idx} className="py-2">
            <div className="container max-w-lg mx-auto px-4">
              <div className="border-t border-border/50 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-1 h-4 rounded-full ${menu.color}`} />
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">{menu.title}</h4>
                  <span className="text-[10px] text-muted-foreground">{menu.desc}</span>
                </div>
                <div className="space-y-0">
                  {menu.items.map((item, i) => (
                    <Link key={i} href={item.href}>
                      <div className={`flex items-center gap-3 py-3 ${i < menu.items.length - 1 ? "border-b border-border/30" : ""} cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors`}>
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        {item.badge && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.badge}</Badge>}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}

      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 mb-16 md:mb-0 bg-muted/20">
        <div className="container max-w-lg mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-dUcFDfrYA6TfPgEdvQbuia.webp" alt="Alpha Trip" className="h-6 w-6 rounded" />
            <span className="font-bold text-sm">Alpha Trip</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{t("home.footer_desc", "글로벌 밋업 & 출장 관리 플랫폼")}</p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/register" className="hover:text-foreground transition-colors">{t("home.u_apply", "밋업 신청")}</Link>
            <Link href="/ride" className="hover:text-foreground transition-colors">{t("home.u_ride", "차량 호출")}</Link>
            <Link href="/delivery" className="hover:text-foreground transition-colors">{t("home.u_delivery", "음식 배달")}</Link>
            <a href="https://t.me/alphatrip" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Telegram</a>
          </div>
          <div className="border-t border-border/30 mt-4 pt-4 text-xs text-muted-foreground">
            <p>{t("home.footer")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
