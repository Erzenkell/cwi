#!/bin/sh
set -e

DUMP_FILE="/docker-entrypoint-initdb.d/4bc00aa5-c6ab-49f6-bf49-f91975fba74a"

echo "Restoring PostgreSQL custom dump from $DUMP_FILE..."

pg_restore \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --no-owner \
  --no-privileges \
  --verbose \
  "$DUMP_FILE"

echo "PostgreSQL custom dump restored."
