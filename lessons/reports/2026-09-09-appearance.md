# 2026-09-09 — Appearance: the fourth Part V seam, and a property with no owner

**Landed:** `lessons/21-appearance.md` (1,316 lines, seven executed exercises),
Set Z in `lessons/review-schedule.md`, the syllabus row and the Part V paragraph
in `lessons/README.md`, three pinned counts in this lane's own tests, one
`FINDINGS.md` entry, and this report.

`pnpm install && pnpm verify` **green in full** — 1,860 runtime tests across 119
files, 2,579 app tests across 165 files, `next build` prerendering **125 pages**,
up from 122. The three new ones are `/lessons/21`, one held address under it, and
`/lessons/review/set-z`.

**A lesson, not machinery.** Yesterday was machinery (#251, the held addresses),
so this run took the lesson half of the alternation. It is also the first run in
a while where the syllabus had an obvious next item rather than a judgement call:
lesson 20 closed by saying the next Part V seam would be found by applying the
pattern and watching where it did not fit, and the theme seam is what turned up.

## What it teaches, and why this shape

Lesson 21 is about `src/theme` and the render seam that mounts it, and it has two
halves that are deliberately unequal in length.

The **first half is the pattern again**, and the interesting thing about it is
that it is *unremarkable*. A theme is three registered ids on the root under
`loom:theme`; the deployment registers palettes, font packs and style presets;
resolution happens once, from the root, before the walk. That satisfies all three
clauses of lesson 19's pattern — *a name in the tree, an address in a registry,
resolved before the walk* — where lesson 20 broke two of them. And 0049 is dated
10 August, which is before any of the three seams that produced the pattern.

So the lesson opens on the question that fact raises: why did a seam that fits
perfectly not feel like the same thing for three lessons? The answer it gives is
that data, destinations and origins all keep a **value** away from a model, and
this one keeps away a **value space**. A URL is dangerous because of what it
points at. A colour is not dangerous at all; sixteen million values with no wrong
ones is a different problem, and it happens to have the same solution.

The **second half is what the lesson is actually for.** Contrast is not a
property of a colour, it is a property of a pair, and no party holds the pair:

- the tree holds a palette id and a structure, and no colours;
- the palette holds seventeen colours and no idea which are read on which;
- the primitive holds at most one end — `loom.perk` writes `fg-subtle` and paints
  no ground, and 0008 forbids the renderer from enforcing parentage, so any
  surface is a legal parent.

Working out where a property like that can be checked is the subject, and the
answer has three declared parts, each of which had to be declared for a different
reason: the pairings (derived by `registryPairings`, because a hand-kept list
went nine pairings stale), the painted/composed split, and the four text grounds
— which cannot be derived at all, because *a probe can see that `loom.action` and
`loom.page` both set an ink beside a ground and cannot see that only one of them
means it.*

That last point is the generalisable one and I gave it the most room: a check
whose correctness depends on **meaning** needs the meaning declared beside it,
plus a test that the declaration still matches what the components render.

## What I emphasised, and the two things I cut

**Emphasised: the Gate result, because it is uncomfortable.** Exercise D weighs a
re-theme and a title change and they come back identical in every column — `low`,
no factors, reversible, `accepted`. Repainting every pixel of a page is, by every
axis this system measures, the same size of change as adding five characters to a
heading. Most readers will think that is wrong, and the lesson does not soften
it. It names the axis they are reaching for — *surprise* — and says the system
deliberately does not measure it, because surprise is a property of the observer
and lesson 07's argument is that the analysis reports properties of the change.
Then it gives them the composition they actually want: `loom:theme` in the
policy's protected prop keys, and it becomes an ordinary stake factor.

**Emphasised: `a token is a promise about provenance, not about difference.`**
This is the sentence I want a reader to keep, and it is the only one in the
lesson that is worth anything outside Loom. It comes from the 23 August
`loom.emphasis` bug recorded in `separation.ts` — a stressed word rendered
identical to its neighbours because the font pack declares the same weight for
headings and body, with every test passing because every test asked whether the
token was *real*. Reflect closes by asking the reader to find a name in their own
work that stands for a value where the thing they care about is a relationship
between two of them, and say what checks it.

**Cut: the derivation solver, down to one short section.** `derive.ts` is
genuinely interesting — a lightness search against the AA bar — but it is a
build-time tool and a lesson that spent a thousand words on it would be teaching
the library rather than the idea. What survived is 0077's sentence, which earns
its place because it is the same instinct as the rest of the course pointed at a
build step: *a page whose colours are computed at import time is a page whose
colours nobody approved.*

**Cut: the font-pack and style-preset schemas in detail.** Three orthogonal
pieces is stated and demonstrated (Exercise B: seventeen of forty-five variables
move when the palette id changes, and `--loom-scale-5` does not). Beyond that
they are the same argument twice.

## What the exercises turned up

Seven exercises, all executed, transcripts recorded from the run. The extraction
check passes — the eight `ts` fences in Try it concatenate to exactly the file
that produced the outputs above them.

**The house palette is the exercise I am most pleased with.** Exercise E builds a
palette a real host would write — white page, a friendly blue, a soft grey for
secondary text, every slot declared — parses it, registers it, resolves it, and
renders it. Seven painted contrast failures and an **empty diagnostics array**.
White label text on a light blue button at 2.54:1 and nobody objects. Every layer
this course has taught a reader to expect a refusal from lets it through, each
for a defensible reason, and that is the concrete form of "Loom offers the
contrast bar and does not impose it" (0076).

**The unmeasurable half is sharper than I expected.** `house` has 21 measured
pairings and 7 painted failures. Rewrite one slot in `hsl()` and `house-hsl` has
17 measured, 5 failures, 4 unmeasured. **Two real failures disappeared from the
failure list** — not because anything improved, but because the module declines
to parse them. That is the strongest possible argument for `unmeasured` being a
third answer rather than folded into "pass", and it is a number rather than an
argument.

**The equal-luminance pair had to be constructed.** `#b3261e` (brick red) on
`#1d6a4a` (forest green) is **1.00:1** contrast and **ΔE 91.19**. In an
accessibility report that ratio means "these are the same colour"; a reader
disagrees instantly. I searched for the pair rather than guessing one, by fixing
a red and solving for a green of matching relative luminance. It is the whole
argument for the separation audit being a different instrument in two numbers.

**And the two audits disagree in both directions on the same palette.** `house`
collapses `bg-canvas` against `bg-surface` at ΔE 0.00 — both are `#ffffff`, which
is what "white page, white cards" means — so a `loom.section tone="surface"`
paints an invisible band. The contrast audit is *completely silent* about it, and
correctly: white on white is not a legibility question because there is no text
in it. Two audits, one palette, two disjoint sets of complaints. I had planned to
demonstrate this with a contrived palette and did not have to.

**One thing I checked rather than asserted.** `contrast.ts` says that on eight of
the palettes in this library an empty `describePaletteAudit` string would be a
false read. I counted: eight exactly — `bold`, `slate`, `midnight`, `carbon`,
`plum`, `forest`, `ember`, `obsidian`. The claim is current.

**And one thing that looked like a defect and is not.** Seven of the twenty-one
palettes have collapsed peers, `minimal` — which all four surfaces wear — among
them. `separation.test.ts` does not assert the list empty; it pins it *exactly*,
nine entries by name, with a comment saying `minimal` and `loom.link` are other
lanes' files and what the assertion buys is that a tenth cannot join quietly.
That is a pattern worth teaching rather than reporting, and the lesson teaches
it: pinning is the honest move when you have found something you are not the one
to fix.

## Found while teaching

**One, filed.** `src/theme/derive.ts`'s module comment closes by naming
`deriveBrandPalette` as the tool that decides whether a brand colour can be ink
or has to be an area. No such function exists — the identifier appears exactly
once in the repository, in that sentence. Filed in `FINDINGS.md` for
`Loom primitives`. It matters more than its size because of 0080: the comment is
written to a stranger, and it is the paragraph a stranger reaches holding exactly
the problem it describes, ending by telling them the answer exists and naming it.

**Nothing else.** I read `theme/`, `render/theme.ts`, `sdk/pairings.ts` and the
six decisions closely and the rest holds up. Two things I went looking for and
did not find: the "eight palettes" count is right, and the pinned collapse list
matches what `auditSeparation` returns today.

## In my own lane, and fixed here

Three counts in this lane's own files were pinned to a course with twenty-five
review sets, and Set Z makes twenty-six:

- `schedule.test.ts` — the letter string, and the assertion that the last set is
  `Y`;
- `queue.test.ts` — a reader who has done nothing gets 25 entries;
- `syllabus.ts` — a comment saying "five of the twenty-five sets".

All three are the pinning pattern working exactly as intended: adding a set is
supposed to be a decision somebody makes, not something that slips in. Updated
rather than loosened.

## The letters run out here

`SET_HEADING` in `_lib/schedule.ts` is `/^## Set ([A-Z]) — (.+)$/` — one letter.
**Set Z is the last set the parser can read.** Lesson 22's review set has nowhere
to go until that changes, and the change is not only the regex: `ReviewSet.letter`
is a string used for the slug (`/lessons/review/set-z`), the queue's ordering, and
the corrections queue's provenance labels.

This is this lane's own machinery and this lane's own problem. I have not fixed
it in a lesson pull request — a lessons PR that also rewrites the schedule parser
is the kind of thing that makes a PR unreviewable, and this run's unit is the
lesson. **It is the first thing the next run should do**, before writing lesson
22, because writing the lesson first would leave the set unwritable.

The cheapest shape is probably two letters (`AA`, `AB`) rather than numbers,
because it keeps every existing slug valid and the twenty-six existing sets do
not move.

## Where to look

Preview:
`https://loom-git-lessons-30-appearance-jpizzolato36-6341s-projects.vercel.app`

`/lessons/21` is the page. It is worth opening rather than reading the file, for
one reason specific to this lesson: **Predict 2 and Predict 3 are both questions
where the reader's confidence is the interesting datum**, and on the page the
rating is taken before a word of the explanation is visible. Predict 3 in
particular — "which change does the Gate route more carefully" — is a question
most people answer confidently and wrongly, which is exactly the pair the
corrections queue is built to bring back.

`/lessons/review/set-z` is the new set.

## Conflicts

This branch is cut from `lessons-29-the-answer-not-in-the-page` (#251), which is
cut from #249 → #247, which carried #226, #233, #239 and #244. `main` has not
moved since 1 September. **Eight units of this lane are now in one tree.**

#251 said it was the last run that would assume the stack without being told.
This run stacked anyway, and the reason is worth stating plainly rather than
leaving as an assumption: a branch off `main` could not contain lesson 21. It
would carry a Part V lesson with no lessons 18, 19 or 20 above it, a README
syllabus table missing three rows, and a `review-schedule.md` conflicting on
every set from W onward. The alternative to stacking was not "a cleaner PR" — it
was "a lesson that does not make sense".

What I have done instead is make the stack cheaper to close: the pull request
says which six open PRs are wholly contained in this one and can be closed
unread, and asks directly whether to close them.
