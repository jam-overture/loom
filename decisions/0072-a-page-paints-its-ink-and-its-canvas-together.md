# 0072. A page paints its ink and its canvas together, or neither

**Status:** Accepted
**Date:** 2026-08-20
**Section:** §4b

## Context

The documentation routine filed it on 20 August, and the interesting part is
how long it went unseen.

`loom.page` took a `fills` prop, off by default, and painted the theme's canvas
only when it was on. It set the palette's **ink** unconditionally:

```ts
color: colour("fg-default"),
...(given.fills === true ? { background: colour("bg-canvas") } : {}),
```

Every documented example on the docs site is rooted at a `loom.page` inside a
bordered frame, and none set `fills`. For as long as every example wore
`editorial`, whose canvas is white, on a docs frame that is also white, nothing
looked wrong. The `bold` example was the exception, and it had been rendering
`#f5f5f5` text on `#ffffff` since the day it was written: unreadable, with an
empty diagnostics array, passing every test in the suite. Matching backgrounds
were hiding it.

That is the shape of the defect, and it is not really about a default. **A page
that paints one half of a palette and inherits the other half is broken
whenever the two halves disagree**, in either direction: light ink on a light
host, or a dark canvas under a host's dark text. The prop said "fills", the
component read it as "fills the background", and nothing said what the ink was
supposed to do.

The finding also asked the narrower question — should the default be on? — and
observed that every surface rendering a specimen wants it on and will discover
this the way the docs site did. That is true and it is the smaller half.

## Decision

**`fills` governs both, and it is on by default.**

- `fills` (or omitted) — the page sets `color` **and** `background` from the
  palette. It is the whole document, and it looks like the theme says it looks.
- `fills: false` — the page sets **neither**. It is embedded in a host's chrome
  and inherits that host's ink and canvas together.

Both halves matter and the pairing is the part that is not a judgement call.
Defaults are arguable; a page that imposes ink onto a background it declined to
paint is a bug in any configuration.

The default moves for the reason the finding gives, plus one the repository can
check: **every tree in this repository that roots at the starter `loom.page`
already sets `fills: true`** — the marketing site, the demo, and every docs
example. The default was serving nobody and catching people out. Turning it on
also puts the *loud* failure on the rarer case: a host whose background is
unexpectedly repainted sees it immediately, where the old default's failure was
text nobody could read and no diagnostic anywhere.

## Consequences

- **A host embedding a page in its own chrome sets `fills: false`.** It then
  gets the host's colours for body text, and the palette's colours for
  everything a primitive names explicitly — `fg-muted` prose, an accent
  eyebrow. That mixture is the honest meaning of "embedded", and it is what the
  old behaviour was silently doing to the *canvas* in reverse.
- **Nothing in this repository changes appearance.** Every root already asks
  for `fills: true`, so the flip is inert here and visible only to a host that
  omitted it — which is exactly the host the old default was failing.
- **A specimen frame needs no special knowledge.** The next surface to render a
  primitive gallery gets a readable page without first learning this.
- **The library's palette tests still cannot see legibility.** They assert that
  colours come from slots, not that any pair of them contrasts. The defect this
  record fixes was invisible to them and would be again in a different shape;
  contrast belongs in the theme tests, where `theme.test.ts` already checks
  pairs, and the pairing rule above is what keeps a *page* out of that class of
  mistake.

## Alternatives considered

**Leave the default off and fix only the pairing.** Correct as far as it goes,
and it removes the unreadable-text failure. Rejected because it leaves every
future specimen surface to discover the same thing: an unfilled page is
*plausible* on a white host and wrong on any other, and the four surfaces here
have already tripped over it once.

**Default on, ink unconditional.** The narrow reading of the finding. It fixes
the docs site and leaves `fills: false` meaning "paint the ink of one theme onto
the canvas of another", which is the bug rather than the default.

**A diagnostic when a page renders unfilled.** Tempting, because the failure was
silent. Rejected: an embedded page is a legitimate composition, not a mistake,
and a diagnostic that fires on a correct usage is one that teaches people to
ignore diagnostics.

**Three states — `fills: "both" | "canvas" | "none"`.** More expressive and
nobody wants it. The case for painting ink without canvas is the bug this record
exists to remove, and a third enum value is grammar budget (0014) spent on
making the mistake reachable again.
