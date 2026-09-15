import type { Shot } from "./capture.js"
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

/**
 * The point at which a specimen stops being special.
 *
 * Everything above knows about themes and rendered documents; nothing below
 * does. A planned shot becomes an address once there is a server to resolve it
 * against, and from there it is the same value `pnpm shoot` hands the same
 * capture loop.
 *
 * `fullPage` is not a choice here: a specimen is a composition, and the reason
 * to photograph one is to see all of it. An address is photographed at the
 * viewport unless its list says otherwise, because a page under test is often
 * a screen rather than a document.
 *
 * `do` is empty here and is not a specimen's to fill, for a stronger reason
 * than economy: a specimen page is `renderToStaticMarkup` with no dev server
 * and no hydration (`render.ts`), so **there is no script in it to press**.
 * Steps belong to `pnpm shoot`, whose subject is an application something else
 * is running. Offering them here would offer a lane a list that silently does
 * nothing.
 */
export const shotsAt = (origin: string, shots: readonly PlannedShot[]): readonly Shot[] =>
  shots.map((shot) => ({
    name: shot.name,
    url: `${origin}/${shot.page.file}`,
    file: shot.file,
    viewport: shot.viewport,
    do: [],
    fullPage: true,
  }))
