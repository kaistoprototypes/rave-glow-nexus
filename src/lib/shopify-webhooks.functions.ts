import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required");
}

export const adminListShopifyWebhookEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number; status?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const limit = Math.min(Math.max(data.limit ?? 100, 1), 500);
    let q = supabaseAdmin
      .from("shopify_webhook_events")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: events, error } = await q;
    if (error) throw new Error(error.message);

    // Counts
    const { data: counts } = await supabaseAdmin
      .from("shopify_webhook_events")
      .select("status");
    const summary = { total: 0, processed: 0, error: 0, received: 0 } as Record<string, number>;
    (counts ?? []).forEach((r: any) => {
      summary.total++;
      summary[r.status] = (summary[r.status] ?? 0) + 1;
    });
    return { events: events ?? [], summary };
  });
