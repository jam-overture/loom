import type { SourceFailure } from "../../src/data/adapter.js"
import type { JsonValue } from "../../src/json.js"
import type { PrimitiveEntry } from "../../src/sdk/definition.js"
import type { SubmissionTarget } from "../../src/submit/endpoint.js"
import type { LoomTree } from "../../src/tree/tree.js"
import type { ThemeSelection } from "../../src/theme/theme.js"

import type { ShotStep } from "./capture.js"

/**
 * A tree, the themes it should be photographed under, and the viewports it
 * should be photographed at.
 *
 * Six lanes have written a screenshot script privately — `Loom primitives`
 * counted nine writings across nine runs, `Loom portal` two more — and every one
 * of them rediscovered the same three obstacles before it took a picture. The
 * script is not the interesting part of any of those runs, so it is here once.
 *
 * A specimen is **data, not a script**: a lane declares what it wants to look
 * at, and the harness owns finding the browser, serving the page, sizing the
 * viewport and measuring the overflow. That split is what lets the harness
 * change — a new browser path, a different wait — without six lanes editing
 * anything.
 *
 * `build` is a function of the theme rather than a single tree because a tree
 * carries its theme in the root's reserved props (0049). Photographing one
 * composition under three palettes means three trees, and only the module that
 * built the first one knows how.
 */

export type SpecimenTheme = {
  /** Appears in the file name, so it is what a report will call this shot. */
  readonly label: string
  readonly selection: ThemeSelection
}

export type SpecimenViewport = {
  readonly label: string
  readonly width: number
  readonly height: number
  /**
   * 2 everywhere in this repository. A screenshot at 1 is legible on the
   * machine that took it and soft in a report, which is the only place any of
   * these are ever looked at.
   */
  readonly deviceScaleFactor: number
  /**
   * Whether the pointer on this device is a finger.
   *
   * A size on its own is not a device, and that is the whole of why this field
   * exists. Chromium in a 390-pixel window reports a **fine, hovering**
   * pointer, so `@media (hover: hover)` and `@media (pointer: fine)` are true
   * in it — and Tailwind compiles every `hover:` utility inside the first of
   * those. A control that is hidden until hover is therefore photographed in
   * its hidden state at phone width *and* at desktop width, the two pictures
   * agree, and the real phone is in a third state the instrument could not
   * produce: the reveal never comes.
   *
   * Required rather than optional, and that is the point. A viewport that says
   * nothing about its pointer is a viewport whose author did not think about
   * it, which is how a named `phone` came to be a desktop window for seven
   * weeks.
   */
  readonly touch: boolean
}

export type Specimen = {
  /** File-safe on its own; every artefact of this specimen is named after it. */
  readonly name: string
  readonly title: string
  readonly build: (theme: ThemeSelection) => LoomTree
  readonly themes: readonly SpecimenTheme[]
  /** Absent takes `DEFAULT_VIEWPORTS`, which is what the reports already mean. */
  readonly viewports?: readonly SpecimenViewport[]
  /**
   * Where the forms in this specimen post, by endpoint id.
   *
   * Without it a `loom.form` can never name a destination the render can
   * resolve, so it correctly draws the state it draws when nobody said where to
   * post — a notice reading *"This form is not connected yet"* over a
   * `disabled` fieldset at six-tenths opacity. That is the form being right and
   * the photograph being useless: every control inside it is greyed, which is
   * fine for a picture *of a form* and worthless for a picture of the field
   * inside one. The lane that shipped the `checkbox` field type had to lift the
   * fields out into a `loom.stack` to photograph it, producing a specimen of
   * markup no real page has.
   *
   * **A target, not an endpoint.** The seam takes a `SubmissionEndpoint`, whose
   * `target` is an async call that may mint a token against a store. A specimen
   * declares the answer instead, because a photograph must not depend on a
   * network: an endpoint free to do IO is an endpoint free to be slow, to fail
   * on a bad afternoon, and to make two runs of the same specimen produce
   * different pictures. It is still validated — these go through
   * `defineEndpoint`, so a specimen naming an off-origin action is refused
   * exactly as a host's would be.
   */
  readonly endpoints?: Readonly<Record<string, SubmissionTarget>>
  /**
   * What the sources this specimen's trees bind to answer with, by source id.
   *
   * The data seam's half of `endpoints`, and it exists for the same reason.
   * Without it a bound primitive can only ever be photographed in the one state
   * it reaches when nobody answered it — so `loom.feed`'s rows, its designed
   * empty region and its *we could not read this* line are three states of one
   * primitive of which exactly one was reachable, and it is the failure.
   *
   * **An answer, not a source.** The seam takes a `SourceEntry` whose adapter
   * is an async call that may query a database. A specimen declares the reply
   * instead, because a photograph must not depend on a network: an adapter free
   * to do IO is free to be slow, to fail on a bad afternoon, and to make two
   * runs of the same specimen produce different pictures. It is still
   * validated — these go through `defineSource`, so a specimen naming
   * `NotASourceId` is refused exactly as a host's would be, and the params a
   * tree asks with are checked before the answer is handed back.
   *
   * The four states a bound primitive has are all declarable here: rows are an
   * answer, *nothing to report* is an answer of `[]`, a source that did not
   * answer is `{ unavailable: … }`, and a shape the primitive cannot draw is an
   * answer of that shape — the source's own schema accepts any JSON, so what
   * refuses it is the primitive, which is the state being photographed.
   *
   * **Declarable beside `live`**, and the two compose without a rule saying so:
   * an answer is resolved from this table rather than fetched, so resolving it
   * again in the browser gives the same reply and the client's first render
   * agrees with the server's markup. See `element.ts` for why that is
   * structural.
   */
  readonly answers?: Readonly<Record<string, SpecimenAnswer>>
  /**
   * Primitives registered beside the starter library, for this specimen only.
   *
   * `renderSpecimen` has taken a list since the day it was written and nothing
   * could ever pass one, because it was a parameter of the renderer rather than
   * a field of the subject — so the CLI, which is what actually runs a specimen,
   * always called it with none. The consequence was not a missing convenience:
   * a run photographing a **seam** had nothing of its own to photograph it on,
   * so it had to add a primitive to `src/primitives/` to have a subject, which
   * is another lane's directory.
   *
   * What goes here is a primitive that exists to be looked at — the smallest
   * thing that places the control, the slot or the binding under test, with no
   * styling opinions to confuse the picture. A primitive anybody's page should
   * be able to use is not this; it is a finding for `Loom primitives`.
   *
   * It is on the specimen rather than on the command line for the reason
   * `args.ts` gives about viewports and themes: what to photograph is a property
   * of the specimen, checked by the compiler and committed beside the lane that
   * cares. It also has to be here for a live specimen to work at all — the
   * browser builds the same registry from the same module, and a flag would
   * reach only one of the two.
   */
  readonly primitives?: readonly PrimitiveEntry[]
  /**
   * Present when this specimen is to be **hydrated** in the browser before it is
   * photographed, absent for the static page every specimen was until now.
   *
   * A specimen is `renderToStaticMarkup` with no dev server and no hydration,
   * and that is the right subject for almost everything: it is the render seam's
   * own output, with nothing between it and the camera. It is also the one
   * subject in which **no control in the behaviour vocabulary appears at all.**
   * Every one of them returns `null` until an effect proves scripting runs
   * (`behaviour.ts`), which is deliberate and correct on a served page and means
   * a specimen of a primitive that copies, discloses, adjusts, presents or
   * dismisses photographs the page without the thing it was taken for. Five
   * members in, nothing in this repository had ever photographed one; three
   * lanes in four days wrote a private bundle-and-serve script instead, which is
   * the drift 0117 folded two harnesses into one to stop.
   *
   * **Opt-in, and that is the whole of the design.** A specimen that says
   * nothing renders, serves and photographs exactly as it did — no bundle, no
   * browser JavaScript, no change to a single existing picture. Saying `live: {}`
   * buys hydration and nothing else; saying `states` buys the presses.
   */
  readonly live?: SpecimenLive
}

/**
 * One state of a live specimen: a name, and what to do to the page to arrive
 * there.
 *
 * The pair of controls that closes itself is the case that asks for it — a
 * picture of a dialog is two pictures, shut and open, and they are the same
 * page. So a state is a third dimension of the plan beside themes and viewports
 * rather than a second specimen, and the page is rendered once for all of them.
 *
 * The steps are `pnpm shoot`'s, unchanged and deliberately: an instrument may
 * reach a state and may never assert one (0159). Nothing here observes what the
 * press produced — that is what the photograph is for, and what a test in
 * Vitest is for.
 */
export type SpecimenState = {
  /** Appended to the shot's name, so it is what a report will call the picture. */
  readonly label: string
  readonly do: readonly ShotStep[]
}

export type SpecimenLive = {
  /**
   * The states to photograph, in order. Absent takes one state with no steps —
   * the page as it settles once hydration lands, which is the picture a specimen
   * of a single control wants and is already more than a static one can give.
   */
  readonly states?: readonly SpecimenState[]
}

/**
 * What one source answers with: a value, or a named reason there is none.
 *
 * The failure half is a `SourceFailure` rather than a `DataUnavailable`,
 * because those are the two things an *adapter* is allowed to say. The other
 * reasons a binding can be unavailable — an unregistered source, params the
 * source refused, an answer of the wrong shape — are produced by the seam, and
 * a specimen reaches them by declaring the situation rather than the verdict.
 */
export type SpecimenAnswer =
  | { readonly answer: JsonValue }
  | { readonly unavailable: SourceFailure }

/**
 * The two sizes every report in this repository has been quoting.
 *
 * A **true** 390px viewport rather than a desktop window scaled down: the
 * distinction matters because a media query reads the viewport and a scaled
 * window is still 1280 wide to CSS, so the wrong one photographs the desktop
 * layout at phone size and hides exactly the defect it was taken to find.
 *
 * That argument has a second half, and for seven weeks this file only made the
 * first. A media query reads the **pointer** as well as the viewport, and a
 * desktop window narrowed to 390 pixels still reports a mouse — so the wrong
 * one photographs the hovering layout at phone size and hides exactly the
 * defect it was taken to find. `touch` is that half.
 */
export const PHONE: SpecimenViewport = {
  label: "phone",
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  touch: true,
}

export const WIDE: SpecimenViewport = {
  label: "wide",
  width: 1280,
  height: 900,
  deviceScaleFactor: 2,
  touch: false,
}

export const DEFAULT_VIEWPORTS: readonly SpecimenViewport[] = [PHONE, WIDE]

/**
 * Identity, and it earns its place by giving a specimen module the type without
 * asking it to import one and annotate a `const`.
 */
export const defineSpecimen = (specimen: Specimen): Specimen => specimen
