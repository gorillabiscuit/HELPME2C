# ADR Queue — pending stack-selection decisions

**This is Phase 1 work.** Walk through each entry below with the human, finalise as a real numbered ADR using `_template.md`, then commit. The order is roughly dependency order — earlier choices constrain later ones.

Each entry below has:
- The decision to make
- The previous-session Claude's recommendation
- The alternatives that were considered and why they're not the recommendation
- What might change the recommendation

These are NOT decisions yet. They're strawmen for the new-session Claude + human to challenge or accept.

---

**Queue is currently empty — Phase 1 stack-selection ADRs are complete (see `README.md` index, ADRs 0001–0014). Phase 2 is repo bootstrap; see `KICKOFF.md`. New pending decisions get appended below as ADR-XXXX sections following the same format.**

---

## How to work through this queue in Phase 1

1. **Read each entry above with the human.**
2. **For each: confirm the recommendation, push back, or pick an alternative.** Don't accept silently — make the human articulate why they agree.
3. **Write the real ADR file** at `docs/decisions/000X-<title-slug>.md` using `_template.md`. Status = "Accepted". Date = today.
4. **Commit each ADR as its own commit** (`docs(adr): accept ADR-0001 monorepo tool` etc).
5. **Mark this `QUEUE.md` entry as resolved** by deleting that section and adding a one-liner to `README.md`'s index table.

Once all pending entries are accepted: Phase 1 done, move to Phase 2 (repo bootstrap).
