# 0209 — A completion is a form the browser let go, and it carries the bands it was the end of

**Status:** Accepted
**Date:** 2026-10-01
**Section:** §6 — Reader signals

## Context

The reader-signal vocabulary has been four kinds since 0136 and all four measure
attention: a node came into view, a reader stayed on it, a reader pressed
something in it, a reader opened it. None of them says a reader *finished*
anything, so a deployment reading its own counters could show engagement and
never conversion — *they looked at the pricing band* with no way to reach *they
bought*.

`docs/signals.md` approved `completed` as step 2 on 13 September, as the one
addition to the closed list. It did not land that day: */docs/the-runtime/what-your-readers-do*
argued the vocabulary was four and `claims.test.ts` held it to the sentence, so
adding the kind reddened `pnpm verify` for four surfaces. `Loom docs` removed
the lock on 16 September by making the page produce the count instead of
printing it, and wrote down exactly which two edits the runtime change needed.
This is that change, plus the two the finding did not predict.

Three questions had to be settled rather than guessed, because a counter means
whatever it meant on the day it started counting and a counter that quietly
changes meaning is worse than one that was never added (0158).

## Decision

**`completed` is the fifth and last approved kind. It fires when a form inside
an addressed node is submitted and nothing on the page cancelled it.**

A signal carries what every other signal carries and nothing more: the node, its
primitive type, an instant. No field names, no values, no destination, no
response.

**1. What "successfully" means is what the page can attest.** A browser fires
`submit` only once constraint validation has passed, so the event itself is the
evidence that the reader filled the form acceptably. The broadcaster additionally
requires that no listener called `preventDefault`, which is as far as its
knowledge goes: it watches the page and never the reply. A page that posts with
`fetch` and cancels the native submit therefore reports **nothing**, and that is
the intended answer — from the page's side a cancelled submit and a failed one
are the same event, and a kind that reported both as completions would be
measuring something it cannot see. The starter library's `loom.form` renders a
native `<form action method>` with no handler on it, so Loom's own forms report
normally.

**2. `preventDefault` is read after the dispatch, not during it.** Whether the
broadcaster's listener runs before or after a page's own is registration order,
and React attaches its handlers at a root container that may be the very element
a broadcast was pointed at. The listener therefore queues a microtask and reads
`defaultPrevented` once dispatch has finished, which is the only reading that
cannot depend on who registered first. The instant is taken at the event, because
that is when the reader finished.

**3. It is captured at the root rather than delegated from it**, like `toggle`
and unlike `click`. A handler inside the page may call `stopPropagation`, and a
submission the broadcaster never heard is a conversion nobody counted.

**4. It is a `DELEGATED_READER_SIGNAL_KIND` and carries `within`.** 0167 gave the
ancestry to `activated` and `disclosed` because the node such a signal names is
the control rather than the region, and refused it to `viewed` and `dwelled`
because those are the high-volume kinds and the payload would be multiplied by
the page's depth to buy nothing. `completed` sits on the first side of that line
and sits there harder: `loom.form` is addressed, so the signal names the form
and the band the form was the end of is lost — and *which band converted* is the
question a deployment opens the portal to ask. It is also the **rarest** kind in
the vocabulary, at most a couple per page view, so the volume argument that
refused the other two does not reach it.

**5. The durable counter is `ReaderTally.completions`, an occurrence.** Two
submissions in one page view are two completions and one view, like
`activations`. *How many views converted* is a `FunnelPair` ending in
`completed`, which needed no new shape at all — a funnel end already names a
kind, so the conversion rate this kind exists for is answerable the day it
lands. The live fold gains the same counter. The Postgres column is additive
and defaulted to `0`, exactly as `engaged` was, so a deployment whose table
predates the question reads as *nothing was submitted here*, which is what
nobody was counting.

**The vocabulary is now closed at five.** A sixth is a record, and `hovered`
remains refused (`docs/signals.md`).

## Consequences

- The portal can show conversion rather than only attention, per node and per
  revision, before and after a change. `Loom portal`'s screens do not render
  `completions` yet; filed.
- A deployment whose forms are intercepted in JavaScript sees zeroes. That is
  honest but it is also the common case in a client-rendered app, and the way to
  change it is a host-supplied report rather than a guess by the broadcaster —
  not designed, filed as a question.
- The broadcaster grew **281 bytes minified, 88 gzipped** (6,165 → 6,446
  minified; esbuild, bundled for the browser). It still reaches no package, which
  `browser-weight.test.ts` holds.
- The marketing site's `SITE_SIGNAL_TYPES` had a deliberate alarm that reddens
  when the vocabulary grows. It is answered with an empty list — nothing on that
  site is a form — rather than by weakening the alarm.
- A submission press produces both an `activated` against the control and a
  `completed` against the form. They are two facts about two nodes; where the
  submit control is not itself addressed, both name the form, and the tally
  carries them in separate counters. Tested.

## Alternatives considered

**Report every `submit`, cancelled or not.** It is the only way a client-rendered
page reports anything, and it is the reason this was tempting. Rejected: the
broadcaster would be claiming a completion for a form whose JavaScript rejected
the input, and a conversion counter that counts failures is not recoverable
afterwards — the batch says `completed` and nothing in it says *maybe*.

**Report the response too, by watching the navigation or wrapping `fetch`.**
Rejected twice over: wrapping `fetch` is the broadcaster reaching outside the
page it was pointed at, and a response status is content about a submission,
which 0136 refuses.

**No `within`, as the docs lane's predicted shape had it.** Rejected: it is the
same gap 0167 was written about, and here the lost half is the commercially
interesting half. The field is optional, so the predicted shape still parses.

**A view counter, `converted`, instead of an occurrence.** Rejected as redundant:
a `FunnelPair` ending in `completed` already answers it over any `from`, and a
bare "views that completed this node" would be a second number that can disagree
with the first.

**`completions` on the tally as a sum of a new per-kind structure.** Rejected:
every other occurrence counter is a plain column, and the funnel machinery
already keeps the per-kind view sets a question needs.
