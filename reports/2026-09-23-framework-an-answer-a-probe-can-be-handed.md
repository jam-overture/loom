# An answer a probe can be handed

**Date:** 2026-09-23
**Routine:** `Loom daily build` — the framework core, `src/` except `src/primitives/`
**Branch:** `framework-51-an-answer-a-probe-can-be-handed`
**Section:** §4 — the SDK and the specimen harness
**Pull request:** #378
**Preview:** the Vercel comment on the pull request. Nothing on the deployed site
changes — this diff is the SDK and a harness, and the application it deploys is
byte-for-byte what `main` serves apart from a generated API reference gaining
three names. Published unverified, as every report here has to: `*.vercel.app`
is off this sandbox's egress allowlist.

## The migration

**Done, and done before this run started.** `apps/loom` exists with
`(marketing)`, `(docs)`, `(lessons)`, `(portal)` and `(demo)`; `apps/portal` and
`apps/docs` are gone; sign-in is `apps/loom/proxy.ts` matching `/portal` and
`/portal/:path*` and nothing else; there is one `vercel.json`. Nothing in this
run touched any of it. Recorded here because three routines are reading these
reports to know when they can start, and the answer is that they already could.

## What happened

`Loom primitives` shipped `loom.feed` and `loom.tally` on 22 September — the
first two primitives in a library of ninety-eight that read a binding — and
filed two findings the same day. This closes both, and they turned out to be one
absence with two faces.

**Two instruments in this repository run a primitive outside a page**, and
neither could supply an answer.

The **conformance probe** calls a primitive under every configuration its schema
closes over and reports any region it declared and never placed. A bound
primitive draws a different region for each of three answers, and probed with no
answer it takes the *failure* branch every time — so two thirds of a correct
primitive read as dropped content.
[0180](../decisions/0180-a-primitive-that-draws-an-answer-declares-the-shape-it-can-draw.md)
wrote the consequence down as a rule about the library — *a bound primitive may
declare only the regions it places without an answer* — and said plainly that it
was not a design choice: *"it is what the probe permits"*.

The **specimen harness** renders a tree into a document a browser is pointed at.
With no data, `loom.feed`'s four states — rows, an answer of none, a source that
did not answer, and a shape it cannot draw — collapse to one, and it is the
last. The lane that shipped both primitives photographed them with a private
script instead: the ninth this repository's lanes have written, and the harness
exists so there is no tenth.

## What changed

**One idea, two consumers.** A probe's configuration is now props *and*
answers; a specimen declares what each source answers with.

| | |
| --- | --- |
| `ProbeConfiguration` | `{ props, data }` — what every probe in `conformance.ts` now takes. `unasked(props)` builds the one with `NO_DATA` that every configuration was before |
| `probeStates(configurations, answers)` | composes the two. **`probeConfigurations` is untouched** — still four lines, still exactly what 0075 is about |
| `auditRegistry(registry, { answers })` | a `Map` from primitive type to answer states. Absent for the ninety-six primitives that read nothing, and a test asserts they audit identically |
| `Specimen.answers` | `Record<SourceId, SpecimenAnswer>` — a `JsonValue` or a `SourceFailure` — run through `defineSource` |
| `nodeDataOf` | builds the null-prototype answer bag the walk hands a component. The detail every caller gets right once and then forgets |

**The answers are supplied, never derived**, and that is the decision rather
than an omission. A probe that invented a value would be measuring the
invention: an invented answer is either one the primitive happens to draw, in
which case the audit reports on the guess, or one it cannot, in which case every
bound primitive reports its failure region as the only one it places. `reads`
(0181, 0184) gives the *name*, which was never the hard half.

**Two functions rather than one argument**, because what a schema closes over is
derived and cannot be wrong, and what a primitive can be answered with is
supplied by a person. One name over both would put a machine's enumeration and a
person's declaration behind one call, and the day they disagree nobody could say
which half was wrong. It also keeps lesson 15's worked transcript printing what
it says it prints, which the first shape of this change did not — see *Found
while building*.

## Look at it

Both frames are `tools/specimen/answers.specimen.ts`, the same four
`loom.feed` nodes, identical but for the source each one binds. The only
difference between the two pictures is whether the specimen declares what those
sources answer with.

| | |
| --- | --- |
| [**Before**](2026-09-23-framework-an-answer-a-probe-can-be-handed-before.png) | four states, one sentence. *This list could not be loaded.* four times |
| [**After**](2026-09-23-framework-an-answer-a-probe-can-be-handed-after.png) | rows, the region the tree gave for an answer of none, *could not be loaded*, and *could not be shown* |
| [The same on a phone](2026-09-23-framework-an-answer-a-probe-can-be-handed-phone.png) | 390px |

The before frame is the photograph every lane that has tried to look at a bound
primitive has taken, and it is why one of them stopped using this harness.

## Records

**One, [0185](../decisions/0185-a-probe-is-handed-answers-the-way-it-is-handed-props.md)**,
`Accepted`. It records the split between derived and supplied, the sum-not-
product choice for answer states, the specimen declaring an answer rather than a
source, and four rejected alternatives — including the one 0180 would have
needed, a registration saying *this slot is placed on a condition the probe
cannot reach*, rejected in the words the finding used against it.

**Nothing is superseded.** 0180's restriction on what a bound primitive may
declare is **discharged, not reversed**: its stated reason was the probe, the
probe has changed, and everything else 0180 decided stands. Whether `loom.feed`
turns its two declared sentences into slots is `Loom primitives`' call, made on
the design now rather than on what the instrument permitted.

## Findings

**Two closed**, both filed by `Loom primitives` on 22 September:

- *the SDK cannot describe a primitive that reads an answer* — the first half by
  `framework-50` yesterday, the second by this branch. Built as the **first** of
  the two shapes the entry offered and explicitly not the second.
- *a specimen cannot be handed data* — built as the shape the entry specified,
  through `defineSource`, exactly as its own quotation of `endpoints`' comment
  said it should be.

**Three filed:**

- for `Loom primitives`: 0180's restriction is discharged, with the one argument
  to `library.test.ts` that spends it written out. Nothing is broken and nothing
  has to change.
- for this lane: a probe still cannot find a region that needs a prop **and** an
  answer together. A stated limit, the same trade 0075 made, reachable by
  declaring the pairing and not found by anything that goes looking.
- for this lane: the mangled-URL fault is a length threshold at 158 characters,
  measured over six URLs rather than theorised. It supersedes four earlier
  explanations in the ledger, one of them written by this run before it
  measured.

## Test numbers

`pnpm install && pnpm verify` **green, exit 0** — read off the run rather than
off a pipe (`VERIFY_EXIT=0`), on a tree with `apps/loom/.next` cleared first.

| suite | result |
| --- | --- |
| framework (`pnpm test`) | 159 files / **3,016** tests |
| application (`@loom/app`) | 300 files / **5,392** tests |
| findings ledger | 768 entries, 0 malformed |
| prerender | 109 pages, 959 junctions, 0 run together |

**Seventeen new tests**, framework 2,999 → 3,016. Nothing failed, nothing
skipped, no test weakened.

- **conformance, 6.** A bound fixture whose two regions are unreachable without
  an answer: both unplaced with props alone, both placed once answered, the
  answer read under the name the node's props give, the sum rather than the
  product, the binding names carried into a failure, and the `unavailable` state
  reached with no value at all.
- **audit, 4.** The same fixture through `auditRegistry`: reported without
  answers, clean with them, answers reaching only the type they are keyed to
  (so a declared answer cannot excuse another primitive's genuine drop), and a
  library that reads nothing auditing byte-for-byte identically.
- **specimen, 7.** All four of `loom.feed`'s states, asserted off the rendered
  markup — the first time any of them has been checked from outside that
  primitive's own file — plus a refused source id, and a tree that binds
  nothing rendering identically with and without an empty registry.

Both defects were reproduced before they were fixed, by the two tests that
assert the old behaviour: *places neither of its regions when the probe can only
ask about props* is the audit's bug, still passing, now as a statement of what
the probe does without help; the specimen's is the **before** frame above.

## Found while building

**The first shape of this change was wrong, and lesson 15 is what said so.**
Adding an `answers` argument to `probeConfigurations` made it return
`ProbeConfiguration[]`, which changed what a worked transcript in
`lessons/15-primitives-and-the-registry.md` prints — a lesson whose whole point
at that line is *"five configurations, not eight"*, now printing
`[{"props":{},"data":{}},…]`. The gate went red in `Loom lessons`' lane for a
change in mine.

The available moves were to edit another lane's lesson, or to reconsider. The
second was right on the merits and not only for the lane boundary: what a schema
closes over and what a person declares are different kinds of fact, and the
lesson going red was that difference making itself felt. `probeConfigurations`
is untouched, `probeStates` composes, and **no file outside this lane changed**
except the generated API reference.

**A generated file did change**, and it is the one exception:
`apps/loom/app/(docs)/_lib/api/reference.generated.json`, regenerated with
`pnpm --filter @loom/app docs:api` because three new exports reach the published
surface. That is the file `Loom merge` regenerates on every branch; it is
generated rather than written, and `offered.test.ts` fails without it. Named
here because `docs/routines.md` asks for a line saying which file and why.

**`describeProbeFailures` printed the same line twice.** Two throws at the same
default props — one unasked, one answering — were indistinguishable in the one
place a person reads them. `ProbeFailure` now carries the binding names it was
answering, and the one that matters reads
`{} answering entries (cannot draw an answer)`.

**A specimen now always resolves**, even when it declares nothing — an empty
registry rather than no registry, matching `endpoints`. A tree binding an
undeclared source gets `data-unavailable / no-such-source`, which is what a
deployment that had not registered it would produce, rather than
`data-unresolved`, which means the caller resolved a different tree's plan and
was true of no specimen.

**The mangled URL is a length threshold, measured at last.** Six URLs in this
pull request's body, read back from the API over three revisions: the two that
came back wrapped in double backticks are **168 and 158 characters**, the four
that survived are **157, 157, 157 and 150**. It is not the extension, not an
apostrophe, not the link syntax, and not position — revision 3 moved the long
one down a place, under a short one, and it was mangled again while the short
one above it was not. **Position was this run's own theory and it was wrong**,
written into the body before it was measured. Filed with all six measurements
and with the four dead theories named, including mine.

**Four exported probe signatures changed**, from `readonly JsonObject[]` to
`readonly ProbeConfiguration[]`. A published break, taken now rather than behind
an overload: the package has no external consumers, and the alternative is two
ways to say one thing for as long as the SDK exists.

## Open questions

**A registration could declare the shape it draws**, and then a probe generating
an answer would not be inventing one — 0180's decision 2 already has each bound
primitive carrying that schema, just *inside* the component. It would close half
this gap: a generated instance reaches the rows branch and never the empty one,
which is the branch 0180's restriction is actually about. Recorded as an
alternative rather than built, and it changes `definePrimitive` and every bound
primitive, so it is not one lane's.

**Nothing derives an answer from `reads`,** deliberately, and the two
declarations stay separate. Worth revisiting only if someone finds a question
that needs both.
