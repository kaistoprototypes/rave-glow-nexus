import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_SECRET_KEY;
        const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret || !whSecret) return new Response("Stripe not configured", { status: 500 });

        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Missing signature", { status: 400 });

        const stripe = new Stripe(secret, { apiVersion: "2024-12-18.acacia" as any });
        const body = await request.text();

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
        } catch (err: any) {
          return new Response(`Bad signature: ${err.message}`, { status: 400 });
        }

        // Idempotency
        const { data: existing } = await supabaseAdmin
          .from("stripe_webhook_events").select("id").eq("id", event.id).maybeSingle();
        if (existing) return new Response("ok");

        await supabaseAdmin.from("stripe_webhook_events").insert({
          id: event.id, type: event.type, payload: event as any,
        });

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          await supabaseAdmin.from("orders").update({
            status: "paid",
            stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
            stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
            shipping_address: (session as any).shipping_details ?? (session as any).collected_information?.shipping_details ?? null,
          }).eq("stripe_session_id", session.id);
        }

        await supabaseAdmin.from("stripe_webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
        return new Response("ok");
      },
    },
  },
});
