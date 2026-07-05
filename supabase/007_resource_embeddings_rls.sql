-- 007_resource_embeddings_rls.sql — Política SELECT faltante en resource_embeddings
-- Idempotente para bases que ya ejecutaron 002_rls_and_seed.sql sin esta política

DROP POLICY IF EXISTS resource_embeddings_select ON resource_embeddings;

CREATE POLICY resource_embeddings_select ON resource_embeddings FOR SELECT USING (
  is_approved_user() AND EXISTS (
    SELECT 1 FROM resources r
    WHERE r.id = resource_embeddings.resource_id
      AND (
        r.institution_id IS NULL
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
            AND (u.role = 'platform_admin' OR u.institution_id IS NULL OR u.institution_id = r.institution_id)
        )
      )
  )
);
