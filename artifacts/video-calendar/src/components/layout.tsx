import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  CalendarDays, LayoutDashboard, Video, Users, FileBarChart,
  Settings, Crown, Sun, Moon, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { photoStorageUrl } from "@/components/photo-upload";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChangePasswordDialog, ForcedChangePasswordDialog } from "@/components/change-password-dialog";
import { DEFAULT_NAV_PERMISSIONS } from "@/lib/nav-permissions";

export const ALL_NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/videos", label: "Vídeos", icon: Video },
  { href: "/team", label: "Equipe", icon: Users },
  { href: "/report", label: "Relatório", icon: FileBarChart },
  { href: "/corrida-bonus", label: "Corrida do Bônus", icon: Crown },
  { href: "/settings", label: "Configurações", icon: Settings },
];

const ADMIN_HREFS = ALL_NAV_ITEMS.map(i => i.href);

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const appName = settings?.appName ?? "Minha Produtora";
  const logoUrl = settings?.logoUrl ?? null;
  const prosocialIconUrl = settings?.prosocialIconUrl ?? null;
  const navPermissions = settings?.navPermissions ?? DEFAULT_NAV_PERMISSIONS;
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, logout, refreshUser } = useAuth();

  useEffect(() => {
    document.title = "ProSocial";
  }, []);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const logoSrc = photoStorageUrl(logoUrl);
  const prosocialSrc = photoStorageUrl(prosocialIconUrl);

  const allowedHrefs: string[] =
    user?.role === "admin"
      ? ADMIN_HREFS
      : user?.role === "operator"
      ? navPermissions.operator ?? DEFAULT_NAV_PERMISSIONS.operator
      : user?.role === "member"
      ? navPermissions.member ?? DEFAULT_NAV_PERMISSIONS.member
      : user?.role === "creator"
      ? navPermissions.creator ?? DEFAULT_NAV_PERMISSIONS.creator
      : [];

  const navItems = ALL_NAV_ITEMS.filter(item => allowedHrefs.includes(item.href));

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
            href={user?.role === "admin" || user?.role === "operator" ? "/" : "/corrida-bonus"}
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

            {/* Separator + Collapse toggle — always after last nav item */}
            <li className="mt-2 pt-2 border-t border-border">
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCollapsed(false)}
                      className="flex items-center justify-center w-full py-1"
                      aria-label="Expandir menu"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all">
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Expandir menu</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={() => setCollapsed(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-all bg-primary/10 text-primary hover:bg-primary/20"
                  aria-label="Recolher menu"
                >
                  <ChevronLeft className="h-4 w-4 flex-shrink-0" />
                  <span>Recolher menu</span>
                </button>
              )}
            </li>
          </ul>
        </nav>

        {/* ProSocial branding */}
        <div className={`border-t px-3 py-2 flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
          {prosocialSrc ? (
            <img src={prosocialSrc} alt="ProSocial" className="h-5 w-5 object-contain rounded flex-shrink-0" />
          ) : (
            <Video className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
          )}
          {!collapsed && (
            <span className="text-xs text-muted-foreground/50 font-medium tracking-wide">ProSocial</span>
          )}
        </div>

        {/* Bottom: user info + actions */}
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
                    {user.role === "admin" ? "Administrador" : user.role === "operator" ? "Operador" : user.role === "creator" ? "Creator" : "Membro"}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className={`flex ${collapsed ? "flex-col items-center gap-1" : "gap-1"} items-center`}>
            {/* Change password */}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span><ChangePasswordDialog collapsed /></span>
                </TooltipTrigger>
                <TooltipContent side="right">Trocar senha</TooltipContent>
              </Tooltip>
            ) : (
              <ChangePasswordDialog />
            )}

            {/* Logout */}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    title="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                onClick={logout}
                className="flex-1 justify-start gap-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10 font-medium"
                title="Sair"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                <span>Sair</span>
              </Button>
            )}
          </div>

        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-4 w-full flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
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

      {user?.mustChangePassword && (
        <ForcedChangePasswordDialog onDone={refreshUser} />
      )}
    </div>
  );
}
