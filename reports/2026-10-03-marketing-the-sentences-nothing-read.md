# 2026-10-03 — marketing: the sentences nothing read

A third of the largest page on this site had no rule over it. Not because
anybody decided it was out of scope — because every rule in this lane that
reads copy was written against the function that happened to be in front of
whoever wrote it.

![the record panel before](2026-10-03-nothing-read-before-refused.png)

Rung 3, on `main`. One sentence, fifty words, a colon and four semicolons, in a
rung of a five-step rail. It is the heaviest change this site can be asked for
and the record names all five reasons it was refused.

![and after](2026-10-03-nothing-read-after-refused.png)

Same five facts, six short sentences, nothing dropped.

---

## Two functions return a page, and the rules read the wrong one

`treeFor` is the page as it is **published**. `pageTreeFor` is the page as it is
**served** — on `/how-it-works` that is the page with the record of whatever the
visitor asked for standing on it, built by running a real request through the
whole sequence.

Measured across all three routes, both deployments and every request a visitor
can make:

| | the page as written | the page as served |
| --- | --- | --- |
| strings a reader reads | 194 | **253** |
| words on `/how-it-works` | 862 | **1,318** |
| words on the site | 2,516 | **2,972** |
| widest band | 259 | **638** |

**59 strings and 456 words with no rule over them**, and the copy budget was
reporting a 259-word widest band on a site that serves a 638-word one.

### What the two plain-language rules actually missed

Both were added on 1 October, both against `treeFor`, and both read a list of
six prop names. Two holes, and between them they covered the site.

| | found | the rules saw |
| --- | --- | --- |
| strings carrying an em dash | **12** | **0** |
| scanned fields over 35 words | **10** (36 to 57 words) | **0** |

Of the twelve em dashes, seven are text nodes — a list of prop names cannot read
a paragraph — and the other five are props on a page `treeFor` never builds. All
ten over-long fields are rungs of `loom.milestone-list` on the served mechanism
page, which is **the one band on this site that is literally a list of steps**,
the shape the rule's own docstring was written for.

Nothing was red. Both readings are valid pages, every assertion passed, and the
figures in this lane's last three reports were each understated by about 450
words.

---

## What shipped

| file | what changed |
| --- | --- |
| `_lib/served.ts` | **new** — every state this site can be served in, 126 pages, with the measurement in its docstring |
| `_lib/words.ts` | `readerCopy`, which labels every string a reader reads; `sentencesOf`; `wordCountOf` |
| `_lib/voice.test.ts` | both rules over all reader copy in all states; the sentence ceiling generalised from the opening band to the site |
| `_lib/budget.test.ts` | two new ceilings over what a request adds, and the cell and plain-band ceilings swept over served pages |
| `_lib/copy.ts` | `MAINTAINERS_OWN` — the two lines on this site he wrote, verbatim |
| `_lib/adapt/record.ts` | the weighing sentence, the approved verdict line, the undo sentence |
| `_lib/adapt/undo.ts`, `adapt/asks.ts` | the undo's proposal, the proof request's rationale |
| `_lib/chrome.ts`, `questions.ts`, `pages/{see-it-happen,what-you-run,answer}.ts` | five sentences and one button label |
| `_lib/{chrome,readers/counting}.test.ts` | four assertions quoting copy that was rewritten |

No primitive added, nothing under `src/` opened, no component written, nothing
outside `app/(marketing)/`, `FINDINGS.md` and `reports/`.

### The two rules, and why they are two

**A sentence is bounded everywhere.** Thirty words, which is the number
`voice.test.ts` has held every opening band to since it was written, now applied
to every string a reader reads in every state instead of to the first screen. It
is the maintainer's *one idea per sentence*, and it is the rule that works on
generated copy, because a sentence is a unit a template controls.

**A scanned field is bounded where somebody wrote it**, which is the published
tree. This is the judgement in the branch and it is worth being plain about:
**a rung built from a record is as long as the change was.** A request at the
refusal floor fires five of the rules and the record names all five. Capping
*that* at 35 words means either truncating a record — the one thing a site
selling the record may never do — or capping what a visitor may ask for.

So the generated half is held by the sentence rule, and the punctuation is where
it bites. `Weighed as the most serious kind: a; b; c; d; e.` becomes six short
sentences carrying exactly the same five facts, and the before and after above
are what that looks like.

### The maintainer's own lines are now a list

`MAINTAINERS_OWN` holds, verbatim, the two strings on this site he wrote: the
headline of 27 September and the lead under it. It does two things.

It keeps a sweep off them. A run told to make this site read plainly has no way
to tell his sentence from its own, and the one it is likeliest to reach for is
the hero.

And it is what lets the em-dash rule be universal. The dash in his lead
introduces a list rather than pivoting to a second clause, it was kept
deliberately after being photographed at 1280 and 390, and a rule reading *every
string except this one sentence* is a rule that gets edited. A rule reading
*every string except the ones he wrote* is this repository's actual rule, stated
where a test can read it.

**Two lines of his are deliberately not in it.** *"Loom is AI model agnostic.
Choose your preferred model or one of your own."* was given as the register to
match rather than as copy, and the front door says it with a third sentence
added — so that is this lane's sentence built on his, and it is held to every
rule the rest of the site is held to. The list is matched exactly rather than
loosely, which is what makes that distinction mean anything.

---

## The budget's new half

Two ceilings, both stated as quantities of their own so that raising one cannot
loosen an authored one.

| | ceiling | measured | used |
| --- | --- | --- | --- |
| what a request adds to a page | 600 | 456 | 76% |
| a band once a request is answered in it | 700 | 638 | **91%** |

The page and site ceilings are deliberately **not** duplicated: a visitor reads
one page and it is the served one, so `MOST_WORDS_ON_A_PAGE` (1,500) and
`MOST_WORDS_ON_THE_SITE` (3,300) are now held over both readings at the same
numbers. **Neither was raised to do it** — 1,318 against 1,500, and 2,972
against 3,300. The cell and plain-band ceilings are swept over served pages too
and are unmoved at 86 and 99, both authored copy on the front door.

The file's existing *a ceiling is binding above three fifths* clause covers both
new numbers, so neither can be quietly raised to make this green.

---

## The tests, and that they were run against the broken site

Fourteen tests added: six in `voice.test.ts` (67 → 73), eight in
`budget.test.ts` (15 → 23).

**Every new rule was falsified by reverting the thing it exists to catch**, and
each failure names the route, the request state, the field and the text:

| what was put back | what failed |
| --- | --- |
| the semicolon weighing join | *keeps every sentence to one idea* — 3 offenders, naming `/how-it-works (drop-pitch/no/not counting) loom.milestone.body` |
| the footer's em dash | *says it without reaching for an em dash* — 3 offenders, one per route |
| the sweep pointed back at `treeFor` | *read the copy a request puts on the page* — `expected 0 to be greater than or equal to 40` |
| the answered-band ceiling set to the authored 300 | *no band becomes a page once the request has been answered in it* — `expected 378 to be less than or equal to 300` |
| `MOST_WORDS_A_REQUEST_ADDS` set to 0 | *no request adds more to a page* — `expected 178 to be less than or equal to 0` |
| the maintainer's lead reworded | *still renders the maintainer's own line* |

The third row is the one worth keeping. A rule quietly moved back onto `treeFor`
would not look like a failure — it would read a 194-string tree and pass every
other assertion in the file. What it stops being able to see is the 59 strings
that assertion counts.

Both sweeps also assert the state count against the arithmetic `served.ts`
publishes, and the budget asserts the served pages are genuinely different
sizes, because 126 identical trees would pass everything above.

---

## Gate

`pnpm install && pnpm verify` — **exit 0**, on a deleted `dist` and `.next`,
status written to a file as the last thing on its line and read in a separate
command.

| | `main` at `f4d2b9c` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 173 files / 3,560 | **173 / 3,560** — `src/` untouched |
| `@loom/app` | 359 / 6,322, 0 skipped | **359 / 6,336**, 0 skipped |
| the marketing suite | 39 files / 1,010 | **39 / 1,024** |
| findings | 949 | **950**, 0 malformed |
| `prerender:check` | — | 124 pages, 1,461 junctions, 0 run together |
| `pnpm shoot` | — | `1280 / 1280`, `390 / 390` — no overflow |

**Fourteen tests added, all written. Nothing weakened, skipped or deleted.**

Four existing assertions were changed and all four quote copy this branch
rewrote: three in `readers/counting.test.ts` and one in `chrome.test.ts`, each
holding the footer's disclosure by a substring of its old wording. The property
each one checks is unchanged; the substring moved with the sentence.

No decision record. This sets no new prop, adds no primitive, and touches
neither the tree schema, the delta model nor an `Accepted` record.

---

## Findings

**Half closed:** the 1 October entry *the voice check reads props and nothing
else*. The register half is done. **The staleness half is not**, and it is the
more interesting one: nothing holds a paragraph naming a page of this site
against the page that actually carries the thing it names, and `/what-you-run`
still carries the one sentence of that shape.

**Filed:** *three rules in this lane read the tree a builder returns*, with the
measurement above. It is closed for the three rules it names and filed because
the shape is not about copy: a test that reads the input to a function rather
than its output passes for the wrong reason, and this lane learned it once on
24 August and repeated it twice on 1 October with the note directly above the
code being edited.

---

## Open questions

Both are the maintainer's and both are unchanged from the last three runs.

1. **The hero.** Still the only part of the site arguing a build case while
   everything under it argues governance. It is his headline of 27 September.
   It is now recorded as his in `MAINTAINERS_OWN` rather than only in a
   docblock, which is a guard and not an answer.
2. **The word ceiling.** 3,300 is 25% of the 13,208 measured on 26 September,
   the strict end of *"60–75% too much of it"*. The honest figure for the site
   is now **2,972 rather than 2,512** — nothing was added, the earlier number
   was measuring the page as published. That is 90% of the ceiling rather than
   76%, so the question of whether 3,300 was a verdict on a ten-page site or a
   standing limit is now a question with a little less room in it.
