
-- Sold count per product (admin-editable)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sold_count integer NOT NULL DEFAULT 0;

-- Audit log for notification settings changes
CREATE TABLE IF NOT EXISTS public.notification_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  user_email text,
  action text NOT NULL DEFAULT 'update',
  changed_keys text[] NOT NULL DEFAULT '{}'::text[],
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notification_audit_logs TO authenticated;
GRANT ALL ON public.notification_audit_logs TO service_role;

ALTER TABLE public.notification_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit logs admin read"
  ON public.notification_audit_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS notification_audit_logs_created_at_idx
  ON public.notification_audit_logs (created_at DESC);
