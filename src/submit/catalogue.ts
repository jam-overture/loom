import type { EndpointId, EndpointRegistry } from "./endpoint.js"

/**
 * Where a deployment will accept a submission.
 *
 * The same projection `dataCatalogue` makes for sources, and it exists for the
 * same reason: a model asked to put a contact form on a page can only name an
 * endpoint it was told about. It is deliberately thinner than the data
 * catalogue — an id and a line — because there is nothing else a model may
 * supply. Whether the endpoint posts or gets, where it posts to, and what it
 * carries are all resolved after the choice is made and are none of the model's
 * business.
 */

export type CataloguedEndpoint = {
  readonly id: EndpointId
  /** One line, written by the endpoint's author, about what it receives. */
  readonly description: string
}

export type SubmissionCatalogue = readonly CataloguedEndpoint[]

export const submissionCatalogue = (registry: EndpointRegistry): SubmissionCatalogue =>
  registry.endpoints.map((endpoint) => ({
    id: endpoint.id,
    description: endpoint.description,
  }))
