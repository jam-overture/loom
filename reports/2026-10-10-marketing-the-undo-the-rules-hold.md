# The undo the rules hold

**Lane:** `Loom marketing` · `apps/loom/app/(marketing)/` · **Branch:**
`marketing-65-the-undo-the-rules-hold` · **Section:** §4d

**Preview:**
https://loom-git-marketing-65-the-un-62ec43-jpizzolato36-6341s-projects.vercel.app
— the one address worth opening on it is
[`/how-it-works?ask=unstick-menu&approve=1&back=1`](https://loom-git-marketing-65-the-un-62ec43-jpizzolato36-6341s-projects.vercel.app/how-it-works?ask=unstick-menu&approve=1&back=1),
which is the state no address on `main` can produce. Not opened from this run:
`*.vercel.app` is denied by the environment's network policy, filed on
27 September. Everything measured below was measured on a production build
served locally by `pnpm shoot --serve`, `built 2026-10-10T11:33:56.101Z`.

## What this run did

The band on `/how-it-works` has a sixth choice. **Stop the menu following me**
asks for one setting on the menu bar to change, the rules hold it, the visitor
says yes, and it lands. Then *Put it back* — and **the rules hold that too**,
and ask the visitor a second time.

That second hold is the whole point of the run. It is the only state of this
site a competitor cannot screenshot, and until today no address could produce
it.

## Why it was missing

The panel has carried a sentence for it since the undo was built:

> *"Nothing has moved. The change is still on the page below and stays there
> until you answer, which is what your rules asked for."*

`STILL_THERE` in `pages/see-it-happen.ts`, written for the state where the rules
stop a putting-back. **No address on this site could reach it.** The five
choices were measured against this page on 1 October and the result was that
every undo on it goes through on its own: the held request removes four bands,
and putting four bands back is an addition, which nothing weighs enough to stop.
So the site demonstrated reversibility only under terms easier than the thing
being reversed, and the sentence sat in the file as a promise with nothing
behind it.

The 1 October entry in `FINDINGS.md` proposed a remedy and ruled it out:

> *"the shape that works is a request that **moves** something protected rather
> than removing something large, because the inverse of a move is another move
> and inherits the same weight. `/how-it-works` has two protected nodes, the
> menu and the footer, and moving either is a worse demonstration than the one
> it would replace."*

Both sentences are true and the conclusion does not follow. **A move is not the
only operation whose inverse is itself.** A setting change is the other one, and
the symmetry is arithmetic rather than arrangement:

- the rules protect the menu, so a setting change on it raises
  `protected-type-touched` at `high`;
- `user-instruction` is let through at `medium`, so the change is held;
- the change that reverses a setting change is **another setting change on the
  same node**, so it is weighed identically and held identically.

No new protected type, no second named policy, and no request invented to make
the point: `loom.nav` has taken `position: "static" | "sticky"` since it was
built, and this site's bar is `sticky`.

## What a visitor sees, measured

Both halves of the claim, photographed. `#see-it-happen` clipped out of a
production build at 1280:

| | picture |
| --- | --- |
| held on the way out, waiting for a yes | `2026-10-10-marketing-held-change-wide.png` |
| **held on the way back**, two cards, the second waiting | `2026-10-10-marketing-held-undo-wide.png` |
| put back, restored | `2026-10-10-marketing-undo-landed-wide.png` |
| the same held undo on `bold` | `2026-10-10-marketing-held-undo-bold.png` |
| and on a phone | `2026-10-10-marketing-held-undo-phone.png` |
| the refusal it pairs with | `2026-10-10-marketing-refused-wide.png` |

**The change is one a reader can see**, which is the part a record-keeping
demonstration most often skips. Scrolled to the band, with the harness reading
the box off the page:

```
held   (?ask=unstick-menu)             nav  x 100 y 0      1080x60
landed (?ask=unstick-menu&approve=1)   nav  x 100 y -3135  ← outside the viewport
```

The menu bar is pinned to the top of the screen while the request is waiting,
and has scrolled away with the rest of the page once the visitor says yes. One
setting, nothing else on the page touched, and the difference is visible without
reading a word.

The weighing sentence is **byte-identical on both records**, which is what
"held on the same grounds" means and is asserted rather than described:

> *"Weighed as heavy. It changes something you marked as protected."*

## The pair, which is the second reason it was worth a run

The sixth choice sits beside the fifth and they ask about the same piece:

| | request | answer |
| --- | --- | --- |
| **Stop the menu following me** | change one setting on the menu | held, lands on your yes, **held again on the way back** |
| **Take the menu away** | remove the menu | refused outright, and a yes does nothing |

One node, two requests, two different answers, on one screen, both pressable.
The band spends three sentences arguing that a set of rules gives graded answers
rather than a yes and a no; this is the argument performed on the thing it is
about.

## A contradiction the sixth request exposed, and the guard for it

`RAISED_BY` turns a stake factor into the clause a visitor reads.
`protected-type-touched` covers two causes — rewriting what is inside a
protected piece, and changing how one is set — and its clause said **"it
rewrites something you marked as protected."**

Accurate for every record this site could previously draw, because only the
first cause was reachable. `unstick-menu` reaches it by the second and nothing
else, so the card said this, three inches apart:

> rung 2: *"…and no word of the page is rewritten."*
> rung 3: *"…it rewrites something you marked as protected."*

It now says *changes*, which is true of both causes. The guard is written as the
property rather than the string, because the string is the thing that was wrong:
**a request whose plan is only settings may not be reported as having rewritten
anything.** Filed with the shape attached — a translation table written while
only some of a code's causes were reachable encodes that fact in its wording and
says so nowhere, and thirteen more clauses sit beside this one.

## Three stale things in this lane, corrected in passing

All three are doc comments inside the files this branch already changed, and all
three were claims a next run would have read as current.

1. **`problem` was declared `landed` and its note said it was the held one.** It
   was held until 1 October, when the choices moved onto a page with no
   protected band for it to move. The note had been wrong for nine days.
2. **`dropPitch`'s note argued from the band it stopped removing**, also on
   1 October. It removes the menu now, and the note explained why the pitch was
   protected.
3. **`dropPrices`**, which the header told a reader to go and see, has not been
   the name of anything for seven weeks.

## And one number that was still typed

`answers.ts` exists because the band told visitors for sixteen runs that four of
the five requests went through on their own when three of them did. Its own
header ends:

> *"a run that adds a sixth choice used to get a page still calling the
> exception singular. Neither can happen now."*

The run adding a sixth choice got a page whose next paragraph opened **"These
five are prepared."** Two sentences counting the choices were derived on
1 October and the third was not, one function away from the two that were. It is
derived now, and asserted from both ends: the page carries the sentence, and the
sentence carries the count read off the list.

## Tests

`pnpm install && pnpm verify` — **exit 0**, read out of a file written as the
last thing on its line.

| | |
| --- | --- |
| `@jam-overture/loom` | 199 files, **4,465** passed, 0 skipped |
| `@loom/app` | 419 files, **7,728** passed, 0 skipped |
| of those, `app/(marketing)` | 46 files, **1,342** passed |
| findings | **1,096**, 0 malformed |
| `prerender:check` | 129 pages, 1,644 junctions, 0 run together |

Five assertions are new or rewritten. Each was checked by planting the defect it
is supposed to catch and watching it go red, and the plants were reverted before
the gate was run:

| planted | what went red |
| --- | --- |
| the setting lands on an unprotected piece instead of the menu | 3 — the declared answer, both new undo tests |
| the undo is weighed by rules that protect nothing | 2 — both new undo tests |
| the card prints the restored sentence over a held undo | 1 — *says the change is still there* |
| the weighing calls a setting change a rewrite again | 1 — *is never reported as having rewritten anything* |
| the sixth choice is taken off the band | 6 — across all three files |

The first plant is the one worth keeping. It is a request that still works, still
changes a setting, and still writes a record — it is simply pointed at a piece
the rules do not protect, which is the version of this unit that would look right
in a screenshot and demonstrate nothing.

One assertion was **loosened on purpose** and it is the one to look at hardest.
`says on the front door that one of them stops and asks` matched the literal
`"stops and asks you first"`, which is the singular, and a second held request
spells that clause in the plural. It now matches either and asserts the tally is
above zero beside it. The property was never the singular; the number comes off
the list the page reads.

## What was not done

- **The hero on a phone**, filed 28 September and owned by `Loom primitives`, is
  twelve days open. Not re-measured this run, because nothing in this branch
  touches it and the last two measurements agreed.
- **`floors.ts` is referenced by three comments in this lane and is not in the
  tree**, and the abstraction one of those comments justifies has one caller.
  Filed rather than fixed: it is a second subject, and which fix is right is a
  real question rather than a tidy-up.
- **The six buttons wrap 5 + 1 at 1280.** Looked at and left. No label short
  enough to fit six on one row exists at this width, the row is built to wrap,
  and the orphan is the refusal, which is the button the band most wants a
  reader to notice.
