# A door that opens into the box

**Routine:** `Loom demo` · **Branch:** `demo-21-a-door-that-opens-into-the-box` ·
**18 September 2026**

**Deployed preview:** _(added to the pull request; this environment cannot open
`vercel.app` — the standing 19 August egress finding)_
`/demo` is unchanged at its own address. What this run is about is the **other**
address it now appears at: scroll the front door to **Your turn** and look at
the demonstration inside the frame.

The twenty-first run of this lane. It takes the finding `Loom marketing` filed
yesterday, takes the shape that finding recommended, and adds the one link the
finding did not reach.

---

## What a stranger could not understand before this run

**Why clicking the demonstration's own logo put the Loom home page inside the
Loom home page.**

§4d landed on 18 September and the front door stopped pointing at the
demonstration and started **containing** it
([0056](../decisions/0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md)).
That is the right call and it changes who meets this surface: the likeliest
first encounter with Loom's demonstration is no longer `/demo`, it is a
1078 × 673 box on the landing page.

Everything in the box works. Leaving it does not, and could not:

| what a link inside the frame could try | what Chromium does |
| --- | --- |
| an ordinary `href` | loads the destination **into the box** |
| `target="_top"` | blocked — `allow-top-navigation` is withheld from every frame |
| `target="_blank"` | blocked — `allow-popups` is withheld too |

There is no fourth row, and the withholding is correct: that grant is what turns
an embedded document into a redirect, and `loom.embed` argues it at length. So a
framed demonstration is a **closed room**, and the demonstration has exactly two
links that leave it.

Measured in Chromium against a real `next build` of `main`, top page at `/`:

| the click | what the visitor gets |
| --- | --- |
| the demonstration's wordmark | **the front door, rendered inside the front door's own embed** — two identical navigation bars, two *Sign in* buttons, one click deep |
| *Want this on a page of your own? Read the docs* | **the whole documentation site in the box** — sidebar, search field, `Introduction` — under a caption still reading *it belongs to a clinic that does not exist* |

On a surface whose entire argument is that it can always tell you what happened,
two of its three chrome controls did something the visitor could not have
predicted and nothing said so.

## What a stranger can understand now

Nothing, and that is the point. **Inside a frame both doors are simply not
there**, and everything else is byte-for-byte what it was.

Driven against two real builds — `main`'s for the before, this branch's for the
rest — at 1280 × 900:

| | `main` | this branch |
| --- | --- | --- |
| wordmark is a link, inside the frame | **yes** | **no** |
| *Read the docs* is offered, inside the frame | **yes** | **no** |
| browsing contexts after clicking the wordmark | **3** — `/`, `/` again, `/demo` | **2** — `/`, `/demo`; there is nothing to click |
| the mark's own markup | `● Loom` | **identical, byte for byte** |
| the bar's other two things — *Someone else's page*, `revision`/`policy` | unchanged | unchanged |
| the demonstration itself, inside the frame | works | **works** — pressed, held, ringed, weighed, `Apply this change` |
| `/demo` at its own address, wide | — | **`md5` identical to `main`** |
| `/demo` at its own address, phone | — | **`md5` identical to `main`** |
| horizontal overflow, 1280 / 390 | 1280 / 390 | **1280 / 390** |

The two `md5`s are `41955176…` (wide) and `71607ab3…` (phone), on both builds.
The wide one is the same hash the 17 September report quoted, which is the
cheapest available proof that the sixty seconds this surface exists for were
not touched.

## The change

### `_lib/framed.ts` — one predicate, and the direction it errs in

`isFramed(view)` → whether this document is inside another one, asked of the two
window handles and nothing else.

A `FrameView` of `{ self, top }` rather than a `Window`, for two reasons. It is
testable outside a browser, and it claims to read only what it reads — which is
also the one thing that is safe across an origin boundary: `window.top` is
readable from a cross-origin frame, it is the *document* behind it that is not,
so comparing identity never throws. A third party framing this gets the same
answer the front door does.

**Absence means not framed, and that direction is chosen rather than defaulted
into.** A wrong *not framed* renders today's link. A wrong *framed* takes the
way out off a top-level page, which is the defect `Loom marketing` filed on
22 August — this route group containing exactly one anchor, and it the skip
link. One of those is a page nobody can leave.

### `_components/use-framed.ts` — and why it is `useSyncExternalStore`

The demonstration's HTML is rendered where there is no window, so the server
cannot know whether the response is about to be put in a box. The third argument
is the whole reason for the hook shape: the server snapshot is `false`, React
uses it for the hydration render, and only then re-reads the client one. Both
doors are therefore in the markup that ships and the withdrawal happens after
hydration — a link that stops being a link within a frame of it. Holding the
opinion any earlier means a framed visitor hydrates against markup that
disagrees with the tree React is building, and React discards the subtree.

There is nothing to subscribe to, and that is a property of the subject rather
than a shortcut: a document's relationship to the window above it is fixed for
the life of the document.

### `_components/wordmark.tsx` — the mark stays, the door goes

The mark answers *whose page is this*, and it has to either way — the page on
the stage belongs to a clinic that does not exist, and the one thing a stranger
must not conclude is that Loom is a physiotherapist. So the square, the word and
the spacing are one definition rendered by both branches, and a test asserts the
two are byte-identical. Framed, it is a `p` rather than a heading: the rail
below carries the `h1`, and a demonstration in a box must not take the
document's outline away from the page that framed it.

### `_components/read-the-docs.tsx` — the weaker withdrawal, and why it is still right

The wordmark's destination is the page the visitor is already on, so withdrawing
it costs nothing at all. This one has a real destination, and withdrawing it
costs a framed visitor the demonstration's one forward step. What makes it the
better trade is **who is framing**: the band that embeds this puts *Open it full
size* **above** the frame rather than below it, precisely so a reader who cannot
work in the box meets the way out before the box — and any host with a menu has
a documentation link in it. A door that opens into the room you are standing in
is not a way out of the room.

The sentence underneath it stays either way. *No account, no sign-in, nothing
kept* is a claim about what this surface does with a visitor, and it is at least
as worth making to somebody who arrived without choosing to.

**Silent, which is this surface's idiom rather than a new one.**
`availablePresets` withdraws an ask with nothing to do without a word, and
`stillToAsk` withdrew the duplicate of an open question the same way yesterday.

## Decisions taken that were not specified

- **The recommended shape, taken as recommended.** `window.self !== window.top`
  read by the bar, not a query parameter from the embedding page. The filing's
  own argument is the right one and it is now also the reason this covers a
  third-party host for free.
- **Widened by one link, and only one.** Both outbound links were enumerated
  before deciding: `#ask` (the skip link) and the clinic's own `mailto:` and
  `tel:` anchors stay, because a fragment does not leave the frame and a
  `mailto:` is handed to the operating system rather than to the box.
- **Withdrawn rather than disabled or explained.** A disabled-looking link, or
  a line about why the box has no exit, would be the demonstration talking
  about its own plumbing on the one bar that exists to say three short things.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing was escalated and nothing was left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all, and neither was
  the marketing route group whose band raised this.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, read off the run rather than
off a pipe:

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 153 | 2,761 |
| `@loom/app` | 278 | 4,851 |

683 findings, 0 malformed. 107 prerendered pages, 853 text junctions, 0 run
together.

The demo lane's own suite goes from **33 files / 440 tests** to **35 files / 454
tests** — **fourteen added, none weakened** — counted per file against a real
run:

| file | `main` | branch |
| --- | --- | --- |
| `_lib/framed.test.ts` | — | 5 |
| `_components/framed.test.tsx` | — | 9 |

Nothing was skipped and no test was weakened. `pnpm verify` was green first time.

### The defect matrix

Run against a commit, not a working tree.

| defect restored | what fails |
| --- | --- |
| `isFramed` drops the absent-`top` guard | 1 test |
| `Wordmark` never withdraws | 2 tests |
| `ReadTheDocs` never withdraws | 1 test |
| the hook answers the client's question on the server too | 1 test |
| **`DemoBar` inlines a link beside the `Wordmark`** | **1 test** |
| **`page.tsx` renders the raw link instead of `ReadTheDocs`** | **nothing — 454 passed** |

**The fifth row is new and it is the encouraging one.** It is the same wiring
defect the 17 September finding is about, and here it *is* caught — because the
bar is an ordinary component, so a test can assert *the bar has no door out*
rather than *the wordmark has no door out*. Where a reading can live in a
component rather than in the page, the wiring is testable for free.

**The sixth is the same one as ever**, and it is filed rather than implied:
unwiring `ReadTheDocs` from `page.tsx` leaves 454 green and one `TS6133` for an
unused import.

## Findings

**Closed:** the 18 September `Loom marketing` entry — *a framed page's own
wordmark navigates the frame* — with the reproduction, the shape taken, and the
second link it did not reach.

**Filed two:**

- `Loom daily build` — **a shot list cannot reach inside a frame**, so this
  run's four pictures were taken by a scratch Playwright script. Sibling of the
  17 September entry and smaller: a `frame` field resolved through
  `page.frameLocator`, which runs nothing it is given. `waitFor` has the same
  limit and that is the part a lane cannot work around.
- `Loom demo` — the third data point on **`page.tsx`**, narrowed by the fifth
  row above, and recommended as this lane's next unit.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **twentieth**
consecutive run. The cost was nil again: what decided this unit was a browser
measurement and two screenshots of this repository's own pages, and no reference
gallery has an opinion about what a link should do inside a sandbox.

**Carried, not closed.** The 16 September finding on the **automatic re-ask** is
untouched and still the largest thing open on this surface. The two 14 September
findings — a `configure` never saying which way it went, and `actions.ts` — are
also untouched and still open.

## Open questions

Nothing blocking.

- **`page.tsx` is still the file a test cannot reach**, and it is now eight
  readings. Recommended as the next unit of this lane unless a maintainer
  comment outranks it.
- **“Ask about just this”** — the scope control reasoned out in this lane's
  22 August finding, still the largest unbuilt idea here.
- **A framed visitor has no forward step from inside the demonstration**, by
  design, and the host supplies one above the frame. Worth a look by eye on the
  preview: if *Open it full size* does not read as the way on, that is the
  marketing lane's line to move and this lane's finding to file.

## The visuals

All four are driven against real `next build` outputs — `main`'s for the two
befores, this branch's for the rest — at 1280 × 900, with the top page at `/`
and the demonstration inside its frame.

| | |
| --- | --- |
| [before](2026-09-18-demo-a-door-that-opens-into-the-box-before.png) | `main`, one click on the demonstration's wordmark: **the front door inside the front door's own embed**, two navigation bars, two *Sign in* buttons, and the caption underneath still saying *it belongs to a clinic that does not exist* |
| [before, the other door](2026-09-18-demo-a-door-that-opens-into-the-box-docs-before.png) | `main`, one click on *Read the docs*: **the whole documentation site in the box** — sidebar, search field, `Introduction` — under the same caption |
| [after](2026-09-18-demo-a-door-that-opens-into-the-box-after.png) | this branch, the same frame on arrival: the bar, the mark and the numbers exactly where they were, and neither door there to be clicked |
| [after, working](2026-09-18-demo-a-door-that-opens-into-the-box-working.png) | this branch, *Take the numbers off* pressed **inside the frame**: the amber ring on the stat band, *This would be removed*, the Gate's own words on damage and reversibility, and *Apply this change* — the demonstration's best moment, in a box with no doors |

**To see it yourself:** open the preview at `/`, scroll to **Your turn**, and
click the small `● Loom` at the top left *inside* the frame. On `main` the
landing page appears inside its own demo box. Here nothing happens, because
there is nothing there to click — and then press **Take the numbers off** in the
same frame and watch the whole demonstration run.
