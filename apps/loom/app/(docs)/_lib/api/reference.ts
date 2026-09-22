import generated from "./reference.generated.json"
import {
  apiSlugFor,
  type ApiEntry,
  type ApiGroup,
  type ApiKind,
  type ApiReference,
  type ApiRequirement,
  type ApiRequirementReach,
  type ApiSymbol,
} from "./model"

/**
 * The generated reference, as the pages read it.
 *
 * The pages import this and never `extract.ts`: the compiler stays out of the
 * bundle, the reference is data by the time Next sees it, and a page renders
 * from a file rather than from a directory scan.
 *
 * The JSON is checked on the way in. It is written by this repository's own
 * generator, so the check will never fail in the ordinary case — which is the
 * point of doing it at module scope. A malformed reference means the pages are
 * about to render nonsense, and the loud version of that is a build that stops
 * with a sentence saying which entry is wrong.
 */

const KINDS: readonly ApiKind[] = ["function", "value", "schema", "type", "interface", "class"]

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const asString = (value: unknown, where: string): string => {
  if (typeof value !== "string") throw new Error(`loom: the generated reference has no ${where}`)

  return value
}

const asSymbol = (value: unknown, where: string): ApiSymbol => {
  if (!isRecord(value)) throw new Error(`loom: ${where} is not an export`)

  const kind = asString(value.kind, `${where}.kind`)

  if (!KINDS.includes(kind as ApiKind)) throw new Error(`loom: ${where} is a ${kind}, which is not a kind`)

  return {
    name: asString(value.name, `${where}.name`),
    kind: kind as ApiKind,
    signature: asString(value.signature, `${where}.signature`),
    truncated: value.truncated === true,
    summary: asString(value.summary, `${where}.summary`),
  }
}

const asGroup = (value: unknown, where: string): ApiGroup => {
  if (!isRecord(value) || !Array.isArray(value.symbols)) throw new Error(`loom: ${where} is not a group`)

  const module = asString(value.module, `${where}.module`)

  return {
    module,
    title: asString(value.title, `${where}.title`),
    summary: asString(value.summary, `${where}.summary`),
    symbols: value.symbols.map((symbol, index) => asSymbol(symbol, `${module}[${index}]`)),
  }
}

const REACHES: readonly ApiRequirementReach[] = ["loaded", "declared"]

const asRequirement = (value: unknown, where: string): ApiRequirement => {
  if (!isRecord(value)) throw new Error(`loom: ${where} is not a requirement`)

  const reach = asString(value.reach, `${where}.reach`)

  if (!REACHES.includes(reach as ApiRequirementReach)) {
    throw new Error(`loom: ${where} is reached by being ${reach}, which is not how a package is reached`)
  }

  return {
    package: asString(value.package, `${where}.package`),
    range: asString(value.range, `${where}.range`),
    optional: value.optional === true,
    reach: reach as ApiRequirementReach,
  }
}

const asEntry = (value: unknown, where: string): ApiEntry => {
  if (!isRecord(value) || !Array.isArray(value.groups)) throw new Error(`loom: ${where} is not an entry point`)
  if (!Array.isArray(value.requires)) throw new Error(`loom: ${where} does not say what it needs installed`)

  const specifier = asString(value.specifier, `${where}.specifier`)

  return {
    specifier,
    slug: asString(value.slug, `${where}.slug`),
    types: asString(value.types, `${where}.types`),
    requires: value.requires.map((requirement, index) => asRequirement(requirement, `${specifier} needs [${index}]`)),
    groups: value.groups.map((group, index) => asGroup(group, `${specifier}[${index}]`)),
  }
}

export const parseReference = (value: unknown): ApiReference => {
  if (!isRecord(value) || !Array.isArray(value.entries)) {
    throw new Error("loom: the generated reference has no entry points — regenerate it")
  }

  return { entries: value.entries.map((entry, index) => asEntry(entry, `entry ${index}`)) }
}

export const apiReference: ApiReference = parseReference(generated)

export const apiEntries: readonly ApiEntry[] = apiReference.entries

/** The entry point a page slug documents, or nothing when the slug is not one. */
export const apiEntryAt = (slug: string): ApiEntry | undefined =>
  apiEntries.find((entry) => entry.slug === slug)

export const apiSlugs: readonly string[] = apiEntries.map((entry) => entry.slug)

export { apiSlugFor }
