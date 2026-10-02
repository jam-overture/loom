import type { Shot, ShotStep } from "./capture.js"
import {
  DEFAULT_VIEWPORTS,
  type Specimen,
  type SpecimenState,
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

/**
 * One photograph. A viewport does not change the markup, so it reuses a page;
 * neither does a state, which is reached in the browser after the page loads.
 */
export type PlannedShot = {
  readonly name: string
  readonly file: string
  readonly page: PlannedPage
  readonly viewport: SpecimenViewport
  /** What to do before the shutter. Empty for a static specimen, always. */
  readonly do: readonly ShotStep[]
}

/**
 * The states a specimen is photographed in.
 *
 * A static specimen has exactly one and it is nameless, which is what keeps
 * every file name in every report written so far exactly as it was: an unnamed
 * state contributes nothing to a shot's name. A live specimen that declares no
 * states is in the same position — one picture per page and viewport, of the
 * page as it settles once hydration lands.
 */
const NO_STATE: SpecimenState = { label: "", do: [] }

export const planStates = (specimen: Specimen): readonly SpecimenState[] => {
  const declared = specimen.live?.states ?? []
  return declared.length === 0 ? [NO_STATE] : declared
}

/**
 * Whether this specimen's pages are to carry a bundle and be hydrated.
 *
 * `live` is the declaration; this is the one question every caller actually
 * asks of it, in one place, so that "a specimen with steps but no `live`" cannot
 * mean something different in the renderer than it does in the planner. It
 * cannot arise — `states` lives inside `live` — and stating it as a function is
 * what keeps that true if `live` ever grows a second field.
 */
export const isLive = (specimen: Specimen): boolean => specimen.live !== undefined

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
  const states = planStates(specimen)

  return planPages(specimen).flatMap((page) =>
    viewports.flatMap((viewport) =>
      states.map((state) => {
        const suffix = slug(state.label)
        const name = `${page.name}-${slug(viewport.label)}${suffix === "" ? "" : `-${suffix}`}`
        return { name, file: `${name}.png`, page, viewport, do: state.do }
      })
    )
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
 * `do` was empty here for a stronger reason than economy, and the reason held
 * until a specimen could ask to be hydrated: a static specimen page has no
 * script in it to press, so offering steps would have offered a lane a list
 * that silently did nothing. A live specimen has one, so the steps its states
 * declare are carried through — and a static specimen's list is still empty,
 * because `planStates` gives it the one nameless state with nothing in it.
 *
 * `measure` is empty here for a reason of the same kind, and it is the
 * `fullPage` above. A specimen is photographed whole, so its picture has no
 * fold in it — and `pastTheFold` against the viewport it was laid out at would
 * report a number about a boundary that nothing in the artefact has. A lane
 * wanting a band measured against a screen is asking about a screen, which is
 * this harness's other subject.
 */
export const shotsAt = (origin: string, shots: readonly PlannedShot[]): readonly Shot[] =>
  shots.map((shot) => ({
    name: shot.name,
    url: `${origin}/${shot.page.file}`,
    file: shot.file,
    viewport: shot.viewport,
    do: shot.do,
    fullPage: true,
    measure: [],
  }))
