#!/usr/bin/env bash
# Runs pgTAP tests through psql in the local Supabase DB container
# (equivalent to `supabase test db`, whose pg_prove container needs privileges
# some Docker hosts refuse).
set -euo pipefail
container="${SUPABASE_DB_CONTAINER:-supabase_db_workspace}"
status=0
for f in supabase/tests/*.test.sql; do
  echo "# $f"
  if ! out=$( (echo 'create extension if not exists pgtap with schema extensions;'; cat "$f") |
    docker exec -i "$container" psql -U postgres -d postgres -q -t -A -v ON_ERROR_STOP=1 2>&1); then
    status=1
  fi
  echo "$out"
  if grep -qE '^not ok|Looks like|ERROR' <<<"$out"; then status=1; fi
done
exit $status
