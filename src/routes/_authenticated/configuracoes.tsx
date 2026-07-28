import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useSalon, useSalonData } from "@/hooks/use-salon";
import { updateSalon } from "@/lib/salon.functions";
import { weekdayNames } from "@/lib/salon-data";
import logo from "@/assets/agenfloow-logo.png";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações do negócio — AgenFloow" },
      { name: "description", content: "Personalize nome, logo, cores, endereço, horários e link de agendamento do salão." },
      { property: "og:title", content: "Configurações do negócio — AgenFloow" },
      { property: "og:description", content: "Deixe o AgenFloow com a cara do seu salão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Configuracoes,
});

const brandColors = ["#d94f80", "#b03a6a", "#7c2f63", "#3a1140", "#e08bb0", "#c2703f"];

function Configuracoes() {
  const { data: salon } = useSalon();
  const { data } = useSalonData(salon?.id);
  const queryClient = useQueryClient();
  const save = useServerFn(updateSalon);
  const [form, setForm] = useState({ name: "", businessType: "", ownerName: "", address: "", phone: "", instagram: "", brandColor: "#d94f80", publicEnabled: true });

  useEffect(() => {
    if (salon) {
      setForm({
        name: salon.name,
        businessType: salon.business_type ?? "",
        ownerName: salon.owner_name ?? "",
        address: salon.address ?? "",
        phone: salon.phone ?? "",
        instagram: salon.instagram ?? "",
        brandColor: salon.brand_color,
        publicEnabled: salon.public_enabled,
      });
    }
  }, [salon]);

  const persist = async (patch?: Partial<typeof form>) => {
    if (!salon) return;
    const next = { ...form, ...patch };
    setForm(next);
    try {
      await save({
        data: {
          salonId: salon.id,
          name: next.name,
          businessType: next.businessType || null,
          ownerName: next.ownerName || null,
          address: next.address || null,
          phone: next.phone || null,
          instagram: next.instagram || null,
          brandColor: next.brandColor,
          publicEnabled: next.publicEnabled,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["salon"] });
      toast.success("Configurações salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  return (
    <AppShell
      title="Configurações"
      subtitle="Dados e personalização do negócio"
      action={<Button size="sm" onClick={() => persist()}>Salvar</Button>}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg">Dados do salão</h2>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2"><Label htmlFor="nome">Nome do salão</Label><Input id="nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="tipo">Tipo de negócio</Label><Input id="tipo" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="dono">Proprietário(a)</Label><Input id="dono" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="end">Endereço</Label><Input id="end" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="tel">Telefone</Label><Input id="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="grid gap-2"><Label htmlFor="ig">Instagram</Label><Input id="ig" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></div>
            </div>
          </div>
        </section>

        <div className="grid gap-4">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-lg">Identidade visual</h2>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <img src={salon?.logo_url ?? logo} alt="Logo do salão" className="size-16 rounded-xl border border-border object-cover object-top" />
            </div>
            <p className="mt-5 text-sm font-medium">Cor da marca</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {brandColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  onClick={() => persist({ brandColor: c })}
                  className={`size-9 rounded-full border-2 transition-transform hover:scale-110 ${form.brandColor === c ? "border-foreground" : "border-border"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-lg">Link de agendamento</h2>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-sm">
              <span className="shrink-0 text-muted-foreground">/salao/</span>
              <span className="min-w-0 truncate font-medium">{salon?.slug}</span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Página pública ativa</p>
                <p className="text-xs text-muted-foreground">Clientes podem agendar online</p>
              </div>
              <Switch checked={form.publicEnabled} onCheckedChange={(v) => persist({ publicEnabled: v })} aria-label="Página pública ativa" />
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <h2 className="text-lg">Horário de funcionamento</h2>
          <div className="mt-4 grid gap-2">
            {(data?.hours ?? []).map((h) => (
              <div key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-secondary/60 px-4 py-3">
                <p className="truncate text-sm font-medium">{weekdayNames[h.weekday]}</p>
                <p className="shrink-0 text-sm text-muted-foreground">
                  {h.closed || !h.open_time ? "Fechado" : `${h.open_time} — ${h.close_time}`}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
