import { renderToStaticMarkup } from "react-dom/server"

import { createStarterPrimitiveRegistry } from "../../src/primitives/index.js"
import type { RenderDiagnostic } from "../../src/render/diagnostics.js"
import { renderLoomTree } from "../../src/render/render.js"
import { createThemeRegistry } from "../../src/theme/registry.js"
import type { PrimitiveEntry } from "../../src/sdk/definition.js"
import { err, ok, type Result } from "../../src/result.js"

import { specimenDocument } from "./page.js"
import { planPages, type PlannedPage } from "./plan.js"
import type { Specimen } from "./specimen.js"

/**
 * A specimen, turned into the documents a browser will be pointed at.
 *
 * The markup is the render seam's own output — `renderLoomTree` into
 * `renderToStaticMarkup` — with no dev server and no hydration in the way.
 * That is what makes a specimen shot cheap, and it is also what makes it
 * honest: what is photographed is what the seam produces, not what a framework
 * did with it afterwards.
 */

export type RenderedPage = {
  readonly page: PlannedPage
  readonly html: string
  readonly diagnostics: readonly RenderDiagnostic[]
}

export type RenderError = { readonly code: "registry"; readonly detail: string }

export const renderSpecimen = (
  specimen: Specimen,
  additionalPrimitives: readonly PrimitiveEntry[] = []
): Result<readonly RenderedPage[], RenderError> => {
  const registry = createStarterPrimitiveRegistry(additionalPrimitives)
  if (!registry.ok) return err({ code: "registry", detail: JSON.stringify(registry.error) })

  const themes = createThemeRegistry()

  return ok(
    planPages(specimen).map((page) => {
      const rendered = renderLoomTree(specimen.build(page.theme.selection), {
        resolver: registry.value,
        validator: registry.value,
        themes,
      })

      return {
        page,
        html: specimenDocument({
          title: `${specimen.title} — ${page.theme.label}`,
          markup: renderToStaticMarkup(rendered.element),
        }),
        diagnostics: rendered.diagnostics,
      }
    })
  )
}
