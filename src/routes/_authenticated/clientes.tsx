import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSalon, useSalonData } from "@/hooks/use-salon";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes do salão — AgenFloow" },
      { name: "description", content: "Histórico de atendimentos, serviços preferidos e próximos agendamentos de cada cliente." },
      { property: "og:title", content: "Clientes do salão — AgenFloow" },
      { property: "og:description", content: "Clientes novos e recorrentes em uma única lista." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const [q, setQ] = useState("");
  const { data: salon } = useSalon();
  const { data } = useSalonData(salon?.id);

  const appointments = data?.appointments ?? [];
  const clients = (data?.clients ?? []).map((c) => {
    const mine = appointments.filter((a) => a.client_id === c.id || (c.phone && a.client_phone === c.phone));
    const done = mine.filter((a) => a.status === "concluido");
    const favorite = mine.length
      ? Object.entries(mine.reduce<Record<string, number>>((acc, a) => {
          acc[a.service_name] = (acc[a.service_name] ?? 0) + 1;
          return acc;
        }, {})).sort((a, b) => b[1] - a[1])[0][0]
      : "—";
    const last = done.map((a) => a.date).sort().at(-1) ?? null;
    const next = mine.filter((a) => a.status !== "cancelado" && a.date >= new Date().toISOString().slice(0, 10))
      .map((a) => a.date).sort()[0] ?? null;
    return { ...c, visits: done.length, favorite, last, next };
  });

  const list = clients.filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone ?? "").includes(q),
  );

  return (
    <AppShell title="Clientes" subtitle={`${clients.length} clientes cadastrados`}>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total de clientes", value: clients.length },
          { label: "Com retorno marcado", value: clients.filter((c) => c.next).length },
          { label: "Atendimentos concluídos", value: clients.reduce((s, c) => s + c.visits, 0) },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-display text-2xl">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou telefone" className="pl-9" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {list.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="truncate font-medium">{c.name}</p>
            <p className="truncate text-xs text-muted-foreground">{c.phone ?? "sem telefone"}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-muted-foreground">Atendimentos</dt><dd className="font-medium">{c.visits}</dd></div>
              <div><dt className="text-muted-foreground">Serviço favorito</dt><dd className="truncate font-medium">{c.favorite}</dd></div>
              <div><dt className="text-muted-foreground">Último</dt><dd className="font-medium">{c.last ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Próximo</dt><dd className="font-medium">{c.next ?? "—"}</dd></div>
            </dl>
            {c.phone && (
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <a href={`https://wa.me/55${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" /> Falar no WhatsApp
                </a>
              </Button>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>}
      </div>
    </AppShell>
  );
}
