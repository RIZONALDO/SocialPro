import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  CalendarDays, LayoutDashboard, Video, Users, FileBarChart,
  Settings, Crown, Sun, Moon, PanelLeftClose, PanelLeftOpen, LogOut,
} from "lucide-react";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { photoStorageUrl } from "@/components/photo-upload";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChangePasswordDialog } from "@/components/change-password-dialog";

// roles: which roles can see this item (undefined = all authenticated users)
const ALL_NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "operator"] },
  { href: "/calendar", label: "Calendário", icon: CalendarDays, roles: ["admin", "operator"] },
  { href: "/videos", label: "Vídeos", icon: Video, roles: ["admin", "operator"] },
  { href: "/team", label: "Equipe", icon: Users, roles: ["admin"] },
  { href: "/report", label: "Relatório", icon: FileBarChart, roles: ["admin"] },
  { href: "/corrida-bonus", label: "Corrida do Bônus", icon: Crown, roles: ["admin", "member"] },
  { href: "/settings", label: "Configurações", icon: Settings, roles: ["admin"] },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const appName = settings?.appName ?? "ProSocial";
  const logoUrl = settings?.logoUrl ?? null;
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  useEffect(() => {
    document.title = appName;
  }, [appName]);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const logoSrc = photoStorageUrl(logoUrl);

  const navItems = ALL_NAV_ITEMS.filter(item =>
    user?.role ? item.roles.includes(user.role) : false
  );

  const LogoIcon = ({ size = "sm" }: { size?: "sm" | "lg" }) =>
    logoSrc ? (
      <img
        src={logoSrc}
        alt="Logo"
        className={size === "lg" ? "h-10 w-10 object-contain rounded-lg flex-shrink-0" : "h-6 w-6 object-contain rounded flex-shrink-0"}
      />
    ) : (
      <Video className={size === "lg" ? "h-10 w-10 flex-shrink-0" : "h-6 w-6 flex-shrink-0"} />
    );

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar */}
      <aside
        className={`hidden sm:flex flex-col border-r bg-background transition-all duration-200 ease-in-out relative ${
          collapsed ? "w-[56px]" : "w-64"
        }`}
      >
        {/* Logo row */}
        <div className={`flex items-center border-b overflow-hidden transition-all duration-200 ${collapsed ? "h-16 px-2 justify-center" : "h-20 px-4 gap-3"}`}>
          <Link
            href={user?.role === "admin" ? "/" : "/corrida-bonus"}
            className={`flex min-w-0 flex-1 overflow-hidden ${collapsed ? "justify-center" : "items-center gap-3"}`}
          >
            <LogoIcon size={collapsed ? "sm" : "lg"} />
            {!collapsed && (
              <span className="truncate text-base font-bold leading-tight">{appName}</span>
            )}
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-auto py-3">
          <ul className="grid gap-1 px-2">
            {navItems.map((item) => {
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

            {/* Divider + Toggle button */}
            <li className="mt-3 pt-3 border-t border-border">
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCollapsed(false)}
                      className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm transition-all text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <PanelLeftOpen className="h-4 w-4 flex-shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Expandir menu</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={() => setCollapsed(true)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-all text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Recolher menu</span>
                </button>
              )}
            </li>
          </ul>
        </nav>

        {/* Bottom: user info + collapse toggle */}
        <div className="border-t px-2 py-2 space-y-1">
          {user && (
            <div className={`flex items-center gap-2 px-2 py-1 ${collapsed ? "justify-center" : ""}`}>
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={photoStorageUrl(user.photoUrl)} alt={user.name ?? user.username} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {(user.name ?? user.username).substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{user.name ?? user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.role === "admin" ? "Administrador" : user.role === "operator" ? "Operador" : "Membro"}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className={`flex ${collapsed ? "flex-col items-center gap-1" : "justify-start gap-1"} items-center`}>
            {collapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sair</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><ChangePasswordDialog collapsed /></span>
                  </TooltipTrigger>
                  <TooltipContent side="right">Trocar senha</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive" title="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
                <ChangePasswordDialog />
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-4 w-full flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          {/* Mobile logo */}
          <div className="flex h-14 items-center sm:hidden">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <LogoIcon size="sm" />
              <span className="truncate">{appName}</span>
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-1">
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
