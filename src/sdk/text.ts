import { z } from "zod"

import type { PrimitiveType } from "../primitive-type.js"
import { NO_TEXT, type PrimitiveText, type TextResolver } from "../render/text.js"

import type { PrimitiveRegistry } from "./registry.js"

/**
 * Translating the strings primitives own.
 *
 * A registry already answers `textFor` with the strings its primitives
 * declared, which is what a deployment serving the authors' own language wants.
 * This is the other half: what a deployment serving a different language
 * supplies, what a translator has to be given to produce it, and what tells a
 * host that the two have drifted apart.
 *
 * All three are pure projections over a registry. Nothing here renders, and
 * nothing here reads a request — which language a visitor gets is the host's to
 * decide, from headers or a path segment or a stored preference, and the
 * framework never guesses at it.
 */

/**
 * A dictionary addresses one string as `${primitive type}.${key}` — the same
 * flat key a translation file uses, so a dictionary can be a JSON file a
 * translator edits and a diff between two languages is readable.
 *
 * The address is unambiguous because a text key never contains a dot
 * (`textKeySchema`), so the last dot always separates the type from the key.
 */
export const textMessageKey = (type: string, key: string): string => `${type}.${key}`

/**
 * A language tag, kept loose on purpose. It is carried for reporting — which
 * dictionary is this, and which one was incomplete — and nothing in the
 * framework branches on it, so validating it against the full BCP-47 grammar
 * would buy strictness nobody spends.
 */
const localeSchema = z.string().regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/)

export const textDictionarySchema = z.object({
  locale: localeSchema,
  /**
   * Empty translations are refused rather than accepted and ignored. A
   * translator who deletes a string leaves a control with no accessible name,
   * which is the exact failure the seam exists to prevent; refusing the
   * dictionary at the boundary is where that gets caught, because by render time
   * there is nobody left to tell.
   */
  messages: z.record(z.string(), z.string().min(1)),
})

export type TextDictionary = z.infer<typeof textDictionarySchema>

/** One declared string, as a translator needs to see it. */
export type CataloguedText = {
  readonly type: PrimitiveType
  readonly key: string
  /** What the primitive's author wrote, in their own language. */
  readonly source: string
}

/**
 * Every string the registered library owns, in registration order and key-sorted
 * within each primitive — the extraction a translation file is written from.
 *
 * Deliberately **not** part of `catalogueOf`. That catalogue is what a model is
 * told it may build (0013), and these strings are the one part of the page a
 * model must not write: an accessible name is a promise about what a control
 * does, and it belongs to whoever wrote the control.
 */
export const textCatalogue = (registry: PrimitiveRegistry): readonly CataloguedText[] =>
  registry.primitives.flatMap((primitive) =>
    Object.entries(primitive.text)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, source]) => ({ type: primitive.type, key, source }))
  )

/**
 * A resolver over the registry's declarations with a dictionary laid on top.
 *
 * The merge happens once, here, rather than once per node during a walk: a page
 * with fifty perks in it does fifty map reads and no string work at all. A host
 * serving several languages builds one of these per dictionary and keeps them,
 * which is also why this takes a dictionary rather than reading one.
 *
 * A key the dictionary does not carry keeps the declared string. That is not a
 * failure mode to be reported at render time — it is the ordinary state of a
 * translation in progress, and `textCoverage` is where a host finds out about it
 * once rather than on every request.
 */
export const textResolverFor = (
  registry: PrimitiveRegistry,
  dictionary: TextDictionary
): TextResolver => {
  const byType = new Map<string, PrimitiveText<string>>()

  for (const primitive of registry.primitives) {
    const resolved: Record<string, string> = Object.create(null) as Record<string, string>

    for (const [key, source] of Object.entries(primitive.text)) {
      const address = textMessageKey(primitive.type, key)

      /** Own-property only: a dictionary is parsed JSON, and `toString` is a key. */
      resolved[key] = Object.hasOwn(dictionary.messages, address)
        ? (dictionary.messages[address] ?? source)
        : source
    }

    byType.set(primitive.type, Object.freeze(resolved))
  }

  return { textFor: (type: PrimitiveType) => byType.get(type) ?? NO_TEXT }
}

export type TextCoverage = {
  readonly locale: string
  /** How many declared strings this dictionary answers. */
  readonly translated: number
  /** Declared strings it does not answer, which will render in the source language. */
  readonly untranslated: readonly CataloguedText[]
  /**
   * Dictionary keys naming no declared string — a primitive that was renamed or
   * removed, or a typo. Enumerated rather than counted because each one is a
   * line somebody has to delete, and because a whole primitive's worth of them
   * appearing at once is how a rename announces itself.
   */
  readonly unknown: readonly string[]
}

/**
 * What a dictionary covers, and where it has drifted from the library.
 *
 * Reported, never enforced — the same bargain 0012 struck for conformance. A
 * partially translated deployment is a normal state and a legitimate choice; a
 * host that would rather it were not asserts on this in a test or a build step,
 * which is a decision it makes rather than one registration makes for it.
 */
export const textCoverage = (
  registry: PrimitiveRegistry,
  dictionary: TextDictionary
): TextCoverage => {
  const declared = textCatalogue(registry)
  const addresses = new Set(declared.map((entry) => textMessageKey(entry.type, entry.key)))

  const untranslated = declared.filter(
    (entry) => !Object.hasOwn(dictionary.messages, textMessageKey(entry.type, entry.key))
  )

  return {
    locale: dictionary.locale,
    translated: declared.length - untranslated.length,
    untranslated,
    unknown: Object.keys(dictionary.messages)
      .filter((address) => !addresses.has(address))
      .sort(),
  }
}
