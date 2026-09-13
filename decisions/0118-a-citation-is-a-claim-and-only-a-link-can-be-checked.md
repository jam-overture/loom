# 0118. A citation is a claim, and only a link can be checked

**Status:** Accepted
**Date:** 2026-09-09
**Section:** §1 (process)

## Context

The records in `decisions/` are cited from everywhere. `src/` alone carries 294
parenthesised references to a record number, across 136 files, and every one of
them is a claim that a reader can go and check: *this is why the code is shaped
like this, and the argument is over there.*

Nothing read them. `pnpm decisions:index` builds the table from the front matter
and reports a numbering clash; `src/record-claims.test.ts` holds a count in a
record against the list in `src/` that settles it; a test added with #217 holds
a link inside a record against the file it opens. Between them they cover the
records and nothing outside them.

Three findings in three days, from two lanes, are the same defect one directory
over:

- Every doc comment in the framing seam cites `(0094)` and means 0095 — eight
  sites, in `src/frame/`, `src/render/` and `src/sdk/`. 0094 is a real Accepted
  record about a card's prose, so a reader following it arrives somewhere
  coherent and wrong. Filed by `Loom lessons` on 7 September, writing a lesson
  that teaches the seam, one day after the same failure was filed against 0087.
- 0081 has had no *Alternatives considered* since 26 August. `decisions/README.md`
  states the format and says why that section in particular matters — *"the
  rejected options are the part a future reader cannot reconstruct"* — and
  nothing looks at a record's body. Filed by `Loom docs` on 8 September, found
  by writing a page that walks the section for every record and asking why one
  came back empty.
- Both client control comments in the render seam link 0009 to
  `0009-a-primitive-declares-its-props-and-the-seam-enforces-them.md`, which
  nobody ever wrote. Found by this check on its first run.

The two forms are not equally checkable, and that is the whole of the design.
A bare `(0094)` carries one fact; the only thing that can be held against it is
whether a record of that number exists, which 0094 does. A link carries the
number twice — once as the label a reader sees, once as the file a click opens —
and two copies of one fact can disagree.

## Decision

**Every citation of a record from `decisions/`, `src/` and `tools/` is checked,
and a citation that does not resolve fails `pnpm verify`.** A bare number must
name a record that exists. A link's label must match the file it opens, and that
file must be a record here.

**A citation is prose, so only prose is read.** In a record that is the whole
file; in TypeScript it is the block comments and the whole-line comments, and
nothing else. The tests in `tools/decisions/` build fixtures out of string
literals that name records deliberately absent, and a check that failed on the
tests proving it works is a check somebody deletes.

**The eight framing-seam sites are renumbered, not rewritten as links** — and
that is a concession rather than a preference. Rewriting them as links was the
first shape of this record, because it makes the sites that were wrong the sites
that cannot be wrong again. It fails a rule that outranks it. The API reference
on the documentation site is generated from these doc comments, and the
maintainer's rule on it is that *"docs should [not] reference internal decisions
(like `(0007)`). The casual reader would not know what those are"*. The
generator lifts a bare parenthetical out of a published sentence and leaves
anything else in; `src/documentation.test.ts` holds the source to what the
generator can lift, and the conversion turned six comments red the moment it ran.

So the bare parenthetical is the citation form in `src/`, and a bare
parenthetical can be checked for existence and nothing more. Making the linked
form liftable is a change to the reference generator, which is
`Loom docs`'s — filed for them rather than taken.

**A record must carry `## Context`, `## Decision`, `## Consequences` and
`## Alternatives considered`.** A trailing qualifier counts, because 0014 writes
`## Decision (proposed)` and that is the record being honest.

**0081 is exempt, by name, in the tool.** Backfilling it would mean writing down
alternatives nobody weighed and presenting them as the ones that were, which is
worse than the gap — the section is worth something precisely because a reader
can trust that what it says was considered. The exemption is checked in both
directions: a record that gains the section it was excused reports its own
exemption as stale, so the list cannot outlive its reason.

**`apps/loom` is not checked.** The four surfaces cite records too, and a check
that turns `pnpm verify` red is a gate in front of every lane. One routine's
unattended run does not put a gate in front of four others; it is offered in
`FINDINGS.md` and each owner can take it.

## Consequences

- **A dead link is now impossible to ship from `src/` or `tools/`,** and a
  citation of a number nobody has written is impossible to ship from anywhere
  this lane owns. Three real defects were found by the first run of the check
  and are fixed in the same commit.
- **The check would not have caught the failure that motivated it, and nothing
  yet stops a ninth.** 0094 exists, so existence says nothing about the eight
  sites; they are fixed by hand and the next one will be too. A bare number is
  one fact and one fact cannot disagree with itself. This is the honest limit of
  what shipped, said here rather than left for a reader to discover — a check
  advertised as catching more than it does is worse than no check. The way out
  is the linked form, and the linked form needs the reference generator to lift
  it.
- **Renaming a record is now safe in this lane's prose.** A rename that leaves a
  link behind fails on the branch that made it, which is where the numbering
  clash check already put that cost.
- **A hole in the numbering becomes a harder failure than it was.** 0097 made a
  hole a `note:` rather than a blocking problem, because a number claimed on an
  unmerged branch is normal here. A *citation* of such a number is still
  blocking — a record that does not exist on this branch cannot be read from
  this branch, whatever another branch is holding. Nothing in the three roots
  checked here cites one today.
- **The scan is a heuristic over prose and will have a false positive one day.**
  It reads four digits beginning with a zero, inside parentheses, inside a
  comment. The first draft read two CIE luminance constants as citations; the
  lookarounds that fixed it are a rule about digits, not about meaning. A false
  positive is a red build for the run that hits it, and the remedy is to widen
  the exclusion in `citations.ts` rather than to reword the prose.
- **The record-shape check has one exemption and will collect more if it is
  allowed to.** One is a fact about a record written before the check existed;
  three would be a check nobody believes.

## Alternatives considered

**Convert every bare citation in `src/` to a link.** 294 sites, mechanically
safe, and it would make the whole repository self-checking rather than only the
records. Rejected twice over. It cannot be done at all until the reference
generator lifts a linked citation the way it lifts a bare one, which is another
lane's file; and even then it is a diff across 136 files that touches no
behaviour, conflicting with every open branch in every lane. Deferred rather
than rejected: it is strictly additive to what this record decides, and it is
the only thing that would close the gap this record admits to.

**Require a title fragment beside a bare number** — `(0095 — a frame carries its
URL)` — so a bare citation carries two facts too, checkable against the record's
title. Rejected as a convention: it is longer than the sentence it sits in half
the time, and the failure it prevents is prevented by a link, which this
repository already writes.

**Report rather than block.** The numbering check has both severities and a hole
is deliberately only reported. Rejected: a hole is a normal state of a repository
with many branches, and a citation that resolves to nothing is not — nobody has
a reason to write one, so nobody is inconvenienced by refusing it.

**Backfill 0081's alternatives from the record's own reasoning.** Its Context and
Decision do weigh options, and a plausible section could be assembled from them.
Rejected: it would be reconstruction presented as record, in the one section
whose value is that it is not reconstructable. An exemption written where the
check is says the true thing.

**Check `apps/loom` as well.** Rejected for now, and only for now — see the
Decision. The four surfaces would benefit most from it, since a marketing page
citing a record a reader can follow is the same promise as a comment doing so.
It needs the owners to say yes, which is a comment on a pull request rather than
a decision an unattended run may take for them.

**Put the check in `src/record-claims.test.ts`, beside the other prose check.**
Rejected: that file is a hand-maintained registry of counted sentences, and its
own doc comment explains at length why it is a registry rather than a sweep.
This is the sweep. They answer different questions and mixing them would blunt
that explanation.
