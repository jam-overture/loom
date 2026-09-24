import type { ReactNode } from "react"

import { createStarterPrimitiveRegistry } from "../../src/primitives/index.js"
import type { RenderDiagnostic } from "../../src/render/diagnostics.js"
import { renderLoomTree } from "../../src/render/render.js"
import { err, ok, type Result } from "../../src/result.js"
import {
  createEndpointRegistry,
  defineEndpoint,
  describeEndpointRegistryError,
  type EndpointEntry,
  type EndpointRegistry,
  type SubmissionTarget,
} from "../../src/submit/endpoint.js"
import { resolveTreeSubmissions } from "../../src/submit/resolve.js"
import { createThemeRegistry } from "../../src/theme/registry.js"
import type { ThemeSelection } from "../../src/theme/theme.js"

import type { Specimen } from "./specimen.js"

/**
 * One specimen page as a React element, built the same way in both places it is
 * ever built.
 *
 * It is its own module rather than a function inside `render.ts` for one
 * reason, and the reason is an import: `render.ts` pulls in `react-dom/server`,
 * and a live specimen hydrates in a browser, where that module has no business
 * being. Everything a page needs — the registry, the endpoints, the theme
 * registry, the submissions — is here, and neither caller decides any of it.
 *
 * That symmetry is the whole contract of a live specimen. Hydration is React
 * checking that the client's first render agrees with the server's markup, so
 * anything either side did differently shows up as a mismatch — and the cheapest
 * way to have nothing differ is to have one function. The alternative was to
 * serialise the tree, the resolved submissions and the theme into the document
 * and rebuild from those, which is a second projection of the same values that
 * can drift from the first.
 *
 * Nothing here does IO. A specimen's endpoints are declared targets answered
 * from memory (see `Specimen.endpoints`), which is why the same call is safe to
 * make in a browser that must reach no network.
 */

export type RenderError =
  | { readonly code: "registry"; readonly detail: string }
  | { readonly code: "endpoints"; readonly detail: string }

export const describeRenderError = (error: RenderError): string =>
  error.code === "registry"
    ? `the starter library would not build a registry: ${error.detail}`
    : `this specimen's endpoints were refused: ${error.detail}`

export type SpecimenElement = {
  readonly element: ReactNode
  readonly diagnostics: readonly RenderDiagnostic[]
}

/**
 * A declared target becomes an endpoint that answers with it and does nothing
 * else.
 *
 * Through `defineEndpoint` rather than as a hand-rolled entry, so the target a
 * lane typed is validated by the same schema a host's answer is. A specimen
 * naming `//evil.example` as an action learns that at the harness rather than
 * in review.
 */
const endpointsOf = (declared: Readonly<Record<string, SubmissionTarget>>): readonly EndpointEntry[] =>
  Object.entries(declared).map(([id, target]) =>
    defineEndpoint({
      id,
      description: `declared by a specimen for ${id}`,
      endpoint: { target: async () => ok(target) },
    })
  )

const endpointRegistryOf = (specimen: Specimen): Result<EndpointRegistry, RenderError> => {
  const built = createEndpointRegistry(endpointsOf(specimen.endpoints ?? {}))

  return built.ok
    ? ok(built.value)
    : err({ code: "endpoints", detail: describeEndpointRegistryError(built.error) })
}

export const specimenElement = async (
  specimen: Specimen,
  selection: ThemeSelection
): Promise<Result<SpecimenElement, RenderError>> => {
  const registry = createStarterPrimitiveRegistry(specimen.primitives ?? [])
  if (!registry.ok) return err({ code: "registry", detail: JSON.stringify(registry.error) })

  const endpoints = endpointRegistryOf(specimen)
  if (!endpoints.ok) return endpoints

  const tree = specimen.build(selection)
  const submissions = await resolveTreeSubmissions(tree, { registry: endpoints.value })
  const rendered = renderLoomTree(tree, {
    resolver: registry.value,
    validator: registry.value,
    themes: createThemeRegistry(),
    submissions,
  })

  return ok({ element: rendered.element, diagnostics: rendered.diagnostics })
}
