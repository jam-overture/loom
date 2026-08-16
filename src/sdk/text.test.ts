import { createElement } from "react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { primitiveTypeSchema } from "../primitive-type.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { registryOf } from "../testing/definitions.js"

import { definePrimitive, type PrimitiveEntry } from "./definition.js"
import { createPrimitiveRegistry, describeRegistryError, type RegistryError } from "./registry.js"
import {
  textCatalogue,
  textCoverage,
  textDictionarySchema,
  textMessageKey,
  textResolverFor,
  type TextDictionary,
} from "./text.js"

const type = (value: string) => primitiveTypeSchema.parse(value)

const withText = (
  primitiveType: string,
  text: Readonly<Record<string, string>>
): PrimitiveEntry =>
  definePrimitive({
    type: primitiveType,
    description: "a subject",
    props: z.object({}),
    text,
    component: ({ children }: LoomPrimitiveProps) => createElement("div", null, children),
  })

const markerDefinition = withText("loom.marker", {
  excluded: "Not included",
  included: "Included",
})

const noteDefinition = withText("loom.note", { aside: "Aside" })

const silentDefinition = definePrimitive({
  type: "loom.page",
  description: "declares no strings at all",
  props: z.object({}),
  component: ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
})

const library = registryOf([silentDefinition, markerDefinition, noteDefinition])

const dictionary = (messages: Readonly<Record<string, string>>): TextDictionary =>
  textDictionarySchema.parse({ locale: "de-DE", messages })

const errorOf = (entries: readonly PrimitiveEntry[]): RegistryError => {
  const built = createPrimitiveRegistry(entries)
  if (built.ok) throw new Error("expected the registry to be refused")

  return built.error
}

describe("textDictionarySchema", () => {
  it("accepts a language tag with a region", () => {
    expect(dictionary({ "loom.marker.excluded": "Nicht enthalten" }).locale).toBe("de-DE")
  })

  it("refuses something that is not a language tag", () => {
    expect(textDictionarySchema.safeParse({ locale: "German!", messages: {} }).success).toBe(false)
  })

  it("refuses an empty translation rather than accepting a nameless control", () => {
    const parsed = textDictionarySchema.safeParse({
      locale: "de",
      messages: { "loom.marker.excluded": "" },
    })

    expect(parsed.success).toBe(false)
  })
})

describe("textCatalogue", () => {
  it("lists every declared string with what its author wrote", () => {
    expect(textCatalogue(library)).toEqual([
      { type: type("loom.marker"), key: "excluded", source: "Not included" },
      { type: type("loom.marker"), key: "included", source: "Included" },
      { type: type("loom.note"), key: "aside", source: "Aside" },
    ])
  })

  it("says nothing about a primitive that declares none", () => {
    expect(textCatalogue(library).map((entry) => entry.type)).not.toContain("loom.page")
  })
})

describe("textResolverFor", () => {
  it("answers with the translation where the dictionary has one", () => {
    const resolver = textResolverFor(library, dictionary({ "loom.marker.excluded": "Nicht enthalten" }))

    expect(resolver.textFor(type("loom.marker"))["excluded"]).toBe("Nicht enthalten")
  })

  it("answers with the declared string where it has none", () => {
    const resolver = textResolverFor(library, dictionary({ "loom.marker.excluded": "Nicht enthalten" }))

    expect(resolver.textFor(type("loom.marker"))["included"]).toBe("Included")
  })

  it("answers an unregistered type with an empty map rather than undefined", () => {
    const resolver = textResolverFor(library, dictionary({}))

    expect(resolver.textFor(type("loom.absent"))).toEqual({})
  })

  it("ignores a dictionary key that names no declared string", () => {
    const resolver = textResolverFor(library, dictionary({ "loom.marker.retired": "Zurückgezogen" }))

    expect(Object.keys(resolver.textFor(type("loom.marker"))).sort()).toEqual([
      "excluded",
      "included",
    ])
  })

  it("does not read a message off Object.prototype", () => {
    const messages: Record<string, string> = Object.create(null) as Record<string, string>
    messages["loom.marker.excluded"] = "Nicht enthalten"

    const resolver = textResolverFor(library, { locale: "de", messages })

    expect(resolver.textFor(type("loom.marker"))["included"]).toBe("Included")
  })

  it("answers with a frozen map, so a primitive cannot rewrite a deployment's strings", () => {
    const resolved = textResolverFor(library, dictionary({})).textFor(type("loom.marker"))

    expect(Object.isFrozen(resolved)).toBe(true)
  })
})

describe("a registry as its own text resolver", () => {
  it("answers with what the primitives declared, so an untranslated deployment is correct", () => {
    expect(library.textFor(type("loom.marker"))).toEqual({
      excluded: "Not included",
      included: "Included",
    })
  })

  it("answers a primitive that declared nothing with an empty map", () => {
    expect(library.textFor(type("loom.page"))).toEqual({})
  })
})

describe("textCoverage", () => {
  it("counts what is answered and names what is not", () => {
    const coverage = textCoverage(library, dictionary({ "loom.marker.excluded": "Nicht enthalten" }))

    expect(coverage.locale).toBe("de-DE")
    expect(coverage.translated).toBe(1)
    expect(coverage.untranslated).toEqual([
      { type: type("loom.marker"), key: "included", source: "Included" },
      { type: type("loom.note"), key: "aside", source: "Aside" },
    ])
  })

  it("names dictionary keys that match nothing, which is how a rename shows up", () => {
    const coverage = textCoverage(
      library,
      dictionary({ "loom.tier.retired": "Zurückgezogen", "loom.marker.gone": "Weg" })
    )

    expect(coverage.unknown).toEqual(["loom.marker.gone", "loom.tier.retired"])
  })

  it("reports a complete dictionary as complete", () => {
    const complete = dictionary(
      Object.fromEntries(
        textCatalogue(library).map((entry) => [textMessageKey(entry.type, entry.key), "übersetzt"])
      )
    )

    const coverage = textCoverage(library, complete)

    expect(coverage.translated).toBe(3)
    expect(coverage.untranslated).toEqual([])
    expect(coverage.unknown).toEqual([])
  })
})

describe("registration", () => {
  it("refuses a text key that is not camelCase", () => {
    const error = errorOf([withText("loom.marker", { "not-included": "Not included" })])

    expect(error).toEqual({ code: "invalid-text-key", type: "loom.marker", key: "not-included" })
    expect(describeRegistryError(error)).toContain("not a valid text key")
  })

  it("refuses a text key containing a dot, which a dictionary could not address", () => {
    expect(errorOf([withText("loom.marker", { "state.excluded": "Not included" })])).toEqual({
      code: "invalid-text-key",
      type: "loom.marker",
      key: "state.excluded",
    })
  })

  it("refuses a blank declared string", () => {
    const error = errorOf([withText("loom.marker", { excluded: "   " })])

    expect(error).toEqual({ code: "blank-text", type: "loom.marker", key: "excluded" })
    expect(describeRegistryError(error)).toContain("empty string")
  })

  it("carries declared text onto the registered primitive", () => {
    expect(library.primitives[1]?.text).toEqual({ excluded: "Not included", included: "Included" })
  })
})
