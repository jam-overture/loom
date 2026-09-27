# 2026-09-27 — "Which page the AI was wrong about"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-37-which-page-the-ai-was-wrong-about` (→ `main`), cut from
`main` at `9ad8385`. Not stacked, and `main` was not pushed to.

**Maintainer comments: none to address.** One pull request was open when this run
started — #419, the documentation lane's — and it is not this lane's. There is no
open portal pull request, no review comment on this lane's work, and nothing has
been filed against this lane since the 26 September report.

**Visuals** — a production build of each commit, photographed by a server started
*after* that build, in a signed-in browser, against one staged deployment. The
two files have different `md5`s, which is the check the 26 and 27 September
entries exist to force.

- [`/portal/trust` — before](2026-09-27-portal-which-page-trust-before-wide.png) —
  1280px, full page. Six wrong claims, and **not one of them says which page it
  was about.** Three of the rows carry the Gate's own sentence in italics on the
  surface. No row has a disclosure at all.
- [`/portal/trust` — after](2026-09-27-portal-which-page-trust-after-wide.png) —
  1280px, full page. Every claim names its page; a new list of the pages the AI
  misjudged sits under the groups; every row has the record one click down.
- [`/portal/trust` on a phone — after](2026-09-27-portal-which-page-trust-after-phone.png)
  — 390px, `scrollWidth 390 / innerWidth 390`.

---

## What was asked, and why this rather than the plan

`FINDINGS.md` first, as the procedure says. Nothing outranked it: no open pull
request of this lane's, no maintainer comment, nothing filed against this lane in
a day. So the choice came from the brief's own list of where the value is, and its
second entry is the sharpest sentence in it:

> **Calibration** — where the AI's own confidence has proven wrong. Nothing else
> in the ecosystem can show this, and it is unreadable today.

It is not unreadable any more — three runs have rebuilt that screen — so the
question was what it still cannot answer. Reading `_lib/calibration-misses.ts`
against the screen that renders it turned up the answer in its own header:

> "The 0.9 band delivered 50%" does not say *which* 0.9s, what they were trying to
> do, **or what refused them** — and those are the only facts that tell anyone what
> to change.

The module then computes a fourth fact nobody asked it for and the screen threw
away: **`treeId`.** Which page.

## The defect

`MissedClaim` has carried `treeId` since the day it was written. No part of
`/portal/trust` has ever rendered it.

So a reader who opened this screen and found six overconfident claims could read
what each one was trying to do, how far out it was, and which rule caught it — and
could not find out whether all six were about one page or spread across six. Those
are opposite situations with opposite next moves: one is a page to go and look at,
the other is a gate floor to think about. **The screen looked identical either
way.**

Two smaller things on the same row, and both are the governing principle, once in
each direction:

1. **The row dropped facts rather than demoting them.** `proposalId`, `intentId`,
   `policyId` and the cause's own code were all computed, all carried on the claim,
   and all discarded. The row had **no disclosure at all** — on the one screen
   whose useful next move is to go and read a change on `/portal/activity`, which
   is a screen you find a change on by its id. *Nothing is ever removed* is the
   half of the rule a row with no disclosure cannot keep.
2. **The row put the Gate's own sentence on the surface.** `claim.detail` is the
   runtime's verbatim account of a refusal — *"removing 9 nodes cannot be undone
   from this log: loom.card at n_prices7"* — rendered in italics, unasked. The
   technical record out in front, and the plain fact a reader wanted missing.
   That is the inversion the whole redirection turns on, and it is in the before
   picture three times.

## What shipped

| | |
| --- | --- |
| `_lib/calibration-misses.ts` | `MissedPage`, `pagesInMisses`, `pagesWithMisses` — grouping and two numbers, no store |
| `_lib/page-order.ts` | `"most-wrong-first"` and `mostWrongRank`, the portal's sixth order |
| `_lib/page-views.ts` | `pageViewHref` exported — one view of one page, as an address |
| `trust/_components/wrong-pages.tsx` | new — the list of pages the AI misjudged |
| `trust/_components/missed-claim.tsx` | the page on the row, and the disclosure the row never had |
| `trust/_components/missed-claims.tsx` | threads the names down; reads them once |
| `trust/page.tsx` | one bounded fan-out for the names, unscoped view only |
| `every-page-list.test.ts` | the pin: a seventh list of pages exists |

### The list, and why the whole row is the press

Everything else on `/portal/trust` is about the AI. The verdict is a rate, the
bands are how the rate was computed, and the groups name a *kind* of change the AI
keeps misjudging. All of it is true and none of it names a thing a reader can
open. *Which pages it was wrong about* is the section that does.

Each row leads to **this same screen scoped to that page** rather than to the page
itself. `/portal/trust` has read a `tree` parameter since it was written; a reader
who has just been told the AI is unreliable about a page wants the rest of *this*
answer about it — the bands, the verdict, the policy breakdown, all of it narrowed
— and the strip on the scoped view is one press from the page anyway.

### The order, and why the count is the whole rung

`mostWrongRank` negates the count, exactly as `mostChangedRank` does, and ties fall
to the shared tiebreak. The alternative was to break ties on the worst claim, and
it is rejected on the rule `page-order.ts` is written under: **every order here
ends on the shared tiebreak**, so that two screens agree about the pages they have
nothing to separate. Two pages holding three wrong claims each *are* two pages this
screen cannot separate, and slipping a second numeric key in front of the name
would make this the one list in the portal whose tail nobody else can reproduce.
The worst claim is on the row either way, which is where a reader comparing two
equal counts is actually looking.

The sentence is *"Pages the AI got most wrong come first."* — **wrong about**
rather than **worst**, because the sweep already owns that word for a page that
does not add up, and a page the AI misjudged is not a page with anything wrong
with it. The section says that out loud rather than implying it, on the surface
rather than in the disclosure: 0031 makes calibration a reader, and a heading
saying *which pages it was wrong about* is one short step from reading as a list
of bad pages.

### What the read costs

**One bounded fan-out over the distinct pages a miss happened on, on the unscoped
view only.** `pagesWithMisses` returns each page once, so a page contributing six
claims costs one read — there is a test asserting the length rather than only the
contents, because a duplicate there is a store read nobody asked for. A screen
already scoped to one page has named it above, so the read is **skipped** rather
than made and discarded, and the per-row page line is suppressed with it. A failed
read costs the name and nothing else: `namesOf` answers for every id it was asked
about, so a row still lists, still links and still shows its id.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**Which of their pages the AI cannot be trusted about — and, pressed, that page's
whole track record.**

- **The repository cannot answer it.** A confidence is a number a model stated
  about a change to a stored tree; a refusal leaves no commit, no build output and
  no file. Every fact this section is built from exists only in the journal.
- **`git log` cannot answer it.** Five of the six claims in the picture *changed
  nothing* — they were refused or discarded — so there is nothing in any history
  for them to be in. That is the whole of what §6 exists for and it is the one
  advantage no other tool in this ecosystem has.
- **A log file cannot answer it either**, which is the sharper claim. A server log
  holds the events; it does not hold the join. This screen pairs a stated
  probability with what actually became of the change, keeps only the claims whose
  outcome *contradicted* the claim, and then groups those by the page they landed
  on. Nothing outside a fold over the journal can produce that, and nothing else
  knows what the pages are called — the name is derived from each page's own
  leading heading at its head revision, so it is the name a visitor is currently
  being served.

The honest scope: this run adds no new fact to the record. It renders one the
record already had and this screen was discarding, and it stops the row throwing
away the ids that let a reader cross to `/portal/activity`.

## The high-schooler test

Applied to `/portal/trust`, which is the one screen this branch touches.

- **"Which pages it was wrong about."** Passes. Four ordinary words and a noun a
  person has.
- **"Autumn prices · 3 wrong claims · worst was 96% wide of the mark."** Passes.
  Nothing on that row is a word the runtime owns, and the two figures answer
  different questions — how often, and how badly.
- **"The wrong claims above were spread across 3 of your pages."** Passes, and the
  one-page case gets its own sentence rather than a count that reads the same
  either way, because those are the two readings the section exists to tell apart.
- **"This says nothing about the pages themselves — a page here is one the AI
  misjudged, not one with anything wrong with it."** Passes, and it is the one
  sentence here that exists to stop a reader drawing a conclusion the data does not
  support.
- **"Pages the AI got most wrong come first. After that, every list here is in the
  same order: by name."** Passes.
- **What do I do now?** Answered for the first time on this screen. Before this
  branch `/portal/trust` had no link out of it except the empty state's; a reader
  who agreed with everything on it had nowhere to go. There are now three presses,
  one per page, ranked.
- **The disclosures** — *What the record says about this one*, and *Why this
  order* — are where the runtime appears: the ids, the cause code, the raw
  confidence and surprise to two places, the policy, and the Gate's own sentence
  verbatim. Exactly one click, never further.

## What I renamed, and what moved behind a disclosure

Nothing was removed.

| What it was | What it is now |
| --- | --- |
| six wrong claims with no page named anywhere on the screen | every claim names its page, in the metadata line with the outcome and the time |
| `treeId` computed on every claim and rendered nowhere | on the surface beside the name, and again in the record |
| a claim row with **no disclosure at all** — `proposalId`, `intentId`, `policyId` and the cause code dropped | all of them one click down, with the raw confidence and surprise |
| the Gate's verbatim sentence in italics **on the surface** | one click down, in monospace, where it always belonged |
| a screen with no way out of it | three, one per page, ranked |
| `hrefFor`, private to the strip | `pageViewHref`, so a single link and the strip resolve through one table |

**What moved behind a disclosure:** the Gate's own sentence, and the four
identifiers. Both were *on* the row or *absent* from it; neither was demoted from
a surface a reader had been using.

**What I deliberately did not rename.** Any route, heading or rail label. This
unit adds one fact to a row and one section to a screen; a rename in the same
branch would make the diff about two things.

## Two decisions a screenshot made, and neither had a failing test

The sixth consecutive run in which looking at the screen found what the suite
could not. Both are the same root cause and it is worth naming because it will
catch the next lane: **Tailwind's preflight sets `a { text-decoration: inherit }`,
so a bare `<Link>` in this portal is drawn as plain text with no affordance at
all.**

1. **The page name on a claim row was a link and did not look like one.** The
   first picture came back with *"Autumn prices t_prices"* rendered
   indistinguishably from the sentence above it — the only pressable thing on the
   row, invisible. It is **not a link** now: the page is identity, it sits in the
   metadata line where the front door's waiting card puts the same fact, and
   `WrongPages` below is the one destination, once per page rather than three
   presses to one place.
2. **The list's rows were name-sized links.** Same fault, same picture. They are
   bordered rows that fill on hover now, with the name and both figures inside the
   press — which is `/portal/pages`' shape exactly, and makes the target the size
   of the row rather than the size of a name. There is a test asserting the
   count and the figure are *inside* the link.

## The author rule, fourth instance, and the check that caught it

Worth a section rather than a line, because it is the clearest case yet for why
the rule is written about the act.

**I committed with `git -c user.name=… -c user.email=… commit`** — the exact
spelling the 24 September entry names, filed by this lane against itself after
the 20 September entry had already filed the `--author` spelling. I read that
entry *after* pushing, while looking for what a preview URL needs.

Then I ran the check the entry prescribes, which is the part that worked:

```
git log -2 --format="%an <%ae>"   →  Claude <noreply@anthropic.com>
git config user.name / user.email →  Claude / noreply@anthropic.com
```

**The override is byte-identical to the session's own configured identity**, which
the same entry established does deploy (#385 went straight to *"Vercel is
deploying your app"*). So nothing was lost this time, and the commits were left as
they are: re-committing would produce identical author fields and a new sha for no
observable difference.

That is the uncomfortable half and the reason it is written down. **The act was
harmless only because the value I typed happened to equal the value I would have
got by typing nothing** — which is exactly the coincidence that teaches the next
run the rule does not matter. It does. The entry's last paragraph names the real
answer, a `pre-push` hook comparing the head commit's author against the
repository's configured one, and says it is not a surface lane's to install. It
still is not. But this is the fourth instance, and the third one caught by a
person reading a finding rather than by anything mechanical.

## Tests

All numbers are real runs. `pnpm verify` was redirected to a file with its exit
code written by the last command on its own line and read from a second file —
never through a pipe, and nothing after the gate on the line (the 12 and 25
September findings).

| | `main` at `9ad8385` | this branch |
| --- | --- | --- |
| `pnpm install && pnpm verify` | — | **green, exit 0** |
| `@jam-overture/loom` | 165 files / 3,216 tests | **165 / 3,216** — `src/` was not opened |
| `@loom/app` | 312 files / 5,425 tests | **313 / 5,467** |
| findings | 847, 0 malformed | **851**, 0 malformed |
| prerender | — | 114 pages, 1,300 junctions, 0 run together; 3 metadata conventions, 0 unserved |
| overflow, measured | — | 1280 vs 1280 wide, 390 vs 390 phone |

**+42 tests, +1 file. Nothing failed, nothing was skipped, and no test was
weakened.** `git diff origin/main -- src/` is empty.

What each group would catch:

- **`pagesWithMisses` asks for no more reads than there are pages** — asserted on
  the length, not only the contents, because this function's whole purpose is the
  read it drives.
- **The grouping partitions the claims**, losing none and inventing none: every
  claim is in exactly one group, no group is empty, no page appears twice, and
  every claim in a group belongs to that group's page. That is the property that
  keeps two views of one fold from describing different windows.
- **`worstSurprise` is the head of the group and not a `Math.max`.** `missesOf`
  sorts worst first, so a group built by walking it keeps the order — and a second
  reduction would be a second definition of *worst* that could drift from the sort.
  There is a test that a page's worst claim is its own and not the window's.
- **`mostWrongRank` leaves equal counts to the shared tiebreak**, asserted through
  `inPageOrder` on two pages with equal counts and different names, which is what
  fails if somebody adds a second numeric key.
- **The list leads with the most claims, not the worst single claim** — on a
  fixture where those two disagree, which is the only fixture that can tell the
  rung from the fold's own order.
- **The lane-wide pin.** `every-page-list.test.ts` found this component the moment
  it existed, by the one thing React makes compulsory, and held it to both rules —
  it goes through `page-order.ts`, and it says which order it is in. The first
  draft **failed** that guard, because the screen was arranging and the component
  was rendering; the arrangement moved into the component, which is the shape the
  guard exists to force and is better than what I wrote.
- **Both ends of the plain-language rule on one render:** every row and the heading
  are free of the runtime's vocabulary, and the disclosure beside them is full of
  it. There is a test that the record holds every id, the cause code and the Gate's
  sentence, and a test that the Gate's sentence is **not** on the row.
- **A page the store could not name still lists, still links and still shows its
  id** — on both components, because a missing entry means a failed read and never
  a missing page.

### The two existing assertions that changed, and why neither is a weakening

`missed-claims.test.ts`'s *"keeps the Gate's own sentence rather than paraphrasing
it"* asserted the sentence was present. It still is — it now asserts it is present
**inside the disclosure**, which is strictly more than the old test checked: the
old one would have passed with the string on the surface, which is the defect.

The two id assertions moved from `getByText` to `getAllByText` with a count,
because a tree id is now on the surface *and* in the record. Both are right and a
count is what says so; `getByText` was throwing on the ambiguity rather than
failing on a fact.

## Findings

**Filed four. Closed none** — nothing this lane owns was closed by this unit, and
saying so is cheaper than stretching one.

1. **The plain-language sweep cannot see a runtime sentence that arrives as a
   value.** The instance is fixed here; the hole is not. `_test/surface-text.ts`
   collects `JsxText` nodes, which is why it beats a regex, and
   `{disposition.reason.detail}` is a `JsxExpression`. Both that and *the record is
   not swept* are deliberate, and they compose into a blind spot neither intended.
   Recommendation in the entry: **sweep the callers, not the values** — the
   runtime's describers are a closed list of about eight names, and a reference to
   one of them outside a `<TechnicalDetail>` subtree is the defect. It would have
   failed on `main` this morning.
2. **A refusal read back out of the record can name the rule and never the
   reason.** `ARCHITECTURAL — needs review`, for `Loom daily build`. `Disposition`
   and `AssessmentSummary` store no `factors`, so `refusal.ts`'s middle layer runs
   only on a write the reader has just performed. The live hazard is
   `cannotBeDrawn`: 0173's and 0179's floors arrive under the same reason code as
   *too risky*, so every record-reading screen tells a reader their settings
   blocked a change that cannot be made at all — which sends them to
   `/portal/rules` to loosen a rule that, loosened, would commit a broken page.
   **No record was written by this lane**, per the escalation rule; the
   recommendation is `factors` on `AssessmentSummary`, optional and never
   defaulted (0045).
3. **The recommendation this lane has carried for three reports names the wrong
   three primitives.** Checked today rather than repeated: `loom.action`,
   `loom.button` and `loom.link` all take their label as **child text** and each
   says so in its own description, so `textIn` and `part-name.ts` already read
   them. The live finding is the second half of `Loom demo`'s 10 September entry,
   which this lane owns: `textIn` misses copy held in **props**, which is
   `loom.stat`'s `figure`/`label`/`caption`, `loom.quote`'s
   `quote`/`author`/`role`, and every primitive following 0052 — so the set
   widens. A change removing a band's three headline numbers reports *no words at
   all* in the review queue. Filed with the two other open items the same field
   would close, including `page-name.ts`'s hard-coded `TITLE_BEARING`. The
   declaration is the framework's; filling it is the primitives lane's; **no
   record was written by this lane.**
4. **The staging preload, eighth consecutive run** — re-filed by reference with
   one measurement and one trap. The measurement: this run had to seed a **second**
   carrier, 30 hand-built journal records for 6 claims, because `/portal/trust`
   reads the journal rather than the store. The cost of not having this is growing.
   The trap: `NODE_OPTIONS="--import ./stage.mjs"` fails, because the harness
   spawns the server with the application as its `cwd` while `NODE_OPTIONS` is
   inherited from the shoot process at the repository root — an absolute path is
   required, and the server otherwise dies before serving anything.

## What I did not do

**I did not re-derive the stake factors.** Finding 2 explains why: the delta is on
the episode and the tree is in the store, so the portal *could* assess the change
again — against today's tree and today's policy, neither of which judged it. A
reason presented as a record and computed from the present is the same defect 0028
refuses when it declines to fold a tree from its own snapshot.

**I did not touch `src/`.** `git diff origin/main -- src/` is empty.

**I did not scope the list.** On `/portal/trust?tree=…` the section is absent
rather than a list of one, and the per-row page is absent with it — the heading,
the lead sentence and the strip all name that page already.

**I did not rank the pages by their worst claim.** The argument is in
`page-order.ts` and above.

**I did not build the staging harness.** Third run in a row that this lane has
declined to put it in a branch about what a reader is shown, and the reason is
unchanged: a branch that is two things is a branch a maintainer has to review
twice.

**Nothing is scheduled and no pull request is subscribed to.**

## Recommendations

1. **The caller sweep, finding 1.** It is about eight names and one ancestor check,
   it needs no exemptions, and it closes a hole that has been open since the sweep
   was written. Cheapest thing on this list and it is this lane's.
2. **`factors` on `AssessmentSummary`, finding 2.** It is the difference between a
   review surface that can explain a refusal and one that can only name a rule,
   and it is the brief's own first value area — *the review queue: what is waiting,
   **why***. It is the framework's to write.
3. **The staging harness, finding 3.** Eighth run. Roughly 200 lines now.
4. **A `copy` declaration on a primitive definition, finding 3.** Not the
   recommendation this lane has been carrying — that one named the three
   primitives that do not have the problem, which is what checking it turned up.
   One field closes three open items across two lanes, and it is the framework's
   to offer.

**On that last one.** The previous three reports listed it as a recommendation and
none of them filed it. It is filed now, corrected, and the ten minutes it took to
check is the whole argument: a recommendation repeated is a recommendation nobody
owns. This lane has written some version of that sentence four times, and this is
the first run that acted on it.
