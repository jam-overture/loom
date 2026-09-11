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
