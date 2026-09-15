-- Private operational logs and durable, cross-instance notification coordination.
-- Run manually in Supabase SQL Editor with an administrative role. No browser grants.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.application_logs (
  id uuid PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL CHECK (level IN ('warn', 'error', 'critical')),
  entry jsonb NOT NULL CHECK (jsonb_typeof(entry) = 'object' AND octet_length(entry::text) <= 32768),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  alert_status text NOT NULL CHECK (alert_status IN ('not_required', 'pending', 'sending', 'failed', 'sent', 'suppressed')),
  alert_attempts integer NOT NULL DEFAULT 0,
  alert_last_attempt_at timestamptz,
  alert_sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS application_logs_received_idx ON private.application_logs (received_at DESC);
CREATE INDEX IF NOT EXISTS application_logs_alert_idx ON private.application_logs (alert_status, received_at DESC)
  WHERE level = 'critical';

CREATE TABLE IF NOT EXISTS private.application_log_rates (
  bucket_key text NOT NULL,
  bucket_start timestamptz NOT NULL,
  requests integer NOT NULL CHECK (requests > 0),
  PRIMARY KEY (bucket_key, bucket_start)
);
CREATE INDEX IF NOT EXISTS application_log_rates_expiry_idx ON private.application_log_rates (bucket_start);
CREATE TABLE IF NOT EXISTS private.application_log_alerts (
  fingerprint text PRIMARY KEY CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  last_sent_at timestamptz,
  lease_until timestamptz,
  lease_token uuid,
  lease_log_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.application_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.application_log_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.application_log_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.application_logs, private.application_log_rates, private.application_log_alerts
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT ALL ON private.application_logs, private.application_log_rates, private.application_log_alerts TO service_role;

CREATE OR REPLACE FUNCTION public.ingest_application_log(p_entry jsonb, p_ip_hash text, p_fingerprint text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_requests integer;
  v_entry jsonb;
BEGIN
  IF p_ip_hash !~ '^[a-f0-9]{64}$' OR p_fingerprint !~ '^[a-f0-9]{64}$'
    OR p_ip_hash IS NULL OR p_fingerprint IS NULL THEN
    RAISE EXCEPTION 'Invalid digest';
  END IF;
  -- The server hashes the trusted edge IP with a secret and an hourly epoch; no raw IP is stored.
  INSERT INTO private.application_log_rates (bucket_key, bucket_start, requests)
    VALUES ('ip:' || p_ip_hash, date_trunc('minute', now()), 1)
    ON CONFLICT (bucket_key, bucket_start) DO UPDATE
      SET requests = private.application_log_rates.requests + 1
    RETURNING requests INTO v_requests;
  DELETE FROM private.application_log_rates WHERE bucket_start < now() - interval '2 hours';
  IF v_requests > 120 THEN RETURN jsonb_build_object('status', 'rate_limited'); END IF;
  INSERT INTO private.application_logs (id, level, entry, fingerprint, alert_status)
    VALUES ((p_entry->>'id')::uuid, p_entry->>'level', p_entry, p_fingerprint,
      CASE WHEN p_entry->>'level' = 'critical' THEN 'pending' ELSE 'not_required' END)
    ON CONFLICT (id) DO NOTHING;
  SELECT entry INTO v_entry FROM private.application_logs WHERE id = (p_entry->>'id')::uuid;
  RETURN jsonb_build_object('status', 'stored', 'entry', v_entry);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_application_log_alert(p_id uuid, p_lease_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_log private.application_logs%ROWTYPE;
  v_alert private.application_log_alerts%ROWTYPE;
  v_requests integer;
BEGIN
  IF p_lease_token IS NULL THEN RAISE EXCEPTION 'Missing lease token'; END IF;
  SELECT * INTO STRICT v_log FROM private.application_logs WHERE id = p_id;
  IF v_log.level <> 'critical' THEN RETURN jsonb_build_object('status', 'stored'); END IF;
  INSERT INTO private.application_log_alerts (fingerprint) VALUES (v_log.fingerprint) ON CONFLICT DO NOTHING;
  -- Every alert mutation locks fingerprint first, then log: different logs cannot both notify.
  SELECT * INTO STRICT v_alert FROM private.application_log_alerts WHERE fingerprint = v_log.fingerprint FOR UPDATE;
  SELECT * INTO STRICT v_log FROM private.application_logs WHERE id = p_id FOR UPDATE;
  IF v_log.alert_status IN ('sent', 'suppressed') THEN
    RETURN jsonb_build_object('status', v_log.alert_status);
  END IF;
  IF v_alert.last_sent_at > now() - interval '5 minutes' THEN
    UPDATE private.application_logs SET alert_status = 'suppressed' WHERE id = p_id;
    RETURN jsonb_build_object('status', 'suppressed');
  END IF;
  IF v_alert.lease_until > now() THEN RETURN jsonb_build_object('status', 'busy'); END IF;
  -- Bound Telegram attempts globally as well as ingestion per IP. Failed attempts count.
  INSERT INTO private.application_log_rates (bucket_key, bucket_start, requests)
    VALUES ('telegram', date_trunc('minute', now()), 1)
    ON CONFLICT (bucket_key, bucket_start) DO UPDATE
      SET requests = private.application_log_rates.requests + 1
    RETURNING requests INTO v_requests;
  IF v_requests > 8 THEN RETURN jsonb_build_object('status', 'busy'); END IF;
  UPDATE private.application_log_alerts SET lease_token = p_lease_token, lease_log_id = p_id,
    lease_until = now() + interval '30 seconds', updated_at = now() WHERE fingerprint = v_log.fingerprint;
  UPDATE private.application_logs SET alert_status = 'sending', alert_attempts = alert_attempts + 1,
    alert_last_attempt_at = now() WHERE id = p_id;
  RETURN jsonb_build_object('status', 'claimed', 'leaseToken', p_lease_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_application_log_alert(p_id uuid, p_lease_token uuid, p_sent boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_fingerprint text;
  v_alert private.application_log_alerts%ROWTYPE;
BEGIN
  IF p_sent IS NULL THEN RAISE EXCEPTION 'Missing delivery outcome'; END IF;
  SELECT fingerprint INTO STRICT v_fingerprint FROM private.application_logs WHERE id = p_id;
  SELECT * INTO STRICT v_alert FROM private.application_log_alerts WHERE fingerprint = v_fingerprint FOR UPDATE;
  IF v_alert.lease_token IS DISTINCT FROM p_lease_token OR v_alert.lease_log_id IS DISTINCT FROM p_id
    OR p_lease_token IS NULL THEN RETURN false; END IF;
  UPDATE private.application_logs SET alert_status = CASE WHEN p_sent THEN 'sent' ELSE 'failed' END,
    alert_sent_at = CASE WHEN p_sent THEN now() ELSE NULL END WHERE id = p_id;
  UPDATE private.application_log_alerts SET last_sent_at = CASE WHEN p_sent THEN now() ELSE last_sent_at END,
    lease_token = NULL, lease_log_id = NULL, lease_until = NULL, updated_at = now() WHERE fingerprint = v_fingerprint;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_application_log(jsonb, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_application_log_alert(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_application_log_alert(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_application_log(jsonb, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_application_log_alert(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_application_log_alert(uuid, uuid, boolean) TO service_role;
COMMIT;
