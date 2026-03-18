-- ============================================================
-- BeetleSense.ai — Extensions
-- 000_extensions.sql
-- Enables required PostgreSQL extensions in the extensions schema.
-- ============================================================

-- PostGIS: spatial data types and functions (geometry, geography, ST_*)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- pgvector: vector similarity search for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- pg_cron: scheduled background jobs (e.g., satellite checks, alert generation)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- moddatetime: automatic updated_at timestamp management
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- uuid-ossp: UUID generation (gen_random_uuid is built-in, but some functions need this)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Make extension types resolvable in public schema queries
SET search_path TO public, extensions;
