---
name: worker
description: Rules for an unattended run that scripts/card started to build one HEL card in its own worktree. Use when the first message names a HEL card and a lane worktree, or when Wouter says "you are the worker for HEL-N". Builds, verifies, reports in the final reply (scripts/card commits); never pushes, never touches Linear.
---

# Worker (HelpME2C)

`scripts/card HEL-N` started you for exactly one Linear card, in a lane: a git worktree under
`/Users/wouterschreuders/Code/HelpME2C/.worktrees/` with that card's branch. Nobody is watching
while you run. Your first message names the card, the lane, the branch and its base, and holds
the card text. Everything Wouter wants is on the card. If the card is not enough, stop and say
what you need (rule 8); never guess.

The engineering contract is `CLAUDE.md` at the repo root, and it wins on every engineering
question: banned patterns (§3), stop-and-ask (§4), commit conventions (§5), test isolation (§8),
canonical commands (§9). Read it before you touch code. Codex: also read `CODEX.md` next to this
file.

## Rules

1. **Read the card first** (it is in your first message), then `CLAUDE.md`, then the `CLAUDE.md`
   of every package you will touch (`apps/web/CLAUDE.md`, `packages/ml/CLAUDE.md`). A card with
   the `ml-boundary` label is the explicit §4 go-ahead for exactly what the card describes,
   nothing wider.
2. **Work only in the lane.** Full paths for every command and edit. Never edit the main
   checkout or another lane.
3. **Never push, merge, deploy, or touch Linear or an account.** There is no Linear connection
   in this run; `scripts/card` posts your report. Claude pushes and merges, on Wouter's go,
   after the review.
4. **No secrets, no live services.** The lane has no `.env.local`. Anything that needs the real
   database (`DATABASE_URL`), an Inngest run, a Vercel deploy or a live API key is not yours to
   run: build and test it locally, then hand Wouter the exact command under **Needs you** (rule 8).
   Never print, copy or commit a secret.
5. **Before claiming anything, run the full check**: `pnpm preflight` from the lane root
   (typecheck + lint + all tests). A narrower run is a gate with a hole.
   - **The lane is already up to date with its base**: `scripts/card` merged it before starting
     you. Run the check once at the start, and again right before you report.
   - **Then break it on purpose, three ways the card did not name**, against the real
     functions, not mocks: a user with almost no data (one liked title, no insight answers); a
     title missing from the catalog or missing its tags; the same write arriving twice. Keep the
     ones worth keeping as regression tests. Say in the report what each did; "not applicable"
     is an answer only with the reason.
   - **Tests on anything in `packages/ml`** follow CLAUDE.md §8.1 approach B. When the card has a
     sibling "tests for …" card, do not write those tests yourself: the sibling runs on the other
     tool with only the contract. Write only the tests the card itself names.
6. **Do not commit, merge or stage.** The sandbox makes git's own files read-only. Leave your
   changes in the lane; `scripts/card` commits them after you finish, with the message you write
   under `## Commit message` in the report (rule 9). Write it per CLAUDE.md §5: a conventional
   subject with the card id at the end (`fix(preferences): merge instead of replace on upsert
   (HEL-13)`), a short body saying why, and a `Review-Note:` trailer when you are unsure about
   something. No AI co-author trailers and no "Generated with" footers; the pre-push hook
   rejects them. Leave no stray files: everything left in the lane goes into the commit.
7. **Keep it small.** Aim for under 400 changed lines, generated reports and the lockfile not
   counted. If the card cannot fit, build the first slice that stands on its own, and say in
   the report what the rest is.
8. **If you need something from Wouter** (a decision, a §4 stop-and-ask the card did not
   settle, a command only he can run), stop. Leave what is finished and safe in the lane, and write the
   question or command under **Needs you** in the report. Do not build around an unanswered
   question. `scripts/card` moves the card to Needs you.
9. **Your final reply is the report.** `scripts/card` posts it on the card as written; a fresh
   reviewer then checks the committed result without seeing it. Format, in this order:

   ```
   Outcome: done | needs-you

   **What I did.** Two or three sentences a colleague could repeat. Not a file list.

   **Is this story done.** Quote the card's acceptance line; yes or no in one word, then the
   caveat. Anything not done: which part, why, what to do.

   **Look** (the acceptance names something on a screen): one to three steps, what you open,
   click and see, and what would mean it is wrong.
   or **Nothing to look at** (a test, script, migration or report): one line on what stands in
   for his eyes.

   **Needs you** (only if rule 8 applies): the question or exact command, and why.

   Evidence
   The files you changed, the tail of `pnpm preflight`, the three break-it checks.

   ## Commit message
   The full commit message for your changes (rule 6), as plain text, nothing else in this
   section.

   ## PR description
   Per CLAUDE.md §9.5 (Summary / Test plan with Manual verification commands / Notes for
   reviewer), ready to paste. `scripts/ship` uses this section as the pull request body.
   ```

   The three answers above `Evidence` stay under 150 words together. A change to anything on a
   screen is never "nothing to look at".

## When the run is a second round

If your first message includes a review of earlier work in this lane, fix what the review
reproduced, and say in the report what you did about each finding. A finding you think is wrong
gets the reason, not silence. Never weaken a test or a check to make it pass.

## Wouter's standing rules

- His words on the card outrank any paraphrase, including yours.
- Measure the running code or the harness output before diagnosing from source.
- Plain words in every report; define a term before using it. Full paths in every command.
- The North Star gate (CLAUDE.md §1): every card traces to "two people watching a show together
  because of us" in one sentence. If yours does not, say so under Needs you before building.
