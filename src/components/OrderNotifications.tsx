import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getOrderNotificationSettings } from "@/lib/notifications.functions";
import { ShoppingBag, MapPin, X, Clock } from "lucide-react";

type Settings = Awaited<ReturnType<typeof getOrderNotificationSettings>>["settings"];
export type OrderPopup = {
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

/**
 * Builds a popup that has not been shown in the last `windowSize` popups.
 * Falls back to a fresh random pick after a few attempts so we never block.
 */
export function buildUniquePopup(
  settings: Settings,
  productNames: string[],
  recent: Set<string>,
  windowSize: number,
  idSeed: { current: number },
  counter: number,
): OrderPopup {
  const productPool = productNames.length ? productNames : settings.fallback_products;
  let attempt = 0;
  let signature = "";
  let fn = "", ln = "", loc: any = null, product = "";

  while (attempt < 12) {
    fn = pick(settings.first_names);
    ln = pick(settings.last_initials);
    loc = pick(settings.locations);
    product = pick(productPool);
    signature = `${fn}|${ln}|${loc.city}|${product}`;
    if (!recent.has(signature)) break;
    attempt++;
  }

  recent.add(signature);
  // Trim window
  if (recent.size > windowSize) {
    // Sets keep insertion order; drop the oldest entry
    const first = recent.values().next().value as string | undefined;
    if (first) recent.delete(first);
  }

  const isRecent = settings.recent_every > 0 && counter % settings.recent_every === 0;
  return {
    id: ++idSeed.current,
    variant: isRecent ? "recent" : "just",
    name: `${fn} ${ln}.`,
    location: `${loc.city}, ${loc.state}, ${loc.country}`,
    product,
    minutesAgo: isRecent ? pick(settings.recent_minutes_pool) : undefined,
  };
}

export function OrderPopupCard({ popup }: { popup: OrderPopup }) {
  return (
    <div className="card-glow rounded-2xl border border-border/40 bg-card/90 backdrop-blur-md p-3 pr-9 shadow-xl flex gap-3 relative">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--lime)]/15 text-[color:var(--lime)]">
        <ShoppingBag className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-[color:var(--magenta)] font-bold">
          {popup.variant === "recent" ? (
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Last ordered {popup.minutesAgo}m ago</span>
          ) : ("Just ordered")}
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
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

export function OrderNotifications() {
  const fetchFn = useServerFn(getOrderNotificationSettings);
  const [popup, setPopup] = useState<OrderPopup | null>(null);
  const [visible, setVisible] = useState(false);
  const idRef = useRef(0);
  const countRef = useRef(0);
  const recentRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    let cancelled = false;
    let settings: Settings | null = null;
    let productNames: string[] = [];

    const showOne = () => {
      if (cancelled || !settings?.enabled) return;
      countRef.current += 1;
      const p = buildUniquePopup(
        settings,
        productNames,
        recentRef.current,
        settings.no_repeat_window || 250,
        idRef,
        countRef.current,
      );
      setPopup(p);
      // Smoother fade: mount hidden, then animate in next frame
      setVisible(false);
      if (fadeRef.current) clearTimeout(fadeRef.current);
      fadeRef.current = setTimeout(() => setVisible(true), 20);

      if (hideRef.current) clearTimeout(hideRef.current);
      hideRef.current = setTimeout(() => {
        setVisible(false);
        // Allow fade-out before unmount
        const out = reducedMotion ? 0 : (settings!.animation_ms ?? 300);
        setTimeout(() => setPopup(null), out);
      }, settings!.display_ms);
    };

    const scheduleNext = (delaySec: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        showOne();
        const idx = countRef.current;
        if (settings && idx < settings.initial_delays.length) {
          scheduleNext(settings.initial_delays[idx]);
        } else if (settings) {
          const span = Math.max(1, settings.max_interval - settings.min_interval);
          // Smoother rotation: small jitter centered on midpoint, biased away from extremes
          const base = settings.min_interval + Math.random() * span;
          const jitter = (Math.random() - 0.5) * Math.min(8, span * 0.15);
          scheduleNext(Math.max(settings.min_interval, base + jitter));
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
        console.debug("notif settings load failed", e);
      }
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideRef.current) clearTimeout(hideRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, [fetchFn, reducedMotion]);

  // Build screen-reader sentence
  const srText = popup
    ? popup.variant === "recent"
      ? `Last ordered ${popup.minutesAgo} minutes ago: ${popup.name} from ${popup.location} ordered ${popup.product}.`
      : `Just ordered: ${popup.name} from ${popup.location} ordered ${popup.product}.`
    : "";

  return (
    <>
      {/* Polite screen-reader announcement, always rendered for assistive tech */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {srText}
      </div>

      {popup && (
        <div
          className={`fixed bottom-4 left-4 z-[60] max-w-[92vw] sm:max-w-sm transition-all duration-300 ease-out
            ${reducedMotion ? "" : visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
          aria-hidden="true"
        >
          <div className="relative">
            <OrderPopupCard popup={popup} />
            <button
              onClick={() => { setVisible(false); setTimeout(() => setPopup(null), reducedMotion ? 0 : 200); }}
              className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
