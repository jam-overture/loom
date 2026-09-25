import { hydrateRoot } from "react-dom/client"

import { describeRenderError, specimenElement } from "./element.js"
import { SPECIMEN_PAGE_ATTRIBUTE } from "./page.js"
import { planPages } from "./plan.js"
import type { Specimen } from "./specimen.js"

/**
 * The browser half of a live specimen, and the only code in this directory that
 * runs anywhere but Node.
 *
 * It is four lines of work and one line of doubt. The work: read which planned
 * page this document is, build the element the same way the server did, hydrate
 * the body with it. The doubt is the third line — hydration only proves anything
 * if the client renders what the server rendered, and the thing that makes that
 * true is that neither side decides anything: both call `specimenElement`, on
 * the same module, with the same selection, looked up by the same pure planner.
 *
 * **It never renders from scratch.** A `createRoot` here would draw a page that
 * looked right and proved nothing — it would paint over any disagreement between
 * the two renders, which is the single most useful thing a live specimen can
 * catch. So a page whose name is missing or whose build fails writes a line to
 * the console and stops, leaving the server's markup on screen: the photograph
 * is then of a page with no controls in it, which is exactly what the static
 * harness would have shown and is honestly what happened.
 */

const failed = (detail: string): void => {
  /**
   * The console is the whole of the reporting, deliberately. The harness is
   * already measuring the picture and the page is already on screen; a banner
   * drawn over it would photograph itself and hide the subject.
   */
  console.error(`loom specimen: ${detail}`)
}

export const hydrateSpecimen = async (specimen: Specimen): Promise<void> => {
  const name = document.body.getAttribute(SPECIMEN_PAGE_ATTRIBUTE)
  if (name === null) {
    failed(`this document carries no ${SPECIMEN_PAGE_ATTRIBUTE}`)
    return
  }

  const page = planPages(specimen).find((planned) => planned.name === name)
  if (page === undefined) {
    failed(`${specimen.name} plans no page called ${name}`)
    return
  }

  const built = await specimenElement(specimen, page.theme.selection)
  if (!built.ok) {
    failed(describeRenderError(built.error))
    return
  }

  hydrateRoot(document.body, built.value.element)
}
