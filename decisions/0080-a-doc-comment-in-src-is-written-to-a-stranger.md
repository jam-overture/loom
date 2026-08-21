# 0080. A doc comment in `src/` is written to a stranger

**Status:** Accepted
**Date:** 2026-08-21
**Section:** §4c

## Context

The API reference is generated from the declarations the package publishes, and
lifts its sentences from the doc comments in `src/`. That is the property that
makes it worth having: nobody paraphrases the runtime, so the page cannot drift
from the code. The cost had not been stated anywhere — **a comment in `src/` is
no longer only a note to whoever is reading the code. It is published.**

Two habits that are harmless in a source file turn out not to be harmless on a
page, and the documentation routine measured both.

**A record number reaches a reader who cannot open the record.** The maintainer,
on the reference:

> *"I don't think docs should reference internal decisions (like "(0007)"). The
> casual reader would not know what those are."*

The docs lane fixed the half it could. `readerFacing` lifts a citation out —
`(0014)`, `, inherited from 0009` — and where the number is part of the grammar
there is nothing to lift, so the summary is **withheld entirely** rather than
paraphrased. Ten summaries were being withheld, nine of them this lane's. The
same rule applies inside a signature, where a union's member comments are
published verbatim: four signatures were losing annotations the same way.

Withholding is the right behaviour for a generator and a silent one for an
author. *"0049's three theme ids, honoured on the root node."* is a good comment
and it appeared on the site as nothing at all, with no failure anywhere.

**A module's opening paragraph is doing more work than its author knows.** The
reference lifts it under the module's heading, so it stands in for every export
underneath that says nothing of its own. A file without one leaves each of those
exports as a bare name and a signature. 28 modules in this lane had none — 13
entry-point barrels with no comment at all, and 15 whose first comment was
attached to a declaration rather than detached from it by an empty line.

That empty line is load-bearing and invisible. **Declaration emit drops it**, so
by the time a comment reaches `dist/` a module's opening paragraph is
indistinguishable from documentation for whatever export happens to be first —
which is how `TREE_SCHEMA_VERSION` came to be described as "the persisted
document". The generator therefore reads the blurb from `src/`. Nothing enforced
the convention it depends on.

## Decision

**A doc comment in `src/` is written to a stranger, and two rules follow.**
Both are asserted by `src/documentation.test.ts`, over `src/` rather than over
`dist/`, because both facts are visible only in the source.

**1. A decision-record number may appear only as a parenthetical citation.**
`(0014)`, `(0053, 0055)`, `(see 0012)` — a footnote, liftable, and the sentence
reads the same without it. Making the number the subject is what puts a sentence
beyond rescue, so it is refused at the point where it is cheap to fix.

**The check is deliberately narrower than the generator's.** `readerFacing` also
strips a trailing attribution clause — `, inherited from 0009`. This permits
only the parenthetical. Narrower is the safe direction: everything this permits,
the generator lifts. Were it wider, a comment could pass here and still vanish
from the site, which is the failure the check exists to prevent. The two
comments written in the trailing form were rewritten to the parenthetical, so
the repository now has one shape rather than two.

**2. Every module opens with a paragraph about the module**, detached from the
first declaration by an empty line. Not because every file deserves an essay —
most of these are two sentences — but because one paragraph is the cheapest
documentation in the repository measured per export it reaches.

**Two directories are excluded, each named in the test with its reason.**
`src/primitives/` is another routine's lane; it currently fails both rules and
the gaps are filed in `FINDINGS.md` for its owner, so deleting its entry is the
one-line change that follows them being closed.

`src/cli/scaffold-fixture/` is excluded on a different ground: **it is not
source.** It is the exact output of `loom init`, committed so that a change to
what a new project starts from fails a test rather than passing silently, and
`scaffold-fixture.test.ts` holds it byte-for-byte against the template. A
paragraph added there either breaks that assertion or becomes a sentence about
Loom's own fixtures that every scaffolded project carries. This was found by
adding one and watching the fixture test go red, which is the check doing its
job.

## Consequences

Measured on the regenerated reference, before and after:

| | before | after |
| --- | --- | --- |
| module groups with a paragraph | 147 / 165 | **164 / 165** |
| exports rendering as a bare name and a signature | 29 | **1** |
| exported symbols carrying a summary | 254 | 261 |
| signatures with member annotations dropped | 4 | **0** |

The one remaining module is `primitives/loom.prose`, which is the other lane's.

**The convention is now cheap to follow and impossible to forget.** Cite a
record in parentheses and the site handles it; write it as the subject and
`pnpm verify` says so, in the file, before the pull request. An author never has
to know how the generator works.

**Nothing in `dist/` changed shape.** Every edit in this record is a comment. No
signature, no export and no behaviour moved, which is why a change touching 50
source files is reviewable: the diff is entirely prose.

**`reference.generated.json` is regenerated here**, in the documentation lane's
directory. It is the mechanical output of `pnpm docs:api` over this lane's
comments and nothing else was touched in that lane; leaving it stale would have
meant the sentences this record is about not actually reaching a reader. Filed in
`FINDINGS.md` for that lane's owner.

**A cost worth naming: the check reads every doc comment in the lane on every
`pnpm verify`.** It is 188 files and about 20ms, which is a rounding error today
and would stop being one if it grew a TypeScript program. It deliberately does
not have one — it is regexes over source text, which is why it is fast and why
it cannot tell an exported declaration from an internal one. It therefore holds
internal comments to a rule they do not strictly need. That is accepted: a rule
with an exception nobody can see from the file they are editing is worse than a
rule applied slightly too widely.

## Alternatives considered

**Leave it to the generator and fix the comments once.** Rejected because it has
already regressed once by the same mechanism: the blank-line convention was
being followed by 158 of 188 files with nothing enforcing it, and the numbers
were reaching the site through a channel — signatures — nobody had noticed until
the reference was generated. A one-time cleanup of a convention nothing checks
is a cleanup that has to be done again.

**Put the rule in the docs app, beside `readerFacing`.** Rejected on lane
grounds and on merit. The convention is a property of how this package writes
its comments; a check that lives in a surface would fail on a `src/` change and
point a framework author at a file in someone else's directory.

**Share the citation grammar between the two — export it from the package, or
lift it into a tool both import.** Rejected as more coupling than the problem
needs. A shared regex would make the docs app depend on the runtime for its
text processing, or add a build-time tool for one pattern. Keeping the source's
rule strictly *narrower* than the consumer's gets the same guarantee with no
shared code: the failure mode of divergence is that this check refuses something
the site would have accepted, which is a comment rewritten unnecessarily rather
than a sentence silently lost.

**Rewrite the withheld sentences in the generator instead.** Rejected by the
docs lane already, and rightly: a generated reference that paraphrases the
package is one that can be wrong about it, and the only reason it can be trusted
is that the words are the package's own.

**Require a paragraph only on modules the reference reaches.** Rejected. It
would exempt the 13 entry-point barrels — the files a developer opens first to
see what `@loom/runtime/store` *is* — and it would make the rule depend on the
export map, so moving an entry point would silently change what is required of a
file. An exception-free rule cost 13 short paragraphs.
