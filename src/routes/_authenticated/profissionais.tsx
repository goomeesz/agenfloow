import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useSalon, useSalonData } from "@/hooks/use-salon";
import { saveProfessional } from "@/lib/salon.functions";
import { isoDate } from "@/lib/salon-data";

export const Route = createFileRoute("/_authenticated/profissionais")({
  head: () => ({
    meta: [
      { title: "Profissionais — AgenFloow" },
      { name: "description", content: "Cadastre a equipe do salão, dias de trabalho e serviços de cada profissional." },
      { property: "og:title", content: "Profissionais — AgenFloow" },
      { property: "og:description", content: "Organize a equipe do seu salão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profissionais,
});

function Profissionais() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", days: "" });
  const { data: salon } = useSalon();
  const { data } = useSalonData(salon?.id);
  const queryClient = useQueryClient();
  const save = useServerFn(saveProfessional);
  const pros = data?.professionals ?? [];
  const todayIso = isoDate(new Date());

  const create = async () => {
    if (!salon) return;
    try {
      await save({ data: { salonId: salon.id, name: form.name, role: form.role || null, days: form.days || null } });
      queryClient.invalidateQueries({ queryKey: ["salon-data"] });
      setOpen(false);
      setForm({ name: "", role: "", days: "" });
      toast.success("Profissional adicionado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  return (
    <AppShell
      title="Profissionais"
      subtitle={`${pros.length} pessoas na equipe`}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-4" /> Adicionar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo profissional</DialogTitle>
              <DialogDescription>Adicione alguém da equipe à agenda do salão.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2"><Label htmlFor="pn">Nome</Label><Input id="pn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" /></div>
              <div className="grid gap-2"><Label htmlFor="pf">Função</Label><Input id="pf" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Ex.: Nail designer" /></div>
              <div className="grid gap-2"><Label htmlFor="pd">Dias de trabalho</Label><Input id="pd" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} placeholder="Ex.: Ter a Sáb" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button disabled={form.name.trim().length < 2} onClick={create}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pros.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-primary-foreground">
                {p.initials ?? "--"}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">{p.role ?? "Profissional"}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Atende: {p.days ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Serviços: {(data?.services ?? []).filter((s) => s.professional_id === p.id).map((s) => s.name).join(", ") || "—"}
            </p>
            <p className="mt-4 text-sm">
              <span className="font-semibold">
                {(data?.appointments ?? []).filter((a) => a.professional_id === p.id && a.date === todayIso && a.status !== "cancelado").length}
              </span>{" "}
              atendimentos hoje
            </p>
          </div>
        ))}
        {pros.length === 0 && <p className="text-sm text-muted-foreground">Nenhum profissional cadastrado ainda.</p>}
      </div>
    </AppShell>
  );
}
