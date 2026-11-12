# 0387. A landmark is not a count, and a copy is a sequence of them at the distances the text puts them at

**Status:** Accepted
**Date:** 2026-11-12
**Section:** §1 (process)

## Context

[0348](0348-a-repeated-payload-is-measured-by-a-landmark-that-escaping-cannot-rewrite.md)
gave this repository an instrument for a defect no verbatim measurement can
see: a stylesheet carried once in the markup and forty-two more times in the
RSC flight payload, JSON-escaped, sharing no long substring with the element it
came from. Its unit is a **landmark** — the longest run of letters, digits,
dots, underscores and hyphens the text contains exactly once, which is what no
escaping rewrites — and its count of a text's copies is that token's count in
the document.

**On 8 November `Loom marketing` read a figure off it, disbelieved it, counted
by hand and reported the hand count.** `pnpm weigh` printed, for a 78-byte rule:

```
style  78 bytes  carried 426 times  at least 33,150 bytes repeated (1% of the document)
```

The document held that rule **twice**. The rule is three declarations:

```css
:root {
  background-color: #0a0a0a;
  color: #f5f5f5;
  color-scheme: dark;
}
```

and its longest escape-safe token appearing exactly once in it is
`background-color`, at sixteen characters — **twice `LANDMARK_FLOOR`**, and long
enough to be implausible by the premise the module states: *"longest rather than
first, because length is what makes a coincidental match in unrelated markup
implausible."* The library stylesheet beside it is 48KB of CSS carried once per
primitive in the payload, so the document contains that token hundreds of times.

**Length is not rarity, and against this corpus it is close to the opposite.**
A Loom page is mostly CSS. The tokens in CSS that are both long and common are
exactly the property names, and a short rule contains almost nothing else. So
the defect is not rare, it is not an estimate being loose, and it is in the
direction the module promises it cannot be: 0348 reports the saving as
`(copies - 1) × the text's own length` and calls it *"provably under the truth,
because escaping only grows a copy."* That proof is about the **size** of a
copy and assumes the **count** is right. When the landmark is not unique to the
text, the count is unbounded and the figure is unbounded with it.

Measured on today's build, before this record:

| | the reading | the truth |
| --- | --- | --- |
| `/?theme=bold`, the 78-byte rule | **346 copies**, 26,910 bytes repeated | 2 copies, 78 bytes |
| `/why-use-it`, its 79-byte rule | **386 copies**, 30,415 bytes repeated | 2 copies, 79 bytes |

## Decision

**A landmark is not a count. A copy of a text is a sequence of its landmarks,
in the text's own order, at the distances the text puts them at — and each of
them exactly once inside the span.**

1. **A text's landmarks are every escape-safe token it contains exactly once**,
   and up to **six** are taken: longest first, ties broken lexicographically so
   two runs agree, then used in **text order**, because what locates a copy is
   the sequence. 0348's requirement that a landmark occur exactly once in the
   text is unchanged and is what makes the sequence countable.

2. **A copy's landmarks sit at least as far apart as the text puts them and at
   most six times that.** An encoding this module can see maps one character of
   the text to between one and six, in order, and never reorders: `>` written
   `>` is the longest escape a payload copy is made of. So the distance
   between two landmarks can only grow, and only by that factor.

3. **A span that carries one of the landmarks twice is not a copy.** It is one
   copy's tail and the next copy's head — the last `background-color` of a
   stylesheet and the `color-scheme` of the small rule encoded after it, at a
   perfectly plausible distance. A copy of a text whose landmark occurs once in
   it carries that landmark once, and this clause is the half of the check that
   does the work.

4. **A count that would rest on one landmark is not published.** A text with a
   single unique escape-safe token is reported `one-landmark` — unmeasurable,
   beside 0348's `no-landmark` — because its count is that token's count in the
   document, which is the figure this record exists to stop printing.

5. **The nearest candidate is taken and no search is made.** Where two
   occurrences of a landmark both fall inside the window, the first is taken; if
   the chain then fails, the copy is not counted. That can miss a copy, which
   **under-counts**, and under-counting is the direction 0348 already promises
   the figure in. A search that backtracked would be a different cost and a
   different proof.

**This amends 0348's counting clause and supersedes nothing.** Everything else
0348 decided stands and is the reason this instrument exists: the unit must be
escape-safe, it must occur exactly once in the text, a text with none is
unmeasurable rather than estimated, the saving is a bound and not an estimate,
the tool prints the number and does not judge it (0213, 0159), and it is not in
`pnpm verify` because a gate that starts a server is a gate that can hang. What
changes is how `copies` is established, and it changes because the premise 0348
reasoned from — rarity follows from length — is false against the one corpus
this instrument is always pointed at.

## Consequences

**The two readings above are now 2 copies and 78 bytes, and 2 and 79**, which is
the hand count the finding reported. Counted on the same artefacts, in the same
command.

**The reading worth keeping is unchanged to the byte.** The same two pages still
report the library stylesheet as 47,981 bytes carried 43 and 48 times, at least
2,015,202 and 2,255,107 bytes repeated — 0348's own figure for `/why-use-it`'s
is 2,015,202 at 43 copies, and this branch reproduces it. A fix that quieted the
instrument's one load-bearing reading would not have been a fix.

**A page's own markup no longer inflates a count.** A stylesheet's landmark is
usually a class name, and a class name is in the `class` attribute of the
element it styles. Under 0348 those occurrences were copies; under clause 3 they
are not, because a `class` attribute does not carry the rest of the sequence.

**Two copies cannot overlap, and nothing has to enforce it.** Clause 3 says a
span carries each landmark once, so the next occurrence of the first landmark is
past the end of the copy just counted. The function was first written with a
guard against overlapping copies; a mutation of that guard survived a sweep that
killed nine others, which is how it was found to be unreachable, and it is gone.

**The residual risk is two landmarks coinciding, and it is bounded by the
rarest of the six rather than by the longest.** Two tokens, in order, at a
distance inside the window, with neither repeated in between, is possible —
`pnpm weigh` prints a number and a report judges it (0213), so what this record
buys is that the number is now wrong only when a document really does carry
something shaped like the text.

**`docs/routines.md` says this** in *`pnpm weigh` — where a page's bytes are*,
which is where a run meets the instrument.

**The 8 November finding is closed**, and the three remedies it offered are all
rejected below in favour of a fourth it did not list.

## Alternatives considered

**Reject the landmark when it also occurs outside the text's own copies** — the
finding's first option, and the one that reads as obviously right. Rejected
because it cannot be computed: finding a text's copies is the thing being asked,
and a copy is not findable verbatim, which is 0348's entire premise. The
sequence is that test made computable.

**Require the landmark to be absent from the rest of the document**, once per
document rather than once per candidate — the finding's second option. Rejected
for the same circularity plus a cost: "the rest of the document" is the document
minus the copies, so it needs the answer first, and approximating it with "the
whole document" would reject every landmark of the 48KB stylesheet, whose copies
are most of the page.

**Raise `LANDMARK_FLOOR`** — the finding's third option, and it is measured not
to work. The floor is 8 and the offending token is 16; a floor that excluded
`background-color` would exclude most of what a short rule contains, and a rule
with no landmark is already handled.

**Take the smallest count across the landmarks.** Every copy carries every
landmark, so each landmark's count is an upper bound on the copies and the
smallest is the tightest. Rejected because the figure needs a bound from
**below**: a count that is at most the truth gives a saving that is at least it.
The smallest of several upper bounds is still an upper bound, and
`(copies - 1) × bytes` computed from one is still a number that can be too big.

**Require every landmark's count to agree, and report unmeasurable when they
disagree.** Cheap, and it would have caught 8 November. Rejected because it
would silence the instrument's one valuable reading: a stylesheet's class names
appear in the markup as well as in the copies, so its landmarks disagree by
construction, and *47,981 bytes carried 43 times* would become *not counted*.
The clause that distinguishes those two cases is the sequence, not the counts.

**Decoding the payload and counting copies in the decoded text.** Rejected again
for 0348's reason, now with a second instance behind it: the instrument would
carry a list of encodings and report *nothing wrong* for any response in a
format missing from it. This record adds the one thing that list would have to
agree on — that an encoding maps a character to between one and six characters
in order — and needs no list.

**Leaving it, and reading the number as an upper bound.** Rejected on the
evidence of the finding. The reading was disbelieved, counted by hand, and the
hand count was what reached the report — which is the instrument not being used.
A figure a lane has to check by hand is worse than no figure, because it is
quoted by the next lane that does not.
