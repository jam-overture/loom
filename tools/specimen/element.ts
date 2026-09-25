import type { ReactNode } from "react"

import {
  createDataRegistry,
  defineSource,
  describeDataRegistryError,
  type DataRegistry,
  type SourceEntry,
} from "../../src/data/adapter.js"
import { resolveTreeData } from "../../src/data/resolve.js"
import { jsonObjectSchema, jsonValueSchema } from "../../src/json.js"
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

import type { Specimen, SpecimenAnswer } from "./specimen.js"

/**
 * One specimen page as a React element, built the same way in both places it is
 * ever built.
 *
 * It is its own module rather than a function inside `render.ts` for one
 * reason, and the reason is an import: `render.ts` pulls in `react-dom/server`,
 * and a live specimen hydrates in a browser, where that module has no business
 * being. Everything a page needs — the primitive registry, the endpoints, the
 * sources, the theme registry, the resolved submissions and the resolved data —
 * is here, and neither caller decides any of it.
 *
 * That symmetry is the whole contract of a live specimen. Hydration is React
 * checking that the client's first render agrees with the server's markup, so
 * anything either side did differently shows up as a mismatch — and the cheapest
 * way to have nothing differ is to have one function. The alternative was to
 * serialise the tree, the resolved submissions, the resolved data and the theme
 * into the document and rebuild from those, which is a second projection of the
 * same values that can drift from the first.
 *
 * **Nothing here does IO, and that is structural rather than a promise.** Both
 * seams this function resolves take their answers from the specimen module: a
 * lane declares a `SubmissionTarget` and a `SpecimenAnswer`, never an endpoint
 * that mints a token or an adapter that queries a database (see
 * `Specimen.endpoints` and `Specimen.answers`). The harness is what wraps each
 * declaration in the seam's own type, so there is no way for a specimen to hand
 * either resolver something that can reach a network, be slow, or answer twice
 * differently. That is what makes the same call safe to make in a browser that
 * must reach no network, and it is why a live specimen may declare answers: the
 * property hydration needs is not that the data seam was skipped, it is that
 * running it twice gives the same result.
 */

export type RenderError =
  | { readonly code: "registry"; readonly detail: string }
  | { readonly code: "endpoints"; readonly detail: string }
  | { readonly code: "sources"; readonly detail: string }

export const describeRenderError = (error: RenderError): string => {
  switch (error.code) {
    case "registry":
      return `the starter library would not build a registry: ${error.detail}`
    case "endpoints":
      return `this specimen's endpoints were refused: ${error.detail}`
    case "sources":
      return `this specimen's answers were refused: ${error.detail}`
  }
}

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

/**
 * A declared answer becomes a source that replies with it and does no IO.
 *
 * Through `defineSource` for the reason `endpointsOf` goes through
 * `defineEndpoint`: the same schemas a host's source is held to run over a
 * lane's fixture, so a specimen asking with params its own tree got wrong is
 * told here rather than photographed as a region that drew nothing.
 *
 * `jsonObjectSchema` accepts any params, because a specimen declares what comes
 * back and not what may be asked — the question is the tree's, and refusing it
 * here would be this harness inventing a contract nobody wrote. What it does
 * still catch is a binding whose `params` are not an object at all.
 */
const sourcesOf = (declared: Readonly<Record<string, SpecimenAnswer>>): readonly SourceEntry[] =>
  Object.entries(declared).map(([id, answer]) =>
    defineSource({
      id,
      description: `declared by a specimen for ${id}`,
      params: jsonObjectSchema,
      answers: jsonValueSchema,
      adapter: { fetch: async () => ("answer" in answer ? ok(answer.answer) : err(answer.unavailable)) },
    })
  )

const dataRegistryOf = (specimen: Specimen): Result<DataRegistry, RenderError> => {
  const built = createDataRegistry(sourcesOf(specimen.answers ?? {}))

  return built.ok
    ? ok(built.value)
    : err({ code: "sources", detail: describeDataRegistryError(built.error) })
}

export const specimenElement = async (
  specimen: Specimen,
  selection: ThemeSelection
): Promise<Result<SpecimenElement, RenderError>> => {
  const registry = createStarterPrimitiveRegistry(specimen.primitives ?? [])
  if (!registry.ok) return err({ code: "registry", detail: JSON.stringify(registry.error) })

  const endpoints = endpointRegistryOf(specimen)
  if (!endpoints.ok) return endpoints

  const sources = dataRegistryOf(specimen)
  if (!sources.ok) return sources

  const tree = specimen.build(selection)
  const submissions = await resolveTreeSubmissions(tree, { registry: endpoints.value })
  const data = await resolveTreeData(tree, { registry: sources.value })
  const rendered = renderLoomTree(tree, {
    resolver: registry.value,
    validator: registry.value,
    themes: createThemeRegistry(),
    submissions,
    data,
  })

  return ok({ element: rendered.element, diagnostics: rendered.diagnostics })
}
