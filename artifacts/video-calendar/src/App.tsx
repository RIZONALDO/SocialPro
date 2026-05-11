import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarLayout } from "@/components/layout";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { photoStorageUrl } from "@/lib/photo-storage";
import { DEFAULT_NAV_PERMISSIONS } from "@/lib/nav-permissions";
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

// All non-admin routes mapped to their components
const ROUTE_MAP: { path: string; component: () => JSX.Element }[] = [
  { path: "/",             component: Dashboard    },
  { path: "/calendar",    component: CalendarPage  },
  { path: "/videos",      component: VideoList     },
  { path: "/team",        component: Team          },
  { path: "/report",      component: Report        },
  { path: "/corrida-bonus", component: CorridaBonus },
];

function Router() {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const navPermissions = settings?.navPermissions ?? DEFAULT_NAV_PERMISSIONS;

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

  // Admin: full access to everything
  if (user.role === "admin") {
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

  // Member: fixed to corrida-bonus only (not configurable)
  if (user.role === "member") {
    if (location !== "/corrida-bonus") return <Redirect to="/corrida-bonus" />;
    return (
      <SidebarLayout>
        <Switch>
          <Route path="/corrida-bonus" component={CorridaBonus} />
        </Switch>
      </SidebarLayout>
    );
  }

  // Operator & Creator: fully driven by settings.navPermissions
  const allowedPaths: string[] =
    user.role === "operator"
      ? (navPermissions.operator ?? DEFAULT_NAV_PERMISSIONS.operator)
      : (navPermissions.creator  ?? DEFAULT_NAV_PERMISSIONS.creator);

  const defaultPath = allowedPaths[0] ?? "/";
  if (!allowedPaths.includes(location)) return <Redirect to={defaultPath} />;

  return (
    <SidebarLayout>
      <Switch>
        {ROUTE_MAP.filter(r => allowedPaths.includes(r.path)).map(r => (
          <Route key={r.path} path={r.path} component={r.component} />
        ))}
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
