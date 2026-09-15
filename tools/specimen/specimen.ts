import type { SubmissionTarget } from "../../src/submit/endpoint.js"
import type { LoomTree } from "../../src/tree/tree.js"
import type { ThemeSelection } from "../../src/theme/theme.js"

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
}

/**
 * The two sizes every report in this repository has been quoting.
 *
 * A **true** 390px viewport rather than a desktop window scaled down: the
 * distinction matters because a media query reads the viewport and a scaled
 * window is still 1280 wide to CSS, so the wrong one photographs the desktop
 * layout at phone size and hides exactly the defect it was taken to find.
 */
export const PHONE: SpecimenViewport = {
  label: "phone",
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
}

export const WIDE: SpecimenViewport = {
  label: "wide",
  width: 1280,
  height: 900,
  deviceScaleFactor: 2,
}

export const DEFAULT_VIEWPORTS: readonly SpecimenViewport[] = [PHONE, WIDE]

/**
 * Identity, and it earns its place by giving a specimen module the type without
 * asking it to import one and annotate a `const`.
 */
export const defineSpecimen = (specimen: Specimen): Specimen => specimen
