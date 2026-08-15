import type { CataloguedProp } from "../catalogue.js"

import type { DataRegistry } from "./adapter.js"
import type { SourceId } from "./source.js"

/**
 * What a deployment can ask about, as data.
 *
 * The same projection `catalogueOf` makes for primitives, and it exists for the
 * same reason: a model asked to put someone's services on their page can only
 * name a source it was told about, and a source it was never told about is one
 * it can only guess at. A registry is the allowlist; the catalogue is how the
 * allowlist gets shown to whoever is choosing.
 */

export type CataloguedSource = {
  readonly id: SourceId
  /** One line, written by the source's author, about what it answers. */
  readonly description: string
  /**
   * Declared params, name-sorted. `undefined` when the declared schema is not an
   * object schema and its keys therefore cannot be enumerated — unknown, which
   * is not the same claim as "none".
   */
  readonly params: readonly CataloguedProp[] | undefined
}

export type DataCatalogue = readonly CataloguedSource[]

export const dataCatalogue = (registry: DataRegistry): DataCatalogue =>
  registry.sources.map((source) => ({
    id: source.id,
    description: source.description,
    params: source.declaredParams,
  }))
