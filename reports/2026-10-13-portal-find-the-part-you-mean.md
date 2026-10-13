# Find the part you mean

**Date:** 2026-10-13
**Section:** §5 (portal)
**Branch:** `portal-62-find-the-part-you-mean`

The second of the four things the 12 October audit photographed and no test
could have found, built. `/portal/pages/t_home1` listed all 191 parts of that
page, open, flat, in one column — and the pane that tells you what you clicked
sat underneath them.

## The measurement

Taken on this branch, same build, same page, with only this run's four files
reverted. So the two columns differ by this change and by nothing else.

| | before | after |
| --- | ---: | ---: |
| the whole screen | **5,586px** | **1,438px** |
| the address book | 4,656px | 508px |
| the list itself | 4,594px | 384px, holding 1,256 |
| rows drawn on arrival | 191 | **14** |
| `Nothing picked yet` starts at | y **5,298** | y **1,150** |
| a way to find a part by name | none | a box |

The audit's own table says 5,594px for this screen and this branch measures
5,586px, which is the two parts the page has gained since. Its prose says
*"`Nothing picked yet` is 11,000 pixels below the thing you click"*, and that
number does not square with its table — 5,298 is what the harness reads off the
page, and it is still four and a half screens.

![the list, folded to the page's own sections](2026-10-13-portal-find-the-part-folded-wide.webp)

Fourteen rows: the page, and the thirteen sections in it, each saying how many
parts it is holding. `Showing 14 of 191 parts.` under the box, and
`Nothing picked yet.` directly beneath that rather than four screens down.

## What a reader can do that they could not this morning

**Find a part by name.** Type *action* and the nine actions on this page come
back, each with the rows it sits inside, so a match is located rather than just
listed.

![searching for a part](2026-10-13-portal-find-the-part-searched-wide.webp)

The box matches **the registered type as well as the plain name**, which is the
*technical record is one click away* half of the brief read as a search rather
than as a disclosure: a developer who knows the part is a `loom.card` should not
have to learn that this portal calls it a card before they can find it. That
sentence is in the disclosure under the list, because it is the one thing about
the box a reader cannot discover by typing in it.

**Open a part and see what is in it**, without picking it. Those are two
different things — picking a card scopes a change to that card, opening it says
what is inside — so they are two controls. One control doing both means a reader
cannot look inside a part without also asking for a change to it.

**Get the whole page back**, from a search that found something or nothing.

![a search that found nothing](2026-10-13-portal-find-the-part-nothing-wide.webp)

## Nothing is removed, and here is each place that had to be argued

This is the rule the whole brief turns on, and a folding list is the easiest
place in this portal to break it by accident.

- **A folded row carries the number of parts inside it.** `Section · 36` is a
  disclosure; `Section` with 36 parts silently gone is a filter. That number is
  why the fold is honest.
- **A search shows every match and every row each match is inside.** *Words*
  three levels inside a card is a match that means nothing on its own.
- **The line under the list says how much of the page is drawn** —
  `Showing 14 of 191 parts.` — and the count in the heading stays the whole
  page's, because that is the question it was answering.
- **A part picked from somewhere else unfolds everything holding it.** A reader
  can pick a part by clicking the page in the pane beside the list, and most of
  a page is deeper than the list arrives open to. Without this the list marks a
  row that is not on the screen and silently disagrees with the page beside it.

## The rule for how far it opens, and the two readings that did not survive

> **The list opens as deep as it can without going over a budget of twenty rows,
> and never shallower than the page itself.**

One rule and one constant. It replaced two, each wrong on a page the other one
handled, and both failures were caught by tests rather than by a photograph.

**A fixed depth of two levels** hid the thing a reader wants most on a short
page. On the two-card page `picked-parts.test.tsx` builds, the words inside the
headings sit at depth 3 — so *Autumn* and *Winter* arrived behind two chevrons
while five rows of `Page`, `Card` and `Heading` sat on the screen saying
nothing. Nine tests in another file failed, which is how I found out.

**Opening a short page whole and a long one to a fixed depth** fixed that end
and left the other. This deployment's front door is 191 rows that are *wide
rather than deep* — 1 at the root, 13 under it, 38 under those — so two levels
of it is 52 rows and a box scrolling through 1,256px of content on arrival.
Measured, not guessed. The budget opens the same page to its 13 sections.

The floor matters too: a page whose top level alone is over the budget shows its
top level and goes over, because a list drawn as one row saying `Page` would be
hiding the page's structure rather than disclosing it.

## The box holds its height, and that is a second defect in the same sentence

The audit named two things in one sentence and they are two defects:

> `Nothing picked yet` is 11,000 pixels below the thing you click […] and
> because that panel is a small dashed box when nothing is picked and a tall one
> when something is, the whole column jumps.

The first is fixed and measured above. The **second is untouched** and is filed
— `SelectedNode` and `PickedParts` still change height on the first click.

What this run did fix is the version of it the fold would otherwise have
introduced. The list's height was written as `max-h-[24rem]` first, and the
three measurements say why that was wrong: 346px folded, 384px on a search that
matched, **10px** on one that did not. Everything under the list moved on every
keystroke. It is a reserved `h-[24rem]` now, on a page long enough to fold, and
the two search states both put their line at the same y. A page short enough to
arrive whole gets no reserved height, because there is nothing to fold on it and
a 384px box around seven rows is padding a list out to look like a problem it
does not have.

## What this tells a developer that nothing else can

The tree on this screen is **the page the deployment is currently serving** —
the authored base plus every change that has been accepted since. It is not in
the repository, it is not in `git log`, and it is not in any log: the repository
has the page as it was written, and the delta that moved it lives in Loom's own
journal. The `↑` on a row is the other half, and it is a fact about this
deployment's registry rather than about any file: it says which parts of your
own page a click in the preview cannot reach, and that asking for a change to
them still works.

Both of those were already true this morning. What was not true is that anybody
could find them: 191 rows of *Prose*, *Link* and *Heading* is a list a person
reads by scrolling it. A refusal nobody can read is not an advantage, and
neither is an address book nobody can search.

## The high-schooler test, applied to this screen

> Could a bright high schooler, who has never read a decision record, say what
> happened and what they should do next?

On `/portal/pages/t_home1`, now: *this is my page, it has 191 parts, here are
its 13 sections, that one has 36 things in it, and I can type to find one.* The
primary action — `Ask for a change` with its box and its button — is above the
list and was already there.

**Nothing was renamed this run.** The routes and the screen names were renamed
by earlier ones; the words added here are `Find a part…`, `Showing 14 of 191
parts.`, `No part of this page is called "trombone".`, `Show the whole page
again` and `Show what is inside Nav`. What moved behind a disclosure is 177 of
the 191 rows, each behind a control that says how many it is holding.

## Tests

- `_lib/outline-view.test.ts` — **25 new**, over the reading: the nesting, the
  folded list, the search, and how far the list opens before anybody touches it.
- `tree-outline.test.tsx` — **17 new**, over what a reader can do about it; the
  19 that were there are unchanged and still pass.
- `pnpm verify`: green. Real numbers in the pull request body.

Two things worth saying plainly about the suite. The nine `PickedParts` failures
above were a **real defect caught by somebody else's tests**, not a broken test
— that file renders the outline beside the pane it is testing, so it is the one
place in the lane where a bad default on a short page shows up as a red line.
And a `(docs)` test timed out at 5,827ms against a 5,000ms limit under the full
parallel suite on the first run and passes on its own; nothing on this branch
touches it.

## What is left on this screen

- **The pane heights**, filed — the second half of the audit's sentence.
- **The screen is 506px wider than the viewport**, and it is not this change:
  `scrollWidth 1786 / innerWidth 1280` is byte-identical before and after. The
  cause is in the measurement — `iframe x 457 1280x800` — the preview is drawn
  at its full device width inside a column that cannot hold it. On a phone the
  same thing makes the whole controls column 1,314px wide. Filed, in this lane.
- **Seven tabs across the top** of this screen, which the audit's plan rebuilds
  along with the rest of the inspector.
