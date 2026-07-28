import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, CalendarDays, CalendarRange, Users, Scissors, UserCog,
  BarChart3, Globe, QrCode, Settings, Menu, LogOut, CreditCard, Bell, UserRound, Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import logo from "@/assets/agenbella-logo.png.asset.json";
import { useSalon } from "@/hooks/use-salon";
import { useAccess, useNotifications } from "@/hooks/use-access";
import { markAllNotificationsRead } from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/calendario", label: "Calendário", icon: CalendarRange },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/servicos", label: "Serviços", icon: Scissors },
  { to: "/profissionais", label: "Profissionais", icon: UserCog },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/qrcode", label: "QR Code", icon: QrCode },
  { to: "/assinatura", label: "Assinatura", icon: CreditCard },
  { to: "/perfil", label: "Perfil", icon: UserRound },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function TrialBadge() {
  const { data: salon } = useSalon();
  const { data: access } = useAccess(salon?.id);
  const a = access?.access;
  if (!a || a.status === "active") return null;
  const tone =
    a.status === "expired" || a.status === "canceled"
      ? "bg-destructive/12 text-destructive"
      : a.status === "trial_expiring"
        ? "bg-warning/25 text-foreground"
        : "bg-rose-soft text-primary";
  const label =
    a.status === "expired"
      ? "Teste encerrado"
      : a.status === "canceled"
        ? "Assinatura cancelada"
        : `${a.daysLeft} ${a.daysLeft === 1 ? "dia" : "dias"} de teste`;
  return (
    <Link
      to="/assinatura"
      className={`hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium sm:flex ${tone}`}
    >
      <Sparkles className="size-3.5" /> {label}
    </Link>
  );
}

function NotificationsBell() {
  const { data: salon } = useSalon();
  const { data: items } = useNotifications(salon?.id);
  const queryClient = useQueryClient();
  const markAll = useServerFn(markAllNotificationsRead);
  const mutation = useMutation({
    mutationFn: () => markAll({ data: { salonId: salon?.id as string } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", salon?.id] }),
  });
  const unread = (items ?? []).filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notificações</p>
          {unread > 0 && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => mutation.mutate()}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <ul className="max-h-80 divide-y divide-border overflow-y-auto">
          {(items ?? []).map((n) => (
            <li key={n.id} className={`px-4 py-3 ${n.read ? "opacity-60" : ""}`}>
              <p className="text-sm font-medium">{n.title}</p>
              {n.message && <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </li>
          ))}
          {(items ?? []).length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground">Nenhuma notificação ainda.</li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function NavList({ onNavigate, slug }: { onNavigate?: () => void; slug?: string }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {nav.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary" }}
        >
          <item.icon className="size-4 shrink-0" />
          {item.label}
        </Link>
      ))}
      {slug && (
      <Link
        to="/salao/$slug"
        params={{ slug }}
        onClick={onNavigate}
        className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Globe className="size-4 shrink-0" />
        Página de agendamento
      </Link>
      )}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const { data: salon } = useSalon();
  return (
    <div className="flex h-full flex-col bg-sidebar py-5">
      <Link to="/" className="mb-6 flex items-center gap-3 px-6" onClick={onNavigate}>
        <img src={logo.url} alt="AgenFloow" className="h-10 w-10 rounded-lg bg-white object-cover object-top" />
        <div className="min-w-0">
          <p className="font-display text-lg leading-none text-sidebar-foreground">AgenFloow</p>
          <p className="truncate text-[11px] tracking-wide text-sidebar-foreground/55">{salon?.name ?? "Seu salão"}</p>
        </div>
      </Link>
      <NavList onNavigate={onNavigate} slug={salon?.slug} />
      <div className="mt-auto px-6 pt-6 text-[11px] text-sidebar-foreground/45">
        {salon?.owner_name ?? "AgenFloow"}
      </div>
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="hidden lg:block lg:sticky lg:top-0 lg:h-screen">
        <SidebarInner />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto]">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[272px] border-none p-0">
                <SheetTitle className="sr-only">Navegação</SheetTitle>
                <SidebarInner onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <TrialBadge />
              <NotificationsBell />
              {action}
              <Button variant="ghost" size="icon" aria-label="Sair da conta" onClick={signOut}>
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}