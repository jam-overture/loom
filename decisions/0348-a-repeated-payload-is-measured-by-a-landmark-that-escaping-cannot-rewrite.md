# 0348. A repeated payload is measured by a landmark that escaping cannot rewrite

**Status:** Accepted
**Date:** 2026-11-04
**Section:** §1 (process)

## Context

The maintainer reported `/why-use-it` as slow. Two framework runs named the
cause as *"93% of 2.4MB is one 47KB stylesheet carried 42 times by
`libraryStylesheet()`"* and asked for a scheduling call, because the 42 call
sites are in `src/primitives/` and that lane is another's.

**The named cause was right and the measurement behind it could not be
reproduced by any tool in this repository.** Counting copies of the stylesheet
in the served document answers **one**, truthfully:

| | |
| --- | --- |
| the document | 2,491,320 bytes |
| `<style>` elements in it | **2** |
| the library stylesheet, verbatim | **1** occurrence, 47,981 bytes |

React 19 hoists a `<style>` carrying `href` and `precedence` and deduplicates
it, exactly as `src/primitives/stylesheet.ts` has said since it was written. The
markup is correct. The copies are in the **RSC flight payload** — 2,309,548
bytes of the 2,491,320, carried as `self.__next_f.push(…)` — where the same CSS
is JSON-escaped: `>` is written `\u003e`, a newline `\n`. A payload copy and the
element it came from share **no long substring**, so every verbatim measurement
of that page reports nothing wrong with it.

That is the general shape and it is why this is a decision rather than a script.
A document is a response, not a tree; a renderer may be right about the tree and
the response still be ten times its content. Anything that measures a response
has to measure it in the encodings it actually carries, and there is no list of
those.

## Decision

**A repeated payload is counted by a landmark, and the landmark is the longest
run of characters that no encoding rewrites.**

Letters, digits, dot, underscore and hyphen, eight characters or more. JSON
escaping, HTML attribute escaping and `\u`-escaping all pass these through
unchanged, so a landmark reads the same inside markup and inside an escaped
payload. `.loom-trend-plot` survives; `.loom-trend-plot > .loom-stat` does not.

**The landmark must occur exactly once in the text it stands for.** A token
appearing twice per copy makes every count a division, and a division is where
an off-by-one becomes a number somebody believes. A text with no unique landmark
is reported as **unmeasurable rather than measured by estimate**.

**The saving reported is a bound, not an estimate:** `(copies - 1)` times the
text's own length. An encoded copy is never smaller than the text it encodes, so
this is provably under the true figure and never over it.

Two estimates of a copy's actual size were built first and both over-reported,
which is why the bound is what ships:

- **The mean gap between landmarks** charges a text for whatever sits between
  its copies. It put the library stylesheet at **98%** of `/why-use-it` and a
  second stylesheet at a further **10%** — summing past the whole document,
  which is the tell.
- **The smallest gap** is tighter and wrong in the same direction, because a gap
  is one copy *plus* the content interleaved with it. On that page the second
  stylesheet's four copies are spread among the first's forty-two, which gave a
  2,255-byte stylesheet a 53,344-byte "copy".

**It prints the number and does not judge it** — [0213](0213-the-harness-reads-a-box-it-prints-the-number-and-the-judgement-stays-in-the-report.md)
and [0159](0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md). A
stylesheet carried twice is sometimes deliberate, so whether a figure is a defect
is the report's to say. The exit code is whether a subject could be **read**.

**It is not in `pnpm verify`.** The reading needs a built application and a
server, and a gate that starts one is a gate that can hang —
[0140](0140-a-call-into-foreign-code-has-a-ceiling-and-the-runtime-owns-it.md)'s
rule pointed at the merge gate rather than at a render. `pnpm weigh` is a
command a run invokes beside `pnpm shoot`.

## Consequences

`pnpm weigh <url-or-file> …` exists. A file argument is read from disk, so a run
can weigh a response it captured earlier and the figures in a report are
reproducible without a server at all.

**What it reads is `<style>` and only `<style>`, for now.** That is the one
element in a Loom page whose content is both large and expected to appear once,
and it is where the reported defect lives. A script, a data URI and an inlined
font have the same shape and are not read yet; adding one is a line in
`styleTexts` and wants a case like this one behind it rather than a guess.

**The figure the two previous runs quoted is corrected.** The copies cost **at
least 2,015,202 bytes, 81% of the page** — not 93%. The 93% was the flight
payload's whole share of the document, which is the right neighbourhood and the
wrong subject: some of that payload is the page.

**The remedy is still another lane's and is now a finding with a number in it.**
The 42 call sites are `src/primitives/`'s. What this record settles is that the
number can be taken, by anyone, in one command.

## Alternatives considered

**Decoding the payload and counting copies in the decoded text.** Rejected, and
it is the option that looks right. It requires knowing the encoding — this one is
Next's flight format, the next will be a data URI or a source map — so the
instrument would carry a list of formats and would report *nothing wrong* for
any response in a format missing from it. The landmark needs no list.

**A byte ceiling in `pnpm verify`.** Rejected twice over. It needs a server in
the gate, and it is an instrument asserting an outcome: the number a ceiling
would be set from is one nobody has looked at yet, so the first thing it would
measure is whoever happened to be editing when it was written.

**Counting every repeated substring, with no candidate texts.** Rejected as a
different problem wearing this one's clothes. The longest-repeated-substring
search over a 2.4MB document is expensive, and what comes back is dominated by
the markup's own repetition — a thousand copies of `class="loom-` are not a
defect. Reading the document's own `<style>` texts asks the question that has an
answer: *is the thing that should be here once, here once?*

**Leaving it as prose in a report.** Rejected on the evidence of this run. Two
reports had already named the cause correctly and the figure in both was wrong
in a way nobody could check, because reproducing it meant building the
application, starting a server and writing a throwaway script — which is how the
first estimate in this record got to 98% and stayed there until a second
stylesheet made it sum past 100%.
