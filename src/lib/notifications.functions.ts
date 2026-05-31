import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SETTINGS_KEY = "order_notifications";

const DEFAULT_SETTINGS = {
  enabled: true,
  // First three popups (seconds from page load)
  initial_delays: [15, 45, 60],
  // Random interval range (seconds) after the initial sequence
  min_interval: 25,
  max_interval: 75,
  // Every Nth popup is the "last ordered X ago" variant
  recent_every: 3,
  // Auto-hide each popup after this many ms
  display_ms: 6000,
  // Recent timeframe pool (minutes ago) for the "last ordered" variant
  recent_minutes_pool: [2, 4, 7, 11, 18, 26, 34, 47, 58],
  first_names: [
    "Alex","Jordan","Sam","Casey","Riley","Morgan","Taylor","Jamie","Avery","Quinn",
    "Skylar","Reese","Cameron","Drew","Emerson","Finley","Harper","Hayden","Kai","Logan",
    "Maya","Nico","Phoenix","Rowan","Sage","Sloane","Aria","Luna","Ezra","Milo",
    "Zara","Indie","Remy","Wren","Echo","Juno","Storm","Vale","Sasha","Eden",
  ],
  last_initials: ["A","B","C","D","E","F","G","H","J","K","L","M","N","P","R","S","T","V","W","Z"],
  locations: [
    { country: "USA", state: "CA", city: "Los Angeles" },
    { country: "USA", state: "CA", city: "San Francisco" },
    { country: "USA", state: "NV", city: "Las Vegas" },
    { country: "USA", state: "NY", city: "Brooklyn" },
    { country: "USA", state: "TX", city: "Austin" },
    { country: "USA", state: "FL", city: "Miami" },
    { country: "USA", state: "IL", city: "Chicago" },
    { country: "USA", state: "WA", city: "Seattle" },
    { country: "USA", state: "CO", city: "Denver" },
    { country: "USA", state: "GA", city: "Atlanta" },
    { country: "Canada", state: "ON", city: "Toronto" },
    { country: "Canada", state: "BC", city: "Vancouver" },
    { country: "UK", state: "England", city: "London" },
    { country: "UK", state: "England", city: "Manchester" },
    { country: "Germany", state: "Berlin", city: "Berlin" },
    { country: "Netherlands", state: "NH", city: "Amsterdam" },
    { country: "Spain", state: "Catalonia", city: "Barcelona" },
    { country: "France", state: "Île-de-France", city: "Paris" },
    { country: "Australia", state: "VIC", city: "Melbourne" },
    { country: "Australia", state: "NSW", city: "Sydney" },
    { country: "Mexico", state: "CDMX", city: "Mexico City" },
    { country: "Brazil", state: "SP", city: "São Paulo" },
    { country: "Japan", state: "Tokyo", city: "Tokyo" },
  ],
  // Optional fallback product names (used if DB lookup is empty)
  fallback_products: [
    "Neon Mirage Tee","Strobe Bandana","UV Reactive Hoodie","Plasma Bucket Hat",
    "Holographic Visor","Cosmic Carnival Tank","Bass Night Joggers","Desert Lights Shorts",
  ],
} as const;

type NotificationSettings = typeof DEFAULT_SETTINGS;

const settingsSchema = z.object({
  enabled: z.boolean(),
  initial_delays: z.array(z.number().min(0).max(600)).min(1).max(10),
  min_interval: z.number().min(5).max(600),
  max_interval: z.number().min(5).max(900),
  recent_every: z.number().int().min(2).max(20),
  display_ms: z.number().int().min(1500).max(20000),
  recent_minutes_pool: z.array(z.number().int().min(1).max(720)).min(1).max(30),
  first_names: z.array(z.string().min(1).max(40)).min(1).max(200),
  last_initials: z.array(z.string().min(1).max(3)).min(1).max(60),
  locations: z.array(z.object({
    country: z.string().min(1).max(60),
    state: z.string().min(1).max(60),
    city: z.string().min(1).max(80),
  })).min(1).max(200),
  fallback_products: z.array(z.string().min(1).max(120)).min(1).max(100),
});

export const getOrderNotificationSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    const settings: NotificationSettings = { ...DEFAULT_SETTINGS, ...((data?.value as object) ?? {}) } as NotificationSettings;

    // Pull a sample of active product names so popups show real catalog items
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("name")
      .eq("status", "active")
      .limit(60);
    const productNames = (products ?? []).map((p) => p.name).filter(Boolean);

    return { settings, productNames };
  });

export const adminGetOrderNotificationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    const settings: NotificationSettings = { ...DEFAULT_SETTINGS, ...((data?.value as object) ?? {}) } as NotificationSettings;
    return { settings, defaults: DEFAULT_SETTINGS };
  });

export const adminUpdateOrderNotificationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(settingsSchema)
  .handler(async ({ context, data }) => {
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: SETTINGS_KEY, value: data, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
