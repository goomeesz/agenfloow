import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Returns short-lived signed URLs for private salon media paths. */
export const signMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ paths: z.array(z.string().min(1).max(300)).max(30) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { signPaths } = await import("./subscription.server");
    const { data: memberships } = await context.supabase
      .from("salon_members")
      .select("salon_id")
      .eq("user_id", context.userId);
    const allowed = new Set((memberships ?? []).map((m) => m.salon_id));
    const paths = data.paths.filter((p) => allowed.has(p.split("/")[0]));
    return signPaths(paths);
  });