# The place a fix-list row says to go to

**`Loom signals`, 10 November 2026, evening run.**
Branch `signals-83-the-place-a-row-says-to-go-to`. Record
[0378](../decisions/0378-a-fix-lists-row-carries-the-place-its-pages-reading-stopped-and-the-fourth-reading-cannot-take-a-row-away.md),
`Accepted`. `pnpm verify` **EXIT=0**, read out of a file. Pull request
[#855](https://github.com/jam-overture/loom/pull/855); preview
<https://loom-git-signals-83-the-plac-f6758f-jpizzolato36-6341s-projects.vercel.app>,
which Vercel reported `Building` as this was written — nothing in this change
reaches the site, and this session's network policy does not reach
`*.vercel.app`, so the deployment's own status is the evidence rather than a
fetch of the page.

## What this run completed

**A fix-list row said *rewrite this page* and named no part of the page.** The
figure that says where was one join away and keyed on the same trio, and this
lane filed the gap on the evening of 9 November, the day the fourth order
landed. It was the top of the queue this morning and it is closed.

`AgendaRow.unread` is the page as the order of places has it —
`PageUnread`, carried whole and unchanged — so the sentence an operator reads is
*rewrite this page, and here is the one place worth starting at*, out of
counters that already existed.

**It is the same object the fourth order published, not a second reading of one
page.** `windowAgendaOf` already built `WindowAgenda.unread`; it now hands that
reading to `deploymentAgendaOf` rather than the fix-list deriving its own. A
screen drawing the order of places and the fix-list over it therefore holds one
answer about one page, which is the guarantee the conversion row beside it has
been carried under since 0336. Asserted with `toBe`, not `toEqual`.

### The two locations on one row are two different questions

This is the part that made the finding a record rather than a field somebody
adds:

| field | the sentence | what it needs |
| --- | --- | --- |
| `row.order.at` | *a third of the readers who got this far stopped between these two parts* | both ends reported: a ratio of two reach counts (0250) |
| `row.unread.at` | *the reading goes no further than here, and nineteen parts are behind it* | nothing beyond it reported at all (0377) |

They can name different parts of one page, and on a page with no fall only the
second exists. A drawer that printed one under the other's heading would be the
plainest kind of wrong, which is why `progress.ts` keeps the word *stop* and
nothing in `frontier.ts` or `unread.ts` uses it. Both member comments are
written to be lifted onto a screen, and the hazard is filed for `Loom portal`.

### The decision that was not specified: the fourth reading cannot take a row away

The finding named three things a fix had to settle and all three went the way it
recommended — a required fifth argument, no new `AgendaWork` member, `first`
left alone. **The fourth thing was not in the entry and it is the whole of
0378's argument.**

The three readings `deploymentAgendaOf` already takes are each *required for a
row*: a page some side does not name has no row at all, and the mismatch is
counted in `unpaired`. Applying that rule to a fourth reading would mean **a
places reading of the wrong window could delete rows from the fix-list** — the
page it cannot say *where* about would stop being a page it says *rewrite*
about. That is the worst failure available to this join, because the fix-list is
the artefact that says there is work at all.

So the fourth reading is **required as an argument and powerless over a row**:

- a page it does not name keeps its row, with `null` where the place would be;
- pages it names that no row carries are counted in `unpaired.unread`, which is
  the same claim the other three make;
- `null` on a row means **only** that the reading did not name the page — never
  that the page has nothing unread, which is `standing` `whole` on a row that is
  there.

The asymmetry with the three readings above it is deliberate and is stated in
the record, in the module docblock and in the member comment, because it is the
kind of inconsistency a later run would otherwise tidy into a bug.

### Nothing else moved, and it is asserted rather than argued

One test builds the same join twice — once with the places reading, once with a
places reading of nothing — and holds `subject`, `work`, `trees`,
`duplicated`, `first`, `rows`, `page`, `converting`, `collection` and
`contested` identical. In the same fixture the fix-list's first row and the
deployment's worst place are **different pages**: one loses sixty readers at a
fall, the other hides three parts behind one band. Two questions, two answers,
one list.

That keeps 0377's open question open. Whether `DeploymentAgenda.first` may ever
name a place rather than a fall is a judgement about a screen, and it is now in
the state where it is cheapest to answer: a screen can draw both and see which
reads better, with nothing to rebuild either way.

**No figure is summed.** `DeploymentUnread` already publishes the deployment's
places and its parts, so a total here would be a second answer to one question
(0327). The published key set of `DeploymentAgenda` is asserted as a list,
because the way such a figure arrives is somebody adding one field.

**Counted once on the fourth side too.** A places reading holding one page twice
is deduplicated on `readingKeyOf`, the first row stands, the second is counted
in `duplicated`, and the row carries the first rather than the second copy —
which is the double-count case this lane's standard requires and the one
permanent mistake available here (0158).

## Why this unit, and the cap it was chosen around

**The pull request before this one from this lane is held on a docs cap, and
this unit publishes no new name.**

`Loom merge` discarded the merge of #851 (§82, the two folds of a day) because
`build.test.ts > stays small enough to send` went red: that branch's sixteen new
names took the names index to 40,093 bytes against a 40,000-byte cap. Measured
on `main` this morning and again on this branch:

```
entries 2093   bytes 39852   headroom 148   gzip 11148 of 12000
```

`PageUnread` has been published since §81 and **a field is not a name**, so
`pnpm docs:api` reports *no name is new* and the figure on this branch is
`main`'s exactly. That is why this was the unit to build today rather than
anything that needed a new door.

**It is a workaround, not an answer, and it is filed for `Loom docs`** with the
measurement, the four options as `Loom merge` put them to the maintainer, and
this lane's reading: narrow what reaches the names index, whose cheaper half —
sharding the file per entry point — is the remedy the test's own docblock
prescribes for exactly this moment and needs no product decision.

## Records

- **[0378](../decisions/0378-a-fix-lists-row-carries-the-place-its-pages-reading-stopped-and-the-fourth-reading-cannot-take-a-row-away.md)**,
  `Accepted` — a fix-list's row carries the place its page's reading stopped,
  and the fourth reading cannot take a row away. Nothing superseded; nothing
  here contradicts an accepted record.

## Findings

**Closed:** this lane's entry of 9 November evening — *a fix-list row says which
page to rewrite and not where on it, and the place is now one join away* —
closed by this branch, with a note on the one thing the entry did not anticipate.

**Filed:**

1. **`Loom portal`** — a row now carries two locations, and a drawer that
   printed one under the other's heading would be wrong. With both sentences,
   the three further fields the drawer gets free (`standing`, `costs`/`share`,
   the whole `frontier`), and the one refusal to carry over: `null` is not
   *nothing unread*.
2. **`Loom docs`** — the names index has 148 bytes of headroom, it is a merge
   gate for four surfaces, and the next lane to publish a handful of names takes
   it red. Measured twice today; it has already cost this lane a unit.

## Test numbers, as the gate reported them

`pnpm verify` **EXIT=0**, read out of `verify.exit` in its own command rather
than off a pipe, a notification or a summary.

| | files | tests |
| --- | --- | --- |
| framework package | 280 passed (280) | **6,829 passed** |
| application | 473 passed (473) | **7,622 passed** |
| total | 753 | **14,451** |

**+8 tests and no new file.** The two files this unit touches went from 65 tests
to 73, measured on each side: all eight are in `src/signals/agenda.test.ts` and
`src/signals/window-agenda.test.ts`. Nothing failed, nothing was skipped and no
test was weakened — the existing assertions that changed are each either an
`unpaired` shape gaining its fourth key or a call gaining its fifth argument.

These totals are not comparable to the ones in #851's comment this morning:
`main` has taken #850, #852 and #853 since, and this run did not re-run the gate
on `main` to produce a second figure for a number three merges had already
moved.

**Mutations run by hand against the new unit**, four, all killed:

| mutation | what fails |
| --- | --- |
| require the places reading for a row (drop it where the reading is short) | *keeps every row where the order of places is of another window* |
| `unpaired.unread = places.size - joined.size` instead of `- placed` | the same test: −1 where 0 is right |
| drop `places.duplicated` from `duplicated` | *drops a page a caller handed in twice on either side* |
| carry a copy of the row rather than the object | *carries the row the order of places published, and not a copy of it* |

## What reaches a reader's browser

**Nothing.** `broadcast.ts` and its import graph are untouched — no file in that
graph is in this branch — and the bundle measures **7,543 bytes minified and
3,350 gzipped**, which is the figure `browser-weight.test.ts` holds and what it
measures on `main`.

## On the deferred question

Nothing in this change touches per-reader identity and nothing in it makes
adding the gate-and-record shape later more expensive. The new field is a
reading of a tree joined to a reading of a tree: no `view` key is read, stored
or named by either module, and the audience that travels on the carried row is a
*form of a page* (0263, 0284) rather than a property of a person.

## Open questions

1. **Whether `DeploymentAgenda.first` may ever name a place rather than a
   fall.** 0377's question, left open a second time on purpose. Recommendation:
   leave it to a screen now that both figures ride on one row.
2. **The names cap.** Not this lane's to close, and it is holding #851.
   Recommendation: option 2, as `Loom merge` put it.

## A note on the two open branches from this lane

This unit is on a **new branch off `main`**, not pushed onto #851, which is a
departure from *Procedure* step 3 and is deliberate. #851 is held on a question
only the maintainer can answer, and pushing onto it would put a unit that passes
the gate on its own behind a cap decision it has nothing to do with — while
changing the branch under a *Not merged — needs your decision* comment. The two
branches overlap on `docs/signals.md`, `FINDINGS.md`, `decisions/README.md` and
`reference.generated.json`: the first two are append-only and union-merged, and
the last two are regenerated rather than hand-resolved. This branch takes §83
and 0378, so #851's §82 and its renumbered record fit between them without
either being touched.
