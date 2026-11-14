# 5 November 2026 — this site has room for 331 more words, and its shortest page is 346

**Routine:** `Loom docs` · **Branch:** `docs-78-no-room-for-another-page` ·
**Section:** §4c

No open pull request from this lane at the start of the run. #758 and #765 have
merged; the four open were #776 (`Loom marketing`), #775 (`Loom signals`), #773
and #766 (`Loom daily build`) — none of them this lane's, and none of them
touching the `(docs)` route group.

**No maintainer comment is outstanding for this lane.** Branch cut from
`origin/main` at `f44fa58` (#777), after `git fetch origin main`.

![What this site has room to say next: the search box's compressed bill at 79,414 of 80,000, the 586 bytes left converted to 331 words, set against the shortest, median and longest pages already written here, and the four candidate remedies with the room each buys](2026-11-05-docs-no-room-for-another-page.svg)

## The plain version

**This site cannot take another page.** Not *should not* — the gate goes red.

The reason has nothing to do with any page. The search box sends a reader the
sentences of every page on the site, so that it can find a phrase inside any of
them, and there is a ceiling on how many bytes that may be: **80,000 compressed,
for all five sections' words together.** The site spends **79,414**.

Turned into the unit a page is actually written in, that is **about 331 words,
for every page this site will ever add.** The shortest page already written here
— *Decision records* — is **346**. The median is about **1,200**.

So the page this lane came to write was red before it was written, and that is
the whole of today's work: saying so in a number rather than a worry, saying it
where a run will meet it, and putting a decision in front of the maintainer that
can be answered in a word.

**The run that came to write a page did not write one.** What that page needed
is in *Needs your input*, and it is not more time.

## Nine reports said *the search box is near its cap*. That was not an answer

This is the tenth consecutive run of this lane to end on the search index, and
the first at which the index stops being a worry and becomes a blocker. The
nine before it carried a sentence like *79,662 gzipped against a cap of 80,000*
and a recommendation phrased as *the box should probably stop holding every
section it has fetched*.

Two things were missing from that, and both of them are why it has gone
unanswered for nine runs.

**It was never converted into the thing being decided.** Nobody writes a page in
compressed bytes. *338 bytes of headroom* is a fact about a file; *331 words,
and the shortest page here is 346* is a fact about the next page, and the second
one is answerable.

**And it was one option, not a choice.** A recommendation that asks somebody to
agree the box should be different, without saying what the alternatives cost, is
a request for a design decision rather than a decision.

## So the room is derived, in words

`_lib/search/room.ts` answers *how long may the next page be?* Three figures turn
a compressed cap into words, and **every one of them is measured rather than
typed**:

- **How well a section's words compress.** Between 2.7× and 7.2×, because
  sixteen reference pages built from one set of bands repeat themselves and
  hand-written runtime pages do not. The section's own ratio is used, because
  that is the file the new words land in.
- **What a word of this site's prose weighs.** 5.324 bytes, measured over the
  prose itself — so an em-dash and a curly quote cost what they weigh rather
  than one character each.
- **Which of four caps fires first.** Chosen by converting each to words and
  taking the least, because two of them are compressed and two are not and
  their headrooms are therefore not numbers of the same kind.

A typed figure for any of the three is a figure that was right the day it was
typed. This lane filed that defect against itself on 2 November and met it again
in a comment on 4 November; the remedy both times was to derive the number or
delete it.

| section | room for a page | the cap that binds |
| --- | --- | --- |
| Getting started | 303 words | the bill for all five |
| Building with Loom | 326 words | the bill for all five |
| The runtime | 331 words | the bill for all five |
| Architecture | 289 words | the bill for all five |

**The same cap binds everywhere**, which is itself the finding: a section's own
file has room — *The runtime* has 2,305 words under its own 40,000 — and none of
it is reachable, because the number that fires is the one about all five
sections at once.

## And the caps now say it rather than printing a number

A cap firing used to read `expected 80631 to be less than 80000`. It now reads:

```
loom: every section's words are 79,414 gzipped bytes against a cap of 80,000, so
a page in The runtime has room for about 331 more words. The shortest page
already written here is Decision records at 346. **A shorter page is not the
remedy and nor is a larger cap** — what has to change is how much of this site's
prose the search box sends a reader, which is a decision about what the box is
rather than about any page. The candidates are measured in decisions/0353.
```

Three sentences, and the order is held by a test: **what failed**, then **the
room in words**, then **that trimming is not the remedy**. That last clause is
the one worth the module. Without it the honest, careful conclusion a run
reaches from the first two sentences is *write a shorter page* — and it is
wrong, because 331 words is shorter than anything on this site and a page that
just fitted would leave nothing for the one after it.

**The clause is printed only while it is true.** A site with room for two pages
should say the number and stop talking; a message that always warns is a message
that stops being read. That is a branch, it has its own test, and the assertion
that the real site is in the *full* state is written to **fail when 0353 is
answered** — so the run that lands the remedy has to come back and say what the
site's state is now, rather than leaving the warning to outlive the condition.

This is the 4 November entry's instrument, applied to this lane's own gate: a
message is the only part of a test read by somebody who does not know the code,
and the only part nothing checks by default.

## The one saving that was this lane's to make

A section's prose file holds one section's words, and the browser **asked for it
by that section** — so writing `/docs/the-runtime` at the front of all ninety of
its keys is ninety copies of the question. The file now states once what its
addresses are `under` and writes down only what is left; `parseSearchProse` puts
them back on the way in, and nothing downstream can tell the difference.

That is the lesson the published names learned on 19 September, applied to the
other file that was still writing addresses down: *what is written down is a
name and not an address.* The 118 KB that went away then was
`/docs/api-reference/runtime#s-` written out a thousand times.

| | raw | compressed |
| --- | --- | --- |
| `origin/main` | 254,709 | 79,665 |
| this branch | **249,486** | **79,414** |
| saved | 5,223 | **251** |

**251 compressed bytes is small and is reported as a saving rather than as a
remedy.** It took the room from 201 words to 331, which is not a page. It is
here because it is the only reduction available that changes nothing a reader
can tell, and because leaving it unmade while asking the maintainer for a
decision would be asking him to pay for something this lane could have paid for
itself.

A landing page's key is the empty string, because a landing page *is* the
section and nothing is left of its address. That is the same empty string
`DOCS_LANDING_SLUG` names in `nav.ts`, and it is handled by name rather than by
accident.

## Decisions taken that were not specified

- **The room is answered per section, not for the site.** A page is written in
  one section and lands in one file, so *how long may the next page be* has a
  different answer in each — and today the answers are nearly identical only
  because the cap that binds is the one about all five. A single site-wide
  figure would hide that, which is the fact the fix depends on.
- **The caps moved into source and the test reads them.** They were literals in
  `build.test.ts`, which was right while nothing else asked what they were. A
  failing cap now has to name the number it failed against inside a sentence, so
  the number is stated once — the move `api/extract.ts` already made with
  `SIGNATURE_CAP`. The values are unchanged and no assertion was loosened.
- **The average compression ratio, not the marginal one.** The marginal ratio is
  the more accurate figure and it cannot be quoted without naming the page it
  was measured with. The two were measured against each other: the gap is under
  4%, and it runs in the direction of the average being the more conservative,
  which is the right direction for a figure somebody is about to spend.
- **`room.ts` is cached, and the comment says it is not an optimisation.**
  Weighing one section means building the whole index — thirty-five MDX files
  off disk and seventeen reference pages rendered — and then compressing it. One
  sentence asks for that a dozen times and the caps build the sentence ten
  times. Uncached, the gate's message cost more than the gate: two tests timed
  out at five seconds each on the first run.
- **The record is `Proposed` and the pull request will therefore not be merged
  by `Loom merge`.** That is the intended cost. Nothing in the branch depends on
  the answer, and a lane that is blocked on a decision should not quietly land
  half of it and carry on.

## Records

**One added, `Proposed`, none superseded.**
[0353](../decisions/0353-the-search-box-sends-a-reader-the-sentences-of-their-own-section-and-the-rest-of-the-site-by-title.md)
— *The search box sends a reader the sentences of their own section, and the
rest of the site by title.* Four candidates with their measured bill and the
room each buys, recommending the third.

Nothing here touches the tree schema, the delta model or an `Accepted` record,
so it is not escalated as `ARCHITECTURAL`. It is `Proposed` because it changes
what the search box promises a reader, which is not a scheduled run's to decide.

## Cross-lane diff

**None.** Every file changed is inside `apps/loom/app/(docs)/`, plus
`FINDINGS.md`, `decisions/` and this report with its visual. Nothing in `src/`,
nothing in another surface's route group, and no primitive was wanted that does
not exist.

## Findings

**None closed.** The 4 November CLI-page entry stays open and now carries a
dated note saying it is **blocked rather than queued**, with the number: the
page costs about 400 words and there are 331.

**Two filed:**

- **Open, and the maintainer's** — this site has room for about 331 more words
  of prose in total, which is less than its shortest page. The entry carries the
  measurement, the three remedies that are ruled out with numbers, and the
  choice in 0353.
- **Open, `Loom daily build`'s** — `src/cli/index.ts` opens by saying the module
  is *scaffolding a new project, and driving a proposal from the terminal
  against the same runtime a server would use*. The second half is not true:
  `parseArguments` accepts `init`, `add primitive` and `--help` and nothing
  else, and the command's own `--help` describes itself as scaffolding. Found
  while costing the page about this import. **It reaches no reader today** and
  that was checked rather than assumed — the generator reads the sub-modules'
  docblocks and not the index's, so the string is in no generated file and on no
  page. Recommendation: delete the clause rather than widen the CLI.

### Standing entries this run met again and did not duplicate

- **`*.vercel.app` is denied by the environment's egress policy** (12 October,
  open). Nothing was fetched from the preview.
- **The composed preview URL** (16 October). The URL below is taken from the
  `vercel[bot]` comment rather than guessed from the branch name.
- **The commit author line** (23 October). `git config user.email` checked
  before the first commit: `noreply@anthropic.com`.
- **Mutation testing before the first commit** (27 October). Followed, and it
  cost something this time — see below.
- **A screenshot taken while the merge gate is running turns the gate red**
  (29 October, this lane's own). Followed.
- **Never let anything run after the gate on the same line**
  (`docs/routines.md`). Followed — the status was written to a file as the last
  thing on its line and read in a separate command.
- **A number taken from another lane's growth is not this lane's number**
  (2 November, this lane's own). Met: the compression ratios and the
  bytes-per-word figure are derived at the moment they are used, and the four
  cap values are the only typed numbers added.
- **The prose index is near its total cap** (26 October, open). This report is
  about it. The entry is superseded in substance by today's, which carries the
  measurement it asked for.

### What the mutation discipline cost, and why it is worth saying

The 27 October rule is *commit the unit before the first mutation, and restore
with `git restore --source=HEAD`*. Both halves were followed and the second one
**ate a test**: a mutation survived, the right remedy was an assertion rather
than a code change, the assertion was written — and then the next mutation ran,
whose restore step is `git restore --source=HEAD -- "apps/loom/app/(docs)"`, and
took the new test with it. The commit afterwards reported a clean tree.

It cost two minutes because the next commit said *nothing to commit* and that is
a loud failure. The rule it adds is the obvious one and it was not written down:
**a test written in answer to a surviving mutation is committed before the next
mutation runs.** Noted here rather than filed, because it is a thing a run does
and `docs/routines.md` is where those live — this one is small enough to be a
sentence in a report until it happens twice.

## Test numbers

### Seventeen mutations, seventeen killed

Each applied on its own against the branch's committed code, restored with
`git restore --source=HEAD -- "apps/loom/app/(docs)"`, with the suite re-run
between. **Run in full again against the branch head `1151adf`**,
because two of them caused test changes and a mutation run that precedes a fix
no longer describes the code.

| what was put in | what failed |
| --- | --- |
| the compressed headroom is spent as if it were raw prose | the repeating-section case |
| a cap already over offers negative room | the negative case |
| the cap with the *most* room binds | **3** |
| the remedy clause is printed whatever the room | the would-fit case |
| the remedy clause is never printed | 2 |
| the remedy comes before the room figure | 2 |
| a sentence names a section by its slug | the English case |
| a landing page counts as a page, so it can be the shortest | **3** |
| the shortest page becomes the longest | the shortest-page case |
| a byte is counted as a character | the file-as-served case |
| one compression ratio is used for every section | the repeating-section case |
| the bill for all five sections stops being a cap | **3** |
| `fits` compares the room and the shortest page the other way round | 2 |
| a section's keys stay whole addresses | **3** |
| a file does not declare what its addresses are under | **6** |
| the browser does not put the section back onto an address | **6** |
| the section is put back and left on, so a second parse doubles it | the round-trip case |

**Two survived on the first pass**, and in both cases the code was right and the
test was silent:

- **The shortest page became the longest.** Every assertion in *names the
  shortest page somebody has written here* was satisfied by the longest page on
  the site — it has words, it is in a section, it is not a landing page. It did
  not say *and nothing here is shorter*, which is the claim. The sentence would
  have read *the shortest page already written here is Where content comes from
  at 3,021* and nothing would have gone red.
- **The prefix was put back twice.** A parsed prose file's keys are whole
  addresses, so it reports itself as under nothing — and that is the field,
  rather than a convention, that makes the round trip safe to repeat. Keeping
  the prefix killed nothing, because every test in the directory does one round
  trip and a second one would have produced
  `/docs/the-runtime/docs/the-runtime/…`.

### The gate

**`pnpm install && pnpm verify` — exit 0**, read out of a file written as the
last thing on its line, with nothing piped into `tail` or `tee`.

**The first run of it was red, and the harness said it was green.** The
background task's own completion notice reported exit code 0; `verify.exit`
said `EXIT=1`. That is the fourth instance of the pattern `docs/routines.md`
names — *whatever tells you the gate passed is not the gate; the file is* — and
the second time it has been the harness's notice rather than a pipe. It cost one
gate re-run and nothing else, because the file was read as well as the notice.

The failure was real and it was this branch's. `0353` laid its alternatives out
as a table and then prose leading with a bare `**A**`, and the *Architecture*
section reads the **Alternatives considered** section out of every record to
show what each ruling turned down. It expects a bold lead that names the
alternative, so it read `A` as the name of one and the length assertion said so
— `0353: expected 1 to be greater than 3`. **The record was rewritten in the
house shape rather than the test being touched**: the table moved up into the
context, where a person reads it and a parser does not, and the section is five
bullets. That is the check doing exactly its job on the first record this lane
has added in a while, and it is the reason the costs page cannot show a short
list of roads not taken and look complete.

| | on `main` at `f44fa58` | on this branch |
| --- | --- | --- |
| framework | 258 files, **6,215 tests** | 258 files, **6,215 tests** |
| application | 406 files, **6,561 tests** | 407 files, **6,577 tests** |
| of which `(docs)` | 144 files, **2,220 tests** | 145 files, **2,236 tests** |

The application baselines were measured in this session, on `origin/main`,
rather than taken from another lane's report. The framework figure is the
branch's and is identical by construction rather than by measurement: nothing
under `src/` changed, which `git diff origin/main -- src/` confirms is empty.

**12,792 pass in total. +16 tests, all of them this lane's** — 14 in
`room.test.ts` and 2 in `build.test.ts`. **Nothing failed in the green run,
nothing was skipped, and no test was weakened.** The only pre-existing
assertions that changed are *cuts the words up without losing or repeating one*,
which now measures through the serialise-and-parse round trip rather than over
the builder's own values, and the four prose caps, which read their numbers from
`room.ts` and carry its sentence as their message. The numbers themselves are
unchanged.

- `findings:check`: **1,431 findings, 0 malformed**
- `reports:check`: **2,085 visuals, 147.0MB**, none over 1.1MB
- `prerender:check`: **137 prerendered pages**, 2,030 text junctions, 0 run
  together; 3 metadata conventions, 0 unserved
- `decisions:index`: regenerated, exit 0

### The search index, measured

| | raw | compressed | the cap |
| --- | --- | --- | --- |
| all five sections, `origin/main` | 254,709 | 79,665 | 260,000 / 80,000 |
| all five sections, this branch | **249,486** | **79,414** | 260,000 / 80,000 |
| *The runtime* alone, this branch | 108,299 | 35,928 | 120,000 / 40,000 |

**The cap that binds is the compressed bill for all five**, in every section —
*The runtime*'s own file has 4,072 compressed bytes of headroom and none of it
is reachable. Room, derived: 303 words in *Getting started*, 326 in *Building
with Loom*, 331 in *The runtime*, 289 in *Architecture*. Shortest page here:
346.

## Needs your input

**One thing is blocked on you, and it blocks this lane's queue rather than this
pull request.**

**0353 — what the search box sends.** The site is full: 331 words of room
against a 346-word shortest page. Four candidates, each measured on this branch:
raise the cap or shard further (refused — sharding makes the bill *larger*);
**A**, one file again, 1,909 words, loses the reader's own section arriving
first; **B**, two files, 1,194 words, makes a second section cost the whole
corpus again; **C**, the reader's section's sentences with the rest of the site
by title, **2,305 words per section**, and the only one that scales.

**Recommendation: C.** The argument that makes it easy is narrower than it
sounds. The box ranks in four bands and the first three — title, section,
summary — come from the table of contents, which is 9,970 compressed bytes,
which every reader already waits for, and which covers **every page on the
site**. Only the fourth band needs a section's words. So under C a reader in
*The runtime* who types `theming` still finds *Theming* in *Building with Loom*,
ranked where it is today; what they lose, unasked, is a match on a sentence
*inside* it, and the box grows an affordance to go and get those.

**One word is enough.** If it is C, this lane builds it next run and the CLI page
after it. If it is A, that is one page of room and the same conversation in a
fortnight, and it would be better to know you would rather have the bytes than
the ordering.

**Three carried, none blocking.** `baseRevision` still has a rule forbidding it
in an opening and nowhere on this site to be looked up, and it still waits on
whether the reference pages are being cut up. Whether a list-shaped export may
be given a list-shaped presentation (22 October). Whether a produced table on
this site should be composed from the library rather than arranged locally
(#709).

## The preview

*Taken from the `vercel[bot]` comment after the pull request was opened, not
composed from the branch name.*

https://loom-git-docs-78-no-room-for-da0609-jpizzolato36-6341s-projects.vercel.app

Nothing on it looks different, which is the point — the two pages the search
box is reached from are unchanged:

- https://loom-git-docs-78-no-room-for-da0609-jpizzolato36-6341s-projects.vercel.app/docs/the-runtime
- https://loom-git-docs-78-no-room-for-da0609-jpizzolato36-6341s-projects.vercel.app/docs/search-index/prose/the-runtime

The second is the file this branch changed, served. Its keys are what is left
of each address once `/docs/the-runtime` is taken off the front, and `under`
at the top of it is that prefix.

**There is no screenshot in this report and there should not be.** Nothing a
reader can see changed: the relative keys are invisible by construction — the
test that proves it is a round trip ending in byte-identical addresses — and the
room sentence is printed only by a failing cap. The visual above is the
measurement, which is what this unit produced. The one thing a picture could
have shown is the search box still finding a sentence after the keys changed,
and that is held by assertions instead: *finds a word that only the prose
carries, once the prose has landed* and *shows the sentence a result was found
by, with the typed word marked*, both of which go red when the browser stops
rebuilding an address — which was confirmed by putting exactly that mutation in.
