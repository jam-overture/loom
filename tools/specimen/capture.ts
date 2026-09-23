import { join } from "node:path"

import type { SpecimenViewport } from "./specimen.js"

/**
 * Driving a browser, expressed as the four things the harness actually asks of
 * one.
 *
 * The narrow seam is the point. Playwright is not a dependency of this
 * repository and must not become one — it is a tool for taking a picture, not
 * part of what ships — so the code that plans, names, measures and reports has
 * to be exercisable without it. Everything below runs against a double; the
 * adapter that speaks to a real browser is `playwright.ts` and is the only
 * file in this directory that knows the word.
 */

export type Overflow = {
  readonly scrollWidth: number
  readonly innerWidth: number
}

/**
 * The check four reports quote beside every phone shot. It is here rather than
 * in each of them because "the page is wider than the phone" is the single
 * most-reported visual defect in this repository and eyeballing a screenshot
 * is exactly how it gets missed.
 */
export const overflows = (measurement: Overflow): boolean =>
  measurement.scrollWidth > measurement.innerWidth

/**
 * One thing to do to a page before the shutter.
 *
 * Four members, and the line they are all on one side of is
 * [0159](../../decisions/0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md)'s:
 * **an instrument may reach a state and may never assert one.** Each of these
 * names a state to arrive at; none of them observes what is there. The moment
 * one of them reports back — a count, a text, a boolean — the harness has
 * become a test runner with a camera attached and every lane will write its
 * journeys here instead of in Vitest.
 *
 * `fill` and `waitFor` are the two 0159 named as reaches it had not been asked
 * for yet. They were asked for on 18 and 19 September, by two lanes, four
 * pictures apart ([0182](../../decisions/0182-a-shot-may-reach-a-state-it-does-not-photograph-and-may-name-the-document-it-reaches-into.md)).
 */
export type ShotStep =
  | { readonly click: string }
  /** Type `text` into the field `fill` names. An empty string clears it. */
  | { readonly fill: string; readonly text: string }
  | { readonly wait: number }
  /**
   * Wait for a selector to appear, mid-sequence.
   *
   * The shot-level `waitFor` covers the load; this covers everything after a
   * step. A form driven by `useActionState` submits by fetch, so the press
   * that signs you in resolves long before the cookie it sets exists, and a
   * duration is a guess about somebody else's server. Naming the thing to wait
   * for is the reach; the harness never says whether it appeared, it fails the
   * shot exactly as the shot-level `waitFor` does.
   */
  | { readonly waitFor: string }

/**
 * The longest a single `wait` step may ask for.
 *
 * There is no way to wait forever here, for [0140](../../decisions/0140-a-call-into-foreign-code-has-a-ceiling-and-the-runtime-owns-it.md)'s
 * reason applied to an instrument rather than a render: a harness that hangs
 * reports nothing at all, and a merge gate that hangs is indistinguishable from
 * a merge gate that is slow. Thirty seconds is far past anything a settled
 * animation or a batched broadcast needs.
 */
export const MAX_WAIT_MS = 30_000

/** Where the shutter points: the viewport, the whole page, or one element. */
export type CaptureTarget = {
  readonly fullPage: boolean
  /**
   * The document `clip` is resolved against, when it is not the top one.
   *
   * `fullPage` and the viewport shot have no frame equivalent on purpose: a
   * frame is not a page, and "all of the page" means the page. Only a selector
   * can be resolved somewhere else, which is the whole of the rule.
   */
  readonly frame?: string
  /**
   * A selector to photograph instead of the viewport.
   *
   * Every lane has been cropping by hand or shipping a picture of a page when
   * it meant a picture of a table. Mutually exclusive with `fullPage`, which
   * the shot list refuses rather than silently resolving.
   */
  readonly clip?: string
}

export type SpecimenPage = {
  readonly goto: (url: string, waitFor?: string, frame?: string) => Promise<void>
  /** Runs the steps in order. Anchor navigation is pinned; see `playwright.ts`. */
  readonly act: (steps: readonly ShotStep[], frame?: string) => Promise<void>
  readonly measure: () => Promise<Overflow>
  readonly capture: (file: string, target: CaptureTarget) => Promise<void>
  readonly close: () => Promise<void>
}

export type SpecimenBrowser = {
  readonly open: (viewport: SpecimenViewport) => Promise<SpecimenPage>
  readonly close: () => Promise<void>
}

/**
 * An address, and everything done at it before anything else happens.
 *
 * A shot is one of these with a camera on the end, and so is the `before` that
 * produces the session it needs — which is the point of naming the shape. The
 * harness has no idea what signing in is: it opens an address, types, presses,
 * waits for the thing that says it worked, and the cookie the server set is
 * still in the context when the shot's own address is opened.
 */
export type Approach = {
  readonly url: string
  /**
   * A selector to wait for once the address is open.
   *
   * Strongly preferred over waiting on the network for anything a server is
   * rendering live. A form driven by `useActionState` submits by fetch rather
   * than by navigation, so the load event resolves *before* the cookie it sets
   * exists — which is how a run photographed a sign-in page believing it was
   * the screen behind it. Wait on something only the destination has.
   */
  readonly waitFor?: string
  /**
   * The document every selector of this approach is resolved against.
   *
   * Playwright's selector engine pierces an open shadow root and does not
   * pierce a browsing context, so a page that *contains* the surface worth
   * photographing — the front door frames `/demo` — could be photographed and
   * not touched. One field, applied to `waitFor`, to every step and to `clip`,
   * because a rule with an exception in it is a rule a lane has to remember.
   */
  readonly frame?: string
  /**
   * What to do once the address is open and `waitFor` has resolved, in order.
   *
   * The block worth photographing is often not the one a load produces. A
   * reader-signal figure is empty until somebody scrolls, presses or opens
   * something; a disclosure's open state exists only once it is opened. Before
   * this existed the run that wanted such a picture wrote forty lines of
   * Playwright in `/tmp` against flags and a viewport that were *copies* of the
   * harness's rather than the harness's — which is the drift
   * [0117](../../decisions/0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)
   * consolidated two harnesses to stop, reappearing for the one thing it left
   * out.
   */
  readonly do: readonly ShotStep[]
}

/**
 * One photograph, with its subject already resolved to an address.
 *
 * The subject is the only thing the two entry points disagree about, so it is
 * the only thing resolved before this type: `pnpm specimen` renders a tree and
 * serves it, `pnpm shoot` is handed pages something else is already serving,
 * and by the time either reaches here both are a URL and a file name. That is
 * what lets the launch flags, the reduced motion, the overflow measurement and
 * the naming be decided once instead of twice — which is the whole reason a
 * second harness was worth folding into this one rather than leaving beside it.
 */
export type Shot = Approach & {
  /** What a report calls this picture, and what `describeShot` prints. */
  readonly name: string
  /** Where to write it, relative to `outDir`. */
  readonly file: string
  readonly viewport: SpecimenViewport
  /**
   * An approach made in this shot's context before its own address is opened,
   * and never photographed.
   *
   * Every shot gets a fresh context, which is what keeps one picture from
   * depending on the one before it — and is also why six consecutive runs of
   * one lane could not photograph a screen behind a session. The state a
   * session lives in belongs to the context, so the only place to produce it
   * is inside the context, before the shot.
   */
  readonly before?: Approach
  readonly fullPage: boolean
  readonly clip?: string
}

export type ShotResult = {
  readonly name: string
  readonly file: string
  readonly viewport: SpecimenViewport
  readonly overflow: Overflow
  readonly overflowed: boolean
}

export type CaptureOptions = {
  readonly outDir: string
}

/**
 * Open an address and do what the approach asks, in that order.
 *
 * The `before` and the shot itself go through this same call, because they are
 * the same thing done twice: the only difference between them is that one ends
 * in a photograph.
 */
const reach = async (page: SpecimenPage, approach: Approach): Promise<void> => {
  await page.goto(approach.url, approach.waitFor, approach.frame)
  if (approach.do.length > 0) await page.act(approach.do, approach.frame)
}

/**
 * Measure before writing the file, so a shot that overflows is still taken.
 *
 * The temptation is to fail on overflow and skip the picture. That gets it
 * exactly backwards: the picture of the broken page is the artefact worth
 * having, and a report that says "1420 > 390" without one is the report nobody
 * can act on.
 */
export const captureShots = async (
  shots: readonly Shot[],
  browser: SpecimenBrowser,
  { outDir }: CaptureOptions
): Promise<readonly ShotResult[]> => {
  const results: ShotResult[] = []

  for (const shot of shots) {
    const page = await browser.open(shot.viewport)
    try {
      if (shot.before !== undefined) await reach(page, shot.before)
      await reach(page, shot)
      /**
       * After the steps, not before. The steps are what produce the state being
       * photographed, and a disclosure that opens or a list that grows is
       * exactly the kind of thing that pushes a page past the phone — so
       * measuring the page the load produced would report the width of
       * something nobody is looking at.
       */
      const overflow = await page.measure()
      const file = join(outDir, shot.file)
      await page.capture(file, {
        fullPage: shot.fullPage,
        ...(shot.clip === undefined ? {} : { clip: shot.clip }),
        ...(shot.frame === undefined ? {} : { frame: shot.frame }),
      })
      results.push({
        name: shot.name,
        file,
        viewport: shot.viewport,
        overflow,
        overflowed: overflows(overflow),
      })
    } finally {
      await page.close()
    }
  }

  return results
}

/** One line per shot, which is what a report pastes. */
export const describeShot = (result: ShotResult): string =>
  `${result.name}  ${result.viewport.width}x${result.viewport.height}@${result.viewport.deviceScaleFactor}x  ` +
  `scrollWidth ${result.overflow.scrollWidth} / innerWidth ${result.overflow.innerWidth}` +
  (result.overflowed ? "  ← overflows" : "")
