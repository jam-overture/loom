# A published page can say how it is being read

**Session:** maintainer, interactive — not a routine · **Date:** 2026-09-12 ·
**Sections:** §3 rendering, §6 telemetry · **Merged:** #271, #273, #274, #276,
#277, #279

**Read this before choosing work in any lane.** Six pull requests landed on
`main` today outside the routines. This is what changed, what it means for each
lane, and — as important — what the maintainer has said *not* to start yet.

![The ski apparel prototype with its signal rail, captured in headless Chromium](2026-09-12-reader-signals-rail.png)

*`prototypes/ski-apparel` with its rail, driven by the framework's own
broadcaster and captured in headless Chromium: "the opening" viewed, seven
seconds on screen, eight signals in seven batches.*

## What Loom is for, stated plainly

Loom exists so a page can **change from how people actually use it**: reader
behaviour becomes a `system-signal` intent, the Gate decides, and the change is
recorded and reversible. The runtime has known how to gate a `system-signal`
change since §2. Until today nothing on a published page could say what a reader
did. That gap is closed at the framework level.

## What landed

| PR | What |
| --- | --- |
| #273 | **Reader signals.** `addressed: true` on a render stamps node ids on a published page; `@loom/runtime/signals` broadcasts four kinds of signal from it. Decision [0136](../decisions/0136-a-published-page-broadcasts-reader-signals-when-its-host-asks.md). |
| #276 | `types` can be set **per kind**. Fixed `kinds: ["dwelled"]` also sending `viewed`. 0136 amended. |
| #279 | **Optimised.** Browser bundle 66 KB → 4.8 KB via the new `@loom/runtime/signals/broadcast` entry; ledger from quadratic to linear. 0136 amended again. |
| #271, #274, #277 | `prototypes/ski-apparel`: a ski kit page built only from registered primitives, with a live rail running on the broadcaster. |

### The shape, in one place

```ts
renderLoomTree(tree, { resolver, addressed: true })          // server

import { broadcastReaderSignals } from "@loom/runtime/signals/broadcast"   // browser
broadcastReaderSignals(root, {
  types: { dwelled: ["loom.section"], activated: ["loom.link"] },
  send: (batch) => navigator.sendBeacon("/signals", JSON.stringify(batch)),
})

import { parseReaderSignalBatch } from "@loom/runtime/signals"   // receiver
```

- **Four kinds, closed:** `viewed`, `dwelled`, `activated`, `disclosed`. A fifth
  is a decision record, not a config option.
- **No content in a signal** — a node id and its primitive type. Words come from
  the tree at the revision the batch names. The prototype's `legend.mjs` is the
  pattern.
- **Every batch names its tree and revision.**
- **Configured by the host, never by the tree.** No prop turns measurement on.
- **Off unless a host calls it.** An unaddressed render is byte-identical.

## Maintainer direction — do not start these

- **Capture, storage, aggregation and interpretation of signals are deferred by
  the maintainer.** "Capture and interpretation can come later." Do not build a
  signals table, an ingestion endpoint, or signal-to-intent derivation in any
  lane until that changes.
- **A signals view in the portal** is something the maintainer is *thinking
  through*, not a task. `Loom portal`: do not build it; if portal work touches
  signals, say so in the report and stop.
- `prototypes/` belongs to no lane. Do not edit it.

## What it means for each lane

- **`Loom daily build`** — `src/signals/` and `src/grammar.ts` are yours now.
  Two things to keep true: the broadcaster's import graph reaches no package
  (`src/signals/browser-weight.test.ts` fails if zod creeps back in), and a
  change to the kinds or to what a signal carries is a record. One finding filed
  for you below.
- **`Loom primitives`** — a primitive is visible to reader signals only if it
  spreads `loom.editable` onto its root. **All 91 do today** (conformance audit:
  none undecorated, none unprobeable). A new primitive that does not is silently
  unmeasurable; the audit already reports it, so treat that verdict as a defect.
- **`Loom docs`** — the API reference is regenerated and lists both entry points.
  There is no guide. Finding filed below.
- **`Loom portal`**, **`Loom demo`**, **`Loom marketing`**, **`Loom lessons`** —
  nothing to do. Read the direction above.

## Faults found today, all fixed

- A root with no revision attribute read as revision 0 (`Number(null)`).
- A background tab reported its first screen as `viewed`.
- A `details` authored open reported `disclosed` on load — browsers fire
  `toggle` for it. jsdom does not, which is why the suite had been green.
- `kinds: ["dwelled"]` still sent `viewed`.
- The ledger copied its state on every call: 314.7 ms for 6,000 nodes, now 10.0.
- The rail dropped the one band without an `anchor`. The legend now lists every
  band; the page was not changed to be measurable.
- `decisions/README.md` cited the amendment rule as 0096 (a record about
  behaviours). It is 0099.

## Records

- **0136** — added, then amended in place twice under 0099. Nothing superseded.

## Findings

- **Closed:** *a broadcaster's `types` filter applies to every kind at once* (#276).
- **Filed for `Loom daily build`:** the broadcaster observes only the nodes
  present when it starts.
- **Filed for `Loom docs`:** reader signals have an API reference and no guide.

## Test numbers

At #279: runtime **2,084 passed, 2 skipped**; `@loom/app verify` **3,857
passed**, build green. This report's branch adds 2 tests.

## Open questions

None blocking. The next move on signals is the maintainer's.
