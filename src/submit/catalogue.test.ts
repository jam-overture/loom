import { describe, expect, it } from "vitest"

import { ok } from "../result.js"

import { submissionCatalogue } from "./catalogue.js"
import {
  createEndpointRegistry,
  defineEndpoint,
  type EndpointEntry,
  type EndpointRegistry,
} from "./endpoint.js"

const entry = (id: string, description: string): EndpointEntry =>
  defineEndpoint({
    id,
    description,
    endpoint: {
      target: () => Promise.resolve(ok({ action: "/api", method: "post" as const, fields: [] })),
    },
  })

const registryOf = (...entries: readonly EndpointEntry[]): EndpointRegistry => {
  const registry = createEndpointRegistry(entries)
  if (!registry.ok) throw new Error(`test registry refused: ${registry.error.code}`)

  return registry.value
}

describe("submissionCatalogue", () => {
  it("projects an id and a line for each registered endpoint, in registration order", () => {
    const catalogue = submissionCatalogue(
      registryOf(
        entry("contact.enquiry", "Receives a contact enquiry"),
        entry("newsletter.subscribe", "Adds an address to the weekly list")
      )
    )

    expect(catalogue).toEqual([
      { id: "contact.enquiry", description: "Receives a contact enquiry" },
      { id: "newsletter.subscribe", description: "Adds an address to the weekly list" },
    ])
  })

  /**
   * Deliberately thinner than the data catalogue. A model choosing where a form
   * posts supplies one thing — the id — so anything else here would be telling
   * it about a decision it does not get to make.
   */
  it("says nothing about where an endpoint goes or what it carries", () => {
    const [first] = submissionCatalogue(registryOf(entry("contact.enquiry", "Receives enquiries")))

    expect(first && Object.keys(first)).toEqual(["id", "description"])
  })

  it("is empty for a deployment that registered none", () => {
    expect(submissionCatalogue(registryOf())).toEqual([])
  })
})
