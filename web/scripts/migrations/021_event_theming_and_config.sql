-- 021_event_theming_and_config.sql
-- Externalize event presentation, color scheme, banner, and photo limit
-- to Supabase instead of hardcoding event-specific branches in the frontend.
BEGIN;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.get_event_state(p_event_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'event_key', event_key,
    'name', name,
    'event_date', event_date,
    'uploads_open', uploads_open,
    'opened_at', opened_at,
    'brand_color', brand_color,
    'banner_url', banner_url,
    'photo_limit', photo_limit,
    'theme', coalesce(theme, '{}'::jsonb)
  )
  FROM public.events
  WHERE event_key = p_event_key;
$$;

REVOKE ALL ON FUNCTION public.get_event_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_state(text) TO anon, authenticated, service_role;

GRANT SELECT (
  event_key,
  name,
  event_date,
  uploads_open,
  opened_at,
  brand_color,
  banner_url,
  photo_limit,
  theme
) ON public.events TO authenticated;

-- Migrate the previously hardcoded Javier & Paula event configuration into DB.
UPDATE public.events
SET
  brand_color = coalesce(nullif(brand_color, ''), '#53653c'),
  banner_url = coalesce(banner_url, '/javier-paula-acuarela-v3.webp'),
  theme = jsonb_build_object(
    'colors', jsonb_build_object(
      'accent', '#53653c',
      'accentSoft', '#a8b48e',
      'accentContrast', '#fffdf9',
      'primary', '#26354b',
      'surface', '#faf9f3',
      'surfaceElevated', '#fffdf9',
      'surfaceMuted', '#eef0e5',
      'ink', '#30372b',
      'inkSecondary', '#655b54',
      'muted', '#727865',
      'border', '#dcded0',
      'focus', '#a37b50',
      'success', '#10b981',
      'warning', '#d99a45',
      'danger', '#c83e3e',
      'tvBg', '#080a07',
      'tvSurface', '#23291f',
      'tvText', '#f7f5eb',
      'tvHighlight', '#e5c58d'
    ),
    'kicker', 'Bienvenidos a la reboda de',
    'headline', 'Javier y Paula',
    'invitationTitle', 'Paula & Javier',
    'eyebrow', '12 SEPTIEMBRE 2026 · VILLARLUENGO',
    'subtitle', '10 años después… Nos volvemos a casar.',
    'illustrationAlt', 'Acuarela de Javier y Paula',
    'photoPrompts', jsonb_build_array(
      'Una sonrisa que merezca quedarse.',
      'Junta a quienes llevan diez años en esta historia.',
      'Ese abrazo que no necesita palabras.',
      'Un detalle que los novios aún no hayan visto.',
      'La foto de vuestra mesa. Sin posar demasiado.',
      'Paula y Javier, desde tu mirada.'
    ),
    'places', jsonb_build_array(
      jsonb_build_object(
        'eyebrow', 'SÁBADO 12 · 12:00 H',
        'title', 'Ceremonia',
        'address', E'Iglesia de la Asunción\nVillarluengo, Teruel',
        'mapUrl', 'https://www.google.com/maps/search/?api=1&query=Iglesia+de+la+Asuncion+Villarluengo+Teruel',
        'linkLabel', 'Cómo llegar a la iglesia'
      ),
      jsonb_build_object(
        'eyebrow', 'DESPUÉS',
        'title', 'Comida y celebración',
        'address', E'Hostal de la Trucha\nVillarluengo, Teruel',
        'mapUrl', 'https://www.google.com/maps/search/?api=1&query=Hostal+de+la+Trucha+Villarluengo',
        'linkLabel', 'Cómo llegar al hostal'
      )
    )
  )
WHERE event_key = 'jp-reboda-2026-k7m4q9x2'
  AND theme = '{}'::jsonb;

COMMIT;
