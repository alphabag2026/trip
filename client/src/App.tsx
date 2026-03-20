import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
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
import DashboardLayout from "./components/DashboardLayout";
import Onboarding from "./pages/Onboarding";
import MyPage from "./pages/MyPage";
import { OnboardingGuard } from "./components/OnboardingGuard";
import RoleDashboard from "./pages/dashboard/RoleDashboard";
import InviteAccept from "./pages/InviteAccept";

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
      <Route path="/404" component={NotFound} />
    </Switch>
  );
}

function AdminRouter() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/registrations" component={AdminRegistrations} />
        <Route path="/admin/meetups" component={AdminMeetups} />
        <Route path="/admin/itineraries" component={AdminItineraries} />
        <Route path="/admin/travel-info" component={AdminTravelInfo} />
        <Route path="/admin/telegram" component={AdminTelegram} />
        <Route path="/admin/search" component={AdminSearch} />
        <Route path="/admin/flights" component={AdminFlights} />
        <Route path="/admin/pickups" component={AdminPickups} />
        <Route path="/admin/accommodations" component={AdminAccommodations} />
        <Route path="/admin/schedule-events" component={AdminScheduleEvents} />
        <Route path="/admin/mod-requests" component={AdminModRequests} />
        <Route path="/admin/channels" component={AdminChannels} />
        <Route path="/admin/vouchers" component={AdminVouchers} />
        <Route path="/admin/chat" component={AdminChatDashboard} />
        <Route path="/admin/surveys" component={AdminSurveys} />
        <Route path="/admin/broadcast" component={AdminBroadcast} />
        <Route path="/admin/baggage-checkin" component={AdminBaggageCheckin} />
        <Route path="/admin/meal-dashboard" component={AdminMealDashboard} />
        <Route path="/admin/hotel-rooms" component={AdminHotelRooms} />
        <Route path="/admin/platform" component={AdminPlatformDashboard} />
        <Route path="/admin/partners" component={AdminPartners} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin/:rest*" component={AdminRouter} />
      <Route>
        <PublicRouter />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <OnboardingGuard>
            <Router />
          </OnboardingGuard>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
