-- Lumen / Supabase data snapshot
-- Read-only: no user identifiers or photo contents are returned.
-- Run after supabase_preflight_readonly.sql and copy the result grid.

WITH snapshot AS (
  SELECT
    10 AS sort_order,
    'events'::text AS section,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'event_key', event_key,
          'name', name,
          'event_date', event_date,
          'photo_limit', photo_limit,
          'brand_color', brand_color,
          'has_banner', banner_url IS NOT NULL
        )
        ORDER BY event_date, event_key
      ),
      '[]'::jsonb
    ) AS details
  FROM public.events

  UNION ALL

  SELECT
    20,
    'photos_by_event',
    COALESCE(
      jsonb_agg(to_jsonb(photo_stats) ORDER BY photo_stats.event_key),
      '[]'::jsonb
    )
  FROM (
    SELECT
      event_key,
      count(*) AS photos,
      count(*) FILTER (WHERE owner_id IS NULL) AS without_owner,
      min(created_at) AS oldest,
      max(created_at) AS newest
    FROM public.photos
    GROUP BY event_key
  ) AS photo_stats

  UNION ALL

  SELECT
    30,
    'members_by_event',
    COALESCE(
      jsonb_agg(to_jsonb(member_stats) ORDER BY member_stats.event_key),
      '[]'::jsonb
    )
  FROM (
    SELECT event_key, count(*) AS members
    FROM public.event_members
    GROUP BY event_key
  ) AS member_stats

  UNION ALL

  SELECT
    40,
    'storage_by_path',
    COALESCE(
      jsonb_agg(to_jsonb(storage_stats) ORDER BY storage_stats.root, storage_stats.event_folder),
      '[]'::jsonb
    )
  FROM (
    SELECT
      COALESCE((storage.foldername(name))[1], '(root)') AS root,
      COALESCE((storage.foldername(name))[2], '(none)') AS event_folder,
      count(*) AS objects,
      count(*) FILTER (WHERE owner_id IS NULL) AS without_owner
    FROM storage.objects
    WHERE bucket_id = 'photos'
    GROUP BY 1, 2
  ) AS storage_stats

  UNION ALL

  SELECT
    50,
    'photo_storage_consistency',
    jsonb_build_object(
      'photo_rows', (SELECT count(*) FROM public.photos),
      'bucket_objects', (
        SELECT count(*) FROM storage.objects WHERE bucket_id = 'photos'
      ),
      'photo_rows_without_object', (
        SELECT count(*)
        FROM public.photos AS photos
        LEFT JOIN storage.objects AS objects
          ON objects.bucket_id = 'photos' AND objects.name = photos.url
        WHERE objects.id IS NULL
      ),
      'objects_without_photo_row', (
        SELECT count(*)
        FROM storage.objects AS objects
        LEFT JOIN public.photos AS photos ON photos.url = objects.name
        WHERE objects.bucket_id = 'photos' AND photos.id IS NULL
      )
    )

  UNION ALL

  SELECT
    60,
    'legacy_tables',
    jsonb_build_object(
      'devices_exists', to_regclass('public.devices') IS NOT NULL,
      'reported_photos_exists', to_regclass('public.reported_photos') IS NOT NULL
    )
)
SELECT section, details
FROM snapshot
ORDER BY sort_order;
