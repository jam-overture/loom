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

/**
 * One box that clips, with content reaching past the edge of it.
 *
 * The document measurement below cannot see any of these, and that is the
 * whole reason this type exists. `overflow: hidden` is not a defect — the
 * library's paints reach their element's edges and a backdrop that did not
 * clip would paint over the band beside it — but it means the page stops being
 * wide when its content gets too wide, so `scrollWidth` against `innerWidth`
 * comes back clean on a page with a word cut in half inside it.
 */
export type ClippedOverflow = {
  /** A short path to the box and its first words: what a lane recognises it by. */
  readonly element: string
  /**
   * How far the box's own in-flow content reaches across it, in the same units
   * as `width`.
   *
   * **In-flow, and `scrollWidth` deliberately is not this number.** A
   * `loom.halo` is an absolutely positioned rim drawn four pixels outside the
   * box it lights, on purpose, and a backdrop clips it on purpose; the
   * browser counts it in `scrollWidth` all the same. Two of eighteen committed
   * specimens reported four pixels of clipped rim on the first run of this
   * instrument and neither was hiding anything. Decoration that is clipped is
   * decoration working. Content that is clipped is a defect, and they have to
   * be told apart or the measurement is noise.
   */
  readonly reach: number
  /** How much room the box gives it: `clientWidth`, padding included. */
  readonly width: number
}

export type Overflow = {
  readonly scrollWidth: number
  readonly innerWidth: number
  /**
   * Every clipping box on the page whose content does not fit it, widest
   * shortfall first.
   *
   * A second reading rather than a second interpretation of the first: the
   * document is either wider than the viewport or it is not, and separately
   * some boxes inside it are hiding what they could not fit. The two are
   * independent — a page can be clean on both, clean on one, or clean on
   * neither — so they are two fields and not one verdict.
   */
  readonly clipped: readonly ClippedOverflow[]
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
 * One box that clips, as the page reports it, before anything has been decided
 * about whether it is worth a line in a report.
 *
 * The split is where the DOM stops. Reading which elements clip needs a laid-out
 * page and a computed style, so it happens in the browser; deciding which of
 * those readings is a defect is arithmetic, so it happens here where it can be
 * tested without one. Before this split the only way to check the rule that
 * drops a visually-hidden label was to take a photograph and read the output.
 */
export type ClippingBox = ClippedOverflow & {
  /**
   * The box's own room for content, its padding taken off.
   *
   * Used only to recognise a box that is *being hidden* rather than clipping,
   * and it is the content box rather than `width` because the pattern that does
   * the hiding writes `width: 1px` and then something else puts padding back
   * on: the documentation site's skip link measures 24 × 17 as a client box and
   * 1 × 1 as a content box, and only the second number says what it is.
   */
  readonly contentWidth: number
  readonly contentHeight: number
}

/**
 * How far past its box content has to reach before it counts.
 *
 * Layout is fractional and these readings are not, so a box whose content is a
 * third of a pixel too wide reports a shortfall of one. Nothing is hidden at
 * that size and every page has a dozen of them.
 */
export const CLIP_TOLERANCE = 1

/**
 * How much room for content a box needs before it is clipping rather than
 * *being* hidden.
 *
 * `position:absolute; width:1px; height:1px; overflow:hidden` is how a
 * visually-hidden announcement is written, here and everywhere else, and it is
 * a clipping box holding a sentence by construction. It is the pattern working,
 * so it is the one exclusion that is about intent rather than about arithmetic
 * — and the first page this instrument was pointed at found one, `sr-only` with
 * `px-3 py-2` on top of it, reported as a 142-pixel reach in a 24-pixel box
 * until the rule was measured on the content box instead.
 */
export const CLIP_VISIBLE_MINIMUM = 2

const shortfall = (box: ClippedOverflow): number => box.reach - box.width

/**
 * The boxes worth naming, widest shortfall first.
 *
 * Only `overflow-x: hidden` and `overflow-x: clip` reach here — `auto` and
 * `scroll` are left out in the page, because a scrollbar is the box telling the
 * reader there is more and that is the opposite of the defect being looked for.
 */
export const clippedFrom = (boxes: readonly ClippingBox[]): readonly ClippedOverflow[] =>
  boxes
    .filter(
      (box) =>
        box.contentWidth >= CLIP_VISIBLE_MINIMUM &&
        box.contentHeight >= CLIP_VISIBLE_MINIMUM &&
        shortfall(box) > CLIP_TOLERANCE
    )
    .map((box) => ({ element: box.element, reach: box.reach, width: box.width }))
    .sort((a, b) => shortfall(b) - shortfall(a) || a.element.localeCompare(b.element))

/**
 * Deliberately **not** folded into `overflows`.
 *
 * A clipped box and a wide document are different facts with different
 * remedies, and one of them decides the exit code of every screenshot run in
 * this repository. Folding them would have turned a measurement that had never
 * been taken into a merge-gate failure on every page it happened to find one
 * on, in the same change that first made it visible — which is how an
 * instrument gets switched off rather than fixed.
 */
export const clips = (measurement: Overflow): boolean => measurement.clipped.length > 0

/**
 * One element's rectangle, as the page reports it, before anything has been
 * decided about whether it fits.
 *
 * Fractional on purpose. `getBoundingClientRect` is, layout is, and a reading
 * rounded at the source is a reading whose error nobody can see afterwards —
 * two blocks 0.4px apart both arrive as the same integer and a report quotes
 * them as touching. Rounding is presentation, so it happens in `describeShot`.
 *
 * Viewport-relative, which is the frame of reference every geometry claim in
 * this repository has actually been making: *the card is 975px in an 857px
 * rail*, *the reply sits 186px above the bottom edge*. A document-relative
 * reading would be a different number that reads the same, which is the worst
 * kind.
 */
export type ElementBox = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  /**
   * How far this element's own content extends down, and how much room it has.
   *
   * The pair, not the difference, because the difference is the only thing a
   * report would print and the two numbers are what make it checkable: *857px
   * of rail holding 1,239px of asks* says where the remedy is, and *382px
   * hidden* does not. Integers, unlike the rectangle above — the DOM rounds
   * these two itself and there is nothing finer to preserve.
   */
  readonly scrollHeight: number
  readonly clientHeight: number
}

/**
 * One selector the shot list asked about, and what it matched.
 *
 * Every match in document order, not the first. A lane asking about
 * `aside li[id]` is asking about the list, and a harness that answered with its
 * head would be answering a question nobody asked — while looking like it had
 * answered the one they did. `found` is empty when nothing matched, which is a
 * reading and not an error: a selector that stops matching is exactly what a
 * lane wants to find out, and it arrives as a printed `no match` rather than as
 * a failed run.
 */
export type MeasuredSelector = {
  readonly selector: string
  readonly found: readonly ElementBox[]
}

/**
 * Whether all four edges of the box are inside the viewport.
 *
 * In Node and not in the page, for `clippedFrom`'s reason: reading a rectangle
 * needs a laid-out document, and deciding whether that rectangle fits is
 * arithmetic. Before this split the only way to check the rule was to take a
 * photograph and read the output.
 */
export const insideViewport = (box: ElementBox, viewport: SpecimenViewport): boolean =>
  box.x >= 0 &&
  box.y >= 0 &&
  box.x + box.width <= viewport.width &&
  box.y + box.height <= viewport.height

/**
 * How far past the bottom edge of the viewport the box reaches, and 0 when its
 * bottom is inside.
 *
 * Its own function beside `insideViewport` rather than a field of one verdict,
 * because it is the one direction with a remedy. A block off the right-hand
 * edge is the overflow the document measurement already reports and the
 * stylesheet already owns; a block below the fold is a copy and ordering
 * decision, which is what six of this repository's last ten visual units have
 * actually been about.
 */
export const pastTheFold = (box: ElementBox, viewport: SpecimenViewport): number =>
  Math.max(0, box.y + box.height - viewport.height)

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
   * Bring the element `scrollTo` names into view, without pressing it.
   *
   * The fourth reach, and the first that is not about time or a press. A
   * surface that pins something to a scroller — a rail, a sticky caution, a
   * long table with a header — has states that are a fact about scroll
   * position and about nothing else, and no sequence of presses reaches them:
   * the driver scrolls an element into view before clicking it, but only to
   * the minimum position that exposes *that* element, which is a position
   * chosen by the driver rather than by the lane.
   *
   * It reaches and does not report, so it is on 0159's near side: the harness
   * never says whether the element was already in view, or where the scroller
   * ended up.
   */
  | { readonly scrollTo: string }

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

/**
 * What the browser already holds when this shot's first document loads.
 *
 * Every step in a `do` list happens *after* a page has read what it reads and
 * decided what to say, so a screen whose whole subject is the state the
 * browser arrived with is unreachable by any of them: a record that will not
 * parse, a record carried from another machine, storage the reader has
 * blocked. Three such screens shipped in one lane on 17 September and all
 * three were photographed by a hand-written driver in a scratch directory,
 * which is the arrangement [0116](../../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)
 * exists to keep from becoming normal.
 *
 * **A closed set of named states, never a script.** The obvious field is an
 * `initScript` string, and it is refused in [0195](../../decisions/0195-a-shot-may-say-what-the-browser-started-with-and-it-says-it-as-data.md):
 * a shot list is input, `strict` on every member so that a misspelling is
 * loud, and a field that runs whatever it is handed is the one thing in such a
 * file that cannot be checked at all. These two members are data — a map and a
 * flag — and the JavaScript that applies them is written here, in this
 * repository, where it is read and typed like everything else.
 *
 * A union rather than two optional fields, so *seed this key* and *make
 * storage throw* cannot both be asked for in one shot. They are opposite
 * instructions and the pair has no meaning.
 */
export type StartState =
  /** Written to `localStorage` before the first paint of every document here. */
  | { readonly storage: Readonly<Record<string, string>> }
  /**
   * Make `window.localStorage` throw, the way a browser does when the reader
   * has blocked site data.
   *
   * The state most worth photographing of the three, because it is the one a
   * reader cannot see is happening, and the one a map of keys cannot reach:
   * there is no value of any key that means *this throws*.
   */
  | { readonly storageBlocked: true }

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
  /**
   * Put the browser in the state the shot starts from, before anything loads.
   *
   * On the seam rather than inside `goto`, because it is a property of the
   * context and not of one address: the `before` that signs a shot in opens a
   * page too, and a seeded record has to be there for that one as well.
   */
  readonly start: (state: StartState) => Promise<void>
  readonly goto: (url: string, waitFor?: string, frame?: string) => Promise<void>
  /** Runs the steps in order. Anchor navigation is pinned; see `playwright.ts`. */
  readonly act: (steps: readonly ShotStep[], frame?: string) => Promise<void>
  readonly measure: () => Promise<Overflow>
  /**
   * Read the rectangle of every element the shot named, in the document the
   * shot's own selectors resolve against.
   *
   * A second reading beside `measure` rather than a field inside it, because
   * the two answer different questions and only one of them is asked on every
   * shot. The overflow measurement is the page's own business and is taken
   * whether a lane asked or not; this one exists because a lane named something
   * it wants the size of, and a shot that named nothing must not pay a round
   * trip into the page to be told so.
   */
  readonly boxes: (
    selectors: readonly string[],
    frame?: string
  ) => Promise<readonly MeasuredSelector[]>
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
  /**
   * What the browser holds before the first document of this shot, `before`
   * included.
   *
   * On the shot rather than on an approach, for the reason `before` is on the
   * shot: the state belongs to the context, and the context is what a shot
   * gets one of.
   */
  readonly start?: StartState
  readonly fullPage: boolean
  readonly clip?: string
  /**
   * Selectors to read a rectangle for, printed beside the shot's own line.
   *
   * Required and empty by default, for the reason `do` is
   * ([0159](../../decisions/0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md)):
   * the capture loop never branches on undefined, and the absence of a
   * measurement is stated where a shot is planned rather than discovered where
   * it is taken.
   *
   * It prints and it does not assert, which is the whole of
   * [0212](../../decisions/0212-the-harness-reads-a-box-it-prints-the-number-and-the-judgement-stays-in-the-report.md).
   * Nothing here can fail a run: a selector that matches nothing reports `no
   * match`, a block below the fold reports how far below, and which of those
   * readings is a defect is the report's to say.
   */
  readonly measure: readonly string[]
}

export type ShotResult = {
  readonly name: string
  readonly file: string
  readonly viewport: SpecimenViewport
  readonly overflow: Overflow
  readonly overflowed: boolean
  /** Whether any box on the page hid content it could not fit. */
  readonly clipped: boolean
  /** One entry per selector the shot asked about, in the order it asked. */
  readonly measured: readonly MeasuredSelector[]
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
      /**
       * Before the `before`. A shot that signs in and then reads a record
       * wants the record there for both loads, and the only ordering that
       * gives it that is this one.
       */
      if (shot.start !== undefined) await page.start(shot.start)
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
      /**
       * After the steps too, and for the same reason: a rail that was scrolled
       * or a card that was opened is the state whose size the lane asked about.
       *
       * Skipped entirely when nothing was named. A shot with no `measure` is
       * every shot in this repository today, and a round trip into the page to
       * be handed an empty list is a cost paid by all of them for none of them.
       */
      const measured =
        shot.measure.length === 0
          ? []
          : await page.boxes(shot.measure, shot.frame)
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
        clipped: clips(overflow),
        measured,
      })
    } finally {
      await page.close()
    }
  }

  return results
}

/**
 * The most a single shot prints about the boxes it found clipping.
 *
 * A page with forty of them is a page with one cause, and forty lines is a
 * wall a lane scrolls past. The count is always exact; the list is the worst
 * offenders, which is where the cause is.
 */
export const CLIPPED_SHOWN = 5

/**
 * One line per shot, which is what a report pastes — and one indented line per
 * clipping box under it, when there are any.
 *
 * Indented rather than appended, because the document measurement is about the
 * page and each of these is about one element: a reader scanning the left
 * margin sees one line per picture, exactly as before this existed.
 */
/**
 * The most matches a single selector prints.
 *
 * `CLIPPED_SHOWN`'s reasoning with its sign reversed, and the difference is
 * worth stating. A clipping box is *discovered* — the page decides how many
 * there are — so a cap protects a lane from a page with forty of one cause. A
 * measured box was *asked for*, so a cap withholds something a lane wanted,
 * and the failure to prevent is a lane quoting a truncated table as a complete
 * one. Hence a higher ceiling than the discovered list, and hence the
 * `…and N more` line below it: a lane that hit this can see it did and narrow
 * the selector, which is the only outcome where the number is safe to quote.
 */
export const MEASURED_SHOWN = 20

/** `x`, `y` and the size, rounded for a report line. See `ElementBox`. */
const describeBox = (box: ElementBox, viewport: SpecimenViewport): string => {
  const hidden = box.scrollHeight > box.clientHeight
  const past = pastTheFold(box, viewport)

  return (
    `x ${Math.round(box.x)} y ${Math.round(box.y)}  ` +
    `${Math.round(box.width)}x${Math.round(box.height)}` +
    (hidden ? `  holding ${box.scrollHeight} in ${box.clientHeight}` : "") +
    (past > 0
      ? `  ← ${Math.round(past)} past the fold`
      : insideViewport(box, viewport)
        ? ""
        : "  ← outside the viewport")
  )
}

/**
 * One line per match of one selector, or one line saying there were none.
 *
 * `(n of m)` whenever a selector matched more than once, because the two facts
 * a lane needs about the second row of a table are which row it is and how many
 * rows there are — and a bare repetition of the selector gives it neither.
 */
const describeSelector = (
  entry: MeasuredSelector,
  viewport: SpecimenViewport
): readonly string[] => {
  if (entry.found.length === 0) return [`    ${entry.selector}  no match`]

  const shown = entry.found.slice(0, MEASURED_SHOWN)
  const rest = entry.found.length - shown.length
  const total = entry.found.length

  return [
    ...shown.map((box, index) => {
      const which = total === 1 ? "" : ` (${index + 1} of ${total})`
      return `    ${entry.selector}${which}  ${describeBox(box, viewport)}`
    }),
    ...(rest > 0 ? [`    …and ${rest} more match${rest === 1 ? "" : "es"}`] : []),
  ]
}

export const describeShot = (result: ShotResult): string => {
  const head =
    `${result.name}  ${result.viewport.width}x${result.viewport.height}@${result.viewport.deviceScaleFactor}x  ` +
    `scrollWidth ${result.overflow.scrollWidth} / innerWidth ${result.overflow.innerWidth}` +
    (result.overflowed ? "  ← overflows" : "")

  const { clipped } = result.overflow
  const shown = clipped.slice(0, CLIPPED_SHOWN)
  const rest = clipped.length - shown.length

  /**
   * The measured lines come after the clipped ones, under the same indent and
   * in the order the shot asked. Two readings of one page, and the one the
   * lane requested is the one it is scrolling to find.
   */
  return [
    clipped.length === 0
      ? head
      : `${head}  ← ${clipped.length} clipping ${clipped.length === 1 ? "box hides" : "boxes hide"} content`,
    ...shown.map((box) => `    ${box.element}  content reaches ${box.reach} in ${box.width}`),
    ...(rest > 0 ? [`    …and ${rest} more`] : []),
    ...result.measured.flatMap((entry) => describeSelector(entry, result.viewport)),
  ].join("\n")
}
