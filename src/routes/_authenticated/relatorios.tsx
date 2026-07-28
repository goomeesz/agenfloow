import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend,
} from "recharts";
import { weekdayShort } from "@/lib/salon-data";
import { useSalon, useSalonData } from "@/hooks/use-salon";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios do salão — AgenFloow" },
      { name: "description", content: "Gráficos de agendamentos por dia, horários mais movimentados, serviços mais procurados e clientes novos." },
      { property: "og:title", content: "Relatórios do salão — AgenFloow" },
      { property: "og:description", content: "Entenda o movimento do seu salão com indicadores claros." },
    ],
  }),
  component: Relatorios,
});

const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)" };

function Relatorios() {
  const { data: salon } = useSalon();
  const { data } = useSalonData(salon?.id);
  const appts = (data?.appointments ?? []).filter((a) => a.status !== "cancelado");

  const weekdayChart = weekdayShort.map((day, i) => ({
    day,
    agendamentos: appts.filter((a) => new Date(`${a.date}T12:00:00`).getDay() === i).length,
  }));

  const hourChart = Array.from({ length: 12 }, (_, i) => i + 8).map((h) => ({
    hour: `${String(h).padStart(2, "0")}h`,
    agendamentos: appts.filter((a) => a.time.startsWith(String(h).padStart(2, "0"))).length,
  }));

  const serviceTotals = appts.reduce<Record<string, number>>((acc, a) => {
    acc[a.service_name] = (acc[a.service_name] ?? 0) + 1;
    return acc;
  }, {});
  const topServices = Object.entries(serviceTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const monthKeys = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("pt-BR", { month: "short" }) };
  });
  const seen = new Set<string>();
  const clientsTrend = monthKeys.map(({ key, label }) => {
    const inMonth = appts.filter((a) => a.date.startsWith(key));
    let novos = 0;
    let recorrentes = 0;
    for (const a of inMonth) {
      const id = a.client_phone ?? a.client_name;
      if (seen.has(id)) recorrentes += 1;
      else {
        novos += 1;
        seen.add(id);
      }
    }
    return { month: label, novos, recorrentes };
  });

  return (
    <AppShell title="Relatórios" subtitle="Indicadores e gráficos do seu negócio">
      <Tabs defaultValue="mes">
        <TabsList>
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="semana">Esta semana</TabsTrigger>
          <TabsTrigger value="mes">Este mês</TabsTrigger>
          <TabsTrigger value="custom">Personalizado</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg">Agendamentos por dia da semana</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="agendamentos" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg">Horários mais movimentados</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="agendamentos" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg">Serviços mais agendados</h2>
          <ul className="mt-4 space-y-3">
            {topServices.map((s) => (
              <li key={s.name}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{s.name}</span>
                  <span className="shrink-0 font-semibold">{s.total}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-brand-gradient" style={{ width: `${(s.total / (topServices[0]?.total || 1)) * 100}%` }} />
                </div>
              </li>
            ))}
            {topServices.length === 0 && <li className="text-sm text-muted-foreground">Sem dados ainda.</li>}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg">Clientes novos e recorrentes</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={clientsTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="novos" stroke="var(--chart-1)" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="recorrentes" stroke="var(--chart-4)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppShell>
  );
}