import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(userId: string) {
  const admin = await getAdmin();
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

export const listActivePromotions = createServerFn({ method: "GET" }).handler(async () => {
  const admin = await getAdmin();
  const { data, error } = await admin.from("promotions").select("*").eq("enabled", true).order("priority", { ascending: false });
  if (error) throw new Error(error.message);
  return { promotions: data ?? [] };
});

export const adminListPromotions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const admin = await getAdmin();
    const { data, error } = await admin.from("promotions").select("*").order("starts_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { promotions: data ?? [] };
  });

export const adminUpsertPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(120),
      kind: z.enum(["buy_2_get_1_free", "buy_1_get_half_off", "flat_off"]),
      flat_amount: z.number().min(0).max(1000).nullable().optional(),
      starts_at: z.string(),
      ends_at: z.string(),
      enabled: z.boolean().default(true),
      priority: z.number().int().min(0).max(100).default(0),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const admin = await getAdmin();
    const payload = {
      name: data.name,
      kind: data.kind,
      flat_amount: data.kind === "flat_off" ? data.flat_amount ?? 0 : null,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      enabled: data.enabled,
      priority: data.priority,
    };
    if (data.id) {
      const { error } = await admin.from("promotions").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await admin.from("promotions").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeletePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const admin = await getAdmin();
    const { error } = await admin.from("promotions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMySignupReward = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin();
    const { data } = await admin
      .from("signup_rewards")
      .select("*")
      .eq("user_id", context.userId)
      .is("used_at", null)
      .maybeSingle();
    return { reward: data ?? null };
  });
