import { renderToStaticMarkup } from "react-dom/server"

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
import { createThemeRegistry } from "../../src/theme/registry.js"
import type { PrimitiveEntry } from "../../src/sdk/definition.js"
import {
  createEndpointRegistry,
  defineEndpoint,
  describeEndpointRegistryError,
  type EndpointEntry,
  type EndpointRegistry,
  type SubmissionTarget,
} from "../../src/submit/endpoint.js"
import { resolveTreeSubmissions } from "../../src/submit/resolve.js"
import { err, ok, type Result } from "../../src/result.js"

import { specimenDocument } from "./page.js"
import { planPages, type PlannedPage } from "./plan.js"
import type { Specimen, SpecimenAnswer } from "./specimen.js"

/**
 * A specimen, turned into the documents a browser will be pointed at.
 *
 * The markup is the render seam's own output — `renderLoomTree` into
 * `renderToStaticMarkup` — with no dev server and no hydration in the way.
 * That is what makes a specimen shot cheap, and it is also what makes it
 * honest: what is photographed is what the seam produces, not what a framework
 * did with it afterwards.
 *
 * Async since 2026-09-15, for the one thing in the seam that is: a form's
 * destination is resolved before the walk, never during it (0065). The walk
 * itself is as synchronous as it ever was.
 */

export type RenderedPage = {
  readonly page: PlannedPage
  readonly html: string
  readonly diagnostics: readonly RenderDiagnostic[]
}

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

const registryOf = (
  specimen: Specimen
): Result<EndpointRegistry, RenderError> => {
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

const sourcesFor = (specimen: Specimen): Result<DataRegistry, RenderError> => {
  const built = createDataRegistry(sourcesOf(specimen.answers ?? {}))

  return built.ok
    ? ok(built.value)
    : err({ code: "sources", detail: describeDataRegistryError(built.error) })
}

export const renderSpecimen = async (
  specimen: Specimen,
  additionalPrimitives: readonly PrimitiveEntry[] = []
): Promise<Result<readonly RenderedPage[], RenderError>> => {
  const registry = createStarterPrimitiveRegistry(additionalPrimitives)
  if (!registry.ok) return err({ code: "registry", detail: JSON.stringify(registry.error) })

  const endpoints = registryOf(specimen)
  if (!endpoints.ok) return endpoints

  const sources = sourcesFor(specimen)
  if (!sources.ok) return sources

  const themes = createThemeRegistry()

  const pages: RenderedPage[] = []

  for (const page of planPages(specimen)) {
    const tree = specimen.build(page.theme.selection)
    const submissions = await resolveTreeSubmissions(tree, { registry: endpoints.value })
    const data = await resolveTreeData(tree, { registry: sources.value })
    const rendered = renderLoomTree(tree, {
      resolver: registry.value,
      validator: registry.value,
      themes,
      submissions,
      data,
    })

    pages.push({
      page,
      html: specimenDocument({
        title: `${specimen.title} — ${page.theme.label}`,
        markup: renderToStaticMarkup(rendered.element),
      }),
      diagnostics: rendered.diagnostics,
    })
  }

  return ok(pages)
}
