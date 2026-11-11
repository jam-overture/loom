# 0365. A colour is measurable when its channels are arithmetic and opaque

**Status:** Accepted
**Date:** 2026-11-08
**Section:** §4b

> **Why this number.** `0363` is the highest on `main`. `0364` is claimed by two
> open pull requests — #808 (this lane's) and #806 — and `0353` by #778, so
> `0365` is the first free number on all four.
>
> **It does not supersede [0076](0076-loom-offers-a-host-the-contrast-bar-and-does-not-impose-it.md)**
> and contradicts nothing in it. 0076's decision is that the bar *reports and
> does not decide*, and that `unmeasured` is a first-class outcome rather than a
> pass. Both still hold. What changes is how often that outcome is reached, and
> 0076's reasons for reaching it as often as it did were reasons of **cost and
> risk**, not a decision that these forms must stay unread.

## Context

[0076](0076-loom-offers-a-host-the-contrast-bar-and-does-not-impose-it.md) moved
Loom's contrast bar into the library as `auditPalette`, and named what
`contrastRatio` could not read:

> `colourSchema` accepts `rgb()`, `hsl()`, named colours and eight-digit hex;
> `contrastRatio` measures three- and six-digit hex and answers `undefined` for
> the rest. A named colour would need 148 entries of CSS vocabulary, `hsl()`
> needs a parser that is worse than useless if it is subtly wrong, and an alpha
> composites against whatever is behind it.

On **4 October** `Loom docs` filed what that cost, having asked the question of
the registry rather than of one function. The table is the finding's:

| the pair written as | `paletteSchema` | `paletteScheme` |
| --- | --- | --- |
| `#111827` · `#f3f4f7` | registers | `"dark"` |
| `#123` · `#eef` | registers | `"dark"` |
| `hsl(220 30% 11%)` · `hsl(220 25% 95%)` | **registers** | `undefined` |
| `rgb(17 24 39)` · `rgb(243 244 247)` | **registers** | `undefined` |
| `midnightblue` · `whitesmoke` | **registers** | `undefined` |
| `#111827ff` · `#f3f4f7ff` | **registers** | `undefined` |

Every row is legal, every row is the same dark canvas under the same light ink,
and **four of six gave no answer.** It is four measurements rather than one: a
palette written in `hsl()` loses `paletteScheme`, `paletteScrim`, `slotChroma`
and the contrast audit together. Measured on a palette whose every slot is
`hsl()`: `auditPalette` came back `26 unmeasured, 0 failures` — a palette that
registers, resolves, re-themes and renders, having quietly lost **every number
Loom can produce about it**, with nothing anywhere saying so.

The finding asked for nothing. It was filed as the figures 0076's deferred
diagnostic would need if it were ever reopened. **This record is not that
diagnostic.** The diagnostic tells a host it failed a bar; this makes the
measurements work for palettes that were already legal, which is a different
thing and the cheaper one.

## Decision

**A colour is measured when its channels are arithmetic, and declined when they
are vocabulary or when an alpha makes the pair's contrast not a property of the
pair.**

`channelsOf` reads every form `colourSchema` admits whose channels can be
computed from the string:

- hex of **three, four, six or eight** digits;
- `rgb()` and `rgba()`, in CSS's comma syntax and its space-and-solidus syntax,
  components as numbers or percentages, clamped rather than refused;
- `hsl()` and `hsla()`, both syntaxes, hue in any of CSS's four angle units,
  wrapped the long way and the negative way.

Two forms are declined, each on its own ground:

- **A named colour is vocabulary, not arithmetic.** It needs the CSS colour
  table — 148 entries this module would own and keep — and no care taken over
  the other forms supplies it. This is 0076's first reason, unchanged.
- **An alpha below opaque is declined**, because it composites against whatever
  is behind it and its contrast is genuinely not a property of the two slots.
  This is 0076's third reason, and it is **upheld rather than worked around.**

**A fully opaque alpha is read.** `#111827ff` composites to exactly `#111827`,
so declining it was declining a colour that was never in doubt — the third
reason applied to a case it does not describe.

**Channels are left unrounded.** A browser quantises to eight bits per channel
on the way into a pixel; nothing here draws anything, so rounding to match would
discard precision to imitate a step this never takes.

### How 0076's second reason was answered rather than ignored

0076's objection to `hsl()` is the serious one and it is about **evidence, not
difficulty**: *a parser that is subtly wrong reports a passing ratio for a
failing pair, which is worse than reporting nothing.* `(docs)`' own theming page
puts it more sharply — such a parser *"reports `"light"` about a dark palette,
and the logo you then serve is the one nobody can see."*

So the parser was not merely written and reviewed. It was **differentially
tested against Chromium's own CSS engine**, in this container, over a corpus of
**1,034 colours** spanning both syntaxes, all four angle units, the hue wheel at
three-degree steps, percentages, out-of-range components and the opaque-alpha
notations:

- **1,034 of 1,034 agreed**, with a worst per-channel difference of **0.5** —
  exactly the 8-bit rounding boundary, and in the direction explained above.
- Of **30** malformed strings Chromium refuses, this module measures **none**.
  Measuring one would be measuring a colour that renders as nothing.
- Every deliberate divergence runs the safe way: Chromium resolves
  `midnightblue` and `rgba(…, 0.5)`, and this module declines both.

That run is **not a test**, and deliberately. `pnpm verify` must not need a
browser. What is committed is the fixed numbers it produced, so every expected
value in `contrast.test.ts` is Chromium's answer for that string rather than
this module's own arithmetic restated.

## Consequences

- **A host writing `rgb()` or `hsl()` gets the bar it was offered.** The four
  measurements the 4 October finding listed all return, in one change, because
  all four sit on `channelsOf`.
- **`unmeasured` stays a first-class outcome**, reached by a named colour and by
  a translucent slot. 0076's bargain is untouched: this still reports and does
  not decide, and nothing that registers today stops registering.
- **An audit can newly report failures where it reported silence.** A host whose
  palette is written in `hsl()` and whose test asserts `failures` empty while
  ignoring `unmeasured` may go red on a real contrast failure that was there all
  along. That is the audit doing its job, and it is the point: the previous
  behaviour was not a pass, it was an absence of information.
- **Loom's own suite is unaffected.** Every shipped palette is written in hex.
- **No new exported name**, so the published API surface and every generated
  reference page are byte-for-byte unchanged. Worth saying in the week a
  generated-page cap is six days from firing: this unit spends none of it.
- **Twelve tests changed their example and none changed its claim.** Each used
  `hsl()` or `rgb()` to stand for *a colour that cannot be read*; each now uses
  a named colour, because the unreadable set shrank. The two lists of declined
  forms were widened from four entries to eleven.
- **One assertion outside this lane**, in `(docs)/_lib/scheme.test.ts`, which
  asserted the figure four. The module needed no change — `declinedForms` is
  derived, and its own comment anticipated this exact day. The prose around the
  table on `/docs/building-with-loom/theming` now overstates the silence and is
  filed for `Loom docs`.

## Alternatives considered

**Read the named colours too, generating the table from Chromium rather than
transcribing it.** Tempting, and it is the only option that empties the declined
set. Rejected for this unit on the ground the record is built on: the other
forms are arithmetic over the string in front of you, and a named colour is a
fixed table of 148 entries this module would then own, keep and ship. Generating
it from a browser removes the transcription risk but not the ownership, and
"arithmetic, not vocabulary" is a line that can be stated in one sentence and
held — where "arithmetic, plus the 148 words we happen to have" is not. Filed as
an open question with the byte cost to be measured, not refused.

**Composite a translucent colour against the slot behind it.** This is the only
way to measure `rgba(…, 0.5)`, and it is wrong for the reason 0076 gives: the
pair's contrast would become a property of a third colour the pairing table does
not name, and `auditPalette` would report a ratio that changes when a primitive
is restacked. Declining is the honest answer and stays.

**Round channels to eight bits, to match what a browser stores.** Rejected. It
would make `channelsOf` agree with `getComputedStyle` exactly, which is a
property nothing needs, at the cost of precision in `labOf` — where
`separation.ts` measures differences near a just-noticeable threshold of 2.3.

**Enforce the readable forms in `paletteSchema`, so an unmeasurable palette
cannot register.** Rejected for exactly the reasons 0076 rejected it, which have
not changed: it is a behaviour change to a shipped seam that would reject
palettes legal today, and it decides a question 0074 and 0076 both deliberately
left to the maintainer.
