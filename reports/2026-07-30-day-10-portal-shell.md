# 2026-07-30 (day 10) — the workspace, and the portal shell in silver

**Build order section:** §5 — Portal. The chrome and the design system; the store-backed half follows.

**Visuals:** [icon rail](2026-07-30-day-10-portal-shell-rail.png) · [expanded on hover](2026-07-30-day-10-portal-shell-expanded.png)

**Branch:** `day-10-portal-shell`, off `main` at `cce4eae`

---

## Your three points

**1. Hyperion.** Read it. The default theme is already the silver one, and the
parts worth copying are more specific than "clean and minimal": 2/4/6px radii,
14px base type on a dense scale down to 11px, a cool `#f2f6f8` page with a
silver-blue gradient wash under white surfaces, a 56px icon rail that expands to
275px on hover with monospace labels, a 2px slate left border for the active item,
and pastel action buttons with dark text plus a slightly darker border.

The part that transferred most usefully was the method, not the palette: CSS
custom properties, mapped once into semantic utilities via `@theme inline`, and
never a raw hex in a component. `code-style.md` already forbids hardcoded hex in
JSX, so the approach dropped straight in. **The tokens transferred; the components
did not** — Hyperion's are wired to proposals and vendors.

**2. Dogfooding.** Corrected in my reply and recorded as 0018, because the
appealing version is not available: props are `JsonValue`, so a function is not a
prop, and the tree has no event model by construction. The portal's chrome cannot
be a Loom tree without inventing interactivity in §5, which is a §1 schema change.
The preview pane is genuinely Loom; the chrome is ordinary React. And the
dogfooding claim that does hold is stronger — the portal has **no privileged
access**.

**3. Server-side.** You were right, recorded as 0017, with two reasons sharper
than general security: the API key cannot go to the browser, and a Gate that runs
where the caller controls the code is a suggestion rather than a gate.

---

## What was completed

**The repo is a pnpm workspace.** `apps/portal` depends on `@loom/runtime` as
`workspace:*`, which is 0018 made mechanical: the portal resolves
`@loom/runtime/store`, and `../../src/store/store.js` simply does not resolve. A
deep-import shortcut now fails to build rather than passing review.

`@loom/runtime` keeps its dependency tree — Next and Tailwind live in the app and
never become something a host inherits.

**`pnpm verify` runs across the workspace.** The root's verify chains the portal's,
and the portal's is `typecheck && test && build`. The build is in there
deliberately, on the day-8 precedent that a scaffold should be proven rather than
asserted: `next build` prerenders `/` and `/trees` to static HTML, which means the
layout, topbar, sidebar and nav actually rendered. A portal that could be broken
while the library was green would not be testing anything.

**The silver design system**, as `apps/portal/app/globals.css`. Beyond the
Hyperion tokens, two groups are Loom's own:

- **Dispositions** — one token pair per `ChangeOutcome` kind the composition
  runtime can produce (`applied`, `awaiting-confirmation`, `rejected`,
  `not-interpreted`, `not-applicable`), so a disposition cannot be rendered in a
  colour the runtime has no name for. Add a kind, add a pair.
- **Edit mode** — hover outline, selected outline, and node label. 0010 fixed that
  edit mode decorates and never invents DOM, so selection has to be expressible as
  a style on a node that is already in the tree.

**The shell** — a fixed 56px topbar, a 56px icon rail expanding to 275px on hover
with monospace labels and a 2px slate active border, and four sections: trees,
primitives, history, audit. Each one is a thing the runtime already produces; a
section with no data behind it would be a promise in a nav bar.

---

## One thing improved rather than copied

Hyperion's nav decides active state with `pathname.startsWith(item.href)`, plus a
special case for `/dashboard`. That has a latent bug: `startsWith` makes `/audit`
claim `/auditorium`, and nothing notices until two routes happen to share a
prefix.

So the rule is a pure function, `isNavItemActive`, matching either the path itself
or the path plus a separator — never a raw string prefix — with `/` exact because
every path starts with it. It has six tests, two of them specifically for the
prefix collision.

Extracting it is also what makes the nav testable at all: `SidebarNav` is the
shell's only client component, and it is one solely because the active item is a
function of `usePathname`. Everything it decides is delegated, so the matching
rule is verifiable without a router.

---

## Decisions I made that weren't specified

1. **`apps/portal`, not `packages/runtime` + `apps/portal`.** Moving the library
   into `packages/` would be the tidier layout and a diff touching every file in
   the repo, every path in ten reports, and every decision record that cites one.
   The root stays `@loom/runtime`; `workspace:*` resolves to it fine.

2. **`transpilePackages: ["@loom/runtime"]`.** The framework ships TypeScript
   source because the compile step was deferred on day 8, so Next has to transpile
   it. 0018 predicted exactly this — the first consumer is what turns a deferred
   decision into a concrete cost. Noted in `next.config.ts` so it is understood as
   a consequence rather than a quirk.

3. **The trees page says what is true.** It reads "the shell is in place, nothing
   reads the store yet" rather than showing an empty list. An empty state that
   reads as "no trees" when the truth is "not connected" is a lie the next session
   would have to debug.

4. **`aria-current="page"` on the active item**, since the active state is
   otherwise carried entirely by colour and a 2px border.

5. **No dark theme yet.** Hyperion has six themes and the tokens are structured to
   take a `[data-theme]` override, but shipping one theme I have checked beats six
   I have not.

6. **No component unit tests, stated plainly rather than papered over.** Asserting
   class names on `SidebarNav` needs jsdom plus a `usePathname` mock, and the
   assertions would then be about the mock. The logic is unit-tested where it
   lives; the components are covered by typecheck and by the build's prerender.
   A real browser test is worth doing and is its own unit of work.

---

## Verified by looking, not by reasoning

I ran the built app and screenshotted it, both states — the two images linked at
the top. The rail, the hover expansion, the monospace labels, the active border
and the group separator are all in the screenshots rather than in my description
of them.

That used Playwright ad hoc against the pre-installed Chromium; **the dependency
was removed afterwards** rather than left in `package.json` unused. Committing a
screenshot script is defensible but it is dev tooling that deserves its own unit
and its own test, not a leftover.

---

## Decision records

| #    | Title                                                          | Status   |
| ---- | -------------------------------------------------------------- | -------- |
| 0017 | Every write goes through one server-side path                   | Accepted |
| 0018 | The portal is a consumer of the framework, not an insider        | Accepted |

Both were written in the previous unit and pushed to PR #14, since 0017 cites 0016
and a separate branch would only have conflicted on the index. Neither is
contradicted by anything here. **No ARCHITECTURAL escalation** — nothing in this
unit touches the tree schema, the delta model, or any runtime module.

---

## Test coverage / status

```
@loom/runtime   47 files, 426 tests   green
@loom/portal     1 file,    6 tests   green + build
```

The runtime counts are main's, not #14's: this branch is off `main`, so the store's
25 tests are not in this tree. They arrive when #14 merges, taking the runtime to
51 files and 451 tests.

`pnpm verify` green across the workspace. **6 new tests**, all for
`isNavItemActive`: a path against itself, a child route against its section, a
different section, **two for the prefix collision that Hyperion's `startsWith`
would get wrong**, and the root's exactness.

---

## Open questions for the next session

1. **PR #14 must merge before the store-backed half.** The portal's preview pane
   and write route need `@loom/runtime/store`, which is not on main yet. Basing
   this branch on an open PR's branch is the stacking mistake from §4, so this unit
   was deliberately scoped to the part that needs nothing from it.

2. **The write route is designed but not built.** 0017 fixes what it does; what it
   needs next is the `EditIntent` → `composeChange` → `append` handler, and the
   optimistic client that reconciles a `revision-conflict`.

3. **A real browser test.** See decision 6 above — the shell is verified visually
   and by prerender, which is not the same as asserted.

4. **The compile step, again.** `transpilePackages` works, but it is the third
   session where the deferred build has cost something. Still not urgent; now
   visible in two places instead of one.

5. **The schema is at 3381 of a 3500 guard.** Untouched. Carried.

6. **Node-level provenance.** (Carried from day 1.) Still unforced.
