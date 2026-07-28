import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import logo from "@/assets/agenbella-logo.png.asset.json";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { createSalon } from "@/lib/salon.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Criar meu negócio — AgenFloow" },
      { name: "description", content: "Configure seu salão no AgenFloow em poucas etapas: dados, horários, serviços e equipe." },
      { property: "og:title", content: "Criar meu negócio — AgenFloow" },
      { property: "og:description", content: "Seu salão organizado em poucos minutos." },
    ],
  }),
  component: Onboarding,
});

const steps = ["Seu negócio", "Identidade", "Funcionamento", "Serviços e equipe"];

function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useServerFn(createSalon);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", businessType: "", ownerName: "", phone: "",
    address: "", instagram: "", brandColor: "#d94f80",
    services: "", professionals: "",
  });

  const finish = async () => {
    if (form.name.trim().length < 2) {
      toast.error("Informe o nome do seu negócio");
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      await create({
        data: {
          name: form.name.trim(),
          businessType: form.businessType || undefined,
          ownerName: form.ownerName || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          instagram: form.instagram || undefined,
          brandColor: form.brandColor,
          services: form.services.split(/[,\n]/).map((v) => v.trim()).filter(Boolean),
          professionals: form.professionals.split(/[,\n]/).map((v) => v.trim()).filter(Boolean),
        },
      });
      await queryClient.invalidateQueries();
      toast.success("Negócio criado!", { description: "Seu salão está pronto no AgenFloow." });
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar o salão");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-soft-gradient px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo.url} alt="AgenFloow" className="h-9 w-9 rounded-lg object-cover object-top" />
          <span className="font-display text-lg">AgenFloow</span>
        </Link>

        <div className="mt-6 flex gap-1.5">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Etapa {step + 1} de {steps.length}</p>

        <div className="mt-4 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <h1 className="text-2xl">{steps[step]}</h1>

          {step === 0 && (
            <div className="mt-6 grid gap-4">
              <div className="grid gap-2"><Label htmlFor="n">Nome do negócio</Label><Input id="n" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Studio Bella" /></div>
              <div className="grid gap-2"><Label htmlFor="t">Tipo de negócio</Label><Input id="t" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} placeholder="Salão, barbearia, estética, nail design..." /></div>
              <div className="grid gap-2"><Label htmlFor="o">Nome do proprietário(a)</Label><Input id="o" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="Seu nome" /></div>
              <div className="grid gap-2"><Label htmlFor="tel">Telefone / WhatsApp</Label><Input id="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 90000-0000" /></div>
            </div>
          )}

          {step === 1 && (
            <div className="mt-6 grid gap-4">
              <div className="grid gap-2"><Label htmlFor="lg">Logo</Label><Input id="lg" type="file" accept="image/*" /></div>
              <div className="grid gap-2">
                <Label>Cor da marca</Label>
                <div className="flex flex-wrap gap-2">
                  {["#d94f80", "#b03a6a", "#7c2f63", "#3a1140", "#e08bb0", "#c2703f"].map((c) => (
                    <button key={c} type="button" aria-label={`Cor ${c}`} onClick={() => setForm({ ...form, brandColor: c })} className={`size-9 rounded-full border-2 ${form.brandColor === c ? "border-foreground" : "border-border"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="grid gap-2"><Label htmlFor="end">Endereço</Label><Input id="end" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro, cidade" /></div>
              <div className="grid gap-2"><Label htmlFor="ig">Instagram</Label><Input id="ig" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@seusalao" /></div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 grid gap-3">
              {["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map((d) => (
                <div key={d} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                  <span className="truncate text-sm">{d}</span>
                  <Input type="time" defaultValue="09:00" className="w-[7.5rem]" aria-label={`Abertura ${d}`} />
                  <Input type="time" defaultValue="19:00" className="w-[7.5rem]" aria-label={`Fechamento ${d}`} />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sv">Serviços oferecidos</Label>
                <Textarea id="sv" rows={4} value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="Corte feminino, escova, coloração, manicure..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eq">Profissionais</Label>
                <Textarea id="eq" rows={3} value={form.professionals} onChange={(e) => setForm({ ...form, professionals: e.target.value })} placeholder="Nome de cada profissional, separados por vírgula" />
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>Continuar <ArrowRight className="size-4" /></Button>
            ) : (
              <Button onClick={finish} disabled={saving}>
                <Check className="size-4" /> {saving ? "Criando…" : "Concluir"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}