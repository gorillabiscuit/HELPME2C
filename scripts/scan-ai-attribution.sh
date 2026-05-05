#!/usr/bin/env bash
# scripts/scan-ai-attribution.sh — pre-push gate.
#
# Aborts the push if any commit on this branch (vs the base branch)
# contains an AI-attribution trailer in its commit message TRAILERS.
# Per CLAUDE.md §5 and the user-level rule in ~/.claude/CLAUDE.md.
#
# Wired into .husky/pre-push as the AI-attribution scan step. To
# install (one-time per clone):
#   pnpm install                         # runs `husky install` via prepare script
#
# Why this exists: relying on the human to remember to grep for trailers
# before every push has failure modes (forgetting, slipping a trailer
# during an amend, etc). Making the push itself fail closes the gap.
#
# Why git interpret-trailers --parse: parsing actual trailers (key:value
# lines at the end of a commit message) is robust against false
# positives where the commit message body PROSE mentions phrases like
# "Co-Authored-By: Claude" while explaining a rule. We only want to
# catch real trailers, not text that quotes them.
#
# Exit 0 = clean. Exit 1 = trailer found, push aborted.

set -u
set -o pipefail

# Configurable: override BASE_BRANCH via env if you're targeting a
# branch other than origin/main. For most workflows the default works.
BASE_BRANCH="${PRE_PUSH_BASE_BRANCH:-origin/main}"

# Pattern matched against PARSED TRAILERS only — not the full commit
# message body. The grep is case-insensitive; the pattern allows
# flexible whitespace because canonical trailers use exactly one space
# but obfuscation attempts might vary.
ATTRIBUTION_PATTERN='(co-authored-by[[:space:]]*:[[:space:]]*claude|co-authored-by[[:space:]]*:[[:space:]]*anthropic|generated[[:space:]]+with[[:space:]]+\[?claude|🤖[[:space:]]*generated[[:space:]]+with)'

# Best-effort fetch so the comparison range is accurate. Don't fail the
# scan if the fetch fails (offline, no remote, etc) — the scan still
# uses local refs in that case.
git fetch --quiet origin 2>/dev/null || true

# If the base branch isn't reachable locally, don't block the push —
# warn and exit clean. Some workflows (initial push, branch from a
# non-tracked base) hit this.
if ! git rev-parse --verify "${BASE_BRANCH}" >/dev/null 2>&1; then
  echo "WARN: ${BASE_BRANCH} not reachable; skipping AI-attribution scan." >&2
  exit 0
fi

# Walk every commit on this branch beyond the base. For each commit,
# parse its trailers via git interpret-trailers --parse and check
# those parsed trailers against the pattern.
OFFENDERS=""
while IFS= read -r SHA; do
  [ -z "${SHA}" ] && continue
  TRAILERS=$(git show "${SHA}" --format='%B' --no-patch | git interpret-trailers --parse 2>/dev/null || true)
  if [ -n "${TRAILERS}" ] && printf '%s\n' "${TRAILERS}" | grep -iE "${ATTRIBUTION_PATTERN}" >/dev/null; then
    OFFENDERS="${OFFENDERS}\n  $(git log -1 --format='%h %s' "${SHA}")"
  fi
done < <(git log "${BASE_BRANCH}..HEAD" --format='%H' 2>/dev/null)

if [ -n "${OFFENDERS}" ]; then
  echo
  echo "ERROR: AI-attribution trailer detected. Push aborted."
  echo "Per CLAUDE.md §5 and ~/.claude/CLAUDE.md, no Co-Authored-By: Claude"
  echo "or Generated with Claude Code trailers are allowed."
  echo
  echo -e "Offending commits:${OFFENDERS}"
  echo
  echo "To fix:"
  echo "  1. Identify the commit (use the SHAs above)."
  echo "  2. Amend it to strip the trailer:"
  echo "       git rebase -i <commit-before-offender>"
  echo "       (mark the offender as 'reword', strip the trailer, save)."
  echo "  3. Push again."
  echo
  echo "Bypass (DISCOURAGED — only for true emergencies):"
  echo "  git push --no-verify"
  exit 1
fi

exit 0
