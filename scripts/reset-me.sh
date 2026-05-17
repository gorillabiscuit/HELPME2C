#!/usr/bin/env bash
# Friendly wrapper around apps/web/scripts/reset-user.ts.
# Resets a single user's data so they re-experience cold-start onboarding,
# without going through account-delete + recreate.
#
# Usage:
#   ./scripts/reset-me.sh                # resets the default user (Wouter)
#   ./scripts/reset-me.sh user_OTHER     # resets a different user
#
# Assumes apps/web/.env.local has a current DATABASE_URL pointing at the
# DB you want to reset against. Refresh with `vercel env pull .env.local`
# from apps/web if needed.

set -euo pipefail

# Default to Wouter's Clerk user id; pass any other id as the first arg
# to reset a different user.
CLERK_ID="${1:-user_3DoxZCe03EfMSKxhZGhM64LjflK}"

cd "$(dirname "$0")/../apps/web"

RESET_OK=yes pnpm dlx tsx --env-file=.env.local scripts/reset-user.ts --clerk-id="$CLERK_ID"
