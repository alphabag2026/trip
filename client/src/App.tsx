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
import FlightPickupInfo from "./pages/FlightPickupInfo";
import AdminChatDashboard from "./pages/admin/ChatDashboard";
import DashboardLayout from "./components/DashboardLayout";

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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
