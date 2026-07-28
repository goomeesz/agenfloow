import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/hooks/use-salon";
import { useAccess } from "@/hooks/use-access";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: salon, isLoading } = useSalon();
  const { data: access } = useAccess(salon?.id);

  const needsOnboarding = !isLoading && salon === null && pathname !== "/onboarding";

  useEffect(() => {
    if (needsOnboarding) navigate({ to: "/onboarding", replace: true });
  }, [needsOnboarding, navigate]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-soft-gradient">
        <p className="text-sm text-muted-foreground">Carregando seu salão…</p>
      </div>
    );
  }

  const blocked = access?.access.blocked && pathname !== "/assinatura" && pathname !== "/perfil";
  if (blocked) {
    return (
      <div className="grid min-h-screen place-items-center bg-soft-gradient px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-soft text-primary">
            <Lock className="size-5" />
          </span>
          <h1 className="mt-4 font-display text-2xl">Seu teste gratuito terminou</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seus dados continuam salvos. Ative o AgenFloow Pro por R$ 97/mês para voltar a usar a
            agenda, os clientes e o link de agendamento.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link to="/assinatura">Ativar AgenFloow Pro</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}