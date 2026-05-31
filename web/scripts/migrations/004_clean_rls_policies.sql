-- 004_clean_rls_policies.sql
--
-- The "Acceso Total Tabla" (ALL) policy makes the two specific
-- policies redundant. Replace all three with a clear, explicit set.

-- Remove the overlapping policies
DROP POLICY IF EXISTS "Acceso Total Tabla" ON public.photos;
DROP POLICY IF EXISTS "Permitir lectura publica" ON public.photos;
DROP POLICY IF EXISTS "Permitir insercion publica" ON public.photos;

-- Explicit SELECT: any client can read photos (shared gallery)
CREATE POLICY "photos_select_public"
  ON public.photos FOR SELECT
  USING (true);

-- Explicit INSERT: any client can insert (anonymous guest upload)
CREATE POLICY "photos_insert_public"
  ON public.photos FOR INSERT
  WITH CHECK (true);

-- Explicit DELETE: any client can delete (UI enforces device_id
-- ownership — this is acceptable for MVP)
-- TODO(auth): restrict to device_id = auth.uid() when Supabase
-- Auth is implemented
CREATE POLICY "photos_delete_public"
  ON public.photos FOR DELETE
  USING (true);

-- NOTE: No UPDATE policy — the app never updates photo records.
-- Omitting it reduces the attack surface.
