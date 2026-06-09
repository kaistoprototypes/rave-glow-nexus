
-- Shopify orders
CREATE TABLE public.shopify_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id text NOT NULL UNIQUE,
  order_number text,
  email text,
  total_price numeric(12,2),
  currency text,
  financial_status text,
  fulfillment_status text,
  cancel_reason text,
  cancelled_at timestamptz,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  shipping_address jsonb,
  billing_address jsonb,
  customer jsonb,
  shopify_created_at timestamptz,
  shopify_updated_at timestamptz,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shopify_orders_email_idx ON public.shopify_orders(email);
CREATE INDEX shopify_orders_status_idx ON public.shopify_orders(financial_status, fulfillment_status);

GRANT SELECT ON public.shopify_orders TO authenticated;
GRANT ALL ON public.shopify_orders TO service_role;
ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read shopify_orders" ON public.shopify_orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER shopify_orders_touch BEFORE UPDATE ON public.shopify_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Shopify products
CREATE TABLE public.shopify_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_product_id text NOT NULL UNIQUE,
  handle text,
  title text,
  description text,
  vendor text,
  product_type text,
  status text,
  tags text[] DEFAULT '{}',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  min_price numeric(12,2),
  max_price numeric(12,2),
  compare_at_price numeric(12,2),
  total_inventory integer,
  deleted_at timestamptz,
  shopify_created_at timestamptz,
  shopify_updated_at timestamptz,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shopify_products_handle_idx ON public.shopify_products(handle);
CREATE INDEX shopify_products_status_idx ON public.shopify_products(status);

GRANT SELECT ON public.shopify_products TO anon, authenticated;
GRANT ALL ON public.shopify_products TO service_role;
ALTER TABLE public.shopify_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active shopify_products" ON public.shopify_products
  FOR SELECT USING (deleted_at IS NULL);

CREATE TRIGGER shopify_products_touch BEFORE UPDATE ON public.shopify_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Webhook idempotency log
CREATE TABLE public.shopify_webhook_events (
  webhook_id text PRIMARY KEY,
  topic text NOT NULL,
  shop_domain text,
  status text NOT NULL DEFAULT 'received',
  error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX shopify_webhook_events_topic_idx ON public.shopify_webhook_events(topic, received_at DESC);

GRANT SELECT ON public.shopify_webhook_events TO authenticated;
GRANT ALL ON public.shopify_webhook_events TO service_role;
ALTER TABLE public.shopify_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read shopify_webhook_events" ON public.shopify_webhook_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
