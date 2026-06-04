import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function PromoBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("epe-promo-dismissed") === "1") return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) setShow(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setShow(!session && localStorage.getItem("epe-promo-dismissed") !== "1");
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!show) return null;

  return (
    <div className="relative bg-gradient-to-r from-[color:var(--magenta)]/30 via-[color:var(--lime)]/20 to-[color:var(--cyan)]/30 border-b border-border/40">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2.5 text-center text-sm">
        <Sparkles className="hidden sm:block h-4 w-4 text-[color:var(--lime)]" />
        <p className="font-semibold">
          Sign up & get <span className="text-neon font-black">20% off</span> your first product
          <Link to="/login" className="ml-2 underline underline-offset-2 text-[color:var(--lime)] hover:text-[color:var(--cyan)]">
            Claim now →
          </Link>
        </p>
        <button
          onClick={() => { localStorage.setItem("epe-promo-dismissed", "1"); setShow(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-foreground/60 hover:text-foreground"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
