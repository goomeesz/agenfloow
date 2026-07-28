import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useSalon } from "@/hooks/use-salon";
import { useAccess } from "@/hooks/use-access";
import { cancelSubscription } from "@/lib/subscription.functions";
import { brl } from "@/lib/salon-data";

const CHECKOUT_URL = "https://pay.cakto.com.br/ar3hhot_1005487";

export const Route = createFileRoute("/_authenticated/assinatura")({
  head: () => ({
    meta: [
      { title: "Assinatura AgenFloow Pro — plano e pagamentos" },
      { name: "description", content: "Gerencie seu plano AgenFloow Pro: período de teste, cobrança mensal, forma de pagamento e histórico de pagamentos." },
      { property: "og:title", content: "Assinatura AgenFloow Pro" },
      { property: "og:description", content: "Plano, cobrança e histórico de pagamentos do seu salão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Assinatura,
});

const benefits = [
  "Agenda ilimitada com confirmação e status",
  "Link público e QR Code de agendamento",
  "Cadastro de clientes com histórico e observações",
  "Equipe, serviços e horários personalizados",
  "Relatórios de faturamento e desempenho",
  "Notificações de novos agendamentos",
];

const statusLabel: Record<string, string> = {
  trial: "Teste gratuito",
  trial_expiring: "Teste terminando",
  expired: "Teste encerrado",
  active: "Assinatura ativa",
  canceled: "Assinatura cancelada",
};

function Assinatura() {
  const { data: salon } = useSalon();
  const { data, isLoading } = useAccess(salon?.id);
  const queryClient = useQueryClient();
  const cancel = useServerFn(cancelSubscription);

  const cancelMutation = useMutation({
    mutationFn: () => cancel({ data: { salonId: salon?.id as string } }),
    onSuccess: () => {
      toast.success("Assinatura cancelada.");
      queryClient.invalidateQueries({ queryKey: ["access", salon?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const access = data?.access;
  const payments = data?.payments ?? [];

  return (
    <AppShell title="Assinatura" subtitle="Seu plano AgenFloow">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-brand-gradient p-6 text-primary-foreground shadow-soft">
          <p className="text-xs uppercase tracking-wide text-primary-foreground/75">Situação atual</p>
          <p className="mt-3 font-display text-2xl">
            {isLoading ? "—" : (statusLabel[access?.status ?? ""] ?? "—")}
          </p>
          {access && access.status !== "active" && access.status !== "canceled" && (
            <p className="mt-1 text-sm text-primary-foreground/85">
              {access.blocked
                ? "Ative o plano para desbloquear a plataforma."
                : `Faltam ${access.daysLeft} ${access.daysLeft === 1 ? "dia" : "dias"} de acesso gratuito.`}
            </p>
          )}
          {data?.subscription?.next_billing_date && access?.status === "active" && (
            <p className="mt-1 text-sm text-primary-foreground/85">
              Próxima cobrança em{" "}
              {new Date(data.subscription.next_billing_date).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-soft px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" /> Plano Pro
              </span>
              <h2 className="mt-3 font-display text-3xl">
                {brl(97)} <span className="text-base text-muted-foreground">/mês</span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                7 dias grátis. Cancele quando quiser.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {access?.status === "active" ? (
                <Button disabled>
                  <CreditCard className="size-4" />
                  Plano ativo
                </Button>
              ) : (
                <Button asChild>
                  <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer">
                    <CreditCard className="size-4" />
                    Assinar AgenFloow Pro
                  </a>
                </Button>
              )}
              {access?.status === "active" && (
                <Button variant="ghost" size="sm" onClick={() => cancelMutation.mutate()}>
                  Cancelar assinatura
                </Button>
              )}
            </div>
          </div>

          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-lg">Histórico de pagamentos</h2>
        <ul className="mt-4 divide-y divide-border">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.description ?? "AgenFloow Pro"}</p>
                <p className="text-xs text-muted-foreground">
                  {p.paid_at ? new Date(p.paid_at).toLocaleDateString("pt-BR") : "—"}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold">{brl(p.amount_cents / 100)}</span>
            </li>
          ))}
          {payments.length === 0 && (
            <li className="py-6 text-sm text-muted-foreground">Nenhuma cobrança realizada ainda.</li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}