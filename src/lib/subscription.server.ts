// Server-only subscription helpers. Trial/blocking is always computed here,
// never in the browser.
export const PRO_PLAN = {
  id: "pro",
  name: "AgenFloow Pro",
  priceCents: 9700,
  currency: "BRL",
  interval: "mês",
};

export type AccessStatus = {
  status: "trial" | "trial_expiring" | "expired" | "active" | "canceled";
  daysLeft: number;
  trialEndsAt: string | null;
  blocked: boolean;
};

export async function getAccessStatus(salonId: string): Promise<AccessStatus> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("salon_access_status", { _salon_id: salonId });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    return { status: "expired", daysLeft: 0, trialEndsAt: null, blocked: true };
  }
  return {
    status: row.status as AccessStatus["status"],
    daysLeft: row.days_left ?? 0,
    trialEndsAt: row.trial_ends_at ?? null,
    blocked: Boolean(row.blocked),
  };
}

/** Throws when the salon's trial has ended without an active subscription. */
export async function requireActiveAccess(salonId: string) {
  const access = await getAccessStatus(salonId);
  if (access.blocked) {
    throw new Error(
      "Seu período de teste gratuito terminou. Ative o AgenFloow Pro para continuar.",
    );
  }
  return access;
}

export async function notify(
  salonId: string,
  input: { type: string; title: string; message?: string | null; link?: string | null },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("notifications").insert({
    salon_id: salonId,
    type: input.type,
    title: input.title,
    message: input.message ?? null,
    link: input.link ?? null,
  });
}

export async function signPaths(paths: (string | null | undefined)[]) {
  const clean = paths.filter((p): p is string => Boolean(p) && !p!.startsWith("http"));
  const map: Record<string, string> = {};
  if (!clean.length) return map;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("salon-media").createSignedUrls(clean, 3600);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}