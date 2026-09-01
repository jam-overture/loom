import { describe, expect, it } from "vitest"

import { err, ok } from "../result.js"

import {
  createEndpointRegistry,
  defineEndpoint,
  describeEndpointRegistryError,
  describeSubmissionUnavailable,
  type EndpointEntry,
  type EndpointId,
  type SubmissionTarget,
} from "./endpoint.js"

const named = (id: string): EndpointId => id as EndpointId

const answering = (id: string, target: unknown): EndpointEntry =>
  defineEndpoint({
    id,
    description: `receives ${id}`,
    endpoint: { target: () => Promise.resolve(ok(target as SubmissionTarget)) },
  })

describe("defineEndpoint", () => {
  it("gives the host's target back when it satisfies the seam", async () => {
    const entry = answering("contact.enquiry", {
      action: "/api/contact",
      method: "post",
      fields: [{ name: "csrf", value: "t0ken" }],
    })

    const resolved = await entry.resolve(undefined)

    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return

    expect(resolved.value).toEqual({
      action: "/api/contact",
      method: "post",
      fields: [{ name: "csrf", value: "t0ken" }],
    })
  })

  it("defaults fields to none, so an endpoint carrying nothing says nothing", async () => {
    const resolved = await answering("contact.enquiry", {
      action: "/api/contact",
      method: "post",
    }).resolve(undefined)

    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return

    expect(resolved.value.fields).toEqual([])
  })

  it("accepts an absolute https action, for a host that posts off its own origin", async () => {
    const resolved = await answering("newsletter.subscribe", {
      action: "https://lists.example.com/subscribe",
      method: "post",
    }).resolve(undefined)

    expect(resolved.ok).toBe(true)
  })

  /**
   * The action is host-authored, so this is not the AI-authored-URL check 0053
   * makes. It is the check that a host's own composition mistake does not become
   * a live `javascript:` form action.
   */
  it("refuses an action that is not a root-relative path or an http(s) URL", async () => {
    for (const action of ["javascript:alert(1)", "", "api/contact", "ftp://files.example.com"]) {
      const resolved = await answering("contact.enquiry", { action, method: "post" }).resolve(
        undefined
      )

      expect(resolved.ok, action).toBe(false)
      if (resolved.ok) continue

      expect(resolved.error.reason).toBe("invalid-target")
    }
  })

  /**
   * The one a leading-slash check accepts and should not.
   *
   * `//evil.example` is scheme-relative and `/\evil.example` is the backslash
   * spelling browsers normalise to it — both begin with `/`, both resolve to
   * another origin, and both look like paths. A form action is where a
   * visitor's typed data is sent, so this is the composition mistake worth
   * failing over rather than the one worth a comment.
   */
  it("refuses a path-shaped action that resolves to another origin", async () => {
    for (const action of [
      "//evil.example/collect",
      "/\\evil.example/collect",
      "//evil.example",
      "/\\\\evil.example",
    ]) {
      const resolved = await answering("contact.enquiry", { action, method: "post" }).resolve(
        undefined
      )

      expect(resolved.ok, action).toBe(false)
      if (resolved.ok) continue

      expect(resolved.error.reason).toBe("invalid-target")
    }
  })

  /**
   * The guard is about crossing an origin silently, not about crossing one. A
   * host that means to post somewhere else says so with a full URL, and the
   * test above and this one are the two halves of that rule.
   */
  it("still accepts an ordinary same-origin path", async () => {
    for (const action of ["/contact", "/api/contact", "/a//b", "/"]) {
      const resolved = await answering("contact.enquiry", { action, method: "post" }).resolve(
        undefined
      )

      expect(resolved.ok, action).toBe(true)
    }
  })

  it("refuses a method that is not one HTML forms have", async () => {
    const resolved = await answering("contact.enquiry", {
      action: "/api/contact",
      method: "put",
    }).resolve(undefined)

    expect(resolved.ok).toBe(false)
    if (resolved.ok) return

    expect(resolved.error.reason).toBe("invalid-target")
  })

  it("refuses a hidden field with no name, which would post nothing under it", async () => {
    const resolved = await answering("contact.enquiry", {
      action: "/api/contact",
      method: "post",
      fields: [{ name: "", value: "t0ken" }],
    }).resolve(undefined)

    expect(resolved.ok).toBe(false)
    if (resolved.ok) return

    expect(resolved.error.reason).toBe("invalid-target")
  })

  it("reports a host's own refusal in its own words", async () => {
    const entry = defineEndpoint({
      id: "contact.enquiry",
      description: "receives enquiries",
      endpoint: {
        target: () => Promise.resolve(err({ code: "refused", detail: "not for this audience" })),
      },
    })

    const resolved = await entry.resolve(undefined)

    expect(resolved.ok).toBe(false)
    if (resolved.ok) return

    expect(resolved.error).toEqual({ reason: "refused", detail: "not for this audience" })
  })

  it("catches an endpoint that throws, rather than losing the page to it", async () => {
    const entry = defineEndpoint({
      id: "contact.enquiry",
      description: "receives enquiries",
      endpoint: {
        target: () => {
          throw new Error("token store is down")
        },
      },
    })

    const resolved = await entry.resolve(undefined)

    expect(resolved.ok).toBe(false)
    if (resolved.ok) return

    expect(resolved.error).toEqual({ reason: "endpoint-threw", detail: "token store is down" })
  })

  it("catches a rejected promise the same way", async () => {
    const entry = defineEndpoint({
      id: "contact.enquiry",
      description: "receives enquiries",
      endpoint: { target: () => Promise.reject(new Error("timed out")) },
    })

    const resolved = await entry.resolve(undefined)

    expect(resolved.ok).toBe(false)
    if (resolved.ok) return

    expect(resolved.error.reason).toBe("endpoint-threw")
  })

  it("hands the render request's context through to the host", async () => {
    const seen: unknown[] = []

    const entry = defineEndpoint({
      id: "contact.enquiry",
      description: "receives enquiries",
      endpoint: {
        target: (request) => {
          seen.push(request.context)

          return Promise.resolve(ok({ action: "/api/contact", method: "post", fields: [] }))
        },
      },
    })

    await entry.resolve({ audience: "member" })

    expect(seen).toEqual([{ audience: "member" }])
  })

  it("calls nothing when it is only defined", () => {
    let called = false

    defineEndpoint({
      id: "contact.enquiry",
      description: "receives enquiries",
      endpoint: {
        target: () => {
          called = true

          return Promise.resolve(ok({ action: "/api/contact", method: "post", fields: [] }))
        },
      },
    })

    expect(called).toBe(false)
  })
})

describe("createEndpointRegistry", () => {
  it("registers in order and looks up by id", () => {
    const registry = createEndpointRegistry([
      answering("contact.enquiry", { action: "/a", method: "post" }),
      answering("newsletter.subscribe", { action: "/b", method: "post" }),
    ])

    expect(registry.ok).toBe(true)
    if (!registry.ok) return

    expect(registry.value.endpoints.map((entry) => entry.id)).toEqual([
      "contact.enquiry",
      "newsletter.subscribe",
    ])
    expect(registry.value.endpoint(named("contact.enquiry"))?.description).toBe(
      "receives contact.enquiry"
    )
    expect(registry.value.endpoint(named("nobody.registered"))).toBeUndefined()
  })

  it("refuses an id that is not dot-namespaced kebab-case", () => {
    const registry = createEndpointRegistry([
      answering("Contact_Enquiry", { action: "/a", method: "post" }),
    ])

    expect(registry.ok).toBe(false)
    if (registry.ok) return

    expect(registry.error.code).toBe("invalid-endpoint-id")
    expect(describeEndpointRegistryError(registry.error)).toContain("contact.enquiry")
  })

  /**
   * Two registrations under one id is the failure worth refusing loudly here:
   * with a data source it serves the wrong answer, and with an endpoint it posts
   * a visitor's message to whichever registration happened to win.
   */
  it("refuses a duplicate id rather than letting one registration win", () => {
    const registry = createEndpointRegistry([
      answering("contact.enquiry", { action: "/a", method: "post" }),
      answering("contact.enquiry", { action: "/b", method: "post" }),
    ])

    expect(registry.ok).toBe(false)
    if (registry.ok) return

    expect(registry.error.code).toBe("duplicate-endpoint-id")
    expect(describeEndpointRegistryError(registry.error)).toContain(
      "post to whichever registration won"
    )
  })
})

describe("describeSubmissionUnavailable", () => {
  it("says something different for each reason", () => {
    const said = (
      ["no-such-endpoint", "invalid-target", "endpoint-threw", "unavailable", "refused"] as const
    ).map((reason) => describeSubmissionUnavailable({ reason, detail: "why" }))

    expect(new Set(said).size).toBe(said.length)
    for (const sentence of said) expect(sentence).toContain("why")
  })
})
