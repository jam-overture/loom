# `pnpm specimen` — the picture

Four routine briefs ask a run for a screenshot. This is what takes one, so that
no run has to write it again.

```bash
# once per session — playwright-core is deliberately not a dependency here
mkdir -p /tmp/shot
(cd /tmp/shot && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright-core)

# from the repository root
LOOM_PLAYWRIGHT=/tmp/shot/node_modules \
  pnpm specimen tools/specimen/example.specimen.ts --out reports
```

```
example-editorial-phone  390x844@2x touch  scrollWidth 390 / innerWidth 390
example-editorial-wide   1280x900@2x  scrollWidth 1280 / innerWidth 1280
…
```

One `.png` per theme per viewport, named `<specimen>-<theme>-<viewport>.png`.
The exit code is non-zero if any shot overflowed its viewport.

## The other half of the pair

A picture proves a change only against a picture of the tree **without** it, and
`--against` takes both ([0240](../../decisions/0240-a-picture-is-proved-against-an-older-library-photographed-with-this-harness.md)):

```bash
LOOM_PLAYWRIGHT=/tmp/shot/node_modules \
  pnpm specimen src/render/the-button-they-came-from.specimen.ts --against origin/main
```

```
3 shots against origin/main: 2 identical, 1 differs
  …-wide-arrived.png              identical
  …-wide-inside.png               identical
  …-wide-back-on-the-trigger.png  differs
  the pictures taken at origin/main are in reports/against
```

**The two `identical` lines are the point.** A lone "after" picture of a focus
ring says nothing — the ring is also where it was before anything opened. What
makes the third shot evidence is that the two either side of it came back the
same file, so the only variable between the pair is the thing being argued about.

**What comes from where.** `src/` is extracted from the revision; the harness and
your specimen module are copied in from the working tree. So it is not *"what did
`main` look like"* — it is **your sheet, pointed at an older library**, which is
what a report means when it says a picture moved. A sheet written in the same run
as the change it photographs can therefore still ask the question, and the
`{ key }` step that only exists on your branch is still available to reach the
state.

**It prints and never fails.** A moved picture is why you ran the harness; the
exit code is still the overflow measurement alone.

Three things it says rather than hiding:

- **`the sheet does not build there`**, with the sentence the failure announced
  itself on. This is the ordinary outcome for a sheet standing on an API the
  revision does not have, and your own pictures are still good.
- **`new — no shot of this name there`**, when a theme or viewport your sheet
  names comes out of `src/` and the revision has no such thing.
- **`the harness at <ref> stopped early`**, when the second run crashed part way
  through — without which a half-photographed sheet reads as a sheet of new
  shots.

A revision `git rev-parse` cannot resolve is the one thing here that *does* fail,
because it is a question that could not be asked. **A session clone is fifty
commits deep**, so a ref older than that reads as unresolvable.

The pictures taken at the ref are left in `<out>/against/` under the same names,
which is where a report's *before* comes from. `reports/against/` is ignored by
git: copy out the one you want under a short name, because a
`<specimen>-<theme>-<viewport>-<state>` path clears 160 characters and GitHub
mangles an image URL past 147.

## The measurements a shot takes

The line above is the first one: the **document** against the viewport, which is
"the page is wider than the phone" and is the single most-reported visual defect
in this repository.

The second is about the boxes inside it, and it exists because the first cannot
see through a clip
([0202](../../decisions/0202-the-harness-measures-the-content-a-clip-hides-and-it-is-not-scrollwidth.md)).
A `loom.backdrop` sets `overflow: hidden` and has to, so a band that overflows
inside one measures `390 / 390` while a word sits off the edge of the page:

```
a-clip-hides-an-overflow-bold-phone  390x844@2x touch  scrollWidth 390 / innerWidth 390  ← 1 clipping box hides content
    div > div > div  "ReferencethemeSelectionSchemaThe heading above …"  content reaches 370 in 346
```

One indented line per box, worst first, five at most and then a count. Each
names the box — its path, and its first words, which on a tree of registered
primitives is the only thing that identifies it — then how far its own content
reaches and how much room it has.

**What it counts is in-flow content, and not `scrollWidth`.** A `loom.halo` is
an absolutely positioned rim drawn four pixels outside its box on purpose, and a
`loom.code` block scrolls sideways on purpose; the browser counts both, so a
reading taken off `scrollWidth` reports two features as defects. What is counted
is the boxes and the text of everything in flow, stopping at anything that
handles its own overflow.

**It does not change the exit code.** A clipped box and a wide document have
different remedies — often in different lanes — so the verdict a run exits on is
still the document measurement alone.

`tools/specimen/a-clip-hides-an-overflow.specimen.ts` is the subject this was
built against, committed so it can be pointed at again.

### The third one, which a shot has to ask for

The two above are taken on every shot whether anybody wanted them or not. This
one exists because a lane named something it wants the size of, and it is
`pnpm shoot`'s alone
([0213](../../decisions/0213-the-harness-reads-a-box-it-prints-the-number-and-the-judgement-stays-in-the-report.md)).

```json
{ "path": "/demo", "out": "the-rail", "measure": ["aside", "aside li[id]", "text=Put it back"] }
```

```
the-rail  1280x900@2x  scrollWidth 1280 / innerWidth 1280
    aside  x 24 y 24  352x857  holding 1239 in 857
    aside li[id] (1 of 4)  x 40 y 377  320x358  ← 195 past the fold
    text=Put it back  no match
```

One line per match, in document order, `(n of m)` when a selector matched more
than once, twenty at most and then a count. `x` and `y` are viewport-relative,
because that is the frame of reference every geometry claim in this repository
actually makes. `holding A in B` appears only when a box's own content extends
further than the room it has. `← N past the fold` appears only when the box
reaches below the bottom edge.

Any selector the driver understands, `text=` included: the reading goes through
a locator rather than a `querySelectorAll`, which is also why `measure` resolves
in the shot's `frame` like every other selector it carries.

**It does not change the exit code**, and a selector that matches nothing prints
`no match` rather than failing the run. Which of these readings is a defect is
the report's to say — a block below the fold is a copy and ordering decision,
and the instrument that reports it has no business settling it.

**It is not offered on a specimen.** A specimen is photographed `fullPage`, so
its picture has no fold in it, and a fold measured against the viewport it
happened to be laid out at would be a number about a boundary the artefact does
not have.

## Writing a specimen

A specimen is data, not a script: **what** to look at, committed beside the lane
that cares. `tools/specimen/example.specimen.ts` is the worked copy.

```ts
export default defineSpecimen({
  name: "pricing-band",
  title: "The pricing band",
  build: (theme) => aTreeWearing(theme),
  themes: [{ label: "editorial", selection: /* palette, fontPack, stylePreset */ }],
  // viewports defaults to [PHONE, WIDE] — 390×844 and 1280×900, both at 2×
})
```

A viewport is a device, not only a size: `PHONE` reports a **coarse, hovering-less
pointer** and `WIDE` reports a mouse, so a primitive that reveals something on
hover is photographed on the phone sheet the way a reader with a finger gets it
([0236](../../decisions/0236-a-viewport-names-a-device-and-the-pointer-is-part-of-it.md)).
`touch` is a required field, so a sheet writing its own viewports out says which
it means; the `touch` in the line above is how a shot reports it.

### Photographing a form

A `loom.form` whose destination nothing resolved draws a notice over a
`disabled` fieldset at six-tenths opacity — correct, and useless as a picture of
the control *inside* the form. Declare where it posts:

```ts
export default defineSpecimen({
  // …
  endpoints: {
    "contact.enquiry": { action: "/contact", method: "post", fields: [] },
  },
})
```

A **target**, not an endpoint: the seam takes an async call that may mint a
token, and a photograph must not depend on a network. It is still validated the
way a host's answer is, so an action that leaves the origin is refused here
rather than in review.

### Photographing a bound primitive

A `loom.feed` nothing answered draws the sentence it draws when the source
could not be reached — correct, and the same picture whatever state you meant
to photograph. Declare what each source answers with:

```ts
export default defineSpecimen({
  // …
  answers: {
    "posts.latest": { answer: [{ title: "A narrower door", meta: "23 September" }] },
    "posts.drafts": { answer: [] },
    "posts.archive": { unavailable: { code: "unavailable", detail: "no answer in time" } },
  },
})
```

An **answer**, not a source, for the reason `endpoints` takes a target: a
specimen that can do IO is one whose pictures differ between two runs of the
same tree. It goes through `defineSource`, so an invalid id is refused here, and
the params a tree asks with are validated before the answer comes back.

The source's schema accepts any JSON deliberately. Three of a bound primitive's
four states are an answer, and the fourth — *a shape this primitive cannot draw*
— is only reachable if the answer gets past the source. `answers.specimen.ts` is
the worked copy and puts all four in one frame.

### Photographing a behaviour

A specimen is static markup, and **every control in the behaviour vocabulary —
`copy`, `disclose`, `adjust`, `present`, `dismiss` — renders nothing until an
effect proves scripting runs.** So a specimen of a primitive that takes one
photographs the page without it, correctly, and there was no flag that changed
that until 24 September. Say `live`:

```ts
export default defineSpecimen({
  // …
  live: {
    states: [
      { label: "settled", do: [] },
      { label: "presented", do: [{ click: ".loom-control-present" }] },
    ],
  },
})
```

The pages are then bundled with esbuild and hydrated in the browser before the
shutter, and each state is a shot named `<specimen>-<theme>-<viewport>-<state>`.
A state's `do` is the same step list `pnpm shoot` takes. `live: {}` hydrates and
declares no states, which is one picture of the page as it settles.

A specimen that says nothing about `live` is unchanged in every respect — no
bundle, no browser JavaScript, and the same file names it had.

Every control carries `loom-control` and `loom-control-<behaviour>`, which is
what a step clicks. What a control publishes is `data-loom-disclosed`,
`data-loom-presented` or the `--loom-adjust` custom property, and the primitive's
own rules read those — see `src/render/behaviour.ts`.

**`answers` and `live` compose, and nothing special happens when both are
declared.** The browser resolves the same declared answers the server did and
gets the same reply, so its first render agrees with the served markup. That is
the one property hydration needs, and it holds because a specimen declares
replies rather than adapters — see `element.ts`.

### Registering a primitive for one specimen

`primitives` takes entries from `definePrimitive` and registers them beside the
starter library, for this specimen only:

```ts
export default defineSpecimen({
  // …
  primitives: [aSubjectThatPlacesTheControl],
})
```

It is for photographing a **seam**: the smallest primitive that holds the thing
under test, so a run does not have to add one to `src/primitives/` — another
lane's directory — to have a subject. A primitive anybody's page should be able
to use is not this; it is a finding for `Loom primitives`.
`tools/specimen/behaviour.specimen.ts` is the worked copy of all three halves:
it declares a primitive, a set of answers and a list of states.

Put it beside the code it photographs. Nothing in this directory is any lane's
content, and the harness imports no specimen but its own three.

## Why it is shaped like this

Recorded in
[0116](../../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md),
with the alternatives. The four things that cost eleven private rewrites:

| obstacle | what the harness does |
| --- | --- |
| `playwright install` cannot reach its CDN, and the browsers are already here | reads `PLAYWRIGHT_BROWSERS_PATH`, derives the Chromium path from the directory, and **writes no build number down** |
| `playwright`'s postinstall re-fetches ~200MB through a proxy that blocks it | `playwright-core` only, resolved at call time from `LOOM_PLAYWRIGHT` or `NODE_PATH`, never a dependency |
| an image URL may not be `file:` or `data:` (0053), so a specimen with an avatar will not render | serves the pages over `http://127.0.0.1` on an ephemeral port |
| a band that reveals on scroll photographs blank | every context is opened with `reducedMotion: "reduce"` |

## The other subject: `pnpm shoot`

A specimen is a tree this harness renders itself. When the subject is a page
something else is already serving — a `next start`, a preview deployment, a
static directory — the entry point is `pnpm shoot`, and the list lives beside
the lane that cares:

```bash
LOOM_PLAYWRIGHT=/tmp/shot/node_modules pnpm shoot shots.json
```

```json
{
  "baseUrl": "http://localhost:3000",
  "outDir": "reports",
  "shots": [
    { "path": "/the-record", "out": "2026-09-08-the-record", "viewport": "phone" },
    { "path": "/portal", "out": "portal", "waitFor": "[data-signed-in]", "fullPage": true }
  ]
}
```

### Reaching a state a load does not produce

The block worth photographing is often three presses in — a figure that is empty
until a reader scrolls, a disclosure that exists only once opened. `do` runs
after `waitFor` and before the shutter; `clip` points the shutter at one element
instead of the viewport:

```json
{
  "path": "/what-your-readers-do",
  "out": "signals-figure",
  "do": [{ "click": "[data-cta]" }, { "wait": 400 }],
  "clip": "[data-figure]"
}
```

Six steps and no more: `click`, `fill`, `wait`, `waitFor`, `scrollTo` and `key`. Every
one of them names a state to arrive at and none of them reports what is there —
the moment this grows a way to assert or to branch, the harness has become a
test runner with a camera attached ([0159](../../decisions/0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md)).

`scrollTo` brings an element into view without pressing it, which is the only
way to reach a state that is a fact about scroll position: a rail that pins
something to its scroller has frames no press lands on, because the driver
scrolls only far enough to expose the thing it is about to click. It is strict
like `click`, for the same reason — which of two matches is brought into view
decides what the picture is of.

`key` presses at whatever holds focus and is the one step that names **no
element** — a keypress has none, and a step taking a selector would be a press on
an element, which `click` already is. It is the only way to photograph anything
whose subject is focus: a ring is painted on the strength of the last input
having been a keyboard, so the same region closed by a mouse comes back as a
picture of no focus state. Key names are the driver's — `Tab`, `Enter`, `Escape`,
`ArrowDown`, `Shift+Tab` — and one it does not know fails the shot
([0237](../../decisions/0237-a-presentation-returns-the-reader-to-its-trigger-and-only-from-inside-the-region-it-closed.md)).

### Reaching a state the load has already passed

A `do` list runs after the page has read what it reads. A screen whose whole
subject is *what the browser arrived with* is therefore unreachable by any step,
and `start` is the field for it ([0195](../../decisions/0195-a-shot-may-say-what-the-browser-started-with-and-it-says-it-as-data.md)):

```json
{ "path": "/lessons/3", "out": "unreadable-record",
  "start": { "storage": { "loom.lessons.progress.v1": "{{{" } } }
{ "path": "/lessons/3", "out": "storage-blocked", "start": { "storageBlocked": true } }
```

Two members, both data. `storage` writes keys before the first paint;
`storageBlocked` makes `window.localStorage` throw a `SecurityError` on access,
the way a browser does when the reader has blocked site data — the state a map
of keys cannot reach, and the one a reader cannot see is happening. There is no
`initScript` and there is not going to be one: a shot list is input, `strict` on
every member so a misspelling is loud, and a field that runs whatever it is
handed is the one thing in such a file that cannot be checked at all. The
JavaScript that applies these lives in `start-state.ts`, in this repository,
typed and tested like everything else.

`start` is on the shot and applies before the `before` as well, because the
state belongs to the context and the context is what a shot gets one of.

A `do` list is a sequence against **one** page, so anchor navigation is
prevented for its duration — otherwise step two runs somewhere else and the
picture is silently of another page. The page's own delegated listeners still
see every click, which is what keeps a reader-signal broadcaster measurable
under the shutter. The page is measured for overflow **after** the steps, since
the steps are what produce the state being photographed. `clip` and `fullPage`
are refused together rather than resolved by precedence.

Everything after the plan is this directory's: the same browser, the same launch
flags, the same reduced motion, the same overflow line, the same naming. Only
what to point at differs. [0117](../../decisions/0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)
is why the two are one harness and what it cost when they were two.

## What it does not do

- **It does not start your application.** `pnpm specimen` needs no server;
  `pnpm shoot` photographs one you are already running. Getting a signed-in
  portal screen up — `next build`, `next start`, that lane's environment —
  remains the portal's own recipe.
- **It does not diff against baselines.** Visual regression is a different
  project; this makes it possible later and presumes none of it.
- **It does not fail a shot on a measurement it took.** `measure` prints; the
  exit code is still the document overflow alone. A height budget is the obvious
  next ask and 0213 says why it is deliberately not here yet.
- **It runs in no CI job.** It is a tool a run drives when it has something to
  look at.
