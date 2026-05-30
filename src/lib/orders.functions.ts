import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("orders")
      .select("id,email,total,status,created_at,currency")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    // Also fetch orders matching email (guest-checkout users that later signed in)
    const { data: byEmail } = await supabase
      .from("orders")
      .select("id,email,total,status,created_at,currency")
      .is("user_id", null)
      .eq("email", context.claims.email ?? "")
      .order("created_at", { ascending: false });
    const merged = [...(data ?? []), ...(byEmail ?? [])];
    if (error) throw new Error(error.message);
    return { orders: merged };
  });
