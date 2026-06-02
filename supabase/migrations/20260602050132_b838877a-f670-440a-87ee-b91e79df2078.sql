
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS hide_colors boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS video_url text;

-- Seed sold counts: weighted (20s/30s common, some 40s, some 60s)
UPDATE public.products SET sold_count = (
  CASE (floor(random() * 10))::int
    WHEN 0 THEN 60 + floor(random() * 10)::int
    WHEN 1 THEN 60 + floor(random() * 10)::int
    WHEN 2 THEN 40 + floor(random() * 10)::int
    WHEN 3 THEN 40 + floor(random() * 10)::int
    WHEN 4 THEN 30 + floor(random() * 10)::int
    WHEN 5 THEN 30 + floor(random() * 10)::int
    WHEN 6 THEN 30 + floor(random() * 10)::int
    WHEN 7 THEN 20 + floor(random() * 10)::int
    WHEN 8 THEN 20 + floor(random() * 10)::int
    ELSE 20 + floor(random() * 10)::int
  END
);

-- Storage policies for admin uploads/replace/delete on existing public buckets
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media admin write product-images') THEN
    CREATE POLICY "media admin write product-images" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media admin update product-images') THEN
    CREATE POLICY "media admin update product-images" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media admin delete product-images') THEN
    CREATE POLICY "media admin delete product-images" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media admin write site-media') THEN
    CREATE POLICY "media admin write site-media" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media admin update site-media') THEN
    CREATE POLICY "media admin update site-media" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media admin delete site-media') THEN
    CREATE POLICY "media admin delete site-media" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
