import { describe, expect, it } from "vitest"

import { describeBindingError, parseBindings } from "./binding.js"
import type { BindingName } from "./source.js"

/** Binding names are branded at the parse boundary; a test names one directly. */
const named = (name: string): BindingName => name as BindingName

describe("parseBindings", () => {
  it("reads a binding name to a source and its params", () => {
    const parsed = parseBindings({
      services: { source: "catalogue.services", params: { limit: 6 } },
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.value.get(named("services"))).toEqual({
      source: "catalogue.services",
      params: { limit: 6 },
    })
  })

  it("defaults absent params to an empty object, so every binding has a key to hash", () => {
    const parsed = parseBindings({ bio: { source: "profile" } })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.value.get(named("bio"))?.params).toEqual({})
  })

  it("reads several bindings on one node", () => {
    const parsed = parseBindings({
      name: { source: "profile" },
      services: { source: "catalogue.services" },
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect([...parsed.value.keys()]).toEqual(["name", "services"])
  })

  it("refuses a source id that is not dot-namespaced kebab-case", () => {
    expect(parseBindings({ things: { source: "Catalogue_Services" } }).ok).toBe(false)
  })

  it("refuses a binding name that is not camelCase", () => {
    expect(parseBindings({ "my-services": { source: "profile" } }).ok).toBe(false)
  })

  it("refuses anything that is not a map", () => {
    expect(parseBindings("profile").ok).toBe(false)
    expect(parseBindings(["profile"]).ok).toBe(false)
    expect(parseBindings(null).ok).toBe(false)
  })

  it("refuses the whole map when one entry is bad, and names the entry", () => {
    const parsed = parseBindings({
      good: { source: "profile" },
      bad: { source: "NOPE" },
    })

    expect(parsed.ok).toBe(false)
    if (parsed.ok) return

    expect(parsed.error.path).toContain("bad")
    expect(describeBindingError(parsed.error)).toContain("bad")
  })

  it("accepts an empty map — a node may declare data and bind nothing yet", () => {
    const parsed = parseBindings({})

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.value.size).toBe(0)
  })
})
