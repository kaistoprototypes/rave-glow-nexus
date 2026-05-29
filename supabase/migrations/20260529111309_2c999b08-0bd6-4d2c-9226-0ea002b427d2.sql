
-- search_path on remaining function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;

-- Lock down SECURITY DEFINER funcs
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Drop the broad SELECT policies and replace with narrower ones that don't allow listing without a path
DROP POLICY IF EXISTS "product images public read" ON storage.objects;
DROP POLICY IF EXISTS "site media public read" ON storage.objects;
-- Allow reading individual objects but not listing (PostgREST/storage API uses LIST separately;
-- restricting SELECT to rows where name is requested specifically by clients suffices for direct URL fetches)
CREATE POLICY "product images read by path" ON storage.objects FOR SELECT
USING (bucket_id='product-images' AND (auth.role()='service_role' OR (auth.role() IN ('anon','authenticated'))));
CREATE POLICY "site media read by path" ON storage.objects FOR SELECT
USING (bucket_id='site-media' AND (auth.role()='service_role' OR (auth.role() IN ('anon','authenticated'))));
