# 0313 — What a page collects is published to the reader it collects about, derived from the configuration and never written by hand

**Status:** Accepted

**Date:** 24 October 2026

**Section:** §4c (reader signals)

## Context

Every reading in `src/signals/` answers a deployment's question: which
bands readers reach, which asks they answer, which page to fix first, what a
change did. **Nothing answered the reader's question**, which is the shorter one:
*what does this page report about me?*

That is not a gap in a feature list. It is the half of this product's argument
that had nothing behind it. Loom exists so that a change to a page can be
inspected, attributed and undone; reader measurement that could not be explained
to the person being measured would contradict the premise. Every competitor in
this space collects more and explains less, and the brief this lane runs under
puts the difference in one line: *best in its class in what it can answer, not
in how much it collects.*

The explaining has to be something a deployment can **publish**. The six rules
in [`docs/signals.md`](../docs/signals.md) are in this repository, the doc
comments on `signal.ts` are in this repository, and a reader of a deployment's
own privacy page has neither. What a deployment could do until today is write
the list by hand, and a hand-written list of what a product collects is right on
the day it is written. Six payload fields and five kinds have landed in this
subsystem since September; `completed` landed on 1 October
([0211](0211-a-completion-is-a-form-the-browser-let-go.md)), `audience` on the
batch with [0284](0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md),
`within` with [0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md).
Each of those would have silently falsified a paragraph somebody wrote in
September.

## Decision

**A notice is a value this subsystem publishes, derived from the configuration a
deployment's pages are broadcast with and from the schema those pages send.**
`collectionNoticeOf` in [`src/signals/notice.ts`](../src/signals/notice.ts),
returning a `CollectionNotice`: the kinds this configuration reports with a
sentence each, every field of every kind and of the delivery with a sentence
each, the closed list of what is never collected, where readers are counted from
or that they are not, and how long a delivery lives.

Five things make it a notice rather than a paragraph.

**1. The fields are the schema's own, held by the compiler.** The tables are
keyed by `keyof Required<…>` of `ReaderSignalBatch` and of each member of the
`ReaderSignal` union, so **a field added to a payload without a sentence here
does not compile**. `Required` is deliberate: an optional field — `within`,
`view`, `audience`, `first` — is as owed a sentence as any other, because a
field that is sometimes there is still collected.

**2. A test drives the real broadcaster.** A type cannot reach the third end of
the claim: a field can be in the schema, described in the table, and never sent
— or sent and never described. `notice.test.ts` reads a fixture page the way a
reader would (a link pressed, a disclosure opened, a form let go, a band on
screen), takes the batches the broadcaster actually produced, and fails on any
field or kind the notice does not name. The mutation that stops it passing
vacuously is a table with one field removed, which has to come back as that
field's name.

**3. It is a ceiling, never an understatement.** `kinds` narrows the notice,
because it is an explicit list a host wrote. `types` and `within` do **not**: a
deployment that reports on sections only, or turns ancestry off, collects less
than the notice says. A disclosure that overstates costs a reader nothing and a
deployment a little credit; one that understates is the failure this module
exists to make impossible. It also keeps a notice stable — a ceiling moves when
the vocabulary or the deployment's own two numbers move, where a floor would
have to be republished whenever somebody added a primitive type to a list.

**4. There is no subject for the reader.** Every field is about one of five
things: the part, the page, the observation, the page view, the delivery.
`FieldSubject` has those five members and no sixth, which is rule 1 stated as a
type rather than as a sentence: a field that needed a member for *the reader*
could not be described without adding one, and adding one is a record.

**5. The sentences are addressed to the reader.** *Your address is never stored*,
not *the reader's address is never stored*. It is the one module in
`src/signals/` that speaks to anybody, and a sentence written in the third
person is a sentence a deployment has to rewrite before it can publish it.

Two numbers come from the deployment and nothing else does: the collection
window (`collect.ts`) and the region floor, through `regionFloorOf` so that the
notice cannot disagree with the map. The window is reported **as given** rather
than clamped, because `collect.ts` is what refuses one below its minimum and a
notice that reported a different number from the configured one would be a second
rule about one setting. Where no region counting was offered the floor is `null`,
which is *nothing about where you are is read* — a different sentence from *your
country is counted and is published only once enough others share it*, and the
difference is the whole of what a floor is for.

**It is not a consent gate, and nothing here builds toward one.** There is
nothing in today's collection to consent to: a signal is anonymous and
node-shaped and correlation is scoped to one page view by a key that never
persists, and neither is configurable
([0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)).
A notice says what is collected; the rules say it cannot be about a person.
Per-reader identity is parked and this record does not reopen it: a gate needs a
recorded decision per reader, which is a different artefact, and a notice does
not become one by being read.

## Consequences

- **A deployment can publish what its pages report**, from the same options
  object it passes `broadcastReaderSignals`, in the voice a reader reads.
- **A payload cannot grow quietly.** The cost of adding a field is now one
  sentence addressed to a reader, written at the moment the field is added, by
  the person adding it. That is the point of putting the tables in the type
  system rather than in a document: the sentence is cheap, and the sentence is
  the thing that would otherwise never be written.
- **Nothing reaches a reader's browser.** The notice is server-side; `broadcast.ts`
  is byte-identical and the import graph is unchanged, so rule 4 is untouched.
- **No counter, no store, no clock.** It is a pure function of configuration,
  so a surface can call it on a page nobody has read yet — which is exactly when
  a privacy page needs it.
- **A kind added to the vocabulary now costs two sentences** rather than one:
  what the page observes, and what each new field says. A sixth kind is already
  a record (rule 6), so the cost lands where the argument is already happening.
- **The ceiling is a claim a deployment makes about itself.** A deployment that
  wants a notice narrower than its configuration permits has to narrow the
  configuration. That is the honest direction, and it is the one this record
  chooses deliberately.

## Alternatives considered

**A documentation page.** It is where this would naturally have gone — the guide
at */docs/the-runtime/what-your-readers-do* is written and good. Rejected
because a page in Loom's documentation explains Loom to a deployment, and the
person who needs this sentence is reading the *deployment's* site. A notice a
host can print is the only shape that reaches them, and the derivation is what
keeps it true.

**A hand-written structure in the docs app.** Same reach problem, plus it would
drift: nothing in `apps/loom` fails when a field lands in `src/signals/signal.ts`.

**Generating the sentences from the doc comments on the schema.** Tempting,
since those comments are good and already maintained. Rejected: they are written
to an engineer reading a schema — *optional, and absent is not false* is correct
and is not a sentence anybody should publish to a reader. The API reference
already lifts those comments for the audience they are written for.

**A floor rather than a ceiling** — reporting what the configuration actually
collects, narrowing on `types` and `within`. Rejected for the reason above, and
for a second: `types` is a per-kind list that `selectionOf` resolves inside
`broadcast.ts`, so a notice that narrowed on it would be a second spelling of
that rule, or would cost the browser an exported name
([0218](0218-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md)).
A disclosure is not worth bytes in a reader's browser.

**Putting the region floor and the window on the notice as sentences only**,
without the numbers. Rejected: the numbers are the part a reader can check, and
a floor stated as *enough* is a floor nobody can hold a deployment to.

**A sixth refusal member for *no cross-site tracking*.** Rejected as a
restatement: `no-stitching` already says nothing joins this visit to another one
*here or on any other page*, and two members for one promise is two sentences a
surface has to decide between.
