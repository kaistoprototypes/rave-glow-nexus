import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { checkIsAdmin } from "@/lib/shopify-admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { ProductEditDrawer } from "./admin/ProductEditDrawer";

export function AdminEditProductButton({ handle }: { handle: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const checkFn = useServerFn(checkIsAdmin);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      try {
        const res = await checkFn();
        if (!cancelled) setIsAdmin(res.isAdmin);
      } catch {
        /* not signed in */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!isAdmin) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[color:var(--magenta)] px-5 py-3 text-xs font-bold uppercase text-white shadow-2xl hover:scale-105 transition"
      >
        <Pencil className="h-4 w-4" /> Edit in Shopify
      </button>
      <ProductEditDrawer open={open} onClose={() => setOpen(false)} handle={handle} />
    </>
  );
}
