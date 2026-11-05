# 0353 — The search box sends a reader the sentences of their own section, and the rest of the site by title

**Status:** Proposed

**Date:** 5 November 2026

**Section:** §4c (the documentation site)

> **This record is `Proposed` and the maintainer's to settle.** It changes what
> the search box promises a reader, which is not a thing a scheduled run should
> decide on its own. Nothing in the pull request that carries it depends on the
> answer: what shipped beside it is a measurement and a 251-byte saving, both of
> which are true whichever way this goes.

## Context

**The plain version.** This site cannot take another page. Not *should not* —
cannot: the gate goes red. The reason has nothing to do with the page and
everything to do with the search box, which sends a reader the sentences of
every page on the site so that it can find a phrase in any of them.

There is a ceiling on that: **80,000 compressed bytes, for all five sections'
words together.** The site spends 79,414 of it. What is left is **about 331
words of prose, for every page this site will ever add.** The shortest page
already written here — *Decision records* — is 346 words. The median is about
1,200.

So the next page is red before it is written, and the figure is now derived
rather than discovered: `_lib/search/room.ts` converts each cap's headroom into
words using that section's own measured compression and this site's own measured
bytes-per-word, and the caps print the result when they fire.

**Nine reports have carried this as a question and it has not been answered**,
which is a fair outcome for a question posed as *the box should probably stop
holding every section*. This record poses it as four candidates with a number
against each, because that is answerable in a word.

### Why the obvious remedies are not remedies

**A bigger cap is not one**, and that rule is older than any of these numbers.
It was written in `build.ts` when the published names left the contents file:
*the run that hits it should split the index rather than take the number up.*
The cap is a statement about what a reader's connection is spent on; moving it
when the spending reaches it makes it a record of the spending.

**Splitting further is not one either, and this is what is new.** The words are
already one file per section (21 September). Compression works on one file at a
time, so five files of this site's prose cost **2,786 more compressed bytes than
one** — measured, not estimated. Cutting the runtime's file by page, which is
the remedy its own cap's comment names, makes the bill **larger**. Sharding has
stopped buying headroom and started costing it.

**A shorter page is not one.** 331 words is shorter than anything on the site,
and a page that fits would leave nothing for the one after it.

## The candidates, measured

Every figure is the **compressed bill for a reader who opens the box** — what
the browser really fetches — and the room is for a page in *The runtime*, the
largest section and the one this lane writes in most. Measured on this branch.

| | the bill | room for a runtime page | what it gives up |
| --- | --- | --- | --- |
| **Today** | 79,414 | **331 words** | — |
| **Un-shard: one file again** | 76,628 | 1,909 words | the reader's own section no longer arrives first |
| **Two files: the reader's section, and all the rest** | 77,890 | 1,194 words | a second section opened in a second page load re-fetches the lot |
| **The reader's section only; the rest by title** | **35,928** | **2,305 words** | sentences inside pages the reader is not on |

The third is the only one that scales. The total cap stops describing anything a
reader receives, each section is held by its own 40,000, and the runtime's file
has 4,072 compressed bytes of headroom — about 2,305 words, two more pages at
this site's median, and the same again for every other section.

## Decision

**Proposed: C.**

**What a reader loses is narrower than it sounds, and that is the whole
argument.** The search box ranks in four bands. The first three — title,
section, summary — come from the table of contents, which is 9,970 compressed
bytes, which every reader waits for, and which covers **every page on the
site**. Only the fourth band, *find a sentence rather than a heading*, needs a
section's words.

So under C a reader standing in *The runtime* who types `theming` still finds
*Theming* in *Building with Loom*, by its title and its one-sentence summary,
ranked where it is ranked today. What they do not get, unasked, is a match on a
sentence **inside** that page.

That is a real loss and it should be stated as one rather than argued away: a
reader searching for a phrase they half-remember from a page in another section
will not find it until they ask the box to look wider. What the box offers
instead is an affordance to do exactly that — *the words on the rest of the
site* — which fetches the other four files, costs what it costs today, and
happens because somebody asked for it.

**It is also the honest shape.** The box already arrives in bands and already
tells a reader which ones have not landed. C makes the last band a thing the
reader asks for rather than a thing the site spends 43 KB of their connection
on by default, on the chance that they will.

## Consequences

- **The per-section caps become the caps**, and they are numbers about one
  section, which is a thing this lane writes. The total gzip cap is retired as a
  ceiling and kept as a reported figure: what a reader who asks for everything
  receives.
- **`shards.ts` keeps its argument and loses the sentence that says the split
  does not buy fewer bytes**, because under C it does.
- **The sentence under *nothing on the site says this* changes.** It currently
  under-claims deliberately — the words count as missing until every section has
  answered. Under C they are *not* missing; they are not asked for, and the box
  has to say which.
- **Room for about two more pages per section, at this site's median length**,
  measured rather than promised.
- Nothing about the tree, the delta model, the registry or the runtime is
  touched. This is one surface's fetching strategy.

## What was not done

**The page this blocked.** `@jam-overture/loom/cli` publishes twenty-five names
and no written page on this site names any of them — filed 4 November, this
lane's own, and the first candidate on its queue. It was costed at about 400
words of plain prose for the shortest honest version and **it does not fit in
331**. It is not written, it is not trimmed to fit, and the finding stays open
with the number in it.

## Alternatives considered

- **Un-sharding the words back into one file.** Buys 1,909 words, which is one
  page at this site's median and then the same conversation again. Rejected
  because of what it gives up rather than what it buys: the reader's own
  section arriving first was bought deliberately in September, and it matters
  more at 77 KB than it did at the 55 KB it was bought at. It is the fallback
  if the loss under the decision above is judged too large.

- **Two files — the reader's section, and a complement holding all the rest.**
  Keeps the ordering for one more compressed kilobyte than un-sharding, and
  buys 1,194 words. Rejected on the cache rather than on the bytes: the five
  per-section files are each useful to every reader, while a complement is
  useful only to a reader standing in one section, so two sections opened in
  two page loads cost the whole corpus twice.

- **A larger cap.** Rejected by a rule older than any of these numbers, written
  in `build.ts` when the published names left the contents file: *the run that
  hits it should split the index rather than take the number up.* The cap is a
  statement about what a reader's connection is spent on; moving it when the
  spending reaches it turns it into a record of the spending.

- **Sharding the runtime's words by page**, which is the remedy that section's
  own cap comment names. Rejected because it makes the bill **larger**:
  compression works on one file at a time, and five files of this prose already
  cost 2,786 more compressed bytes than one. Sharding has stopped buying
  headroom and started costing it.

- **Writing a shorter page.** Rejected because 331 words is shorter than
  anything on this site — the shortest is 346 — and a page that just fitted
  would leave nothing for the one after it. This is the alternative a careful
  reader of the failing cap reaches on their own, which is why `room.ts` prints
  a sentence saying it is not the remedy.
