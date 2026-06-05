import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

export const yoycolListProductTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      page: z.number().int().min(1).max(1000).default(1),
      size: z.number().int().min(1).max(50).default(20),
      keyword: z.string().max(120).optional(),
      spu_code: z.string().max(120).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { yoycolFetch } = await import("./yoycol.server");
    const res = await yoycolFetch<any>({
      method: "GET",
      path: "/api/2025/open/v4/catalog/products",
      query: {
        page: data.page,
        size: data.size,
        keyword: data.keyword,
        spu_code: data.spu_code,
      },
    });
    return { code: res.code, msg: res.msg, data: res.data };
  });

export const yoycolPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { yoycolFetch } = await import("./yoycol.server");
    try {
      const res = await yoycolFetch<any>({
        method: "GET",
        path: "/api/2025/open/v4/catalog/products",
        query: { page: 1, size: 1 },
      });
      return { ok: res.code === "100000", code: res.code, msg: res.msg };
    } catch (e: any) {
      return { ok: false, code: "ERR", msg: e.message };
    }
  });
