import { Link, useLocation } from "wouter";
import { CalendarDays, LayoutDashboard, Video, Users, FileBarChart, Settings } from "lucide-react";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { photoStorageUrl } from "@/components/photo-upload";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const appName = settings?.appName ?? "Minha Produtora";
  const logoUrl = settings?.logoUrl ?? null;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/calendar", label: "Calendário", icon: CalendarDays },
    { href: "/videos", label: "Vídeos", icon: Video },
    { href: "/team", label: "Equipe", icon: Users },
    { href: "/report", label: "Relatório", icon: FileBarChart },
    { href: "/settings", label: "Configurações", icon: Settings },
  ];

  const logoSrc = photoStorageUrl(logoUrl);

  const LogoIcon = () =>
    logoSrc ? (
      <img src={logoSrc} alt="Logo" className="h-6 w-6 object-contain rounded" />
    ) : (
      <Video className="h-6 w-6 flex-shrink-0" />
    );

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <aside className="hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold min-w-0 flex-1">
            <LogoIcon />
            <span className="truncate">{appName}</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-auto py-4">
          <ul className="grid gap-1 px-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary ${
                      isActive ? "bg-muted text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-4 w-full flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <div className="flex h-14 items-center sm:hidden">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <LogoIcon />
              <span className="truncate">{appName}</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
