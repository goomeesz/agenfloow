import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/hooks/use-salon";
import { useAccess } from "@/hooks/use-access";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock, CreditCard, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — AgenFloow" },
      { name: "description", content: "Atualize seu nome, e-mail de acesso e senha da conta AgenFloow." },
      { property: "og:title", content: "Meu perfil — AgenFloow" },
      { property: "og:description", content: "Dados da sua conta e segurança de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Perfil,
});

const statusLabel: Record<string, string> = {
  trial: "Teste gratuito",
  trial_expiring: "Teste terminando",
  expired: "Teste encerrado",
  active: "Assinatura ativa",
  canceled: "Assinatura cancelada",
};

function Perfil() {
  const { data: salon } = useSalon();
  const { data: accessData, isLoading: accessLoading } = useAccess(salon?.id);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setName((data.user?.user_metadata?.full_name as string) ?? "");
    });
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado.");
  };

  const changePassword = async () => {
    if (password.length < 8) return toast.error("A senha precisa ter ao menos 8 caracteres.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      setPassword("");
      toast.success("Senha alterada.");
    }
  };

  const access = accessData?.access;
  const subscription = accessData?.subscription;

  return (
    <AppShell title="Meu perfil" subtitle="Dados da sua conta e plano">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg">Dados pessoais</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail de acesso</Label>
              <Input id="email" value={email} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Negócio</Label>
              <Input value={salon?.name ?? ""} disabled />
            </div>
            <Button onClick={saveProfile} disabled={saving}>Salvar alterações</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg">Meu plano</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe sua assinatura e o período de teste do AgenFloow Pro.
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4 text-primary" /> Plano
              </span>
              <span className="text-sm font-medium">AgenFloow Pro — R$ 97/mês</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="size-4 text-primary" /> Situação
              </span>
              <span className="text-sm font-medium">
                {accessLoading ? "—" : (statusLabel[access?.status ?? ""] ?? "—")}
              </span>
            </div>
            {access && access.status !== "active" && access.status !== "canceled" && (
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4 text-primary" /> Tempo restante
                </span>
                <span className="text-sm font-medium">
                  {access.blocked
                    ? "Teste encerrado"
                    : `${access.daysLeft} ${access.daysLeft === 1 ? "dia" : "dias"}`}
                </span>
              </div>
            )}
            {subscription?.next_billing_date && access?.status === "active" && (
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="size-4 text-primary" /> Próxima renovação
                </span>
                <span className="text-sm font-medium">
                  {new Date(subscription.next_billing_date).toLocaleDateString("pt-BR")}
                </span>
              </div>
            )}
            {subscription?.trial_ends_at && access?.status !== "active" && access?.status !== "canceled" && (
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="size-4 text-primary" /> Fim do teste
                </span>
                <span className="text-sm font-medium">
                  {new Date(subscription.trial_ends_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            )}
          </div>
          <Button asChild className="mt-6 w-full" variant={access?.status === "active" ? "outline" : "default"}>
            <Link to="/assinatura">
              {access?.status === "active" ? "Gerenciar assinatura" : "Ativar AgenFloow Pro"}
            </Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <h2 className="text-lg">Segurança</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina uma nova senha com pelo menos 8 caracteres.
          </p>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="senha">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button variant="secondary" onClick={changePassword}>Alterar senha</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}