# 0078. The front door speaks the visitor's language, and a test holds it there

**Status:** Accepted
**Date:** 2026-08-20
**Section:** §4d

## Context

The maintainer read the marketing site against `nextjs.org` on 20 August, sent
the reference, and said the copy was heavy on technical jargon. He was right, and
what makes it worth a record rather than a commit message is *why* it happened.

His standing instruction for these surfaces is one sentence, given for the portal
on 18 August and binding hardest here:

> *"It should be very intuitive, such that a high schooler can easily follow what
> is going on."*

The site's brief repeats it and names the failure mode exactly — never open with
`TreeDelta`, `disposition` or the Gate. The site opened with the Gate anyway. The
third band of the landing page was `Proposals · The Gate · Revisions · Inverses`
under the heading "The four things underneath", inside the first screen and a
half, and the hero's supporting sentence was forty-five words containing *tree*,
*registered primitives*, *proposal* and *policy*.

Nothing did that on purpose. It drifted, one defensible sentence at a time, over
three weeks of runs written by a routine that reads the repository all day and to
which those words are ordinary. **Every other property this site claims has an
assertion behind it** — a re-theme touches only the root, no colour is named
below it, every surface is reachable from every page — so a run that broke one
found out within a second. The register had nothing, so it was the one property
that could rot silently, and it did.

## Decision

**The register is a property of this surface, tested like the others.**

`RESERVED_VOCABULARY` in `app/(marketing)/_lib/copy.ts` names the words this
project uses about itself that a visitor has never heard — `delta`, `the Gate`,
`primitive`, `inverse`, `provenance`, `schema`, `registry`, `runtime`, `node`,
`tree`, `TreeDelta`, `disposition`. `voice.test.ts` enforces two rules, and the
split between them is the whole decision:

- **The front door may not use a reserved word at all.** Someone arriving at `/`
  has no context, and a word they have to look up is a word that sends them
  somewhere else to look it up.
- **A mechanism page may, once it has said the same thing plainly first** — the
  plain phrase earlier in the page, the word after it, in the same breath. The
  test holds the order: `delta` is allowed on `/how-it-works` because "an exact
  list of changes" appears above it, and `the Gate` because "Your rules decide"
  does.

The second rule is what keeps this from being censorship. `delta` and `the Gate`
are the right names for what they name and the documentation should use them
freely. What a visitor cannot be asked to do is meet them cold.

**The register itself is four habits, taken from the reference** rather than
invented here: the reader is in the sentence ("your page", not "a page"); one
idea per sentence, and a short second sentence is a gift; what it does for you
before what it is made of; and something concrete — "the button that puts it
back" — in place of the abstraction it implements. The first and the second are
testable and are tested; a thirty-word ceiling on any sentence in an opening band
is where "one idea" stops being true.

## Consequences

- **A routine cannot quietly re-jargonise the site.** The failure this record
  exists for now fails a test, in the run that causes it, naming the word.
- **The test reads props, not just text nodes**, and this is the part worth
  knowing. Most of the words on this site are *configuration* — `loom.feature`
  carries its title and body as props, which is 0052 working as intended — so a
  scan of text nodes alone reports a clean page while the entire feature grid,
  every FAQ answer and the whole pricing band go unread. The first version of the
  test did exactly that and passed. `PROSE_PROPS` is an allowlist for that
  reason: a new prose prop nobody adds to it is copy the test cannot see.
- **Positioning is untouched and still the maintainer's.** Nothing here decides
  what Loom is for or who it is for; it decides what words may be used to say
  whatever he decides. The pricing band is still marked placeholder, in plainer
  words than before.
- **The documentation and the portal are not bound by this.** They serve people
  who have arrived on purpose. If either wants the same guard, the mechanism is
  twenty lines and the list is worth sharing rather than copying.
- **A future surface that adds a word to the reserved list retroactively tests
  the whole marketing site**, which is the desired direction: the list grows as
  the project invents nouns.

## Alternatives considered

**A style guide in `docs/`, unenforced.** Rejected on the evidence. The brief
already said "never open with `TreeDelta`, `disposition` or the Gate", in the
document every run is told to read first, and the site opened with the Gate for
three weeks. A rule a run can be sincerely following while breaking is not a
rule, it is a preference.

**Ban the words everywhere on the site.** Rejected: it makes `/how-it-works`
unable to name what it is describing, and a mechanism page that will not say
`delta` has to say "the exact list of changes" eleven times instead, which is
worse writing and less honest.

**A readability score — Flesch, or a word-length average.** Rejected as a proxy
that measures the wrong thing. "The Gate is a pure function" scores well; it is
still four words a visitor cannot read. A named list of this project's own nouns
is smaller, blunter and cannot be argued with.

**Leave the register to review.** Rejected because review is the maintainer, he
is the scarce resource, and this is the second time he has had to be the test.
