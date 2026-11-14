# Marketing — the context this server can honestly set, and the site serving a segment's form

**Branch** `marketing-37-the-context-this-server-can-honestly-set` ·
**Date** 14 November 2026 · **Section** §4d, the marketing site ·
**Lane** `apps/loom/app/(marketing)/`

---

# What was built

No new band, no new page and no copy change. **loomjs.org now passes a render
context and serves a segment's form.** Until today every reader of this site was
served the base page, because the one call on the render path did not compose.

This closes `Loom daily build`'s entry of 13 November — *a site can be served a
segment's form now, and loomjs.org still passes no context, so the only
deployment anybody can look at serves every reader the base.*

**The front door is unchanged, and that is the correct result.** Nothing has
authored a rule or a form for this project in the portal, so there is no segment
for a reader to be in and every reader is served exactly what they were served
yesterday:

![the front door](2026-11-14-marketing-the-context-front-door.webp)

---

# 1. What the finding left to this lane, and what it did not

The framework half was already on `main`. `pageForReader` composes, answers the
segment to file the reading under, and hands back a refusal where the forms
could not be applied. The entry said so and said what was left:

> *"No framework work is left for this. … What this lane decides is which keys
> loomjs.org's server can honestly put in a context, which is a question about
> that server and not about Loom."*

So the wiring is three lines and the judgement is a file.

## The wiring

`live.ts` line 117 was the whole of the old behaviour:

```ts
return livePageOf(await live.pullFor(deployment, key).ready(), built.treeId) ?? built
```

It is now `pageForReader(held, built, context)`, and the `?? built` fallback it
used to spell out happens inside. `liveTreeOf` became `servedPageOf` because it
no longer answers only a tree, and `render.ts`' `servedTreeFor` became
`servedPageFor` for the same reason.

| | before | now |
| --- | --- | --- |
| what the render path gets | a tree | a tree **and the segment it was drawn for** |
| a page the door has no version of | the built page | unchanged |
| a reader no rule matches | the live base | unchanged |
| **a reader in a segment with a form** | **the live base** | **the form, over the base** |
| **a form that cannot be applied** | — | **the base, under no segment, and a line in the log** |

That last row is the property worth naming: **a form that cannot be applied
costs the reader their segment, not their page.** The refusal is logged beside
`reportFailure`, which has been this module's one place for *a pull did not
happen* since it was written; it is now the one place for both.

---

# 2. The judgement: two keys, and why not a third

`readers/context.ts` is new and is the whole of it. The rule it is written to:

> **A key is set when this server was told the answer, and is absent when it
> would have to guess.**

An absent key does not match — `src/audience/rule.ts` calls that *this reader is
not in this audience* rather than an error — so leaving a key out is a supported
state that costs a reader nothing. It is `routes.ts`' own rule about routing
conventions it cannot read, one layer out: *refuse rather than guess.*

| key | where it comes from | set when |
| --- | --- | --- |
| `palette` | the address, via `askedFor` | **always** |
| `device` | `Sec-CH-UA-Mobile`, the browser's own client hint | the browser sent it |

**`palette` is always set, so this server always passes a context.** That is
worth more than the key itself: `segmentOf` answers nothing at all for a context
of `undefined`, so a server that sometimes passed one and sometimes did not
would have two behaviours where this has one.

It is also **this site's own key, and a customer's site would not have it** — the
palette switcher exists because this site is also the demonstration. `device` is
the key shape a customer's server would set, and is the one the portal's own
fixtures are written against.

## What is deliberately not in it

- **No `source`.** Classifying a referrer into *search* or *social* needs a list
  of hosts nobody has decided on, and a referrer can carry a query string that
  says more about a reader than this site is willing to read.
- **Nothing off `User-Agent`.** This is the trade in the finding below.
- **Nothing that says who the reader is.** No cookie, no address, no header
  kept. `context.test.ts` states it as a case rather than a comment: six
  identifying headers go in, and neither their values nor anything derived from
  them comes out.

## The cost of that rule, measured rather than waved at

`Sec-CH-UA-Mobile` is a Chromium feature. **Safari and Firefox send no
`Sec-CH-UA-*` header at all**, so a segment written as *readers on a phone*
reaches an Android reader in Chrome and never an iPhone reader in Safari — on a
marketing site's traffic, likely the larger half of the phones.

That is a real cost and it is taken deliberately. Parsing the user agent would
answer for every browser by inferring a device from a string the browser did not
send to say so, and a reader put in a segment by inference makes the portal's
comparison between two segments a comparison between one real group and one
guessed one. **It is filed for the maintainer** rather than settled here,
because it is a judgement about honesty and this site's whole claim is that Loom
can say who asked for a change.

---

# 3. What a reader can actually see today, which is nothing

**There is no picture of a composed page in this report, and manufacturing one
would have been dishonest.** The specimen harness renders with its own theming
rather than this site's, so a photograph of a composed tree taken that way would
not be a photograph of this site. What the change does is visible in two places
and neither of them is a screenshot: the cases in `live.test.ts`, and the first
reader of loomjs.org who falls into a segment somebody has written a form for.

So the visual evidence here is the negative one — **the front door is untouched
under all three palettes and on a phone**, which is what this change is supposed
to look like on a deployment with no segments:

| | |
| --- | --- |
| ![bold](2026-11-14-marketing-the-context-bold.webp) | ![editorial](2026-11-14-marketing-the-context-editorial.webp) |

![the front door on a phone](2026-11-14-marketing-the-context-phone.webp)

`scrollWidth 390 / innerWidth 390` at `390x844@2x touch`. Nothing overflows, and
nothing in this change names a colour.

## The markup is byte-identical until this deployment counts

The strongest version of *nothing changed* is not a photograph, and this one is
checked. `RenderOptions.audience` is written

> *"on the root of an addressed page so its reader signals are filed under that
> segment (0284), and nowhere else: it changes no node and no prop."*

So the segment's name reaches the markup exactly when `addressed` is true, which
on this deployment is its answer to whether it counts anybody at all. Two cases
pin it: the same page rendered with a segment and without it is **the same
string** on a deployment that counts nobody, and differs by the segment's name
on one that counts. That coupling is the right way round — a deployment with
nowhere to post a signal should not be spending bytes saying which segment a
reader was in.

---

# 4. One thing that went red, and it was the check being right

`named.test.ts` failed on the first run with four mentions it could not place:
`(marketing)/_lib/live.ts: /live`, `/react`, and the same two from the test.

The prose was quoting `src/live/index.ts` on which entry points a site's server
imports, and writing them as `` `/live` `` and `` `/react` ``. That file's rule
is *this route group's prose names only pages this site serves or has retired*,
and a bare `` `/live` `` in backticks is indistinguishable from a page of this
site — which is exactly the reader confusion the rule exists to prevent, not a
false positive.

**The fix was the prose, not the rule.** Both are now written as the full
specifier, `@jam-overture/loom/live`, which is clearer for a human reader and
does not match a pattern that means *a page of this site*.

---

# Decisions

**None.** This wires one route group to a published entry point under records
that were all Accepted before the run started, and decides which keys this one
deployment's server sets — which is a property of this server rather than of
Loom, and is the question the filing lane left here. It touches no tree schema,
no delta model and no Accepted record, publishes no name, adds no primitive, and
edits nothing outside `app/(marketing)/` except one appended entry in
`FINDINGS.md`. Nothing here is `ARCHITECTURAL`.

# Findings

**One filed**, for the maintainer: the device trade above. It carries both
halves, says which one shipped and why, and names the one function and the one
test case that change if he wants the other.

**One closed**: `Loom daily build`'s 13 November entry, by this branch.

**None of this lane's three standing entries moved.** Each still waits on one
sentence from the maintainer — where a reader gets `LOOM_URL` and
`LOOM_PROJECT_KEY` (12 November), whether a section called *Pricing* may be
printed in a table of the twenty-two (9 November), and whether
`npx loom add primitive …` can be printed when *primitive* is a reserved word
(11 November). Nothing this run could do moves any of them.

# Test numbers

`pnpm install && pnpm verify` — **EXIT=0**, read out of a file in its own
command, with nothing after the gate on the line.

| | files | tests |
| --- | --- | --- |
| framework and tools | 293 | **7,073** |
| application | 497 | **7,999** |
| | **790** | **15,072** |

**15,072 pass. Nothing failed, nothing skipped, no test weakened.**

`findings:check` **1,549 findings, 0 malformed**. `reports:check` 2,250
visuals, 154.9MB, none over 1.1MB. `prerender:check` **139 pages, 2,101 text
junctions, 0 run together; 3 metadata conventions, 0 unserved**.

**+16 tests and +2 files**, all on the application half and all in this lane,
counted off the files rather than off another pull request's figures:
`readers/context.test.ts` is new and is 7, and `live.test.ts` goes from 11 to
20.

**The framework half is untouched**, which `git diff --stat` against `main`
shows directly: this branch edits no file under `src/` or `tools/`. The two
things it reads from outside the route group are both published entry points —
`@jam-overture/loom/live` for the composition and `@jam-overture/loom/store` in
a test, for the one schema the **portal** owns and the server deliberately does
not import.
