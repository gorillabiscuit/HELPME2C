---
description: Run the pre-PR review per CLAUDE.md §7
---

You are running the pre-PR review per `CLAUDE.md §7`. Do all of the following inline. Do not ask the human to type commands or run scripts — you have Bash access; run things yourself.

## Step 1 — Run the gates

Run, in order:

- `pnpm typecheck` (or `pnpm preflight` if it's defined to chain typecheck + lint + test)
- `pnpm lint`
- `pnpm test`

Report PASS/FAIL summary inline.

If anything fails: STOP. Surface the failure to the human, fix it, then re-run from step 1. Do not proceed to step 2 with broken gates.

## Step 2 — Walk the diff

Run `git diff origin/main...HEAD`. Tag every chunk: Scaffolding / Decision / Logic / External / Security per `CLAUDE.md §6`. Apply §6.1 escalation (when in doubt, classify upward) and §6.2 acknowledgement (the human must explicitly acknowledge each Security or External chunk before commit).

## Step 3 — Pessimistic meta-check (fresh sub-agent)

Spawn an Explore sub-agent. The sub-agent must NOT see this conversation's implementation context — it reviews cold.

Brief the sub-agent:

> Read `CLAUDE.md`, the relevant ADRs in `docs/decisions/`, the per-package `CLAUDE.md` files for any package this PR touches, and the current `git diff origin/main...HEAD`.
>
> Look for: rule violations (banned patterns from §3, missing ADRs for architectural choices, missing `DEPS.md` entries for new deps, cross-package import violations from the per-package CLAUDE.md files, the `packages/ml` purity rules), category/naming/scope mismatches, brittleness (hardcoded dates, magic strings, paths that age badly), documentation drift (broken cross-references), things that pass the gates but a senior reviewer would flag.
>
> Bias toward suspicion. **Assume at least three issues missed**; if you find fewer than three, look harder before concluding.
>
> Categorise findings:
> - **Definitely-issue** — clear correctness/contradiction; must fix
> - **Likely-issue** — strong indication; fix or document why not
> - **Maybe-issue** — judgment call; surface for human decision
> - **Looks-clean** — areas you specifically checked and found no issue
>
> Be specific: file path + line number + quoted snippet per finding. Don't tell me "looks good overall" — tell me exactly what you checked and what you found.
>
> Under 700 words.

Resolution rule: every Definitely and Likely is fixed in the diff or has a Review-Note trailer documenting why not. Maybes get a one-line decision (fix / Review-Note / accept-as-is).

## Step 4 — Acceptance-criteria mapping

Read the ticket (Linear / GitHub issue / wherever). For each acceptance-criterion bullet, point at the file:line that satisfies it, or write "not satisfied" if you can't.

## Step 5 — Commit hygiene + scope check

`git log --oneline origin/main..HEAD`. For each commit:

- One logical change? (per CLAUDE.md §5)
- Scope conventional? (`feat(area):` / `fix(area):` etc)
- New deps in their own commit?
- DEPS.md entry for any new dep?

Then check the full diff for anything outside the ticket scope.

## Step 6 — Rebase status

`git rev-list --left-right --count origin/main...HEAD`. Flag if the branch is behind.

## Step 7 — PR description draft

Per CLAUDE.md §9.5 — three blocks:

```markdown
## Summary

<1–3 bullets, plain English, what changed and why>

## Test plan

- [ ] <reproduction step 1>
- [ ] <reproduction step 2>
- [ ] <edge case>

### Manual verification commands

<exact shell commands or UI actions a reviewer should run to exercise this PR's surface end-to-end>
<if pure refactor with no human-visible surface, write "Pure refactor — no surface to exercise" instead>

## Notes for reviewer

<acceptance-criteria mappings from step 4>
<any Review-Note trailers from commits>
<anything subtle worth flagging>
```

No emoji. No AI-attribution.

## Step 8 — Output the consolidated handoff

Output sections 1–7 above as one markdown document, in chat. Section labels in bold. The PR description draft (step 7) goes in a clearly-marked code block so the human can copy it cleanly.

## Step 9 — Surface what only the human can do

End the handoff with a short concrete list:

> **Your turn:**
> - Read these chunks I tagged Decision/Logic/External/Security: `path/to/file.ts:42-58`, `path/to/other.tsx:10-30`, ...
> - Run these manual verification commands: `bash command 1`, `curl ...`, ...
> - Then say `ship it` to commit + push, or tell me what to fix.

## When the human says `ship it`

1. Stage and commit any final changes (one logical change per commit per §5).
2. `git push`. The pre-push hook automatically runs the AI-attribution scan via `.husky/pre-push` → `bash scripts/scan-ai-attribution.sh`.
3. Output the PR-creation URL inline (GitHub: run `gh pr create` if the user has explicitly OK'd it, otherwise output the URL `https://github.com/<owner>/<repo>/compare/main...<branch>?expand=1`).
4. Output the §9.5 PR description draft inline (the same one from step 7), ready to copy.

The human clicks the URL, copies the description, pastes into the PR form, clicks Create.
