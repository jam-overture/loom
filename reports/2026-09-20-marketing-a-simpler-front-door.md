# 2026-09-20 — marketing: a simpler front door, and a label that stopped promising failure

The maintainer read the site mid-run and said two things:

> *"I think we need to simplify the marketing page. It is too busy. Also I don't
> like the menu option 'When it goes wrong'. That gives it the wrong message."*

He sent a picture of the bar. Both are answered here, on the same branch as the
run's earlier unit rather than a second one.

![the front door, 1280×900](2026-09-20-marketing-a-simpler-front-door.png)

---

## The menu option

`When it goes wrong` is now **`What can happen`**, at `/what-can-happen`, and it
is **off the bar**.

The page is unchanged and it is a good page. What was wrong is what six words
can mean to somebody who reads them *before* anything has explained them: **four
of the five endings are the product working, not failing.** A refusal is the
rules doing their job. A label promising *wrong* on the way in teaches a stranger
to read all five as damage, and it is the only label on the site that leads with
the bad outcome — beside *What you run*, *What readers do* and *Who can ask*, it
reads as the one apology in a row of statements.

`What can happen` is what the page actually says: five endings, four of which
leave the page exactly as it was.

| | before | after |
| --- | --- | --- |
| label | When it goes wrong | **What can happen** |
| path | `/when-it-goes-wrong` | **`/what-can-happen`** |
| title | *When it goes wrong — the four endings that…* | *What can happen — the five ways a request can end, and the four that…* |
| in the bar | yes | **no** |

Every reference in the repository went through one exported constant, so the
rename is that constant, the route directory, and the page module beside it.
Nothing outside this lane names the old path.

Taking it off the bar is the other half of *too busy*: **six links became five.**
The guarantee `inMenu` has carried since 8 September is unchanged and is asserted
rather than assumed — what the bar leaves out, the footer's map carries, marked
as the page the reader is on.

![the bar](2026-09-20-marketing-a-simpler-front-door-bar.png)

---

## The page

**Two bands left the front door.** The rule I cut by: *the page should say each
thing once.*

| | band | wide | phone |
| --- | --- | --- | --- |
| removed | the closing call to action | 316px | 565px |
| moved to `/how-it-works` | *The same thing, twice* | 736px | 1,148px |

| | before | after |
| --- | --- | --- |
| bands between the menu and the footer | 11 | **9** |
| front door at 1280 | 7,224px | **6,172px** (−15%) |
| front door at 390 | 12,724px | **11,011px** (−13%) |

### The closing band was the page's second goodbye

It sat directly under *Where to go from here*, which offers the four surfaces as
four cards. Its own two actions were **See how a change travels** — the hero's
primary action, already on the first screen — and **Read the source**, which the
facts band above it and the footer below it both already carry.

Two consecutive bands whose whole job is *go here next* is the clearest thing
that made the page feel long, and nothing became unreachable by removing one: the
repository is still a card in the facts band and a named group in the footer.

### *The same thing, twice* moved rather than died

That band prints one piece of the page beside the same piece as data. It is a
real proof and I did not want to lose it — but on the landing page it was the
**third demonstration in a row**, and the most technical thing a stranger meets:
a wall of JSON, two screens after a live page rearranging itself and one screen
after a whole framed application.

It is on `/how-it-works` now, after the band about what a change is written
against, which is the argument it belongs to. A reader who wants the proof has
already gone looking for it by then.

**What that cost, said plainly.** Five assertions went with it — the ones that
re-checked the panel after each of the front door's five prepared requests. They
were guarding against the panel describing a page that had moved under it, and
the page it stands on now is not one any request rearranges. The identity
assertion those five protected is unchanged and still runs on the page as served.

### What I tried and the suite refused

I also evened up the four cards in the *Letting AI near your interface* band —
278, 105, 133 and 273 characters looked like carelessness. It is not: that band
is a `loom.mosaic` with `rhythm: "alternating"`, so the first and fourth cells
are **twice as wide**, and `pages.test.ts` holds each wide cell's copy to more
than 1.6× a narrow one. My trim took the ratio to 1.57 and the test said so.

The unevenness is the layout, and the copy is written to it. Reverted.

---

## Three tests that were right for the wrong reason

Moving one band across a page boundary found three assertions that had been
passing on a coincidence. None of them was wrong about what it wanted; each was
reading something looser than it meant, and each stopped being able to tell the
difference the moment a second candidate existed.

| assertion | what it read | what it meant |
| --- | --- | --- |
| *closes the mechanism page* | the first node with `tone: "accent"` | the closing **band** — a `loom.section` |
| *prints one panel per line of the run* | every `loom.code` on the route | the panels **in the two record bands** |
| *is a band of the page* | `BAND.asData`, a front-door name | the band's own eyebrow, wherever it lives |

The second is the one worth keeping. It counted seven code panels across the
whole page; the arriving band prints one of its own, so it read eight. Summing
two bands' panels into one total is a count that fails in both directions — a
stage dropped from the record and a panel added anywhere else would have
cancelled out and said nothing.

---

## Tests

`pnpm install && pnpm verify` — **green, exit 0**, read from a log file rather
than through a pipe. Nothing skipped, no test weakened.

| suite | `main` at `1abfbd7` | this branch |
| --- | --- | --- |
| `@loom/runtime` | 154 files / 2,807 | **154 / 2,807** — `src/` was not opened |
| `@loom/app` | 280 / 4,904 | **280 / 4,899** |
| marketing, within it | — | 38 files / 1,603 tests |

The application total is **five lower than `main`**, and all of it is accounted
for: the earlier unit on this branch added four, the five ask-run assertions on
the moved band went with it, and two navigation assertions on the renamed page
became three. Nothing was deleted to make anything pass.

`findings:check` reads 703 entries, 0 malformed. `prerender:check` reports 107
pages and 858 junctions, 0 run together — the renamed route prerenders exactly as
the old one did.

Three typecheck errors surfaced during the run and each was a real loose end
rather than a compiler quirk: `REPOSITORY_URL` unused once the closing band went,
a test helper unused once its assertions went, and Next's generated route
validator still naming the old directory (`.next/types`, cleared).

---

## What I did not do, and would want a word on

**The two demonstrations are still back to back**, and together they are 2,034px
of the 6,172 on a laptop and 3,090 of 11,011 on a phone — by far the densest
stretch left:

- *Ask this page to rearrange itself* — five prepared requests, run against this
  page
- *Now type one of your own* — the whole demonstration, framed

By the rule I cut the rest of the page by, that is one thing said twice: *watch a
page change*. I did not cut either, because §4d requires the site to **embed** the
demonstration rather than describe it — which is the reason the demonstration is
public at all (0056) — and the brief names the self-rewriting page as the
strongest thing this surface has. Cutting one is a positioning call rather than a
tidying one.

If the page is still too busy, that pair is where the next 1,000px are, and my
recommendation would be to keep the self-adapting band and move the framed
demonstration down to sit beside *Where to go from here*, where a visitor who
wants a turn is already looking.

## Needs your input

- **The two demonstrations**, above. One question, a recommendation attached.
- **Either cut is one word to reverse** — the closing band and the moved band are
  both single lines in `home.ts`.
- **The licence line** (#96). Still the site's one placeholder.

Nothing scheduled and nothing armed.
