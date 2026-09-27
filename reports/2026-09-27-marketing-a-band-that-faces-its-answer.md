# 2026-09-27 — marketing: a band that faces its answer

The 26 September cut took this site from 13,208 words to a third of that, and it
was the right cut. What it left behind on the two interior pages was **nine
bands in a row, each a full-width heading above a reading column, with roughly
half of every band empty.**

| `/how-it-works` at 1280 | |
| --- | --- |
| before — `main` | ![](2026-09-27-marketing-facing-how-before-wide.png) |
| after — this branch | ![](2026-09-27-marketing-facing-how-after-wide.png) |

Nothing was broken. Every band rendered correctly, emitted no diagnostic and
passed every test this surface has. The page just looked like it had not
finished loading.

---

## The measurement, before anything moved

`loom.section` lays its regions out in a column — eyebrow, heading, content —
and `loom.prose` with `measured` is capped at `READABLE_MEASURE`, 68ch. Put
those two together in a `width: "wide"` band and the arithmetic is fixed:

| | |
| --- | --- |
| the band | 1120px, less the page's own padding |
| the paragraph in it | 68ch |
| what is left | **roughly half of it, on every prose-only band** |

Nine of them: four short answers and *Who is asking* on `/how-it-works`, three
on `/what-you-run`. The heading went into the space the paragraph was not using.

## What shipped

**One constructor**, and the nine bands that use it. No primitive was added,
nothing under `src/` was opened, and no component was added — `loom.split` has
existed since the port and this lane had never composed one.

| file | what changed |
| --- | --- |
| `_lib/nodes.ts` | `splitSection` — `section`'s sibling, heading beside the content instead of above it |
| `_lib/pages/how-it-works.ts` | the four short answers and *Who is asking* |
| `_lib/pages/what-you-run.ts` | *What you bring*, *What leaves your server*, *What this page counts* |
| `_lib/facing.test.ts` | new — 9 cases, a prohibition swept over both served pages |

Outside `app/(marketing)/`: `FINDINGS.md` and this report. Nothing else.

### Three things the primitives already knew

The composition is not a workaround; it is the one two primitives were written
for, and each says so in its own comment.

- **`loom.split` declares inline-size containment per column.** Its own comment:
  *this primitive reads no width itself, and it is the reason anything inside it
  can.*
- **`loom.heading` caps its top two steps in `cqi` rather than `vw`**, and names
  the case: *a heading in a `loom.card` or in one half of a `loom.split` is now
  held to the column it is actually in.* That is why a 60px `bold` heading in a
  540px column is 47px rather than 60px, and why nothing overflows.
- **`loom.prose` says a paragraph in a narrow column is already measured.** Each
  half of an even split in a `wide` band is ≈ 540px against a 68ch measure, so
  the paragraphs inside one set no `measured` of their own. The column *is* the
  measure, and a second opinion about line length is one that has to agree.

### Both starter palettes

| `bold` | |
| --- | --- |
| before | ![](2026-09-27-marketing-facing-how-before-bold.png) |
| after | ![](2026-09-27-marketing-facing-how-after-bold.png) |

No literal colour is in the diff, and the `surface`-toned *Who is asking* band
is the one that shows why a palette sweep was worth taking: it is invisible on
`minimal` and a panel on `bold`, and the two columns have to sit correctly in
both.

`/what-you-run`, same treatment:

| | |
| --- | --- |
| before | ![](2026-09-27-marketing-facing-what-before-wide.png) |
| after | ![](2026-09-27-marketing-facing-what-after-wide.png) |

### What it does at every other width

| width | what happens |
| --- | --- |
| 1280 | two columns, `scrollWidth 1280 / innerWidth 1280` |
| **820** | two columns, still ![](2026-09-27-marketing-facing-how-after-tablet.png) |
| 390 | **wraps to one column**, heading above the paragraphs, in the order it was |

![the phone](2026-09-27-marketing-facing-what-after-phone.png)

**The phone is not byte-identical and the claim is not that it is.** Measured at
390 against `main`, `/how-it-works` is **220px shorter** and `/what-you-run` is
**204px shorter**: a split column's gap is one step tighter than a section's
content region, so each band loses about 44px. The order and the wrapping are
unchanged; the spacing is slightly tighter. Both pages also lost height on a
laptop — 8610 → 7790 and 6372 → 6070 at 2× — which is the empty half being used
rather than anything being cut.

---

## The test, and why it is a prohibition rather than a count

A count of the bands that were converted is satisfied by the bands that already
pass and says nothing about the tenth one somebody adds next week. So the rule
is stated over the **served trees**, as the question a reviewer would ask:

> no band whose content is only paragraphs may stack its heading above them

with two companions — the heading and the answer are in opposite regions of the
split, and nothing inside a column asks for a second measure. The failure names
the band by its **eyebrow**, because the person who trips it has just written
that eyebrow and an index into a tree tells them nothing.

**Both checked red.** Reverting *Who is asking* to `section` produced
`expected [ 'Who is asking' ] to deeply equal []`; restoring `measured: true`
inside a column failed the third.

### The blind spot, which is the part worth keeping

This is filed as well as reported, because it is not this lane's alone. The
overflow measurement is the **one automated eye this repository has on a
rendered page**, and it can only fail in one direction:

| instrument | reads | why it was silent |
| --- | --- | --- |
| the tree's tests | structure | every band was correct on its own |
| the renderer's diagnostics | what could not be honored | nothing was unhonored |
| `voice.test.ts` | the words | layout is not words |
| **`scrollWidth` vs `innerWidth`** | **a page too wide** | **this is a page with too much room** |

A band that spills off a phone screams. A band using half the space it was given
is silent forever. They are the same defect — contents and width disagreeing —
and only one of them is reportable. The question filed for the other four
surface lanes is *which of your bands are this, and what in your lane would ever
tell you?*

---

## The second half: the front door was framing the wrong host

**Not "found while building" — found by the maintainer, after this lane looked
straight at it and got it wrong.**

| `pnpm shoot --serve`, as filed this morning | the same band, after the fix |
| --- | --- |
| ![](2026-09-27-marketing-facing-embed-broken.png) | ![](2026-09-27-marketing-facing-embed-fixed.png) |

### What was filed, and why it was wrong

The first version of this section said the broken box was the screenshot
harness's: `--serve` starts on an ephemeral port, the frame's absolute `src`
resolves to `localhost:3000`, so the frame points at nothing. It ended *"the
site is fine and a deployment is fine — Vercel sets `VERCEL_URL`."*

Every observation was accurate. The conclusion was wrong, and the maintainer
reported the same broken box **on the preview deployment of this pull request**
within hours.

`siteOrigin()` answers *where does this page live*. A frame needs *where did
this request arrive*. On a preview those are two different hosts:

| | |
| --- | --- |
| `VERCEL_URL`, so `siteOrigin()` | `loom-9kd3jf-….vercel.app` — deployment-unique |
| what the reader is on | `loom-git-<branch>-….vercel.app` — the branch alias |

So the frame was cross-origin; a preview sits behind Vercel's deployment
protection; the framed request arrived without the reader's cookie; Vercel
answered with a sign-in page that refuses to be framed. Broken-document glyph.

Reproduced by serving a production build with `VERCEL_URL` pointed at a host
the browser was not on, which put
`iframe src="https://loom-9kd3jf-….vercel.app/demo"` into the page exactly as
the maintainer's screenshot showed.

### Why the wrong reading was the comfortable one

Worth writing down, because it was not carelessness and it will recur:

- The symptom was **first met through a local tool**, where the second host is
  an ephemeral port rather than a protected preview. "My tooling is wrong" is a
  smaller and more familiar story than "the site is wrong", and it fit every
  fact in hand.
- It was **confirmed by a fix that worked**. Serving on port 3000 by hand made
  the frame render — which proves the *mechanism*, that the frame's host must
  match the page's, and was then read as proving the *diagnosis*. The mechanism
  holds on any host, Vercel's included.
- **Nothing disagreed.** Exit 0, `scrollWidth` equals `innerWidth`, the tree is
  right, and the frame-origin allowlist does not fire because the registry and
  the `src` are built from the same `siteOrigin()` — they agree with each other
  and are both wrong about the reader. The only instrument that reports it is a
  person looking at the page.

### The fix, and the rule it states

**The tree's addresses follow the browser; the document's declared identity
stays pinned.**

| | answers | reads | used by |
| --- | --- | --- | --- |
| `servedOrigin()` | where did this request arrive | `x-forwarded-host` | the three page renders |
| `siteOrigin()` | where does this page live | `LOOM_SITE_ORIGIN`, `VERCEL_URL` | canonical, sitemap, share image, the graph |

A canonical link announcing itself under whichever host a reader happened to
reach it by would be a page telling a crawler there are three of it, so those
keep the pinned answer. A `Host` header is attacker-controlled where nothing
pins one and what it reaches is an address the visitor's own page tells their
browser to load, so it is **parsed rather than interpolated**: a path, a second
scheme, credentials or a space is refused and the caller falls back to the
environment.

Verified on a build served under a misleading `VERCEL_URL`: the frame resolved
to `http://localhost:3100/demo` while the canonical stayed on the pinned host.

**Nothing is asked of the harness, and that is the evidence it is one bug.**
`pnpm shoot --serve` sets the `Host` header to its own ephemeral origin, so the
frame follows it — the picture on the right above is the band rendering live in
a screenshot, which had never once happened.

18 cases cover the parsing, including every malformed authority.

### And the other one, which is already written down

The first set of *after* shots came back **identical to the before shots**. A
`next start` from earlier in the run had survived a `pkill` that returned 144
and killed the wrong thing, so port 3000 was still serving the previous build
while the new one sat on disk. That is exactly the failure
[0191](../decisions/0191-the-harness-may-start-the-application-because-there-is-now-only-one.md)
and the 25 September finding describe, met by a run that had read both an hour
earlier. It cost two builds. **The lesson is the narrower one:** the reason to
use `--serve` is not convenience, it is that a server the harness started cannot
be somebody else's.

---

## Tests

`pnpm verify` — **exit 0**, read out of a file written as the last thing on its
own line, on a `.next` and a `dist` deleted first and a fresh `pnpm install`.
Re-run on the merged head after `Loom merge` brought `main` in at 15:44, and
again after the origin fix.

| | |
| --- | --- |
| runtime | **3,216 passed** in 165 files — untouched |
| application | **5,408 passed** in 312 files — **27 added** (9 for the bands, 18 for the origin) |
| findings | **839**, 0 malformed |
| prerender | 112 pages, 1,300 junctions, 0 run together, 0 unserved |
| overflow | 1280, 820 and 390: `scrollWidth` equals `innerWidth` on both pages |

**One failure on the way, stated rather than smoothed over.** The first full
`verify` came back `EXIT=2` on `app/(marketing)/_lib/facing.test.ts`:
`Property 'text' does not exist on type 'TextNode'` — the field is `value`. The
vitest run before it had passed all nine, because vitest does not typecheck.
Numbers above are the second run's. Nothing was skipped and no test was
weakened.

## Findings

**One filed, one closed.**

- **Filed and then corrected, this lane's own:** the framed demonstration
  pointed at a host the reader is not on. Filed first as the harness's with the
  status *"nothing is wrong on a deployment"*, which was false; rewritten with
  the real diagnosis, and closed by this branch. Nothing is asked of the
  harness.
- **Closed** by this branch: the empty half, recorded for the shape rather than
  for the nine bands — the instrument that would have caught it does not exist
  on any surface.

## Open

Unchanged from yesterday and still the maintainer's: **what the `publisher`
should be** in the structured-data graph — the org name or his own. Nothing
shipped for it, deliberately.
