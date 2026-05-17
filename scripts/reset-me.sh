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
#                                          # keeps ageVerified=true (fast path
#                                          # for retesting the onboarding picker)
#   ./scripts/reset-me.sh --full           # same, but ALSO clears ageVerified
#                                          # so the next visit lands on /age-check
#                                          # (use when testing the age-check
#                                          # flow itself, e.g. country picker)
#   ./scripts/reset-me.sh user_OTHER       # single user by clerk-id (fast path)
#   ./scripts/reset-me.sh other@email.com  # single user by email (fast path)
#   ./scripts/reset-me.sh --full user_OTHER
#   ./scripts/reset-me.sh other@email.com --full
#
# Flag order doesn't matter. --full is positionally independent.
#
# Detection rule for non-flag args: contains '@' → treated as email,
# otherwise as clerk-id. Email lookup uses Clerk's admin API and requires
# CLERK_SECRET_KEY in apps/web/.env.local (already there if you've ever
# run the web app locally; refresh with `vercel env pull .env.local`
# from apps/web if not).
#
# DATABASE_URL must also be in apps/web/.env.local — that's where the
# wipe writes go.

set -euo pipefail

# Identities to wipe when no positional arg is passed. Each entry is
# either a Clerk user id (`user_…`) or an email (contains `@`).
DEFAULT_IDENTITIES=(
  "user_3DoxZCe03EfMSKxhZGhM64LjflK"
  "wschreuders@gmail.com"
)

# Parse args: separate --full from positional identity arg(s).
FULL=0
POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    --full) FULL=1 ;;
    *) POSITIONAL+=("$arg") ;;
  esac
done

if [ ${#POSITIONAL[@]} -gt 0 ]; then
  IDENTITIES=("${POSITIONAL[@]}")
else
  IDENTITIES=("${DEFAULT_IDENTITIES[@]}")
fi

EXTRA_FLAGS=()
if [ "$FULL" -eq 1 ]; then
  EXTRA_FLAGS+=("--clear-age-verified")
fi

cd "$(dirname "$0")/../apps/web"

for identity in "${IDENTITIES[@]}"; do
  echo "──────────────────────────────────────────────────────────────"
  echo "Resetting: $identity${EXTRA_FLAGS[*]:+ (full)}"
  echo "──────────────────────────────────────────────────────────────"
  if [[ "$identity" == *"@"* ]]; then
    RESET_OK=yes pnpm dlx tsx --env-file=.env.local scripts/reset-user.ts \
      --email="$identity" "${EXTRA_FLAGS[@]}"
  else
    RESET_OK=yes pnpm dlx tsx --env-file=.env.local scripts/reset-user.ts \
      --clerk-id="$identity" "${EXTRA_FLAGS[@]}"
  fi
done
