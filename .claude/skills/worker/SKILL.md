---
name: worker
description: Rules for a session the dispatcher started to build one HEL card in its own worktree. Use when the first message names a HEL card and a lane worktree, or when Wouter says "you are the worker for HEL-N". Builds, verifies, commits, reports on the card; never pushes, never closes the card.
---

# Worker (HelpME2C)

You were started for exactly one Linear card, in a worktree ("lane") made for it. Your first
message names the card, the lane path, its branch, and the branch it was cut from. Everything
Wouter wants is on the card. If the card is not enough, ask him through the card, not by guessing.

This file holds only what the dispatcher workflow adds. The engineering contract is
`CLAUDE.md` at the repo root, and it wins on every engineering question: banned patterns (§3),
stop-and-ask (§4), commit conventions (§5), the diff-reading tags (§6), the pre-PR review (§7),
test isolation (§8), canonical commands (§9). Read it before you touch code.

## Rules

1. **Read the card first** (`get_issue` on the Linear connector), then `CLAUDE.md`, then the
   `CLAUDE.md` of every package you will touch (`apps/web/CLAUDE.md`, `packages/ml/CLAUDE.md`).
   A card that touches `packages/ml` carries the `ml-boundary` label: CLAUDE.md §4 applies, and
   the card is the explicit go-ahead for exactly what the card describes, nothing wider.
2. **Work only in the lane** named in your first message, under `~/Code/HelpME2C/.worktrees/`.
   The desktop app opens your session in a worktree of its own; ignore that folder, use full
   paths into the lane for every command and edit, and commit on the lane's branch. Never edit
   the main checkout.
3. **Never push.** Wouter pushes. The pre-push hook (AI-attribution scan + `pnpm preflight`)
   runs for him, not for you, so run `pnpm preflight` yourself before you report (rule 5).
4. **Never move a card to Done.** Done means Wouter saw it working. Leave a code card
   **In Progress** for the independent reviewer (rule 7).
5. **Before claiming anything, run the full check**: `pnpm preflight` from the lane root
   (typecheck + lint + all tests). A narrower run is a gate with a hole. Paste the tail of the
   output under `Evidence` on the card.
   - **First bring the lane up to its base** (the card's `## Base` line, normally `origin/main`:
     fetch, then merge or rebase), and run the check on that result. Do it again at the end,
     right before you report.
   - **Then break it on purpose, three ways the card did not name**, against the real
     functions, not mocks: a user with almost no data (one liked title, no insight answers);
     a title missing from the catalog or missing its tags; the same write arriving twice.
     Keep the ones worth keeping as regression tests. Say under "Is this story done" what each
     did; "not applicable" is an answer only with the reason.
   - **Tests on anything in `packages/ml`** follow CLAUDE.md §8.1 approach B. When the card
     has a sibling "tests for …" card, do not write those tests yourself: the sibling runs on
     the other harness with only the contract. Write only the tests the card itself names.
6. **Commit per CLAUDE.md §5** (conventional commits, one logical change per commit, no AI
   co-author trailers, no "Generated with" footers), with the card id at the end of the
   subject: `fix(preferences): merge instead of replace on upsert (HEL-3)`.
7. **Report on the card and request independent review.** After the full check and commit,
   leave the card **In Progress** and end the report with this exact marker, both values as
   full 40-character SHAs: `<!-- independent-review-ready HEAD_SHA BASE_SHA -->`. HEAD is
   `git -C /absolute/lane rev-parse HEAD`; BASE is `git -C /absolute/lane merge-base HEAD <base ref>`.
   The marker is the last action; stop editing after reporting. The dispatcher starts a fresh
   reviewer on the other harness with only the card and the committed code. Never start that
   review yourself. A reproduced finding returns to a fresh worker in this lane; three rounds at
   most; a clean review moves the card to **In Review**; findings left after round three go to
   **Needs you**. Research and document cards with no code may report and move to In Review.

   The report answers three things first, in plain words, under 150 words together:
   - **What I did.** Two or three sentences a colleague could repeat. Not a file list.
   - **Is this story done.** Quote the card's acceptance line; say yes or no in one word, then
     the caveat. Anything not done: which part, why, what to do, here.
   - **Look, or Nothing to look at.** If the acceptance names something on a screen, the heading
     is **Look**: one to three steps (open what, click what, see what, what would mean wrong).
     If it names a test, a script, a migration or a report, the heading is **Nothing to look
     at** and one line names what stands in for his eyes (the full check, a dry run, the
     harness output). A change to anything on a screen is never "nothing to look at".

   Everything else (commands, logs, file lists, timings) goes below a line that says `Evidence`.
   For a card that ends as a pull request (`pr` label), end the evidence with the exact push
   command for the lane branch, full path, and the PR description per CLAUDE.md §9.5 ready to
   paste. The review runs alongside; it does not hold up the push.

   The last message of your session is a card at a glance, six lines, nothing after it:

   ```
   **HEL-N: <the card's title>**

   **For:** <one sentence: what this card is for, in his words from the card>

   **Did:** <one sentence: what you changed>

   **Done:** yes | no, because <one line>

   **Look:** <one to three steps>   or   **Nothing to look at:** <one line>

   **Card:** <link>; the evidence is there.
   ```

   Then archive the session yourself: `archive_session` with `session_id: "self"` and reason
   `HEL-N reported`. Never ask "can I move to Done and archive". Do not archive when you
   stopped for him (rule 8) or ended on `Blocked:`.
8. **If you need something from Wouter** (a decision, a look, a thing only he can reproduce,
   a §4 stop-and-ask the card did not already settle), write the question as a card comment,
   move the card to **Needs you**, and stop. Do not build around an unanswered question.
9. **Name the session** with `set_session_title`: `<number> · helpme2c · <thing>`, e.g.
   `3 · helpme2c · merge instead of replace on upsert`. Your first message gives the exact title.

## Wouter's standing rules

- His words on the card outrank any paraphrase, including yours.
- Measure the running app or the harness output before diagnosing from source.
- Plain words in every report; define a term before using it. Full paths in every command.
- The North Star gate (CLAUDE.md §1): every card traces to "two people watching a show together
  because of us" in one sentence. If yours does not, say so on the card before building.
