
-- Mappings: product <-> Yoycol SPU + placements
CREATE TABLE public.yoycol_product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  spu_code text NOT NULL,
  template_name text,
  cover_image text,
  -- placements: [{ position: "front"|"back"|"sleeve_l"|..., design_url: "...", design_name?: "..." }]
  placements jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- variant_map: { "size:color": { yoycol_sku: "...", yoycol_variant_id: "..." } }
  variant_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  sync_direction text NOT NULL DEFAULT 'manual', -- 'pull' | 'push' | 'manual'
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.yoycol_product_mappings TO authenticated;
GRANT ALL ON public.yoycol_product_mappings TO service_role;
ALTER TABLE public.yoycol_product_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "yoycol mappings admin all" ON public.yoycol_product_mappings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER yoycol_mappings_touch BEFORE UPDATE ON public.yoycol_product_mappings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Yoycol orders
CREATE TABLE public.yoycol_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  yoycol_order_id text,
  yoycol_order_no text,
  status text NOT NULL DEFAULT 'pending', -- pending|submitted|in_production|shipped|delivered|cancelled|error
  tracking_number text,
  tracking_url text,
  carrier text,
  last_error text,
  request_payload jsonb,
  response_payload jsonb,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.yoycol_orders TO authenticated;
GRANT ALL ON public.yoycol_orders TO service_role;
ALTER TABLE public.yoycol_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "yoycol orders admin all" ON public.yoycol_orders
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER yoycol_orders_touch BEFORE UPDATE ON public.yoycol_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX yoycol_orders_yoycol_id_idx ON public.yoycol_orders(yoycol_order_id);

-- Webhook events (idempotency log)
CREATE TABLE public.yoycol_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  event_type text,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.yoycol_webhook_events TO service_role;
ALTER TABLE public.yoycol_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "yoycol webhook events admin read" ON public.yoycol_webhook_events
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Convenience columns on orders for quick admin view
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS yoycol_status text,
  ADD COLUMN IF NOT EXISTS yoycol_order_id text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_url text;
