import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SETTINGS_KEY = "order_notifications";

// Large default first-name pool (200+) so combos × initials × locations × products
// yield millions of unique popups out of the box. Admins can fully replace it.
const DEFAULT_FIRST_NAMES = [
  "Alex","Jordan","Sam","Casey","Riley","Morgan","Taylor","Jamie","Avery","Quinn",
  "Skylar","Reese","Cameron","Drew","Emerson","Finley","Harper","Hayden","Kai","Logan",
  "Maya","Nico","Phoenix","Rowan","Sage","Sloane","Aria","Luna","Ezra","Milo",
  "Zara","Indie","Remy","Wren","Echo","Juno","Storm","Vale","Sasha","Eden",
  "Asher","Atlas","August","Bailey","Beau","Blake","Briar","Brooks","Cade","Callum",
  "Caspian","Cedar","Cleo","Cyrus","Dakota","Darian","Devon","Dorian","Eli","Elliot",
  "Ember","Everest","Fable","Felix","Flynn","Forrest","Gray","Hadley","Halo","Hendrix",
  "Indigo","Iris","Isla","Ivy","Jagger","Jasper","Jett","Journey","Kade","Keanu",
  "Kenzo","Knox","Lake","Lennox","Levi","Lex","Liam","Lior","Lyric","Marley",
  "Mars","Mateo","Mavi","Meadow","Mika","Misha","Moss","Nash","Neo","Nova",
  "Oakley","Onyx","Orion","Otto","Pax","Paz","Pepper","Perry","Poet","Reign",
  "Rhys","River","Roan","Rocco","Roux","Saint","Salem","Scout","Selah","Shay",
  "Shiloh","Soren","Stevie","Sunny","Tatum","Teagan","Theo","Tobi","True","Vega",
  "Wilder","Winter","Wolf","Zen","Ziggy","Zion","Amari","Amaya","Anaya","Anya",
  "Aspen","Aurora","Aya","Bea","Briella","Calla","Cami","Cassia","Celeste","Coco",
  "Dalia","Delaney","Della","Elena","Elise","Elle","Esme","Fae","Faye","Frankie",
  "Freya","Gigi","Halle","Hazel","Imani","Isadora","Jade","Joss","Kaia","Kara",
  "Kira","Kiri","Lena","Leni","Liv","Lola","Lou","Maeve","Margot","Mia",
  "Mira","Naomi","Nia","Noor","Nyla","Odette","Olive","Ophelia","Penny","Pia",
  "Posy","Raven","Rey","Romi","Rosa","Saoirse","Selene","Sera","Soleil","Sora",
  "Stella","Suri","Tess","Thea","Tilly","Vera","Violet","Wren","Xio","Yara",
  "Yuna","Zelda","Zoe","Aksel","Bodhi","Cassius","Dax","Enzo","Gideon","Hugo",
  "Ilan","Jaxon","Kian","Lior","Maddox","Niall","Omar","Ravi","Soren","Tariq","Yusuf","Zev",
];

const DEFAULT_LAST_INITIALS = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
];

const DEFAULT_SETTINGS = {
  enabled: true,
  initial_delays: [15, 45, 60],
  min_interval: 25,
  max_interval: 75,
  recent_every: 3,
  display_ms: 6000,
  // Soft fade-in/out time in ms, only used when user does not prefer reduced motion
  animation_ms: 300,
  // Avoid showing the same (name+location+product) combo within this many popups
  no_repeat_window: 250,
  recent_minutes_pool: [2, 4, 7, 11, 18, 26, 34, 47, 58],
  first_names: DEFAULT_FIRST_NAMES,
  last_initials: DEFAULT_LAST_INITIALS,
  locations: [
    { country: "USA", state: "CA", city: "Los Angeles" },
    { country: "USA", state: "CA", city: "San Francisco" },
    { country: "USA", state: "CA", city: "San Diego" },
    { country: "USA", state: "CA", city: "Oakland" },
    { country: "USA", state: "NV", city: "Las Vegas" },
    { country: "USA", state: "NV", city: "Reno" },
    { country: "USA", state: "NY", city: "Brooklyn" },
    { country: "USA", state: "NY", city: "New York" },
    { country: "USA", state: "NY", city: "Buffalo" },
    { country: "USA", state: "TX", city: "Austin" },
    { country: "USA", state: "TX", city: "Houston" },
    { country: "USA", state: "TX", city: "Dallas" },
    { country: "USA", state: "FL", city: "Miami" },
    { country: "USA", state: "FL", city: "Orlando" },
    { country: "USA", state: "FL", city: "Tampa" },
    { country: "USA", state: "IL", city: "Chicago" },
    { country: "USA", state: "WA", city: "Seattle" },
    { country: "USA", state: "OR", city: "Portland" },
    { country: "USA", state: "CO", city: "Denver" },
    { country: "USA", state: "CO", city: "Boulder" },
    { country: "USA", state: "GA", city: "Atlanta" },
    { country: "USA", state: "MA", city: "Boston" },
    { country: "USA", state: "PA", city: "Philadelphia" },
    { country: "USA", state: "AZ", city: "Phoenix" },
    { country: "USA", state: "MN", city: "Minneapolis" },
    { country: "USA", state: "MI", city: "Detroit" },
    { country: "USA", state: "NC", city: "Charlotte" },
    { country: "USA", state: "TN", city: "Nashville" },
    { country: "USA", state: "LA", city: "New Orleans" },
    { country: "USA", state: "DC", city: "Washington" },
    { country: "Canada", state: "ON", city: "Toronto" },
    { country: "Canada", state: "BC", city: "Vancouver" },
    { country: "Canada", state: "QC", city: "Montreal" },
    { country: "Canada", state: "AB", city: "Calgary" },
    { country: "UK", state: "England", city: "London" },
    { country: "UK", state: "England", city: "Manchester" },
    { country: "UK", state: "England", city: "Bristol" },
    { country: "UK", state: "Scotland", city: "Glasgow" },
    { country: "Germany", state: "Berlin", city: "Berlin" },
    { country: "Germany", state: "Bavaria", city: "Munich" },
    { country: "Germany", state: "Hamburg", city: "Hamburg" },
    { country: "Netherlands", state: "NH", city: "Amsterdam" },
    { country: "Netherlands", state: "ZH", city: "Rotterdam" },
    { country: "Spain", state: "Catalonia", city: "Barcelona" },
    { country: "Spain", state: "Madrid", city: "Madrid" },
    { country: "Spain", state: "Andalusia", city: "Seville" },
    { country: "France", state: "Île-de-France", city: "Paris" },
    { country: "France", state: "PACA", city: "Marseille" },
    { country: "France", state: "AURA", city: "Lyon" },
    { country: "Italy", state: "Lazio", city: "Rome" },
    { country: "Italy", state: "Lombardy", city: "Milan" },
    { country: "Portugal", state: "Lisbon", city: "Lisbon" },
    { country: "Sweden", state: "Stockholm", city: "Stockholm" },
    { country: "Norway", state: "Oslo", city: "Oslo" },
    { country: "Denmark", state: "Capital", city: "Copenhagen" },
    { country: "Ireland", state: "Leinster", city: "Dublin" },
    { country: "Belgium", state: "Brussels", city: "Brussels" },
    { country: "Switzerland", state: "Zurich", city: "Zurich" },
    { country: "Austria", state: "Vienna", city: "Vienna" },
    { country: "Czechia", state: "Prague", city: "Prague" },
    { country: "Poland", state: "Masovia", city: "Warsaw" },
    { country: "Greece", state: "Attica", city: "Athens" },
    { country: "Australia", state: "VIC", city: "Melbourne" },
    { country: "Australia", state: "NSW", city: "Sydney" },
    { country: "Australia", state: "QLD", city: "Brisbane" },
    { country: "Australia", state: "WA", city: "Perth" },
    { country: "New Zealand", state: "Auckland", city: "Auckland" },
    { country: "Mexico", state: "CDMX", city: "Mexico City" },
    { country: "Mexico", state: "Jalisco", city: "Guadalajara" },
    { country: "Brazil", state: "SP", city: "São Paulo" },
    { country: "Brazil", state: "RJ", city: "Rio de Janeiro" },
    { country: "Argentina", state: "CABA", city: "Buenos Aires" },
    { country: "Chile", state: "Santiago", city: "Santiago" },
    { country: "Colombia", state: "Bogotá", city: "Bogotá" },
    { country: "Japan", state: "Tokyo", city: "Tokyo" },
    { country: "Japan", state: "Osaka", city: "Osaka" },
    { country: "South Korea", state: "Seoul", city: "Seoul" },
    { country: "Singapore", state: "Singapore", city: "Singapore" },
    { country: "UAE", state: "Dubai", city: "Dubai" },
    { country: "South Africa", state: "Gauteng", city: "Johannesburg" },
  ],
  fallback_products: [
    "Neon Mirage Tee","Strobe Bandana","UV Reactive Hoodie","Plasma Bucket Hat",
    "Holographic Visor","Cosmic Carnival Tank","Bass Night Joggers","Desert Lights Shorts",
  ],
};

type NotificationSettings = typeof DEFAULT_SETTINGS;

const settingsSchema = z.object({
  enabled: z.boolean(),
  initial_delays: z.array(z.number().min(0).max(600)).min(1).max(10),
  min_interval: z.number().min(5).max(600),
  max_interval: z.number().min(5).max(900),
  recent_every: z.number().int().min(2).max(20),
  display_ms: z.number().int().min(1500).max(20000),
  animation_ms: z.number().int().min(0).max(2000),
  no_repeat_window: z.number().int().min(0).max(5000),
  recent_minutes_pool: z.array(z.number().int().min(1).max(720)).min(1).max(30),
  first_names: z.array(z.string().min(1).max(40)).min(1).max(5000),
  last_initials: z.array(z.string().min(1).max(3)).min(1).max(60),
  locations: z.array(z.object({
    country: z.string().min(1).max(60),
    state: z.string().min(1).max(60),
    city: z.string().min(1).max(80),
  })).min(1).max(2000),
  fallback_products: z.array(z.string().min(1).max(120)).min(1).max(500),
});

function mergeWithDefaults(value: unknown): NotificationSettings {
  return { ...DEFAULT_SETTINGS, ...((value as object) ?? {}) } as NotificationSettings;
}

export const getOrderNotificationSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    const settings = mergeWithDefaults(data?.value);

    const { data: products } = await supabaseAdmin
      .from("products")
      .select("name")
      .eq("status", "active")
      .limit(120);
    const productNames = (products ?? []).map((p) => p.name).filter(Boolean);

    return { settings, productNames };
  });

export const adminGetOrderNotificationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await supabaseAdmin.from("user_roles").select("role")
      .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");
    const { data } = await supabaseAdmin
      .from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const settings = mergeWithDefaults(data?.value);
    return { settings, defaults: DEFAULT_SETTINGS };
  });

function diffSettings(prev: any, next: any): { changedKeys: string[]; diff: Record<string, { from: any; to: any }> } {
  const keys = new Set([...Object.keys(prev ?? {}), ...Object.keys(next ?? {})]);
  const diff: Record<string, { from: any; to: any }> = {};
  const changedKeys: string[] = [];
  for (const k of keys) {
    const a = JSON.stringify(prev?.[k]);
    const b = JSON.stringify(next?.[k]);
    if (a !== b) {
      changedKeys.push(k);
      // Cap large arrays in diff body so logs stay readable
      const cap = (v: any) => Array.isArray(v) && v.length > 12 ? { __summary: `${v.length} items`, sample: v.slice(0, 5) } : v;
      diff[k] = { from: cap(prev?.[k]), to: cap(next?.[k]) };
    }
  }
  return { changedKeys, diff };
}

export const adminUpdateOrderNotificationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(settingsSchema)
  .handler(async ({ context, data }) => {
    const { data: role } = await supabaseAdmin.from("user_roles").select("role")
      .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");

    const { data: existing } = await supabaseAdmin
      .from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const prev = mergeWithDefaults(existing?.value);
    const { changedKeys, diff } = diffSettings(prev, data);

    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: SETTINGS_KEY, value: data, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);

    if (changedKeys.length) {
      await supabaseAdmin.from("notification_audit_logs").insert({
        user_id: context.userId,
        user_email: context.claims?.email ?? null,
        action: "update",
        changed_keys: changedKeys,
        diff,
        previous_value: prev,
        new_value: data,
      });
    }

    return { ok: true, changedKeys };
  });

export const adminListNotificationAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await supabaseAdmin.from("user_roles").select("role")
      .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");
    const { data, error } = await supabaseAdmin
      .from("notification_audit_logs")
      .select("id,user_email,action,changed_keys,diff,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { logs: data ?? [] };
  });
