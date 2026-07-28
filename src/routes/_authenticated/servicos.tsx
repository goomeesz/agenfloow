import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Clock, Tag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { brl } from "@/lib/salon-data";
import { useSalon, useSalonData } from "@/hooks/use-salon";
import { saveService, setServiceActive } from "@/lib/salon.functions";

export const Route = createFileRoute("/_authenticated/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços do salão — AgenFloow" },
      { name: "description", content: "Cadastre serviços com preço, duração, profissional responsável e status." },
      { property: "og:title", content: "Serviços do salão — AgenFloow" },
      { property: "og:description", content: "Gerencie o cardápio de serviços do seu negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Servicos,
});

function Servicos() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", duration: "" });
  const { data: salon } = useSalon();
  const { data } = useSalonData(salon?.id);
  const queryClient = useQueryClient();
  const save = useServerFn(saveService);
  const toggle = useServerFn(setServiceActive);
  const services = data?.services ?? [];

  const create = async () => {
    if (!salon) return;
    try {
      await save({
        data: {
          salonId: salon.id,
          name: form.name,
          description: form.description || null,
          price: Number(form.price) || 0,
          duration: Number(form.duration) || 60,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["salon-data"] });
      setOpen(false);
      setForm({ name: "", description: "", price: "", duration: "" });
      toast.success("Serviço criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  return (
    <AppShell
      title="Serviços"
      subtitle={`${services.length} serviços cadastrados`}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-4" /> Novo serviço</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo serviço</DialogTitle>
              <DialogDescription>Defina nome, preço e duração do atendimento.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2"><Label htmlFor="n">Nome</Label><Input id="n" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Escova modelada" /></div>
              <div className="grid gap-2"><Label htmlFor="d">Descrição</Label><Textarea id="d" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes do serviço" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label htmlFor="p">Preço (R$)</Label><Input id="p" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="120" /></div>
                <div className="grid gap-2"><Label htmlFor="du">Duração (min)</Label><Input id="du" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="60" /></div>
              </div>
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
        {services.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">{s.description ?? "—"}</p>
              </div>
              <Switch
                checked={s.active}
                onCheckedChange={async (v) => {
                  await toggle({ data: { id: s.id, active: v } });
                  queryClient.invalidateQueries({ queryKey: ["salon-data"] });
                  toast(v ? "Serviço ativado" : "Serviço desativado", { description: s.name });
                }}
                aria-label={`Ativar ${s.name}`}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5 font-semibold text-primary"><Tag className="size-3.5" /> {brl(Number(s.price))}</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="size-3.5" /> {s.duration} min</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Responsável: {(data?.professionals ?? []).find((p) => p.id === s.professional_id)?.name ?? "Equipe"}
            </p>
          </div>
        ))}
        {services.length === 0 && <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado ainda.</p>}
      </div>
    </AppShell>
  );
}
