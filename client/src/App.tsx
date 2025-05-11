import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import NewRequestPage from "@/pages/new-request";
import ApprovalRequestsPage from "@/pages/approval-requests";
import StationDetailsPage from "@/pages/station-details";
import VisitSchedulePage from "@/pages/visit-schedule";
import PaymentsPage from "@/pages/payments";
import StationsPage from "@/pages/stations";
import SettingsPage from "@/pages/settings";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/new-request" component={NewRequestPage} />
      <ProtectedRoute path="/approval-requests" component={ApprovalRequestsPage} />
      <ProtectedRoute path="/station/:id" component={StationDetailsPage} />
      <ProtectedRoute path="/visit-schedule" component={VisitSchedulePage} />
      <ProtectedRoute path="/payments" component={PaymentsPage} />
      <ProtectedRoute path="/stations" component={StationsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Set the document dir to RTL for Arabic
  document.documentElement.dir = "rtl";
  document.documentElement.lang = "ar";
  
  // Add title
  document.title = "نظام إدارة محطات الخلط الخرسانية";
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
