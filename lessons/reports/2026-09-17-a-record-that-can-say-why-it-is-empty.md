# 2026-09-17 — Course machinery: a record that can say why it is empty

**Landed:** a new reading of the stored record
([`_lib/reading.ts`](<../../apps/loom/app/(lessons)/_lib/reading.ts>)), the
notice that speaks for it
([`_components/notice.tsx`](<../../apps/loom/app/(lessons)/_components/notice.tsx>)),
one shared record per page in
[`_components/store.tsx`](<../../apps/loom/app/(lessons)/_components/store.tsx>),
corrected copy on the review queue, the course index and the record page, a
paragraph in [`lessons/README.md`](../README.md), and one finding filed.

**No lesson this run, and no new review set.** The brief permits alternating and
the last four runs are lesson, repair, lesson, lesson; machinery was overdue by
the alternation rule on 16 September and the run that noticed said so in its own
pull request, asked which item to build, and got no answer before this one
started. Rather than wait another day I took that run's own candidate, which is
the smallest and — having built it — the one I would have picked anyway: it is
the course's own subject, one floor down from where the course teaches it.

`pnpm install && pnpm verify`: **green, exit 0.** Runtime 2,697 tests across 153
files; application 4,692 tests across 266 files; 658 findings, 0 malformed; 106
prerendered pages, 834 text junctions, 0 run together. Nothing in `src/` is
touched by this branch, and no existing test was changed except one assertion in
`queue.test.tsx` whose sentence this run deliberately replaced.

**Twenty-one tests added**, in three files: ten in `_lib/reading.test.ts`, eight
in `_components/notice.test.tsx`, two in a new `_components/store.test.tsx`, and
one more case in `queue.test.tsx`.

## What the machinery is

`/lessons` computes everything — what is due, which questions come back, how
often you were sure and wrong — from one string in one browser. That read is
total, and has to be: the value is the reader's own and may have been written by
an older version of this page or edited by hand. Totality bought it this:

| what is true | what the page said |
| --- | --- |
| nobody has done anything yet | *No set is due today. That is the schedule working, not the schedule empty.* |
| the record is on the reader's other machine | the same sentence |
| site data is blocked, so nothing can ever be stored | the same sentence |
| something is stored and nothing could read it | the same sentence, and then the next keystroke overwrote it |

The first row is true and the sentence is the most useful one on the page. The
second and third are the page reporting **a fact about the reader that it is in
no position to know** — which is lesson 24's subject exactly, and lesson 26's
remedy shape: the reading now says which of them it is, the way `MarkedHolds`
answers with an `unreadable` list rather than a shorter one.

The fourth row is not a wrong sentence. It is data loss. A value nobody could
parse is still a value somebody might rescue, and `setItem` does not ask.

So `openRecord` returns one of three readings — `read`, `absent`, `unreadable`
with a reason — and two facts beside them: whether a write lands, and whether
writing would destroy something. The storage is a parameter, for the same reason
the clock is: three of the five states below can only be produced by a browser
misbehaving, and a test that has to arrange a misbehaving `localStorage` is a
test nobody writes.

### What the reader now sees

- **A new reader** gets *Nothing is due, because nothing is scheduled* instead of
  a reassurance about a schedule that does not exist, and the two doors that
  would give them one: mark a lesson, or bring in a record.
- **A blocked browser** is told before the sitting rather than after. That was
  the whole argument for probing the write rather than assuming it: a browser
  that answers reads and refuses writes renders the course as a clean slate,
  behaves as one, and loses the ten minutes when the tab closes.
- **An unreadable value is handed back and not written over.** The page stops
  saving, shows the string, and offers *Discard it and start a new record*. It
  does not clear the key to unblock itself, because it cannot know that string is
  worthless and the reader can.

The screenshots are beside this report: the queue and the index at their new
empty state, the unreadable notice at 1280 and at 390, and the blocked one.

## The bug this found, which is this lane's own

`useProgress` was not a hook onto a store. It **was** the store: every caller ran
its own `useState`, read the same key, and kept its own copy. That is merely
wasteful while the components are read-only, and `/lessons` is not read-only —
it is the page with the syllabus on it.

So, on `main` today: mark lesson 01 in the syllabus, and the line above it goes
on saying *No set is due for review today*, computed from the record as it was
before the click, until the page is reloaded.

I did not go looking for this. The notice's third test — *say so after a write
fails* — could not pass, because the component that writes and the component that
reports are two components, and two copies of a store cannot tell each other
anything. That is the same failure as the subject of the run, arriving from
inside.

**Fixed here rather than filed**, because it is `apps/loom/app/(lessons)/` and
because the notice does not work without it: one `ProgressProvider` in the
lessons layout, and `useProgress` prefers it. A component rendered without a
provider still gets a working store of its own, which is what every test on this
surface does and what the hook has always promised — no other test file changed.
`store.test.tsx` is the regression: mark the lesson, watch the due line move.

## What I did not build, and why

**Not a prettier reader.** Everything here is something paper cannot do, per the
brief's split. What it adds is not a feature of the course; it is the course
declining to state a fact it does not have.

**Not a detector for a partly-legible record.** `readProgress` drops what it
cannot parse and keeps the rest, so a record with three good sittings and one
corrupt attempt reads as three sittings and says nothing about the fourth. That
is a fifth state and it is genuinely harder: telling it apart means diffing what
was parsed against what was there, and the honest answer is a count of dropped
entries rather than a yes or no. It is also much rarer than the four above, all
of which are one browser setting away. Left alone, and written down here so the
next run does not think it was missed.

**Nothing under `## Answers`, no set, no syllabus row.** This run wrote no
lesson, so `review-schedule.md` is untouched — a new interleaved set is a thing a
new lesson earns.

## Found while teaching

**One finding filed, for `Loom daily build`, and it is a gap rather than a
defect.** `tools/screenshot/plan.ts` gives a shot list two steps, `click` and
`wait`, and every screen this run built is a state the browser is *already in*
when the page loads. None of the three is reachable by clicking, so the pictures
were taken by a twenty-line Playwright script in a scratch directory instead of
by `pnpm shoot` — which is the arrangement
[0116](../../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)
exists to stop being normal.

The fix is one field, and which field is a real decision rather than an obvious
one: a `storage` map is in keeping with the harness's posture that a shot list is
*input* — Zod, `strict`, a misspelling is loud — and cannot reach the blocked
case, which is the state most worth photographing. An `initScript` reaches
everything and is arbitrary JavaScript in a JSON file. I offered both and picked
neither; `tools/` is not this lane's.

**Nothing else.** This run read `apps/loom/app/(lessons)/` and no `src/`, so the
usual crop of framework findings is not here to be had.

## What is next

The machinery question the last run asked is now answered by having done it, and
the answer suggests the next one: **the corrections queue has the same shape of
silence.** It computes *nothing has come back today* from a record, and a reader
with no corrections and a reader whose corrections are on another machine get the
same empty panel. The reading built here is already in the store and already
says which it is; what is missing is one branch in `corrections.tsx`. That is
half a run rather than a whole one, which makes it a good thing to pair with a
lesson.

For the lesson side, lesson 26's closing question is still unanswered and still
the best one on the table: *when your system gives an incomplete answer, what
does the incomplete part look like on a screen — and is there anybody whose job
it is to notice that it is there?* This run is a small instance of exactly that
and does not consume it: `unreadable` in `MarkedHolds` is a list handed back
honestly that nothing in the repository is obliged to render, and now there is a
worked example of what obliging something to render it looks like.
