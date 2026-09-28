# 2026-09-28 — "The banner a stranger actually meets, and a rail that lets go"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-40-the-banner-a-stranger-actually-meets` (→ `main`), cut from
`main` at `73559cc`. Not stacked.

**Two defects, both found by the maintainer using the deployed portal**, minutes
apart, and both about the portal as it is actually met rather than as it is
tested. They are unrelated to each other and are in one branch because they
arrived together and neither is large enough to review on its own; the files do
not overlap.

- [`/portal/sign-in` at 1280](2026-09-28-portal-sign-in-banner-wide.png) — the
  banner, on the screen he was looking at.
- [`/portal/sign-in` on a phone](2026-09-28-portal-sign-in-banner-phone.png) —
  `scrollWidth 390 / innerWidth 390`.

---

## 1. The warning was behind the door it was warning about

The maintainer, with `loomjs.org/portal/sign-in` open:

> *"I wanted a banner here saying that the portal is coming soon."*

#428 added `UnderConstruction` on 28 September and put it on `/portal`. That is
the right banner and the wrong screen, and the reason is one line in the sign-in
page's own module comment:

> **The only page reachable without a session.**

So the audience the banner was written for — *"a stranger who follows Portal from
the marketing site's menu or its footer"*, in #428's own words — is precisely the
audience that could never see it. They land on `/portal/sign-in`, read three
sentences describing a working review surface in the present tense, and have no
way to know most of it is unbuilt. The one screen a person without a key will
ever see was the one screen without the warning.

`SignInHero`'s own docstring had already said so, a fortnight before the banner
existed: *"The first page a stranger sees now that the marketing site sends them
here."*

**Placed above the heading**, which is where `/portal` puts it, and for the
reason `UnderConstruction`'s own comment gives: a reader needs to have seen it
*before* they judge anything else on the screen. On this page the thing they
would otherwise judge is the sentence about what the portal is.

**On both paths.** A visitor who arrives at a deployment that cannot accept a key
at all — no session secret, no roster — is the person *most* likely to conclude
the product is broken rather than unfinished.

### The guard is lane-wide, not a second place to remember

`guarded-pages.test.ts` already enumerates the pages exempt from `requireActor`
and already asserts that every exemption is still the thing it was exempted for.
The new rule sits in that file rather than beside the component:

> **Every unguarded page that renders a screen says the portal is unfinished.**

One page today. A second public portal screen is inside the rule the moment
somebody adds one to `UNGUARDED_BY_DESIGN` — which is exactly the moment this
would otherwise be forgotten again.

It reads the page's **whole directory** rather than the page file, because a page
in this lane is a shell: `portal/sign-in/page.tsx` gathers config and hands it to
`SignInHero`, and everything a visitor reads is in the component. A rule that
read only the page file would pass on a screen that says nothing.

**Proved by removing the banner.** The guard goes red with
`portal/sign-in/page.tsx does not say the portal is unfinished`. A guard that has
quietly stopped matching passes for ever, and this lane disarmed one that way on
8 September by renaming the thing it looked for.

## 2. A rail navigated with the pointer now gives the focus back

> *"When I click on a sidebar menu item and the sidebar is expanded, it should
> collapse when navigating. Right now it persists open and is super annoying to
> have to click again to close it."*

**The cause is `focus-within`, not hover.** The rail widens on both. A link keeps
focus after it is clicked, so the rail stayed expanded after the pointer had
left — and the only thing that would close it was clicking somewhere else, which
is what he had to do.

It is worse than annoying on a touch screen, where there is no pointer to leave:
a tapped link holds focus with nothing to take it away, so the rail covers a
third of the screen until something else is tapped. Nobody had reported that
because nobody had used it that way yet.

**`detail === 0` is the whole of the fix.** A click from Enter or Space on a
focused link carries a detail of 0; a real press carries its click count. So a
pointer press hands the focus back and the rail collapses when the pointer
leaves, and a keyboard press keeps it — because taking focus off the element a
keyboard user has just activated drops them at the top of the document, and
would undo the reason `focus-within` is on the rail at all, which is that a
keyboard user tabbing it would otherwise meet six unlabelled icons.

**Blurring rather than holding an `expanded` boolean**, deliberately. The width
is CSS and should stay CSS: a component owning the state would have to own the
hover case too, and then a rail the pointer is resting on could be closed by a
render.

## What this tells a developer that they could not get elsewhere

**Nothing, and both of these are the other kind of work.** The value question in
the brief is a test for screens that show Loom's own data; these are two defects
in how the portal is met and used, found by a person opening it rather than by
anything in this repository. Saying so is cheaper than stretching an answer.

What is worth recording is *how* they were found: **neither is visible from
inside the codebase.** #428's banner was correct, tested, and photographed — on
the screen it was on. The rail's `focus-within` is correct CSS with a test
asserting it. Both defects live in the gap between a component being right and a
person meeting it, and the only instrument that has ever found one is somebody
opening the deployed site.

## Tests

`pnpm verify` green, exit 0, read from a file written by the last command on its
own line, on a `.next` deleted first.

| | `main` at `73559cc` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 165 files / 3,223 | **165 / 3,223** — `src/` was not opened |
| `@loom/app` | 319 / 5,555 | **319 / 5,561** |
| findings | 859, 0 malformed | **859**, 0 malformed |
| prerender | 114 pages, 1,304 junctions | **114 / 1,304**, 0 unserved |
| overflow, measured | — | 1280 / 1280 wide, 390 / 390 phone |

**+6 tests, no new files. Nothing failed, nothing skipped, no test weakened.**

- `guarded-pages.test.ts` — **1**, the lane-wide rule, guarded against a vacuous
  sweep by pinning the list it runs over, and proved by mutation.
- `sign-in-hero.test.tsx` — **3**: that the banner is there, that it comes before
  the page says what the portal is, and that it is on the misconfigured path too.
- `sidebar-nav.test.tsx` — **2**: focus given back on a pointer press, focus kept
  on a keyboard press. The pair is the assertion; either alone would pass on a
  component that always did one of them.

## Findings

**Filed none.** Both of these were reported rather than discovered, and there is
no gap in another lane's directory to file — the banner was this lane's screen to
put it on, and the rail is this lane's component.

## What I did not do

**I did not move the banner off `/portal`.** It is correct there too — a signed-in
reviewer is also looking at an unfinished surface — and #428's argument for it
being above the heading on both return paths is unchanged.

**I did not change the banner's wording.** It is the maintainer's, and #428's
tests deliberately assert the claim rather than the copy so that his own edit
does not go red.

**I did not make the rail collapse on hover-out by script.** It already does;
what it could not do was stop being focused.

**Nothing is scheduled.**

## Recommendations

1. **Look at `/portal` and `/portal/sign-in` on the deployment after this lands.**
   Both of today's defects were invisible to every test in this repository and
   visible in the first second of looking at the live site.
2. **The front door's width**, carried from yesterday and still the first thing I
   would change on the screen behind this one.
