import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Lookup from "./pages/Lookup";
import ScheduleView from "./pages/ScheduleView";
import PickupBoard from "./pages/PickupBoard";
import CommChannel from "./pages/CommChannel";
import MyAssignments from "./pages/MyAssignments";
import AIChatbot from "./pages/AIChatbot";
import SurveyResponse from "./pages/SurveyResponse";
import FlightPickupInfo from "./pages/FlightPickupInfo";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminRegistrations from "./pages/admin/Registrations";
import AdminMeetups from "./pages/admin/Meetups";
import AdminItineraries from "./pages/admin/Itineraries";
import AdminTravelInfo from "./pages/admin/TravelInfo";
import AdminTelegram from "./pages/admin/Telegram";
import AdminSearch from "./pages/admin/Search";
import AdminFlights from "./pages/admin/Flights";
import AdminPickups from "./pages/admin/Pickups";
import AdminAccommodations from "./pages/admin/Accommodations";
import AdminScheduleEvents from "./pages/admin/ScheduleEvents";
import AdminModRequests from "./pages/admin/ModRequests";
import AdminChannels from "./pages/admin/Channels";
import AdminVouchers from "./pages/admin/Vouchers";
import AdminChatDashboard from "./pages/admin/ChatDashboard";
import AdminSurveys from "./pages/admin/Surveys";
import AdminBroadcast from "./pages/admin/Broadcast";
import AdminBaggageCheckin from "./pages/admin/BaggageCheckin";
import FlightTracker from "./pages/FlightTracker";
import MyProfile from "./pages/MyProfile";
import AdminMealDashboard from "./pages/admin/MealDashboard";
import AdminHotelRooms from "./pages/admin/HotelRooms";
import AdminPlatformDashboard from "./pages/admin/PlatformDashboard";
import AdminPartners from "./pages/admin/Partners";
import AdminHotelVouchers from "./pages/admin/HotelVouchers";
import AdminFlightTickets from "./pages/admin/FlightTickets";
import AdminBookingSearch from "./pages/admin/BookingSearch";
import AdminAffiliateRevenue from "./pages/admin/AffiliateRevenue";
import AdminApiKeys from "./pages/admin/ApiKeys";
import DashboardLayout from "./components/DashboardLayout";
import Onboarding from "./pages/Onboarding";
import MyPage from "./pages/MyPage";
import { OnboardingGuard } from "./components/OnboardingGuard";
import RoleDashboard from "./pages/dashboard/RoleDashboard";
import InviteAccept from "./pages/InviteAccept";
import ImmigrationChecklist from "./pages/ImmigrationChecklist";
import BookingCenter from "./pages/BookingCenter";
import MobileBottomNav from "./components/MobileBottomNav";
import CommunityChat from "./pages/CommunityChat";
import AdminTelegramUploads from "./pages/admin/TelegramUploads";
import AdminApiDocs from "./pages/admin/ApiDocs";
import AdminPassportList from "./pages/admin/PassportList";
import AdminExpenses from "./pages/admin/Expenses";
import LoginPage from "./pages/LoginPage";
import Welcome from "./pages/Welcome";
import TwoFactorSettings from "./pages/admin/TwoFactorSettings";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function PublicRouter() {
  return (
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
      <Route path="/community" component={CommunityChat} />
      <Route path="/community/:roomId" component={CommunityChat} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/404" component={NotFound} />
    </Switch>
  );
}

function AdminRouter() {
  return (
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
        <Route path="/platform" component={AdminPlatformDashboard} />
        <Route path="/partners" component={AdminPartners} />
        <Route path="/hotel-vouchers" component={AdminHotelVouchers} />
        <Route path="/flight-tickets" component={AdminFlightTickets} />
        <Route path="/booking-search" component={AdminBookingSearch} />
        <Route path="/affiliate-revenue" component={AdminAffiliateRevenue} />
        <Route path="/api-keys" component={AdminApiKeys} />
        <Route path="/telegram-uploads" component={AdminTelegramUploads} />
        <Route path="/api-docs" component={AdminApiDocs} />
        <Route path="/passport-list" component={AdminPassportList} />
        <Route path="/expenses" component={AdminExpenses} />
        <Route path="/2fa-settings" component={TwoFactorSettings} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin" nest component={AdminRouter} />
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
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
