# 0218 — What a counter means is published, and the browser pays for the number and not its name

**Status:** Accepted
**Date:** 2026-10-02
**Section:** §4c (reader signals)

> **Renumbered on 2026-10-03**, from 0215, when the branch that carried it
> (#486) was merged. `main` had meanwhile accepted a different 0215 — *a stake
> rule either reads a policy or is fixed at its code* (#485, merged earlier the
> same morning) — and two records sharing a number is fatal (0097). This record
> was written on 2 October and nothing in it changed but its number; references
> on the branch were updated with it.

## Context

`viewed` and `dwelled` are the two kinds a browser produces by *watching* rather
than by witnessing an act, and what they watch for is one rule, written once in
`broadcast.ts`: an element is on screen when at least half of it is visible, **or**
when it fills at least three tenths of the window. The second clause is not a
softening — the visible fraction of an element taller than the window can never
reach one half, so a long section judged by the first clause alone would never be
viewed at all.

`Loom docs` filed it on 2 October, while writing the page that explains the
vocabulary to a host. The rule was two literals inside an unexported function, so
a page could not state it: it said *"enough of the element was on screen"* —
true, vaguer than it needed to be, and deliberately not *"half of it, or a third
of the window"*, because that is two hand-typed numbers about runtime behaviour
standing next to the noun they count, which is the class of claim this repository
spent 1 October building a mechanism to refuse.

So the numbers had to be published. The question this record exists for is
**where from**, because the obvious answer costs every reader of every page that
broadcasts.

Measured, with `esbuild --bundle --minify` over `src/signals/broadcast.ts`:

| | minified | gzipped |
| --- | --- | --- |
| before | 6,477 | 2,944 |
| two names exported from `broadcast.ts` | **6,554** (+77) | **2,986** (+42) |
| the same two numbers imported into it | **6,477** (+0) | 2,945 (+1) |

A name a browser entry point *exports* survives minification, because a bundler
cannot know nothing outside will ask for it. A name it *imports and uses* is a
local, mangled to a letter, and the value is inlined. The two spellings are
indistinguishable in a diff and differ by 77 bytes on the wire, for ever, on
every page — against rule 4 of `docs/signals.md`, which is the one rule in this
subsystem that is about the reader rather than about what is known of them.

## Decision

**The thresholds that decide what `viewed` and `dwelled` mean are published, as
`READABLE_VISIBLE_FRACTION` and `READABLE_VIEWPORT_FRACTION`.** They are part of
the vocabulary, not an implementation detail: a page, a portal screen or a lesson
that explains either kind may read the number rather than type it.

**They are not configuration.** Nothing in the environment or the host's options
sets them. A deployment that could choose its own would have counters whose
meaning differed from every other deployment's while the column names stayed
identical, and a rollup cannot record the threshold a browser applied — so the
number would be unknowable for every row already stored. Changing them at all
changes what every stored counter meant when it was written, which makes them a
documented promise rather than a threshold to tune.

**A value a browser entry point needs and a page needs to quote lives in a module
of its own, imported by the browser entry and re-exported from the server one.**
`src/signals/readable.ts` holds these two; `broadcast.ts` imports them;
`@jam-overture/loom/signals` publishes them. The browser pays for the number and
not for what it is called. This is the general rule, not a one-off: any constant
that is both applied in the browser and quoted elsewhere goes the same way.

**The rule itself stays private.** `isReadable` is not exported. It takes an
`IntersectionObserverEntry` and is only meaningful inside an observer callback,
and publishing it would invite a host to re-implement the measurement rather than
read the counters. It is tested through the observer the broadcaster builds for
itself, with the browser's half doubled — which nothing in `src/` had done before
today.

## Consequences

- A page may state what `viewed` means precisely, produced rather than typed, and
  goes stale on purpose if the numbers ever move.
- The browser cost of publishing them is **zero bytes minified** and a byte of
  gzip noise, measured rather than argued.
- The two numbers are now a public API surface: changing either is a breaking
  change to a documented meaning and to the comparability of stored counters, so
  it is a record rather than a commit.
- `src/signals/readable.test.ts` is the first test in this directory to drive the
  real `IntersectionObserver` seam. The clause that carries elements taller than
  the window was previously held by one app test reporting a ratio of 1, which
  satisfies both clauses and so distinguishes neither.
- One more module in the signal path, which is the price of the byte count. A
  reader of `broadcast.ts` now follows an import to learn the thresholds; the
  doc comment on `isReadable` names both and links them.

## Alternatives considered

**Export them from `broadcast.ts`, where the rule is.** The first build of this
change, and the obvious one. Rejected on measurement: 77 bytes minified and 42
gzipped, on every page of every deployment that broadcasts, to serve a sentence
on a documentation site. Rule 4 is not a preference.

**Leave them unexported and let pages describe the rule in prose.** What the docs
lane did on 1 October, and the reason this record exists. It works, and the cost
is a page that is vaguer than the code it documents, or — worse, and the actual
risk — a page that types `0.5` beside the word `viewed` and is silently wrong the
day the number moves.

**Make them configuration, per host or per deployment.** Rejected. It sounds
generous and it destroys comparability: two deployments' `reached` columns, or
one deployment's before and after, would be the same name for different
measurements, and nothing in a rollup records which threshold produced a row.
0146 made the *retention window* configuration deliberately, because a window
length is a policy about keeping data; a threshold is the definition of the
datum.

**Export `isReadable` too, so the rule is testable directly.** Rejected for a
narrower test seam rather than a wider API: driving a doubled
`IntersectionObserver` tests the thresholds, the fallback to the window's own
height, the zero-height guard **and** that the observer is asked to report the
fraction it judges by — four things a direct call to a predicate would not reach.
A host that wants to know what a reader saw reads the counters.
