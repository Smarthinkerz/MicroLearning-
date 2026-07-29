import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import MyLessons from "./pages/MyLessons";
import LessonPlayer from "./pages/LessonPlayer";
import Shifts from "./pages/Shifts";
import Assignments from "./pages/Assignments";
import Certificates from "./pages/Certificates";
import ContentAuthoring from "./pages/ContentAuthoring";
import LessonEditor from "./pages/LessonEditor";
import ReviewQueue from "./pages/ReviewQueue";
import Roster from "./pages/Roster";
import AssignLessons from "./pages/AssignLessons";
import Analytics from "./pages/Analytics";
import Compliance from "./pages/Compliance";
import SettingsPage from "./pages/Settings";
import Notifications from "./pages/Notifications";
import LessonLibrary from "./pages/LessonLibrary";
import AdminCRM from "./pages/AdminCRM";
import Pricing from "./pages/Pricing";
import SecurityDashboard from "./pages/SecurityDashboard";
import ConsentSettings from "./pages/ConsentSettings";
import OnboardingWizard from "./pages/OnboardingWizard";
import SystemStatus from "./pages/SystemStatus";
import { CheckoutSuccess } from "./pages/CheckoutSuccess";
import { CheckoutFailed } from "./pages/CheckoutFailed";
import { CheckoutPending } from "./pages/CheckoutPending";
import { PaymentCallback } from "./pages/PaymentCallback";
import { OfflineBanner } from "./components/OfflineBanner";
import Login from "./pages/Login";
import CompletionReport from "./pages/CompletionReport";

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/lessons" component={MyLessons} />
        <Route path="/library" component={LessonLibrary} />
        <Route path="/lessons/:id" component={LessonPlayer} />
        <Route path="/shifts" component={Shifts} />
        <Route path="/assignments" component={Assignments} />
        <Route path="/certificates" component={Certificates} />
        <Route path="/authoring" component={ContentAuthoring} />
        <Route path="/authoring/new" component={LessonEditor} />
        <Route path="/authoring/:id" component={LessonEditor} />
        <Route path="/review" component={ReviewQueue} />
        <Route path="/roster" component={Roster} />
        <Route path="/assign" component={AssignLessons} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/compliance" component={Compliance} />
        <Route path="/security" component={SecurityDashboard} />
        <Route path="/consent" component={ConsentSettings} />
        <Route path="/status" component={SystemStatus} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/completion-report" component={CompletionReport} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function AdminCRMRoute() {
  return <AdminCRM />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin-crm" component={AdminCRMRoute} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/onboarding" component={OnboardingWizard} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/failed" component={CheckoutFailed} />
      <Route path="/checkout/pending" component={CheckoutPending} />
      <Route path="/checkout/cancelled" component={CheckoutFailed} />
      <Route path="/payment-callback" component={PaymentCallback} />
      <Route path="/login" component={Login} />
      <Route path="/404" component={NotFound} />
      <Route>
        <DashboardRoutes />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <OfflineBanner />
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
