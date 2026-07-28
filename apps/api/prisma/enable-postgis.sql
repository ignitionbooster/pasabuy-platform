-- Run once against a fresh database, before `prisma migrate dev`:
--   psql "$DATABASE_URL" -f prisma/enable-postgis.sql
CREATE EXTENSION IF NOT EXISTS postgis;
