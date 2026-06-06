import { createFileRoute } from "@tanstack/react-router";
import { syncAllOpenYoycolOrders } from "@/lib/yoycol.functions";

export const Route = createFileRoute("/api/public/yoycol-sync")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const res = await syncAllOpenYoycolOrders();
          return Response.json({ ok: true, ...res });
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
        }
      },
      GET: async () => {
        try {
          const res = await syncAllOpenYoycolOrders();
          return Response.json({ ok: true, ...res });
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
        }
      },
    },
  },
});
