import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarLayout } from "@/components/layout";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useGetSettings } from "@workspace/api-client-react";
import { photoStorageUrl } from "@/lib/photo-storage";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import CalendarPage from "@/pages/calendar";
import VideoList from "@/pages/video-list";
import Team from "@/pages/team";
import Report from "@/pages/report";
import CorridaBonus from "@/pages/corrida-bonus";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function FaviconApplier() {
  const { data: settings } = useGetSettings();
  useEffect(() => {
    const url = photoStorageUrl(settings?.faviconUrl) ?? "/favicon.svg";
    const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (link) link.href = url;
  }, [settings?.faviconUrl]);
  return null;
}

const OPERATOR_PATHS = ["/", "/calendar", "/videos"];
const MEMBER_PATH = "/corrida-bonus";

function Router() {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <span className="text-muted-foreground text-sm">Carregando...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSuccess={() => navigate("/")} />;
  }

  // Member: only corrida-bonus
  if (user.role === "member") {
    if (location !== MEMBER_PATH) return <Redirect to={MEMBER_PATH} />;
    return (
      <SidebarLayout>
        <Switch>
          <Route path={MEMBER_PATH} component={CorridaBonus} />
        </Switch>
      </SidebarLayout>
    );
  }

  // Operator: dashboard, calendar, videos
  if (user.role === "operator") {
    if (!OPERATOR_PATHS.includes(location)) return <Redirect to="/" />;
    return (
      <SidebarLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/videos" component={VideoList} />
        </Switch>
      </SidebarLayout>
    );
  }

  // Admin: full access
  return (
    <SidebarLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/videos" component={VideoList} />
        <Route path="/team" component={Team} />
        <Route path="/report" component={Report} />
        <Route path="/corrida-bonus" component={CorridaBonus} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </SidebarLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <FaviconApplier />
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
