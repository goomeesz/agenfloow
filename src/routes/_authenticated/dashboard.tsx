import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, CalendarCheck, Users, Clock, Wallet, ArrowRight, Scissors } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useSalon, useSalonData } from "@/hooks/use-salon";
import { brl, isoDate, statusLabels, statusStyles, weekdayShort, type Status } from "@/lib/salon-data";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard do salão — AgenFloow" },
      { name: "description", content: "Visão geral do movimento do salão: agendamentos, clientes, horários livres e faturamento estimado." },
      { property: "og:title", content: "Dashboard do salão — AgenFloow" },
      { property: "og:description", content: "Acompanhe o movimento do seu salão em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: salon } = useSalon();
  const { data, isLoading } = useSalonData(salon?.id);

  const todayIso = isoDate(new Date());
  const appointments = data?.appointments ?? [];
  const today = appointments.filter((a) => a.date === todayIso && a.status !== "cancelado");
  const revenue = today.reduce((s, a) => s + Number(a.price), 0);
  const next = today.find((a) => a.status === "agendado" || a.status === "confirmado");
  const clientsToday = new Set(today.map((a) => a.client_name)).size;
  const pending = today.filter((a) => a.status === "agendado").length;

  const weekdayChart = weekdayShort.map((day, i) => ({
    day,
    agendamentos: appointments.filter(
      (a) => new Date(`${a.date}T12:00:00`).getDay() === i && a.status !== "cancelado",
    ).length,
  }));

  const cards = [
    { label: "Agendamentos de hoje", value: String(today.length), icon: CalendarCheck, hint: `${pending} aguardando confirmação` },
    { label: "Clientes de hoje", value: String(clientsToday), icon: Users, hint: `${data?.clients.length ?? 0} clientes cadastrados` },
    { label: "Equipe ativa", value: String(data?.professionals.length ?? 0), icon: Clock, hint: `${data?.services.length ?? 0} serviços no cardápio` },
    { label: "Faturamento estimado", value: brl(revenue), icon: Wallet, hint: "Serviços agendados hoje" },
  ];

  return (
    <AppShell
      title="Dashboard"
      subtitle="Como está o seu salão hoje"
      action={
        <Button asChild size="sm">
          <Link to="/agenda"><CalendarPlus className="size-4" /> Novo agendamento</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm text-muted-foreground">{c.label}</p>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-soft text-primary">
                <c.icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl">{isLoading ? "—" : c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-brand-gradient p-6 text-primary-foreground shadow-soft">
          <p className="text-xs tracking-wide text-primary-foreground/75 uppercase">Próximo agendamento</p>
          {next ? (
            <>
              <p className="mt-3 font-display text-2xl">{next.client_name}</p>
              <p className="mt-1 text-sm text-primary-foreground/85">{next.service_name}</p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5"><Clock className="size-4" /> {next.time}</span>
                <span className="flex items-center gap-1.5"><Scissors className="size-4" /> {next.professional_name ?? "Equipe"}</span>
              </div>
            </>
          ) : (
            <p className="mt-3">Nenhum agendamento restante hoje.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg">Agendamentos por dia da semana</h2>
            <Link to="/relatorios" className="shrink-0 text-xs font-medium text-primary hover:underline">
              Relatórios
            </Link>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Bar dataKey="agendamentos" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg">Atendimentos de hoje</h2>
            <Link to="/agenda" className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
              Ver agenda <ArrowRight className="size-3" />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {appointments.filter((a) => a.date === todayIso).map((a) => (
              <li key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
                <span className="w-12 shrink-0 text-sm font-semibold text-primary">{a.time}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.client_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.service_name} · {a.professional_name ?? "Equipe"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[a.status as Status]}`}>
                  {statusLabels[a.status as Status]}
                </span>
              </li>
            ))}
            {!isLoading && appointments.filter((a) => a.date === todayIso).length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">Nenhum agendamento para hoje ainda.</li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg">Equipe hoje</h2>
          <ul className="mt-4 space-y-3">
            {(data?.professionals ?? []).map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rose-soft text-sm font-semibold text-plum">
                  {p.initials ?? "--"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.role ?? "Profissional"}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">
                  {today.filter((a) => a.professional_id === p.id).length}
                </span>
              </li>
            ))}
            {(data?.professionals.length ?? 0) === 0 && (
              <li className="text-sm text-muted-foreground">
                <Link to="/profissionais" className="text-primary hover:underline">Cadastre sua equipe</Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
