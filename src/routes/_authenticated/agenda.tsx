import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSalon, useSalonData } from "@/hooks/use-salon";
import { createAppointment, setAppointmentStatus } from "@/lib/salon.functions";
import {
  addDays, brl, isoDate, statusLabels, statusStyles, weekdayShort, type Status,
} from "@/lib/salon-data";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda do salão — AgenFloow" },
      { name: "description", content: "Agenda por dia, semana e mês com filtros por profissional, serviço e status." },
      { property: "og:title", content: "Agenda do salão — AgenFloow" },
      { property: "og:description", content: "Crie, edite, reagende e acompanhe cada atendimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Agenda,
});

const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function NewAppointmentDialog({ salonId }: { salonId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientName: "", clientPhone: "", serviceId: "", professionalId: "", date: isoDate(new Date()), time: "09:00",
  });
  const { data } = useSalonData(salonId);
  const queryClient = useQueryClient();
  const create = useServerFn(createAppointment);

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          salonId,
          clientName: form.clientName,
          clientPhone: form.clientPhone || undefined,
          serviceId: form.serviceId,
          professionalId: form.professionalId || null,
          date: form.date,
          time: form.time,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salon-data"] });
      setOpen(false);
      setForm((f) => ({ ...f, clientName: "", clientPhone: "" }));
      toast.success("Agendamento criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = form.clientName.trim().length > 1 && form.serviceId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><CalendarPlus className="size-4" /> Novo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
          <DialogDescription>Cadastre um atendimento manualmente na agenda.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Input id="cliente" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Nome da cliente" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tel">WhatsApp</Label>
            <Input id="tel" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} placeholder="(11) 90000-0000" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Serviço</Label>
              <Select value={form.serviceId} onValueChange={(v) => setForm({ ...form, serviceId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {(data?.services ?? []).filter((s) => s.active).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Profissional</Label>
              <Select value={form.professionalId} onValueChange={(v) => setForm({ ...form, professionalId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {(data?.professionals ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hora">Horário</Label>
              <Input id="hora" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Salvando…" : "Salvar agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Agenda() {
  const { data: salon } = useSalon();
  const { data, isLoading } = useSalonData(salon?.id);
  const [pro, setPro] = useState("todos");
  const [status, setStatus] = useState("todos");
  const queryClient = useQueryClient();
  const changeStatus = useServerFn(setAppointmentStatus);

  const cancel = async (id: string, client: string) => {
    try {
      await changeStatus({ data: { id, status: "cancelado" } });
      queryClient.invalidateQueries({ queryKey: ["salon-data"] });
      toast.error("Agendamento cancelado", { description: client });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar");
    }
  };

  const todayIso = isoDate(new Date());
  const days = Array.from({ length: 5 }, (_, i) => addDays(todayIso, i));
  const appointments = data?.appointments ?? [];

  const filtered = appointments.filter(
    (a) => (pro === "todos" || a.professional_id === pro) && (status === "todos" || a.status === status),
  );
  const day = filtered.filter((a) => a.date === todayIso);

  return (
    <AppShell
      title="Agenda"
      subtitle="Dia, semana e mês do seu salão"
      action={salon ? <NewAppointmentDialog salonId={salon.id} /> : undefined}
    >
      <div className="flex flex-wrap gap-3">
        <Select value={pro} onValueChange={setPro}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os profissionais</SelectItem>
            {(data?.professionals ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(statusLabels) as Status[]).map((s) => (
              <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="dia" className="mt-5">
        <TabsList>
          <TabsTrigger value="dia">Dia</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
        </TabsList>

        <TabsContent value="dia" className="mt-4">
          <div className="rounded-2xl border border-border bg-card shadow-soft">
            {isLoading && <p className="p-6 text-sm text-muted-foreground">Carregando agenda…</p>}
            {!isLoading && day.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">Nenhum agendamento com esses filtros.</p>
            )}
            {day.map((a) => (
              <div key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 border-b border-border p-4 last:border-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <div className="w-14 shrink-0">
                  <p className="text-sm font-semibold text-primary">{a.time}</p>
                  <p className="text-[11px] text-muted-foreground">{a.duration}min</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.client_name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {a.service_name} · {a.professional_name ?? "Equipe"} · {brl(Number(a.price))}
                  </p>
                </div>
                <div className="col-span-full flex flex-wrap items-center gap-2 sm:col-auto">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[a.status as Status]}`}>
                    {statusLabels[a.status as Status]}
                  </span>
                  {a.status !== "concluido" && a.status !== "cancelado" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await changeStatus({ data: { id: a.id, status: "concluido" } });
                        queryClient.invalidateQueries({ queryKey: ["salon-data"] });
                        toast.success("Atendimento concluído");
                      }}
                    >
                      Concluir
                    </Button>
                  )}
                  {a.status !== "cancelado" && (
                    <Button variant="ghost" size="sm" onClick={() => cancel(a.id, a.client_name)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="semana" className="mt-4">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[64px_repeat(5,minmax(0,1fr))] border-b border-border">
                <div />
                {days.map((d) => (
                  <div key={d} className="border-l border-border p-3 text-center text-xs font-semibold">
                    {weekdayShort[new Date(`${d}T12:00:00`).getDay()]} {d.slice(8)}
                  </div>
                ))}
              </div>
              {hours.map((h) => (
                <div key={h} className="grid grid-cols-[64px_repeat(5,minmax(0,1fr))] border-b border-border last:border-0">
                  <div className="p-2 text-[11px] text-muted-foreground">{h}</div>
                  {days.map((d) => {
                    const items = filtered.filter((a) => a.date === d && a.time.startsWith(h.slice(0, 2)));
                    return (
                      <div key={d} className="min-h-14 border-l border-border p-1.5">
                        {items.map((a) => (
                          <div key={a.id} className="mb-1 rounded-lg bg-rose-soft px-2 py-1.5 text-[11px] leading-tight text-plum">
                            <p className="truncate font-semibold">{a.time} {a.client_name}</p>
                            <p className="truncate opacity-75">{a.service_name}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
