CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('yoycol-sync-orders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='yoycol-sync-orders');

SELECT cron.schedule(
  'yoycol-sync-orders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--24e6b821-7ac9-4112-b1e7-4cf3bbadc2fd.lovable.app/api/public/yoycol-sync',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_oJVCpnMbn59_uYMg-ym1wg_fwvNYV_p"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);