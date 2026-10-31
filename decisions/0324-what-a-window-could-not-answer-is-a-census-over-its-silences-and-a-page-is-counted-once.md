# 0324 — What a window could not answer is a census over its silences, and a page is counted once

**Status:** Accepted

**Date:** 30 October 2026

**Section:** §4c (reader signals)

## Context

[0240](0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)
settled what a reading means when it says nothing. A hundred and fourteen names
across twenty closed sets, each mapped to the **condition** it reports and the
**subject** that condition is true of, so that *the window held no page views*
said by a copy reading and said by a before-and-after reading is one sentence
where the subject agrees and two where it does not. It published
`relateSilences`, which holds two reasons against each other, and
`distinctSilences`, which collapses the readings of one card to the states they
are actually in.

**Nothing has ever called either.** Twenty sets, a relation and a dedup, and the
only file in this repository that imports them is their own test. The reason is
in the shape of the call: `distinctSilences` takes the silences of **one card**,
and the thing an operator holds is a window of forty pages with nine readings
over each. Handed that, it answers *which distinct reasons are in this list* and
cannot answer *how much of my window is dark*, *which page is dark*, or *is this
one door row or forty*.

That is the condition this lane treats as unfinished work rather than as a
feature waiting for a screen: a counter nobody can phrase a question against is
not finished, and this was a whole vocabulary in that state. It is also the
cheapest reading in the subsystem to add, because nothing is collected — the
silences are already published on every reading, and what was missing was the
arithmetic over them.

## Decision

**`silenceCensusOf` takes one entry per reading and groups it twice:** by the
state, which is a condition and a subject, and by the page.
`src/signals/silence-census.ts`, pure, linear in the entries, reaching no store,
clock or DOM.

**One entry per reading, not one per silence.** The argument is
`ReadingSilence[]`, whose `meaning` is nullable — the one way this differs from
`distinctSilences`' argument, and the whole reason the second grouping has a
denominator. A reading that answered is still a reading **of that page**, and
dropping the nulls before the call makes *nine of this page's nine readings are
silent* and *one of one* the same row. The first is a page to fix; the second is
a page that is working.

**A state is one condition about one subject, and nothing else.** The grouping
key is that pair, which is `relateSilences`' `one-state` written as a string.
Two readings that spell one state collapse to one entry and the entry keeps the
**first** reading's vocabulary, so that reading's own sentence can still be
printed — `distinctSilences`' rule, unchanged — with every vocabulary that
reported it published beside it. Two readings that agree on the condition alone
stay two entries, for 0240's reason: the narrower is not evidence for the wider,
and the wider does not say which side it is about.

**What a reason cost is two numbers, and they are not each other.** `readings`
is how many readings it took. `forms` names the pages, **each once however many
of that page's readings report it** — the rule
[0271](0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md)
already applies to a fault in a deployment's collection, where a page is counted
once however many faults it has. One page whose nine readings are all
`unmeasured` is nine readings and one page; nine pages with one each is nine and
nine, and the remedies differ.

**The page is a form and not a tree.** Keyed by `formKeyOf`
([0290](0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md),
[0293](0293-a-comparison-pairs-pages-by-form-and-the-pairing-rule-is-published-beside-the-reading-rule.md)),
because two forms of one page are two readerships and a tree alone is not one
page. A census keyed by the tree would report one page where two forms were
dark.

**A reading of no one page is counted apart, as `wide`.** A library census and
an order over a deployment's pages are of something larger than a page, and a
reading's subject is not its scope (0240) — so attributing their silences to a
form would be a guess. They are counted in their own group and in each state's
own `wide`.

**No ranking.** The states are not comparable in what they cost: a page's
`no-view-reported` takes every reading of that page, where a library's
`nothing-of-the-kind` takes one row of one census and means *this deployment
does not use that kind of part*, which is not a fault at all. The counts are
published, the order is the order the readings were handed over, and a surface
that means *most readings* or *most pages* sorts by the figure it means. That is
the shape this lane settled for a verdict it could not take honestly — publish
the figure, let the operator read it — when a sweep could prove a retention
promise kept and not tight (0321).

**No total of pages across the states.** One page is in as many states as it has
reasons, so a sum over `forms` counts it once per reason, and a count that has
been added cannot be unadded
([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
What is published instead **partitions**: every silent reading is in exactly one
state, so the states' `readings` sum to `silent`, and every reading is in
exactly one group, so the form rows' and `wide`'s readings sum to `readings`.
Both identities are published as tests rather than described.

**No sentence of its own.** A state is a condition and a subject, and
`silences.ts` already prints a line for each. The only thing a third sentence
would add is the counts, which is pluralisation and belongs to whoever draws the
screen, in whatever language it is in.

## Consequences

- **The silence vocabulary is answerable over a window**, which it was not. *How
  much of this window is dark, for how many distinct reasons, and which pages*
  is one call off silences every reading already publishes.
- **The sentence worth leading a screen with now exists**, and it is the form
  grouping rather than the states: a page whose every reading is silent is a
  page to fix, and until there was a denominator there was no way to say so.
- **`relateSilences` has a caller and a tie.** The key is the pair rather than a
  call to the relation, because a call would turn a grouping into a scan per
  entry; the two are held together by a test over a window built to produce both
  ways the key could disagree with the relation — the device that holds a DDL
  default to the constant that spells it.
- **A surface may still print a reading's own words.** Nothing is renamed and no
  set is superseded; the first vocabulary travels on every state.
- **It is not a member of `windowAssemblyOf`** (0322), because the assembly
  produces readings and does not call the thirty-nine readings over them. A
  caller that wants a census maps its own readings' `silence` fields through the
  matching `meaningOf…Silence`. Discoverability is the part that does not hold,
  and it is filed rather than solved.
- **Nothing reaches a reader's browser.** No payload field, no column, no
  migration, no store method, no new kind, and `broadcast.ts` is untouched.

## Alternatives considered

**Widen `distinctSilences` in place.** The smallest change: add the counts to
what it returns. Rejected because its argument is the wrong shape for the
question — it takes `(SilenceMeaning | null)[]`, with no page on an entry and
therefore no denominator and no way to say which page a reason cost. Changing
that argument would change every call it has, which today is a test, and would
leave the one-card call it is right for worse. It keeps its shape and the census
is built over it.

**Rank the states by what they cost.** What an operator wants and what this
cannot honestly give. A state's cost is in two units, the two orders disagree,
and a third of the conditions are not faults — `nothing-of-the-kind` at the top
of a screen, above a missing door row, would be a true number answering no
question. Rejected in favour of publishing both figures, which is what 0321's
finding recommended the last time this lane could not take a verdict.

**Attribute a deployment-wide reading's silence to the pages it covered.** A
library census silent for `unplaced` is, in a sense, about every page in the
window. Rejected: that is an inference about which pages, the reading does not
make it, and it would put pages in a state's `forms` that no reading said
anything about — the same error as reading a subject for a scope, which 0240
names.

**Key the census on the tree and let the audience ride along.** Simpler rows and
one fewer concept. Rejected for the reason 0293 exists: two forms of one page
share a tree, so the second form would be dropped as a duplicate where both sit
at one revision. A census that under-reports dark pages is the one direction
that matters here.

**A `FormSilences` standing — `answered`, `partly`, `dark`.** The closed set this
subsystem reaches for by reflex. Rejected as a threshold nobody asked for: the
useful line is drawn at `silent === readings` and a surface holds both numbers,
so the set would be a judgement in the framework about where *partly* begins,
plus a fifth name to keep in step with the other twenty sets.
