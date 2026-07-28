import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useSalon, useSalonData } from "@/hooks/use-salon";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário mensal — AgenFloow" },
      { name: "description", content: "Visão mensal completa com os dias mais e menos movimentados do salão." },
      { property: "og:title", content: "Calendário mensal — AgenFloow" },
      { property: "og:description", content: "Enxergue o movimento do salão durante todo o mês." },
    ],
  }),
  component: Calendario,
});

function Calendario() {
  const { data: salon } = useSalon();
  const { data } = useSalonData(salon?.id);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const appts = data?.appointments ?? [];
  const counts = Array.from({ length: daysInMonth }, (_, i) => {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    return appts.filter((a) => a.date === iso && a.status !== "cancelado").length;
  });
  const total = counts.reduce((a, b) => a + b, 0);
  const busiest = Math.max(...counts);
  const empty = counts.filter((c) => c === 0).length;

  return (
    <AppShell title="Calendário" subtitle="Visão mensal do movimento">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Agendamentos no mês", value: total },
          { label: "Dia mais movimentado", value: `${busiest} atendimentos` },
          { label: "Dias sem agendamento", value: empty },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-display text-2xl">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-6">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-muted-foreground">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {counts.map((c, i) => (
            <div
              key={i}
              className={`aspect-square rounded-xl border border-border/60 p-2 text-left transition-transform hover:-translate-y-0.5 ${
                c === 0 ? "bg-muted/50" : c > 10 ? "bg-primary/85 text-primary-foreground" : c > 5 ? "bg-primary/35" : "bg-primary/15"
              }`}
            >
              <p className="text-xs font-semibold">{i + 1}</p>
              {c > 0 && <p className="text-[10px] opacity-80">{c} ag.</p>}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-muted/50" /> Sem agendamentos</span>
          <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-primary/15" /> Movimento baixo</span>
          <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-primary/35" /> Movimento médio</span>
          <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-primary/85" /> Dia cheio</span>
        </div>
      </div>
    </AppShell>
  );
}