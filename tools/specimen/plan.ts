import {
  DEFAULT_VIEWPORTS,
  type Specimen,
  type SpecimenTheme,
  type SpecimenViewport,
} from "./specimen.js"

/**
 * What a run of the harness will produce, computed before anything is rendered
 * and before a browser is launched.
 *
 * Separating the plan from the doing is what makes the harness checkable
 * without a browser: the naming, the pairing of themes with viewports and the
 * page-per-theme economy are all decided here, by pure functions a test can
 * call. What is left in the driver is genuinely irreducible IO.
 */

/** One rendered document. A theme changes the markup, so it needs its own page. */
export type PlannedPage = {
  readonly name: string
  readonly file: string
  readonly theme: SpecimenTheme
}

/** One photograph. A viewport does not change the markup, so it reuses a page. */
export type PlannedShot = {
  readonly name: string
  readonly file: string
  readonly page: PlannedPage
  readonly viewport: SpecimenViewport
}

/**
 * Lowercase, alphanumeric and hyphens. Every label reaches a file name, and a
 * label is written by a lane in prose — "Editorial serif", "1280 (wide)" — so
 * the harness slugs it rather than asking six lanes to remember not to.
 */
export const slug = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export const planPages = (specimen: Specimen): readonly PlannedPage[] =>
  specimen.themes.map((theme) => {
    const name = `${slug(specimen.name)}-${slug(theme.label)}`
    return { name, file: `${name}.html`, theme }
  })

export const planShots = (specimen: Specimen): readonly PlannedShot[] => {
  const viewports = specimen.viewports ?? DEFAULT_VIEWPORTS

  return planPages(specimen).flatMap((page) =>
    viewports.map((viewport) => {
      const name = `${page.name}-${slug(viewport.label)}`
      return { name, file: `${name}.png`, page, viewport }
    })
  )
}
