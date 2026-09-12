# The debts this library owed

**Routine:** `Loom primitives` · **Date:** 2026-09-12 · **Branch:**
`primitives-27-the-debts-this-library-owed` · **Section:** §4d

## What this run built, and why this rather than anything else

**No new primitives. Three changes to three existing ones, and a fourth finding
closed by measurement rather than by code.** The library is **91**, unchanged.

That needs the argument up front, because the brief this routine runs on is a
breadth mandate and this run added no breadth.

On 12 September there were **four open findings against `src/primitives/`**.
Every one was filed by another lane. Every one was measured against the running
front door. **Not one of them was a missing primitive**, and one of them —
`loom.embed`'s sandbox — was blocking §4d, which is the plan item that says the
marketing site *embeds the demo rather than describing it*, and which is the
entire reason the demo is public at all
([0056](../decisions/0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md)).

The maintainer's sentence for this library is *"when we demo this it really needs
to pop"*. Weighed against that sentence, a band that renders perfectly, is
allowlisted, and **silently does nothing when a visitor presses the large green
button** is a worse demo defect than a ninety-second primitive is a demo asset.
The marketing lane agreed at the time and withdrew the band rather than shipping
it. It has been pointing at a link ever since.

So this run paid the debts. The breadth question is not dropped — there is a
section at the end naming where the range actually stops, which is not where the
port ledger says it does.

## The four

### `loom.code` — printed data is not code *(3 September)*

`overflow-x: auto` is the right answer for a shell command and the wrong one for
a printed tree. A pretty-printed JSON string value is **one line however long
the string is**: there is no line structure below the printer's to protect, so
nothing is lost by wrapping it and quite a lot is lost by hiding it. The lane
that filed it worked around it by rewriting the box it prints to a sentence short
enough to fit — *"a real cost — the specimen is now chosen partly for its
length"*.

`wrap`, off by default. Measured on this run's own specimen, which prints a
longer line than the front door's:

| | panel | content | behind the gesture |
| --- | --- | --- | --- |
| `wrap: false` at 390 | 348 | 1,384 | **1,036px** |
| `wrap: true` at 390 | 348 | 348 | **0** |
| `wrap: false` at 1280 | 603 | 1,384 | **781px** |
| `wrap: true` at 1280 | 603 | 603 | **0** |

Two things the file now says that it did not:

- **`pre-wrap` preserves the content's own breaks.** The old comment read
  *"`pre-wrap` would silently rewrap a command; the content's own breaks are the
  content"*, and the first half of that is not true — `pre-wrap` keeps every
  newline and every run of spaces exactly as `pre` does. What the default is
  really protecting is a *shell command* from reading as two commands, which is
  a claim about the content rather than about the whitespace. Stating it
  correctly is what made it obvious this is a prop and not a debate.
- **`overflow-wrap: anywhere` is the half that works on a phone.** `pre-wrap`
  alone breaks at spaces, and the lines this is for — a URL, a base64 value, a
  90-character JSON string — have none. `anywhere` rather than `break-word`
  because only `anywhere` is counted in the element's min-content width, which is
  what stops the *panel* being stretched by the line it is holding.

`overflow-x: auto` survives the wrap rather than being switched off with it: a
wrapped listing has nothing to scroll, and what the declaration is still doing is
containing an unbreakable token to this panel rather than letting it out onto the
page, which is the 20 August finding the file already carries.

### `loom.embed` — the sandbox, and the demo that could not be pressed *(4 September)*

```
Blocked form submission to '' because the form's frame is sandboxed
and the 'allow-forms' permission is not set.
```

Every control in `/demo` is a server action reached through a
`<form action={…}>`. The sandbox was a module constant with no `allow-forms` and
no prop that changed it.

**A frame the deployment's own registry resolved as `self` is now granted
`allow-forms`.** [0135](../decisions/0135-a-same-origin-frame-is-granted-what-its-own-document-needs.md)
is the record, and the argument in it is one the primitive's own doc comment has
carried since 26 August without acting on:

> `allow-scripts` with `allow-same-origin` is a boundary only because the framed
> document is cross-origin, and a host framing its own origin gets nothing from
> it.

For a same-origin frame the sandbox is **already not a boundary**.
`allow-same-origin` hands the framed document its real origin, and from there it
reaches `parent.document`, the deployment's cookies and its storage. A document
holding all of that can issue the identical request with `fetch`, and always
could — `allow-forms` gates the `<form>` element, not the network. So withholding
it buys no security whatsoever; it buys a button that does nothing. **This is
better read as the removal of an inconsistency in the sandbox than as a grant
added to it.**

Three things bound it, and the first is the one that matters:

- **Nothing in the tree can ask for it.** There is no prop, deliberately. The
  only route is the deployment's registry declaring the origin `self` (0095) — a
  host decision in code a maintainer wrote, never a value a model puts in a
  proposal. An explicit prop was considered and rejected: a prop a model can set
  would have to be gated on `sameOrigin` anyway to be safe, at which point it
  does nothing the flag does not, except give a proposal a lever.
- **A deployment that registered no origin of its own is untouched, byte for
  byte.** There is a test that renders the *same node, same props, same URL*
  against a registry that does not call the origin its own, and asserts today's
  sandbox exactly.
- **`allow-top-navigation` stays withheld from every frame**, this one included,
  along with `allow-popups`, `allow-downloads` and `allow-modals`. The assertion
  runs over *every* rendered frame rather than the one in the fixture, so
  widening the constant instead of the case fails a test.

### `loom.embed` — a shape that is not the same at every width *(4 September)*

The filed measurement, framing `/demo` in a 1080px band: `wide` is **12px short**
of the one control the band's heading promised at 1440, and `square` at 390 shows
the demo's bar and two paragraphs and no control. *"There is no shape that is
right at both ends, because the framed document reflows and a fixed ratio
cannot."*

`aspect: "adaptive"` — 3/4 while the frame is narrow, 16/10 once it is not.
Measured this run:

| | width | height | ratio |
| --- | --- | --- | --- |
| `adaptive`, full width at 1280 | 1016 | **635** | 16/10 |
| `wide`, full width at 1280 | 1016 | 572 | 16/9 |
| `adaptive`, **half a split at 1280** | 492 | **656** | 3/4 |
| `adaptive` at 390 | 286 | **381** | 3/4 |
| `wide` at 390 | 286 | 161 | 16/9 |

Two departures from what the finding asked for, both deliberate:

- **The member is local to `loom.embed`, not a fourth `ASPECT_NAMES`.** That
  list is shared with `loom.media` and `loom.overlay`, and a photograph has an
  intrinsic shape that is correct to honour at every width. A fourth member there
  would be a shape offered to two primitives with no use for it.
- **The threshold is read off the frame's own width, not the viewport's** — which
  is why the third row of that table exists. A window query would have given that
  column the laptop shape, because the window *is* a laptop. The frame is what is
  narrow, so the frame is what is asked. Both shots show it: the same prop is two
  different shapes in one photograph.

The mechanism is a class and a container query rather than an inline ratio,
because **an inline style beats a rule** — an `adaptive` frame that also wrote a
ratio inline would render as whatever that inline value said and the query would
be dead, visible in no screenshot, because one of the two shapes is always right.
There is a test for exactly that. The unqueried rule is the **narrow** one, which
is the shape #229 established for this library's container queries.

### `loom.milestone` — already fixed, and nobody had said so *(5 September)*

**No code was written for this one.** #229 landed the `:has()` rule and the 26rem
container query on 11 September — six days after the finding, in *this lane's own
previous run* — and closed it without knowing it was closing it, because that run
was working from `docs/hermes-port-map.md` rather than from `FINDINGS.md`.

Verified rather than assumed, at a true 390:

| | grid columns | body column | marker |
| --- | --- | --- | --- |
| as filed, 1 Sep | `5.5rem auto 1fr` | **101px of 390** | beside the title |
| measured, 12 Sep | `12px 326px` | **326px of 390** | above the title |

The 88px column is gone below 26rem and present above it — `88px 12px 481px` at
1280. The rail is in the specimen at both widths so the closure is a picture as
well as a number.

## Which fields became nodes, and which stayed props

No Hermes block is ported here, so 0052's question is asked of three props rather
than of a record. All three are the same answer, and it is the granularity doc's
sharper question — *does changing this prop change the set of nodes?* — answered
no three times:

| | Node | Prop | Why |
| --- | --- | --- | --- |
| whether a long line wraps | | `wrap` | Two renderings of one content model. The whitespace is unchanged in both; what changes is whether a line with nowhere left to go also breaks. Nothing is added, dropped or reordered — there is a test asserting the node set is identical either way. |
| the shape a frame is held to | | `aspect` | A closed set of four renderings of one region. Same test, same result. `adaptive` is not a *number* a tree tunes — it is a named shape, and the two ratios behind it are the primitive's. |
| whether a frame may submit a form | | **neither** | The interesting one. It is not a prop *and* not a node: it is read off the deployment's frame registry, so the tree cannot express it at all. That is the point — see 0135. |

That third row is worth a sentence on its own. Everything this library has argued
about granularity has been about where a decision lives *in the tree*. This is
the first time the answer has been **outside it** — a rendering decision that is
the host's, arrives through a seam, and has no representation a proposal can
reach. `loom.form`'s destination is the nearest precedent and it is not quite the
same, because that one is about where a thing goes rather than what it may do.

## The specimen, and what it deliberately cannot show

`reports/2026-09-12-primitives-the-debts-this-library-owed-{editorial,bold}-{wide,phone}.png`
— both palettes at 1280 and a true 390, `reducedMotion: "reduce"`, `scrollWidth
=== innerWidth` at both widths on all four.

Every band puts the defect and its absence **in the same photograph** — the
wrapped panel above the unwrapped one, the adaptive frame above the fixed one. A
shot of the fixed state alone proves nothing, because it looks like every other
shot.

Two things it does not show, and both are stated rather than worked around:

- **The sandbox is an attribute, not a pixel.** It is asserted in
  `library.test.ts`, where it can be read.
- **Every `loom.embed` in the specimen renders its refusal notice**, because the
  specimen harness wires no frame registry. That is not a gap: **the refusal box
  keeps the frame's ratio**, which is precisely what these tiles are photographed
  for. Wiring a registry into the harness would mean editing `tools/`, which is
  not this lane's, for a picture that would show the same three rectangles.

## Test numbers

`pnpm verify` **green**. **Thirteen tests added** to
`src/primitives/library.test.ts` (272 → 285); suite 2,052 → 2,065. **Nothing was
weakened**, and no test was changed to accommodate a change — the three existing
assertions that name the old sandbox string and the old `white-space` still pass
as written, because both defaults are untouched.

Each of the four behaviours was **mutation-tested** before this was written:
revoking the same-origin grant, giving `adaptive` an inline ratio, making `wrap`
a no-op, and declaring containment unconditionally. Each mutation failed
**exactly one** test and no others, which is the property worth having — a test
that fires for four different reasons does not tell you which.

The three worth naming:

- **The grant follows the registry and nothing else** — the same node, same
  props, same URL, against an allowlist that does not say `self`, gets today's
  sandbox exactly.
- **No frame may move the page it sits on** — asserted over every rendered frame
  rather than the one in the fixture, so widening the constant fails.
- **A shape changes no node** — the node set of an `adaptive` frame and a `wide`
  one, in edit mode, must be equal.

## Records

**One: [0135](../decisions/0135-a-same-origin-frame-is-granted-what-its-own-document-needs.md),
`Accepted`.** It changes no schema, no tree and no delta model, and reverses
nothing another record decided — it is 0095's `self` flag being acted on for the
first time, which that record's own definition of the flag asks for. It is
nevertheless a security surface, so it carries a *What would reverse this*
section naming the one thing that would: a deployment marking an origin `self`
that is not actually its own. **It is the one thing in this branch worth a second
pair of eyes**, and it is flagged as such on the pull request rather than only
here.

## The two lines outside `src/primitives/`

**One is `reference.generated.json`**, regenerated by
`pnpm --filter @loom/app docs:api`. Its whole diff is `LIBRARY_CLASS`'s signature
gaining `frameAdaptive`.

**The other is one line of `tsconfig.build.json`, and it is a finding as much as
a fix.** `tools/specimen/README.md` tells a lane to put a specimen *beside the
code it photographs*. For every lane whose code is under `src/` that was
impossible: a specimen imports `defineSpecimen` from `tools/`, which is outside
`rootDir`, so `tsc -p` refuses to emit and **`pnpm build` fails for following the
instruction the harness gives**. The four route-group lanes never hit it because
`apps/` is a different project; this is the first specimen committed under
`src/`, nine days after the harness landed.

`src/**/*.specimen.ts` now joins `src/**/*.test.ts` in `exclude`, which is the
same call rather than a new one — a specimen is no more part of the published
runtime than a test is — and it is still typechecked by `tsconfig.json`, which
sets no `rootDir`. Filed in full, including the general form, which is that two
places now have to agree about what is not published.

**A second, smaller thing, recorded because it nearly shipped a false claim.**
`pnpm verify 2>&1 | tail -35` **reports exit 0 on a failed verify** — the exit
code is the pipe's, and the `ELIFECYCLE` lines are easy to read past. This run's
first verify failed exactly that way and was one step from being written up as
green. Redirect and check `$?`; never pipe a gate into `tail`. It belongs in
`docs/routines.md` beside the token discipline rather than in any lane's code.

## The check that failed for something this branch did not write

The docs lane asserts that **no decision-record number reaches a reader** —
`(0007)` is a footnote to a document a visitor has never seen and cannot open.
It is a good rule. It failed on `LIBRARY_CLASS's signature`, for a citation
written weeks ago in a member this branch does not touch.

`LIBRARY_CLASS` is an object literal with a doc comment on nearly every member,
so its inferred type runs to 4,700-odd characters and **TypeScript truncates
it**. What the extractor publishes ends in `…`, and what falls inside that window
moves with every comment before it:

| | length | truncates at | numbers visible |
| --- | --- | --- | --- |
| `main` | 4,773 | `loom.list`'s markers | **0** |
| this branch, before the fix | 4,780 | the comparison table's steer column | **1** — `0084` |

**There were seven decision numbers in that object the whole time**, and the check
could see one. A sixteen-word comment for a new class moved the boundary far
enough to expose one of them.

The failure was real — a reader would have seen `(0084)`. What is not real is the
coverage: as written the check is a spot check wearing an invariant's clothes,
and *which* of the seven fires is decided by where a type happens to be cut.

So the fix here is the whole object rather than the one that fired. **All seven
now name the rule instead of the number** — *a container is its child's name plus
the arrangement* rather than `0054`, *a render is a total pure projection of one
node* rather than `(0008)`. That is better prose for the reader the rule exists
to protect, who cannot open the record either way, and it means the next lane to
add a class here does not trip a mine somebody else laid. The check itself is
filed for the docs lane, with the one-line version of the fix: ask TypeScript not
to truncate for the purposes of the check, even if the published signature stays
short.

**The trap is not confined to `LIBRARY_CLASS`.** Any exported object literal with
per-member doc comments has the same shape, and there are several in
`src/primitives/` alone.

## What the library still cannot express

Unchanged from 11 September, and still not this lane's: a dark scrim under a
light palette; a paint that bleeds wider than its own box; a backdrop that knows
how much chroma its palette has; a tab strip (wants a `select` member in the
behaviour vocabulary) and a feed (wants the binding seam and a live source).

Two added by this run:

- **A frame cannot be told how tall the document inside it wants to be.**
  `adaptive` is two good guesses, not a measurement, and it cannot be anything
  else — the framed document is cross-origin by default and nothing in a render
  reads a viewport
  ([0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md)). The
  honest limit is that **the marketing lane must re-measure `adaptive` against
  the real `/demo`** before trusting the 16/10, because the number that motivated
  it was taken against `wide` and a 12px shortfall. 16/10 clears that shortfall by
  56px at the measured width; whether it clears the *content* is a measurement
  only that lane can take.
- **`self` is now load-bearing and no registry validates it.** Anyone may declare
  any origin their own. That is fine while a registry is written by a maintainer
  and is stated in 0135 rather than guarded, because the guard — comparing
  against an origin the deployment states once — is `src/frame/`'s and not this
  lane's.

## Where the range actually stops, for the run that reads this next

Three consecutive runs read `docs/hermes-port-map.md`'s empty tables as *the
range is finished* and went hunting for a ninetieth content model. The
11 September run found two real primitives by asking what a **page** could not
do. This run found four real defects by reading what other lanes had already
**measured**. Neither instrument is the ledger.

Having now read all 91 descriptions against what a marketing page needs, the
content bands genuinely are complete — hero, logos, features, bento, testimonials,
pricing, FAQ, CTA, footer, nav, stats, timeline, team, blog, comparison,
integrations, how-it-works, product tour, before/after, video, newsletter. What
is **not** complete, and what a run looking for breadth should take next:

- **Nothing in this library makes one thing on a page catch the eye.**
  `loom.heading` is flat `fg-default` at every level and `loom.emphasis` offers
  bold, italic and highlight. There is no accent-washed display type anywhere —
  arguably the single most characteristic device of the tier the brief points at,
  and entirely expressible in tokens as a wash between `accent` and `secondary`.
  The interesting design question is whether it belongs on `loom.heading` (the
  whole headline) or on `loom.emphasis` (one word of it), and the second is both
  harder and much better, because a washed *word* is addressable.
- **Nothing draws attention to one card among several** — no glow, no lit border,
  no ring on the featured tier. By 0130 that is a wrapper and its argument would
  be the one 0130 already makes, which is why it is a candidate rather than a
  guess.

Both are pop rather than breadth, and both are reachable without a framework
change. Neither is started here, because four measured findings on the surface
the maintainer judges by eye outranked them.
