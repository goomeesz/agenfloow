import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ salonId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getAccessStatus, PRO_PLAN } = await import("./subscription.server");

    const { data: member } = await context.supabase
      .from("salon_members")
      .select("salon_id")
      .eq("salon_id", data.salonId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!member) throw new Error("Acesso negado");

    const access = await getAccessStatus(data.salonId);

    const { data: subscription } = await context.supabase
      .from("subscriptions")
      .select(
        "trial_started_at, trial_ends_at, status, plan, price_cents, currency, next_billing_date, canceled_at, payment_method_label",
      )
      .eq("salon_id", data.salonId)
      .maybeSingle();

    const { data: payments } = await context.supabase
      .from("payments")
      .select("id, amount_cents, currency, status, description, paid_at")
      .eq("salon_id", data.salonId)
      .order("paid_at", { ascending: false })
      .limit(24);

    return { access, subscription, payments: payments ?? [], plan: PRO_PLAN };
  });

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ salonId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _salon_id: data.salonId,
      _user_id: context.userId,
      _role: "dono",
    });
    if (!isOwner) throw new Error("Somente o proprietário pode gerenciar a assinatura.");

    throw new Error(
      "O pagamento online ainda não está ativo neste projeto. Ative os pagamentos para liberar o checkout do AgenFloow Pro.",
    );
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ salonId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("salon_id", data.salonId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });