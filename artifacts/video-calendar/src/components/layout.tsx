import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  CalendarDays, LayoutDashboard, Video, Users, FileBarChart,
  Settings, Crown, Sun, Moon, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { photoStorageUrl } from "@/components/photo-upload";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/videos", label: "Vídeos", icon: Video },
  { href: "/team", label: "Equipe", icon: Users },
  { href: "/report", label: "Relatório", icon: FileBarChart },
  { href: "/corrida-bonus", label: "Corrida do Bônus", icon: Crown },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const appName = settings?.appName ?? "Minha Produtora";
  const logoUrl = settings?.logoUrl ?? null;
  const { theme, toggle: toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const logoSrc = photoStorageUrl(logoUrl);

  const LogoIcon = () =>
    logoSrc ? (
      <img src={logoSrc} alt="Logo" className="h-6 w-6 object-contain rounded flex-shrink-0" />
    ) : (
      <Video className="h-6 w-6 flex-shrink-0" />
    );

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar */}
      <aside
        className={`hidden sm:flex flex-col border-r bg-background transition-all duration-200 ease-in-out ${
          collapsed ? "w-[56px]" : "w-64"
        }`}
      >
        {/* Logo row */}
        <div className="flex h-14 items-center border-b px-3 lg:h-[60px] gap-2 overflow-hidden">
          <Link href="/" className="flex items-center gap-2 font-semibold min-w-0 flex-1 overflow-hidden">
            <LogoIcon />
            {!collapsed && (
              <span className="truncate text-sm">{appName}</span>
            )}
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-auto py-3">
          <ul className="grid gap-1 px-2">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href;
              const linkClass = `flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-all hover:text-primary ${
                isActive ? "bg-muted text-primary" : "text-muted-foreground"
              } ${collapsed ? "justify-center" : ""}`;

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={item.href} className={linkClass}>
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link href={item.href} className={linkClass}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse toggle at the bottom */}
        <div className="border-t px-2 py-2 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className="text-muted-foreground hover:text-primary"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-4 w-full flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          {/* Mobile logo */}
          <div className="flex h-14 items-center sm:hidden">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <LogoIcon />
              <span className="truncate">{appName}</span>
            </Link>
          </div>

          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
