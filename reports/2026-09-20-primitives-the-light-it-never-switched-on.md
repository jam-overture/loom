# The light it never switched on — three treatments the library built and the phrasebook never wore

**Routine:** `Loom primitives` · **Date:** 2026-09-20 · **Branch:**
`primitives-40-the-light-it-never-switched-on` · **Section:** §4b

![The two bands that wear a treatment, at 1280px, under bold](2026-09-20-primitives-the-light-it-never-switched-on-bold-wide.png)

## What this run chose, and why that

The 19 September run ended with a ranked list of what was left, and this is the
item it put at the top in its own words:

> `halo` / `backdrop` / `reveal` — the treatments that make a page **pop**, which
> is the maintainer's own word. Zero bands use any of them. **This is the most
> demo-relevant thing left** and it is not a band, it is a pass over the bands
> that exist — which is a different kind of run and wants its own.

This is that run. The measurement it starts from, taken on `main` this morning:

| | |
| --- | --- |
| treatment primitives registered | **3** — `loom.reveal` (6 Sep), `loom.backdrop` (11 Sep), `loom.halo` (13 Sep) |
| catalogue bands | 34 |
| **bands using any treatment** | **0** |

Three primitives, two of them carrying a decision record apiece, none of them
reachable by dropping in a band. A page assembled from `PAGE_SEQUENCE` was one
lit hero followed by twenty flat bands — which is, word for word, the failure
`loom.backdrop` was written to fix and says so in its own header. `loom.halo` is
sharper still: the gap its opening paragraph names is *a pricing band draws
three tiers that are typographically identical*, and a week after it shipped the
pricing band still marked its featured plan with nothing but the word.

**Nothing was blocked and nobody missed anything.** A primitive entering the
library and a band picking it up are two pieces of work, and only the first had
an owner. That is the same shape as the maintainer's 12 September finding — *a
fix is not finished when the schema accepts it* — arriving at the treatments
instead of at anchors, and it is the part of this run worth generalising: **the
next treatment will land with nothing using it too, unless somebody writes the
second half.**

## The rule had to come first, and it is most of the work

The obvious version of this run is *put a glow on the bands that look plain*,
and it fails within two runs: a treatment applied by taste is a treatment on
every band, and a page where everything is emphasised has no emphasis.

[0174](../decisions/0174-a-band-wears-the-treatment-its-own-content-earns.md) is
the rule, in two clauses:

> **A band may build a treatment its own content has already earned. It may not
> build one that its position on the page would have to earn. And a treatment
> may not cost the band its ground.**

Each treatment draws a distinction, and the band may wear it only if the band
already makes that distinction some other way:

| treatment | the distinction it draws | what a band must already have |
| --- | --- | --- |
| `loom.halo` | **this one, not those** | a named exception among peers |
| `loom.reveal`, per child | **these are peers, and here they come** | interchangeable children with no inherent order |
| `loom.backdrop` | **stop here** | content that is the page's object of attention, and space between its objects for atmosphere to be seen in |

**The refusals are what make it a rule rather than a list.** `bento` has a lead
cell and a heading saying *one of these is the reason*, which reads as a named
exception until you notice the exception is already drawn in the strongest way a
layout can draw one. `cta` is the page's closing moment and a reader is
certainly meant to stop at it — but *closing* is where it sits, not what it
holds, and the same band a third of the way down a page is not a close.

## What shipped

**Two bands, three nodes, and one line on a primitive.**

| band | treatment | why this band |
| --- | --- | --- |
| **`pricing`** | `loom.halo` — `ring`, `corners: "lg"`, round the Team tier | the exception is named in the band's own copy. This is the gap `loom.halo` names by name in its opening paragraph, and `loom.tier-table` had already reserved the room for the ring in a comment |
| **`pricing`** | `loom.backdrop` — `aurora`, holding the whole band | its content is a **decision** rather than a summary, and its three opaque cards have wide gutters for the atmosphere to be read in |
| **`features`** | `loom.reveal` — `rise`, round **each** of six tiles | peers with no inherent order is a sequence to arrive in. A reveal round the *grid* would be one thing fading in, which is not a cascade |

Two treatments on one band is not an exception to 0174; it is what the rule says
when a band earns both, and it is the clearest available demonstration that the
wrappers compose — which is the property 0110 and 0130 chose a wrapper *for*.

**The cascade is the one I would defend hardest, and it needed no new feature.**
`loom.reveal`'s own header had filed the stagger as a gap — *the cascade inside a
band is not here* — and named the workaround: a reveal around each cell, so each
has a view timeline of its own. That is not a workaround, it is the better
mechanism, and the file now says so. A declared stagger is a list of delays that
goes wrong the moment the reader's window is a different shape. A per-cell
timeline is the reader's own scroll position answering the question: at 1280 the
tiles arrive by row, at 390 they arrive one at a time, from the same markup, with
nothing measuring a viewport (0008).

## What the photographs changed, which was the whole shape of one third of it

**The backdrop was on the wrong band, and only a camera could say so.**

`metrics` was the first band the rule picked. Its own header says `tone:
"surface"` is there so *the band breaks the page's rhythm*, which read like a
band declaring itself the stop. It is also the shortest composition in the
catalogue — a strip about **170 pixels** tall. All five paints, both palettes,
1280 and 390:

| paint | `editorial` | `bold` |
| --- | --- | --- |
| `grid` | nothing at all | nothing at all |
| `dots` | a dotted texture over the numbers | faint speckle |
| `spotlight` | **a grey smear across the figures** | a warm band of light — the near-miss |
| `aurora` | **a grey blob beside "4 min"** | nothing at all |
| `rays` | **a grey starburst that reads as an artifact** | reads as a rendering fault |

`pnpm verify` was green with the backdrop in place. It renders as well in a
strip as in a band, produces no diagnostic, passes every palette assertion, and
the node was correct by every check in this repository. **The only instrument
that sees it is a photograph**, and it is the fourth run running where the
camera corrected the prose rather than the other way round.

Two things came out of it. The band went back to what it was, and the rule
gained the clause about **area** — which then pointed at `pricing`, whose band
is five hundred pixels tall with three opaque cards and wide gutters, and where
the same `aurora` reads as atmosphere under `bold` and as a soft wash under
`editorial`. The limit itself is [filed](../FINDINGS.md): the ruled paints mask
themselves to nothing at that height and the glow paints concentrate into
exactly the blob `backdrop.ts` warns about, and fixing it is a decision about
the whole paint vocabulary rather than a tweak to one band.

**The stretch defect the cascade brought with it.** `loom.feature-grid` stretches
its cells so a row's cards line up; a wrapper between the grid and the cell is
the grid item now, and unless it passes the stretch on, every tile with shorter
text ends above the box it is in. `loom.halo` had worked this out and written a
paragraph about it; `loom.reveal` had not, because **until this band no tree in
this repository had ever put a reveal inside an arranger**. One line —
`display: grid; height: 100%` — and an assertion on the markup. The wrapper
family agrees now, and 0174 says to expect the same of the next treatment's
first real use.

**A stale claim in the stylesheet, found on the way.** `LIBRARY_CLASS`'s header
described *the cascade over its own children* as one of the reveal's classes.
Three are declared and nothing ever emitted a fourth — a cascade over a reveal's
own children would have to reach through the arranger it wraps to find the
cells, which [0155](../decisions/0155-a-container-may-only-add-to-its-children-what-they-left-unspoken.md)
is about. Corrected rather than built.

## Which fields became nodes and which stayed props

Nothing was ported from Hermes: the treatments are not a Hermes content model
and `docs/hermes-port-map.md` cannot see them, which is the 19 September finding
about the provenance of the queue, still holding. The 0052 questions are about
this catalogue's own structure.

| | became nodes | stayed props |
| --- | --- | --- |
| **the light** | **all of it.** A halo is a node wrapping the tier, not `featured: true` on `loom.tier` — so moving the emphasis to Enterprise is a `move`, and the light and the ribbon travel separately because they are two nodes. The pricing band is forty-four nodes now, where it was forty-two | `light: "ring"`, `corners: "lg"` — three renderings of one idea and a corner radius. Neither changes the set of nodes |
| **the atmosphere** | the backdrop itself, so a page that wants the band plain does one `remove` rather than hunting for the prop that turns it off | `paint: "aurora"` — five renderings, none of which changes a node. There is deliberately no opacity, which is the "tune it a bit" number 0130 refuses |
| **the cascade** | **six nodes, one per tile**, and that is the cost. What it buys is that a tile which should not move is one `remove` — of the reveal, not of the tile. A `stagger` prop on the grid would have been cheaper and unreachable | `motion: "rise"`. No duration, no delay, no order (0055) |

**The near-miss, and it is the second clause.** *Wrap the section in a backdrop*
is one line and reads as the obvious way to light any band. Behind an opaque
`tone` it draws **nothing at all**, and the fix that suggests itself is to drop
the tone — trading a ground every palette can draw for a paint only some of them
can. `pricing` may be wrapped because its section takes no tone and so has no
ground to lose; `metrics` and `cta` may not. That distinction is one line of
markup either way, both versions render clean, and the broken one is invisible
under whichever palette you happened to open — so it is a test rather than a
sentence.

## What is now checked, and where

Four assertions in `compositions.test.ts`, each earned by something here.

- **No treatment sits outside a ground the band paints for itself.** 0174's
  second clause, in the form a test can hold. It is the assertion that keeps
  `metrics` and `cta` safe from the next run's good idea.
- **The pricing band lights the plan that carries the ribbon.** A claim about
  *this band*, deliberately not a rule about trees — `loom.halo` is emphatic
  that the light and the label are independent on purpose. What a starting
  composition may not do is arrive already disagreeing with itself, and nothing
  else would notice if it did: both trees are valid, both render clean, and the
  defect is a sentence about one plan pointing at the plan beside it.
- **A grid's stretch passes through every treatment the catalogue puts in a
  cell.** Asserted on the markup, because it is a fact about what the browser is
  handed and the failure it catches is a style quietly dropped.
- **Every treatment a band builds is declared in its `uses`.** A treatment is the
  one node a band can gain in a one-line edit to a `children` array, with no new
  import and nothing in the diff that looks like a new primitive — which is
  exactly the edit that leaves `uses` behind, and `CATALOGUE_TYPES` is derived
  from `uses`.

**0174's first clause is deliberately not asserted.** It is a judgment about
copy, and a test that tried would either restate the two bands that pass it
today — a list, not a check — or guess at what counts as a named exception,
which is the rule re-decided by whoever writes the regex. A reviewer is the
thing enforcing that clause, which is what the pictures are for.

## Which way the measurement moved

The 19 September run exported `CATALOGUE_TYPES` so the next one could say which
way reach moved rather than re-deriving it. Taken with its own instrument:

| | 19 Sep | **20 Sep** |
| --- | --- | --- |
| primitives registered | 96 | 96 |
| catalogue bands | 34 | 34 |
| **primitive types some band can reach** | 63 | **66** |
| registered and unreachable by dropping in a band | 33 | **30** |

No new primitive and no new band. Three primitives a deployment was already
paying for on every interpretation request became things a page can actually
have — which is the argument that inventory has been making for a week, and this
is the first run to move the number without adding an entry to anything.

## Checks

- `pnpm install && pnpm verify` **green, exit 0**, read from a file rather than
  through a pipe (`docs/routines.md`). Framework 154 files / **2,811** tests
  (+4, all new); application 280 files / **4,904** tests, unchanged; **703
  findings, 0 malformed**; 107 prerendered pages, 858 text junctions, 0 run
  together. Nothing skipped, **no test weakened**.
- The first run was **red on two counts and both were the repository working**:
  the decisions index needed regenerating, and `tools/decisions` caught 0174
  citing `0130` by a filename that does not exist — the third time in four runs
  a citation has been caught by a test rather than by me.
- **One existing assertion changed, and it is the reason it exists.** The
  pricing band's node count is asserted against the figure its doc comment
  claims; 42 → 44, with both updated and the two nodes named. That test caught
  the drift on the first run, which is exactly its job.
- Every band renders under both starter palettes with **no diagnostics**.
- Overflow measured by the harness: 1280 / 1280 wide, 390 / 390 phone, both
  palettes, no horizontal overflow anywhere.
- No literal colour anywhere in the diff; every value is a token or a length,
  and `reads every colour from the palette and names none of its own` passes
  over the whole catalogue.
- The reverted experiment was reverted with `git checkout HEAD -- <file>` and
  `git status` clean after it; the scratch specimen used to shoot the five
  paints was deleted.

## Outside the lane

One generated file, not edited by hand (0139): `decisions/README.md`,
regenerated with `pnpm decisions:index`. The API reference needed **no**
regeneration — `CATALOGUE_TYPES` changed in value and not in type, and nothing
new is exported.

Everything else is `src/primitives/`, `decisions/0174`, `FINDINGS.md` and this
report. Nothing under `apps/`, and nothing in `src/` outside `src/primitives/`.

**On the commit author.** `docs/routines.md` still gives two opposite
instructions and it is not this lane's to resolve — filed by `Loom portal` on 16
September and reported by three runs since. This run followed the later section,
as they did: no author is set, so the session default `Claude
<noreply@anthropic.com>` applies, which both sections name as a known-good
deploying identity.

## What the library still cannot express

**The page-spanning backdrop**, which is the thing that would really make a
demo pop and is the one `loom.backdrop`'s own header names: *a backdrop can hold
three sections at once so the light runs behind all of them*. No catalogue entry
can express it, because a `Composition` is a pure function to **one**
`ElementNode` and `planComposition` emits **one** `insert`. Filed, with the note
that anything closing it is `ARCHITECTURAL — needs review`: a page-level member
of the catalogue is a second kind of entry with a second insertion rule, which
is what 0120 settled.

**A paint that works in a short band.** Filed, with the three options a next run
has to choose between and the observation that the cheapest — *atmosphere
requires area, and the vocabulary should say so* — may be the right one.

**The five genuinely-missing primitives left** from the 19 September
classification, now that `halo`, `backdrop` and `reveal` are reached: `table` /
`table-row` / `table-cell` (a specification band — a real afternoon, and the
largest single piece left), `divider` (page furniture, and arguably the page
sequence's rather than any band's), and `spec` / `pin` (the second needs an asset
to annotate, so it is really in the *needs an image source* row).

**Unchanged and still not mine:**

- **Tier B** — tabs, tooltip, dialog, dropdown, toast, lightbox, a pricing
  toggle — is nine primitives behind one framework decision about the behaviour
  vocabulary, and is still `Loom daily build`'s to open. **Five runs have now
  reported it.**
- **The specimen harness photographs and cannot assert.** Filed 17 September,
  and this run is the sharpest case of it yet: every shot is taken with reduced
  motion, deliberately, so the cascade this run's third treatment exists for is
  **unphotographable by construction**. The picture shows six tiles at full
  opacity having moved not at all, which is the correct rendering for a reader
  who asked for reduced motion and is evidence of nothing about the effect.
  Three of the four tests above exist partly because of that.
- **`21st.dev` re-verified blocked**, `EGRESS_BLOCKED` from the proxy rather
  than a timeout. **Seventeenth consecutive check from a routine session and it
  has never once been reachable.** The brief names it as the visual standard,
  which means the visual standard for this run was `loom.hero`, `loom.feature-grid`
  and the two screenshots below. No new finding filed; the existing ones cover
  it.

**On the 250 question**, unanswered for five runs now and past its date: this
run's position is the gap inventory's and is unchanged, with one number added.
The vocabulary is at 96 and should stop near 110; the phrasebook is at 34 and is
the row that scales. What this run adds is that **reach is a third axis and the
cheapest of the three** — 63 → 66 with no new primitive, no new band, and no cost
on any interpretation request. Thirty registered primitives are still
unreachable, and closing that gap is worth more to a demo than a ninety-seventh
entry nothing can say.
