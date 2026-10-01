# Reader signals — `completed`, the kind that closes a funnel

**Routine:** `Loom signals` · **Date:** 1 October 2026 · **Branch:**
`signals-01-completed`

## What I completed

**Step 2 of `docs/signals.md` is on a branch: the reader-signal vocabulary is
five kinds.** `completed` fires when a form inside an addressed node is
submitted and nothing on the page cancelled it. It was approved on 13 September
and had not landed; `Loom docs` removed the thing blocking it on 16 September
and wrote down what the runtime change needed. This is that change, carried
through the whole pipeline rather than stopped at the schema.

| | |
| --- | --- |
| Vocabulary | `viewed`, `dwelled`, `activated`, `disclosed`, **`completed`** |
| Carries | node id, primitive type, an instant — and `within`, the bands it was the end of |
| Durable counter | `ReaderTally.completions`, an occurrence, defaulted to `0` on existing rows |
| Live counter | `ReaderReadings.completions`, and a column on `NodeReading` |
| Conversion rate | a `FunnelPair` ending in `completed` — **no new shape was needed** |
| Browser cost | **+281 bytes minified, +88 gzipped** |
| Record | [0209](../decisions/0209-a-completion-is-a-form-the-browser-let-go.md) |

The thing worth noticing is the last row of that table but one. A funnel end
already names a kind, so the day `completed` exists, *of the 40 views that
reached the pricing band, 9 submitted the form* is answerable with the funnel
machinery that has been there since 0146. Nothing was built for it. That is the
same asymmetry the lane is pointed at — the capability was already in the shape,
waiting for a word.

## Decisions I took that the step did not specify

Three, and they are in 0209 with the alternatives. In short:

**1. A completion is a `submit` the page did not cancel.** A browser fires
`submit` only once constraint validation has passed, so the event is the
evidence that the reader filled the form acceptably; the broadcaster adds that
no listener called `preventDefault`, which is as far as its knowledge reaches.
The cost is real and I want to be plain about it: **a form posted with `fetch`
reports nothing**, and that is most forms in a client-rendered app. I took it
anyway because the alternative is counting rejected input as conversion, and a
counter that means the wrong thing is permanent (0158). Loom's own `loom.form`
renders a native `<form action method>` with no handler, so the starter library
reports normally. Filed as an open question — see below.

**2. `preventDefault` is read in a microtask after the dispatch.** Whether the
broadcaster's listener runs before or after the page's own is registration
order, and React attaches its handlers at a root container that may be the very
element a broadcast was pointed at. Reading `defaultPrevented` during dispatch
would make the counter depend on who registered first. There is a test that
fails if the microtask is removed.

**3. It carries `within`, so it is a third `DELEGATED_READER_SIGNAL_KIND`.**
0167 refused ancestry to `viewed` and `dwelled` on volume grounds and gave it to
the two kinds whose node is not the thing a reader aimed at. `completed` is on
that side and further over: `loom.form` is addressed, so the signal names the
form and the band is lost — and *which band converted* is the question that
justifies the counter. It is also the rarest kind in the vocabulary, so the
payload argument does not reach it. The field is optional, so the shape the docs
lane predicted still parses.

Also, mechanically: the listener is **captured at the root** rather than
delegated from it, like `toggle` and unlike `click`, so a handler calling
`stopPropagation` cannot make a conversion invisible.

## Real test numbers

`pnpm install && pnpm verify` — **green**, on the final tree.

| | |
| --- | --- |
| Runtime suite | **169 files, 3,383 tests, 0 failed** |
| Application suite | **345 files, 5,991 passed, 1 skipped, 0 failed** |
| `findings:check` | 907 findings, 0 malformed |
| `prerender:check` | 119 pages, 1,383 text junctions, 0 run together |

**22 tests added.** Eleven on the broadcaster, five on rollup, three on the
fold, two on the schema, one on the marketing site's promise. The store contract
suite's accumulation test now carries the counter, so both the memory and the
Postgres implementations are held to summing it.

Nothing was skipped and nothing was weakened. One test failed during the run and
is worth recording because it taught me something: my first double-count test
clicked the submit control **and** dispatched a `submit` event, and jsdom
implements implicit submission, so it produced two completions. The test was
wrong, not the code — but it is the exact shape of the bug the brief asks to be
tested against, so the test now drives the whole path from one press and asserts
`["activated:n_6", "completed:n_6"]`: two facts about two nodes, one completion.

### The double-count cases, named

- One press producing one `completed`, while also producing an `activated`
  against the control — including the sharper case where the submit button is
  **not** itself addressed, so both signals name the form.
- Two submissions in one page view: two completions, **one** view. The view
  count is what every rate is taken over and it must not move.
- A cancelled submit followed by nothing: zero.
- A submission after `stop()`: zero.

## Browser bytes, measured

`src/signals/broadcast.ts`, bundled for the browser with esbuild
(`--bundle --minify --format=esm`):

| | minified | gzipped |
| --- | --- | --- |
| before | 6,165 | 2,838 |
| after | **6,446** | **2,926** |

**+281 bytes, +88 gzipped.** The import graph is unchanged — the broadcaster
still reaches no package, which `browser-weight.test.ts` holds. (That file
checks imports, not bytes; the figures above are mine, taken for this report.)

## Cross-lane edits, declared

Three, all forced by `pnpm verify` being the merge gate for four surfaces, all
minimal, each with its own entry in `FINDINGS.md`.

1. **`(marketing)/_lib/readers/asked.ts`** — `SITE_SIGNAL_TYPES` carries a
   deliberate alarm that reddens when the vocabulary grows, with a comment
   saying the landing day is when somebody decides what the site asks. I
   answered it: `COMPLETION_TYPES = []`, because nothing under `(marketing)`
   renders a form, and a kind `types` does not name is reported for *every*
   addressed type — so leaving the key out was the wrong answer, not the
   neutral one. I added a test that asserts the emptiness is still true of the
   pages, so the list cannot rot silently.
2. **Three `(portal)` test fixtures** — literals of `StoredTally` that no longer
   satisfy the type. `completions: 0` and one widened `Pick`. No portal
   behaviour touched.
3. **`src/testing/reader-signal-contract.ts`** — in `src/` but it decides what a
   reader-signal store must do, so I read it as this lane's under the
   *follow-the-content* rule in `docs/routines.md`. Two signal builders and one
   extended assertion.

## Records, findings, plan

- **Added:** decision **0209**, *A completion is a form the browser let go, and
  it carries the bands it was the end of*. Accepted — `docs/signals.md` already
  approved the kind and nothing here contradicts an accepted record. Index
  regenerated. The number is the next free on `main`; #462 also claims 0209, so
  one of us gets renumbered on merge.
- **Filed, four:** the docs page deletes its own over-reading caveat the day the
  kind ships (`Loom docs`); the marketing site's empty list will rot the day it
  grows a form (`Loom marketing`); the reader screen has a conversion counter it
  does not know about (`Loom portal`); and the `fetch` hole, filed against this
  lane as a question rather than a unit.
- **Closed:** none. No open finding was owned by this lane.
- **`docs/signals.md`** now says five kinds, marks steps 1, 2 and 3 **done**
  (1 and 3 were already on `main` and the plan still read *approved*), and
  records the three things settled in the building.

## Open questions

**1. The `fetch` hole, and rule 3's edge.** This is the one I want a reading on.
A host's own form that posts with `fetch` reports no completion, and the only
honest fix is a function the host calls — `completed(node)` on the broadcast
handle — because only the page knows its own submission succeeded. That is
measurement a page's JavaScript switches on, and rule 3 refuses measurement as a
*prop in the tree* so a **proposal** cannot write it. A host's own code is not a
proposal, so I believe the two are different and the function is allowed. But
the distinction is not written down anywhere, and I would rather have it written
down than rely on it. **Recommendation:** allow it, and say so in a record that
amends nothing — the rule is about what a model can author, not about what a
host can call. Not built, and not proposed as a record, pending your reading.

**2. Nothing else.** The counter is additive, the column is defaulted, and every
existing row reads `0`, which is what was true of them.

## On the parked door, since the brief asks

Nothing in this change makes per-reader identity more expensive to add later. A
`completed` is anonymous and node-shaped like the other four; the `view` key it
is correlated by is still minted in the browser, still consumed by rollup, still
dropped with the raw window. If an identified batch ever arrives behind a
consent gate, it arrives through the same intake and the same parser, and this
kind needs no change to be part of it.

## What I did not do

The interpretation layer — joining `role`, `copy` and the registry to the
counters on the server — is the first item in this lane's queue and is the next
run's work. I took `completed` ahead of it on purpose: it was approved, it was
unblocked by another lane that had spent three days unblocking it, and building
the interpretation layer over four kinds and then extending it is two jobs. The
join now has five kinds to interpret, including the only one that is about a
reader finishing.

No other lane has a branch open touching the signal path. #462 is
`framework-61-what-an-adapter-must-do` and touches §2.
