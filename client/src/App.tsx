import { lazy, Suspense } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OnboardingGuard } from "./components/OnboardingGuard";
import MobileBottomNav from "./components/MobileBottomNav";
import { Loader2 } from "lucide-react";

// ═══════════════════════════════════════════════════════
// Loading fallback
// ═══════════════════════════════════════════════════════
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Lazy-loaded pages - User / Public
// ═══════════════════════════════════════════════════════
const Home = lazy(() => import("./pages/Home"));
const Register = lazy(() => import("./pages/Register"));
const Lookup = lazy(() => import("./pages/Lookup"));
const ScheduleView = lazy(() => import("./pages/ScheduleView"));
const PickupBoard = lazy(() => import("./pages/PickupBoard"));
const CommChannel = lazy(() => import("./pages/CommChannel"));
const MyAssignments = lazy(() => import("./pages/MyAssignments"));
const AIChatbot = lazy(() => import("./pages/AIChatbot"));
const SurveyResponse = lazy(() => import("./pages/SurveyResponse"));
const FlightPickupInfo = lazy(() => import("./pages/FlightPickupInfo"));
const FlightTracker = lazy(() => import("./pages/FlightTracker"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const MyPage = lazy(() => import("./pages/MyPage"));
const RoleDashboard = lazy(() => import("./pages/dashboard/RoleDashboard"));
const InviteAccept = lazy(() => import("./pages/InviteAccept"));
const ImmigrationChecklist = lazy(() => import("./pages/ImmigrationChecklist"));
const BookingCenter = lazy(() => import("./pages/BookingCenter"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const ScheduleHub = lazy(() => import("./pages/ScheduleHub"));
const RideHailing = lazy(() => import("./pages/RideHailing"));
const FoodDelivery = lazy(() => import("./pages/FoodDelivery"));
const CommunityChat = lazy(() => import("./pages/CommunityChat"));
const Notes = lazy(() => import("./pages/Notes"));
const Translator = lazy(() => import("./pages/Translator"));
const TeamSchedule = lazy(() => import("./pages/TeamSchedule"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const InterpreterDashboard = lazy(() => import("./pages/InterpreterDashboard"));
const CountryExplorer = lazy(() => import("./pages/CountryExplorer"));
const MeetupPortal = lazy(() => import("./pages/MeetupPortal"));
const NearbyExplorer = lazy(() => import("./pages/NearbyExplorer"));
const Welcome = lazy(() => import("./pages/Welcome"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const NotFound = lazy(() => import("./pages/NotFound"));

// ═══════════════════════════════════════════════════════
// Lazy-loaded pages - Admin (separate chunk)
// ═══════════════════════════════════════════════════════
const DashboardLayout = lazy(() => import("./components/DashboardLayout"));
const SuperAdminGuard = lazy(() => import("./components/SuperAdminGuard"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminRegistrations = lazy(() => import("./pages/admin/Registrations"));
const AdminMeetups = lazy(() => import("./pages/admin/Meetups"));
const AdminItineraries = lazy(() => import("./pages/admin/Itineraries"));
const AdminTravelInfo = lazy(() => import("./pages/admin/TravelInfo"));
const AdminTelegram = lazy(() => import("./pages/admin/Telegram"));
const AdminSearch = lazy(() => import("./pages/admin/Search"));
const AdminFlights = lazy(() => import("./pages/admin/Flights"));
const AdminPickups = lazy(() => import("./pages/admin/Pickups"));
const AdminAccommodations = lazy(() => import("./pages/admin/Accommodations"));
const AdminScheduleEvents = lazy(() => import("./pages/admin/ScheduleEvents"));
const AdminModRequests = lazy(() => import("./pages/admin/ModRequests"));
const AdminChannels = lazy(() => import("./pages/admin/Channels"));
const AdminVouchers = lazy(() => import("./pages/admin/Vouchers"));
const AdminChatDashboard = lazy(() => import("./pages/admin/ChatDashboard"));
const AdminSurveys = lazy(() => import("./pages/admin/Surveys"));
const AdminBroadcast = lazy(() => import("./pages/admin/Broadcast"));
const AdminBaggageCheckin = lazy(() => import("./pages/admin/BaggageCheckin"));
const AdminMealDashboard = lazy(() => import("./pages/admin/MealDashboard"));
const AdminHotelRooms = lazy(() => import("./pages/admin/HotelRooms"));
const AdminPlatformDashboard = lazy(() => import("./pages/admin/PlatformDashboard"));
const AdminPartners = lazy(() => import("./pages/admin/Partners"));
const AdminHotelVouchers = lazy(() => import("./pages/admin/HotelVouchers"));
const AdminFlightTickets = lazy(() => import("./pages/admin/FlightTickets"));
const AdminBookingSearch = lazy(() => import("./pages/admin/BookingSearch"));
const AdminAffiliateRevenue = lazy(() => import("./pages/admin/AffiliateRevenue"));
const AdminApiKeys = lazy(() => import("./pages/admin/ApiKeys"));
const AdminTelegramUploads = lazy(() => import("./pages/admin/TelegramUploads"));
const AdminApiDocs = lazy(() => import("./pages/admin/ApiDocs"));
const AdminPassportList = lazy(() => import("./pages/admin/PassportList"));
const AdminExpenses = lazy(() => import("./pages/admin/Expenses"));
const TwoFactorSettings = lazy(() => import("./pages/admin/TwoFactorSettings"));
const AdminAdBanners = lazy(() => import("./pages/admin/AdBanners"));
const AdminAttendeeDashboard = lazy(() => import("./pages/admin/AttendeeDashboard"));
const AdminInvitationGenerator = lazy(() => import("./pages/admin/InvitationGenerator"));
const AdminMeetupSchedules = lazy(() => import("./pages/admin/MeetupSchedules"));
const AdminLocationTracker = lazy(() => import("./pages/admin/LocationTracker"));
const AdminGeofenceManager = lazy(() => import("./pages/admin/GeofenceManager"));
const AdminLocationHistory = lazy(() => import("./pages/admin/LocationHistory"));
const AdminLocationHeatmap = lazy(() => import("./pages/admin/LocationHeatmap"));
const AdminTravelPolicy = lazy(() => import("./pages/admin/TravelPolicy"));
const AdminAttendeeTiers = lazy(() => import("./pages/admin/AttendeeTiers"));
const AdminSafetyCenter = lazy(() => import("./pages/admin/SafetyCenter"));
const AdminBudgetDashboard = lazy(() => import("./pages/admin/BudgetDashboard"));
const AdminBookingPipeline = lazy(() => import("./pages/admin/BookingPipeline"));
const AdminExecutiveReport = lazy(() => import("./pages/admin/ExecutiveReport"));

// ═══════════════════════════════════════════════════════
// Routers
// ═══════════════════════════════════════════════════════
function PublicRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/register" component={Register} />
        <Route path="/register/:meetupId" component={Register} />
        <Route path="/lookup" component={Lookup} />
        <Route path="/schedule/:meetupId" component={ScheduleView} />
        <Route path="/pickup/:meetupId" component={PickupBoard} />
        <Route path="/channel/:channelId" component={CommChannel} />
        <Route path="/my-assignments/:regId" component={MyAssignments} />
        <Route path="/flight-pickup" component={FlightPickupInfo} />
        <Route path="/chatbot" component={AIChatbot} />
        <Route path="/flight-tracker" component={FlightTracker} />
        <Route path="/survey/:surveyId" component={SurveyResponse} />
        <Route path="/my-profile" component={MyProfile} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/my-page" component={MyPage} />
        <Route path="/dashboard" component={RoleDashboard} />
        <Route path="/invite/:token" component={InviteAccept} />
        <Route path="/immigration-checklist" component={ImmigrationChecklist} />
        <Route path="/booking" component={BookingCenter} />
        <Route path="/my-bookings" component={MyBookings} />
        <Route path="/schedule" component={ScheduleHub} />
        <Route path="/ride" component={RideHailing} />
        <Route path="/delivery" component={FoodDelivery} />
        <Route path="/community" component={CommunityChat} />
        <Route path="/community/:roomId" component={CommunityChat} />
        <Route path="/notes" component={Notes} />
        <Route path="/translator" component={Translator} />
        <Route path="/team-schedule" component={TeamSchedule} />
        <Route path="/driver-dashboard" component={DriverDashboard} />
        <Route path="/interpreter-dashboard" component={InterpreterDashboard} />
        <Route path="/countries" component={CountryExplorer} />
        <Route path="/nearby" component={NearbyExplorer} />
        <Route path="/m/:token" component={MeetupPortal} />
        <Route path="/welcome" component={Welcome} />
        <Route path="/404" component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AdminRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={AdminDashboard} />
          <Route path="/registrations" component={AdminRegistrations} />
          <Route path="/meetups" component={AdminMeetups} />
          <Route path="/itineraries" component={AdminItineraries} />
          <Route path="/travel-info" component={AdminTravelInfo} />
          <Route path="/telegram" component={AdminTelegram} />
          <Route path="/search" component={AdminSearch} />
          <Route path="/flights" component={AdminFlights} />
          <Route path="/pickups" component={AdminPickups} />
          <Route path="/accommodations" component={AdminAccommodations} />
          <Route path="/schedule-events" component={AdminScheduleEvents} />
          <Route path="/mod-requests" component={AdminModRequests} />
          <Route path="/channels" component={AdminChannels} />
          <Route path="/vouchers" component={AdminVouchers} />
          <Route path="/chat" component={AdminChatDashboard} />
          <Route path="/surveys" component={AdminSurveys} />
          <Route path="/broadcast" component={AdminBroadcast} />
          <Route path="/baggage-checkin" component={AdminBaggageCheckin} />
          <Route path="/meal-dashboard" component={AdminMealDashboard} />
          <Route path="/hotel-rooms" component={AdminHotelRooms} />
          <Route path="/platform">{() => <Suspense fallback={<PageLoader />}><SuperAdminGuard><AdminPlatformDashboard /></SuperAdminGuard></Suspense>}</Route>
          <Route path="/partners">{() => <Suspense fallback={<PageLoader />}><SuperAdminGuard><AdminPartners /></SuperAdminGuard></Suspense>}</Route>
          <Route path="/hotel-vouchers" component={AdminHotelVouchers} />
          <Route path="/flight-tickets" component={AdminFlightTickets} />
          <Route path="/booking-search">{() => <Suspense fallback={<PageLoader />}><SuperAdminGuard><AdminBookingSearch /></SuperAdminGuard></Suspense>}</Route>
          <Route path="/affiliate-revenue">{() => <Suspense fallback={<PageLoader />}><SuperAdminGuard><AdminAffiliateRevenue /></SuperAdminGuard></Suspense>}</Route>
          <Route path="/api-keys">{() => <Suspense fallback={<PageLoader />}><SuperAdminGuard><AdminApiKeys /></SuperAdminGuard></Suspense>}</Route>
          <Route path="/telegram-uploads">{() => <Suspense fallback={<PageLoader />}><SuperAdminGuard><AdminTelegramUploads /></SuperAdminGuard></Suspense>}</Route>
          <Route path="/api-docs">{() => <Suspense fallback={<PageLoader />}><SuperAdminGuard><AdminApiDocs /></SuperAdminGuard></Suspense>}</Route>
          <Route path="/passport-list" component={AdminPassportList} />
          <Route path="/expenses" component={AdminExpenses} />
          <Route path="/ad-banners" component={AdminAdBanners} />
          <Route path="/attendee-dashboard" component={AdminAttendeeDashboard} />
          <Route path="/invitation" component={AdminInvitationGenerator} />
          <Route path="/meetup-schedules" component={AdminMeetupSchedules} />
          <Route path="/schedules" component={AdminMeetupSchedules} />
          <Route path="/location-tracker" component={AdminLocationTracker} />
          <Route path="/geofence" component={AdminGeofenceManager} />
          <Route path="/location-history" component={AdminLocationHistory} />
          <Route path="/location-heatmap" component={AdminLocationHeatmap} />
          <Route path="/travel-policy" component={AdminTravelPolicy} />
          <Route path="/attendee-tiers" component={AdminAttendeeTiers} />
          <Route path="/safety-center" component={AdminSafetyCenter} />
          <Route path="/budget-dashboard" component={AdminBudgetDashboard} />
          <Route path="/booking-pipeline" component={AdminBookingPipeline} />
          <Route path="/executive-report" component={AdminExecutiveReport} />
          <Route path="/2fa-settings" component={TwoFactorSettings} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </Suspense>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin" nest component={AdminRouter} />
      <Route path="/login">{() => <Suspense fallback={<PageLoader />}><LoginPage /></Suspense>}</Route>
      <Route path="/forgot-password">{() => <Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>}</Route>
      <Route path="/reset-password">{() => <Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>}</Route>
      <Route path="/verify-email">{() => <Suspense fallback={<PageLoader />}><VerifyEmail /></Suspense>}</Route>
      <Route>
        <PublicRouter />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <OnboardingGuard>
            <Router />
            <MobileBottomNav />
            <PWAInstallPrompt />
          </OnboardingGuard>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
