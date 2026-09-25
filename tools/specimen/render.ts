import { renderToStaticMarkup, renderToString } from "react-dom/server"

import type { RenderDiagnostic } from "../../src/render/diagnostics.js"
import { ok, type Result } from "../../src/result.js"

import { specimenElement, type RenderError } from "./element.js"
import { specimenDocument } from "./page.js"
import { isLive, planPages, type PlannedPage } from "./plan.js"
import type { Specimen } from "./specimen.js"

export { describeRenderError } from "./element.js"
export type { RenderError } from "./element.js"

/**
 * A specimen, turned into the documents a browser will be pointed at.
 *
 * The markup is the render seam's own output — `renderLoomTree` into
 * React's server renderer — with no framework in the way. That is what makes a
 * specimen shot cheap, and it is also what makes it honest: what is
 * photographed is what the seam produces, not what a framework did with it
 * afterwards.
 *
 * Async since 2026-09-15, for the one thing in the seam that is: a form's
 * destination is resolved before the walk, never during it (0065). The walk
 * itself is as synchronous as it ever was.
 *
 * **Two renderers, chosen by whether the specimen asked to be live.**
 * `renderToStaticMarkup` is the cheaper one and is documented as markup that is
 * not to be hydrated; a static specimen is never hydrated, so it keeps it, and
 * every picture ever taken by this harness is unchanged. A live specimen takes
 * `renderToString`, which is the one React supports on the other end of a
 * `hydrateRoot`.
 */

export type RenderedPage = {
  readonly page: PlannedPage
  readonly html: string
  readonly diagnostics: readonly RenderDiagnostic[]
}

export const renderSpecimen = async (
  specimen: Specimen
): Promise<Result<readonly RenderedPage[], RenderError>> => {
  const live = isLive(specimen)
  const markupOf = live ? renderToString : renderToStaticMarkup

  const pages: RenderedPage[] = []

  for (const page of planPages(specimen)) {
    const built = await specimenElement(specimen, page.theme.selection)
    if (!built.ok) return built

    pages.push({
      page,
      html: specimenDocument({
        title: `${specimen.title} — ${page.theme.label}`,
        markup: markupOf(built.value.element),
        ...(live ? { page: page.name } : {}),
      }),
      diagnostics: built.value.diagnostics,
    })
  }

  return ok(pages)
}
