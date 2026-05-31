import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getOrderNotificationSettings } from "@/lib/notifications.functions";
import { ShoppingBag, MapPin, X, Clock } from "lucide-react";

type Settings = Awaited<ReturnType<typeof getOrderNotificationSettings>>["settings"];
type Popup = {
  id: number;
  variant: "just" | "recent";
  name: string;
  location: string;
  product: string;
  minutesAgo?: number;
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function OrderNotifications() {
  const fetchFn = useServerFn(getOrderNotificationSettings);
  const [popup, setPopup] = useState<Popup | null>(null);
  const idRef = useRef(0);
  const countRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let settings: Settings | null = null;
    let productNames: string[] = [];

    const buildPopup = (): Popup => {
      if (!settings) throw new Error("no settings");
      countRef.current += 1;
      const isRecent = settings.recent_every > 0 && countRef.current % settings.recent_every === 0;
      const fn = pick(settings.first_names);
      const ln = pick(settings.last_initials);
      const loc = pick(settings.locations);
      const productPool = productNames.length ? productNames : settings.fallback_products;
      const product = pick(productPool);
      return {
        id: ++idRef.current,
        variant: isRecent ? "recent" : "just",
        name: `${fn} ${ln}.`,
        location: `${loc.city}, ${loc.state}, ${loc.country}`,
        product,
        minutesAgo: isRecent ? pick(settings.recent_minutes_pool) : undefined,
      };
    };

    const showOne = () => {
      if (cancelled || !settings?.enabled) return;
      const p = buildPopup();
      setPopup(p);
      if (hideRef.current) clearTimeout(hideRef.current);
      hideRef.current = setTimeout(() => setPopup(null), settings!.display_ms);
    };

    const scheduleNext = (delaySec: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        showOne();
        // After the initial sequence we use random intervals
        const idx = countRef.current;
        if (settings && idx < settings.initial_delays.length) {
          scheduleNext(settings.initial_delays[idx]);
        } else if (settings) {
          const span = Math.max(1, settings.max_interval - settings.min_interval);
          const next = settings.min_interval + Math.random() * span;
          scheduleNext(next);
        }
      }, delaySec * 1000);
    };

    (async () => {
      try {
        const res = await fetchFn();
        if (cancelled) return;
        settings = res.settings;
        productNames = res.productNames;
        if (!settings.enabled) return;
        scheduleNext(settings.initial_delays[0] ?? 15);
      } catch (e) {
        // silent — non-critical UI
        console.debug("notif settings load failed", e);
      }
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideRef.current) clearTimeout(hideRef.current);
    };
  }, [fetchFn]);

  if (!popup) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[60] max-w-[92vw] sm:max-w-sm animate-fade-in">
      <div
        key={popup.id}
        className="card-glow rounded-2xl border border-border/40 bg-card/90 backdrop-blur-md p-3 pr-9 shadow-xl flex gap-3"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--lime)]/15 text-[color:var(--lime)]">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--magenta)] font-bold">
            {popup.variant === "recent" ? (
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Last ordered {popup.minutesAgo}m ago</span>
            ) : (
              "Just ordered"
            )}
          </p>
          <p className="mt-0.5 text-sm font-semibold truncate">
            <span className="text-foreground">{popup.name}</span>{" "}
            <span className="text-muted-foreground">grabbed</span>{" "}
            <span className="text-[color:var(--lime)]">{popup.product}</span>
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {popup.location}
          </p>
        </div>
        <button
          onClick={() => setPopup(null)}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
