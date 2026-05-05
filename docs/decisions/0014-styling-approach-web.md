# ADR-0014: Styling approach (web)

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

Tailwind CSS v4 as the primary styling system for `apps/web`, with CSS modules permitted as an escape hatch where Tailwind is genuinely awkward (complex `:has()` selectors, container queries with named scopes, one-off keyframe-heavy animations). No runtime CSS-in-JS. The component-library question (shadcn/ui or otherwise) is a separate follow-up decision and is out of scope here.

## What we rejected

- **CSS modules only** — works, but writing a design system from scratch in pure CSS is meaningfully slower than Tailwind for solo-dev velocity, and the AI tooling ecosystem heavily assumes Tailwind class names.
- **styled-components / Emotion** — runtime cost, hydration friction with Server Components, already banned by `apps/web/CLAUDE.md`. Not reconsidering.
- **Vanilla Extract / Panda CSS** — zero-runtime and type-safe, but a smaller ecosystem and another learning curve for marginal gain over Tailwind v4's compile-time pipeline.
- **Pinning the component library in this ADR** — deliberately deferred. shadcn/ui is the likely pick but warrants its own decision once the styling foundation is in place.

## Why

Tailwind is the path of least resistance for a solo build on Next.js + Vercel. The ecosystem (component examples, AI codegen, design references) overwhelmingly assumes Tailwind class names, which compounds for a solo developer leaning on AI assistance per CLAUDE.md. Compile-time class generation means zero runtime cost and no hydration-mismatch class of bugs that runtime CSS-in-JS introduces with Server Components.

CSS modules as an escape hatch (rather than banned outright) preserves an exit for the rare case where utility composition gets gnarly — a complex animation, a third-party widget that needs scoped overrides, a bespoke design moment. The expectation is rare use, not routine; if CSS-modules files start outnumbering Tailwind-only components, that's a signal to revisit this ADR.

The "no runtime CSS-in-JS" line stays a hard rule, codified in `apps/web/CLAUDE.md` banned patterns. This ADR makes the positive choice explicit so the next contributor (or AI session) doesn't re-litigate it.

## What would change our mind

- A specific design-system requirement Tailwind utility classes can't express ergonomically and that recurs across many components.
- Tailwind's compile pipeline introduces build-time pain that outweighs runtime savings (e.g. multi-second incremental builds in dev).
- The project gains contributors with strong preference against utility-first CSS and the team coordination cost outweighs solo velocity gains.
- A future styling primitive (CSS Cascade Layers + native nesting + container queries used heavily) makes Tailwind's value-add shrink to the point that vanilla CSS modules win on ergonomics.

## Related

- ADR-0002 (frontend framework — Next.js)
- `apps/web/CLAUDE.md` §banned-patterns (no runtime CSS-in-JS)
- PROJECT.md §Phase 1A scope
