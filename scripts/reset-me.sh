#!/usr/bin/env bash
# Friendly wrapper around apps/web/scripts/reset-user.ts.
# Resets a single user's data so they re-experience cold-start onboarding,
# without going through account-delete + recreate.
#
# Default behaviour: wipes EACH of Wouter's known accounts (one referenced
# by clerk-id, another by email). The underlying script is idempotent —
# missing users (Clerk or DB) print a note and exit 0.
#
# Usage:
#   ./scripts/reset-me.sh                  # resets the default accounts (Wouter)
#   ./scripts/reset-me.sh user_OTHER       # resets a single different user by clerk-id
#   ./scripts/reset-me.sh other@email.com  # resets a single different user by email
#
# Detection rule for the arg: contains '@' → treated as email, otherwise
# as clerk-id. Email lookup uses Clerk's admin API and requires
# CLERK_SECRET_KEY in apps/web/.env.local (already there if you've ever
# run the web app locally; refresh with `vercel env pull .env.local`
# from apps/web if not).
#
# DATABASE_URL must also be in apps/web/.env.local — that's where the
# wipe writes go.

set -euo pipefail

# Identities to wipe when no arg is passed. Each entry is either a
# Clerk user id (`user_…`) or an email (contains `@`).
DEFAULT_IDENTITIES=(
  "user_3DoxZCe03EfMSKxhZGhM64LjflK"
  "wschreuders@gmail.com"
)

if [ $# -gt 0 ]; then
  IDENTITIES=("$1")
else
  IDENTITIES=("${DEFAULT_IDENTITIES[@]}")
fi

cd "$(dirname "$0")/../apps/web"

for identity in "${IDENTITIES[@]}"; do
  echo "──────────────────────────────────────────────────────────────"
  echo "Resetting: $identity"
  echo "──────────────────────────────────────────────────────────────"
  if [[ "$identity" == *"@"* ]]; then
    RESET_OK=yes pnpm dlx tsx --env-file=.env.local scripts/reset-user.ts --email="$identity"
  else
    RESET_OK=yes pnpm dlx tsx --env-file=.env.local scripts/reset-user.ts --clerk-id="$identity"
  fi
done
