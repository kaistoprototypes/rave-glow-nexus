
CREATE TABLE public.shopify_order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_line_item_id text NOT NULL UNIQUE,
  shopify_order_id text NOT NULL REFERENCES public.shopify_orders(shopify_order_id) ON DELETE CASCADE,
  shopify_product_id text,
  shopify_variant_id text,
  title text,
  variant_title text,
  sku text,
  quantity integer,
  price numeric(12,2),
  total_discount numeric(12,2),
  vendor text,
  fulfillment_status text,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shopify_order_line_items_order_idx ON public.shopify_order_line_items(shopify_order_id);
GRANT SELECT ON public.shopify_order_line_items TO authenticated;
GRANT ALL ON public.shopify_order_line_items TO service_role;
ALTER TABLE public.shopify_order_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read shopify_order_line_items" ON public.shopify_order_line_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.shopify_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_variant_id text NOT NULL UNIQUE,
  shopify_product_id text NOT NULL REFERENCES public.shopify_products(shopify_product_id) ON DELETE CASCADE,
  title text,
  sku text,
  option1 text,
  option2 text,
  option3 text,
  price numeric(12,2),
  compare_at_price numeric(12,2),
  inventory_quantity integer,
  available boolean,
  position integer,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shopify_product_variants_product_idx ON public.shopify_product_variants(shopify_product_id);
GRANT SELECT ON public.shopify_product_variants TO anon, authenticated;
GRANT ALL ON public.shopify_product_variants TO service_role;
ALTER TABLE public.shopify_product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read shopify_product_variants" ON public.shopify_product_variants
  FOR SELECT USING (true);

CREATE TRIGGER shopify_product_variants_touch BEFORE UPDATE ON public.shopify_product_variants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
