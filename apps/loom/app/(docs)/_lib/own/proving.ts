import {
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  type IdFactory,
  type JsonObject,
  type LoomNode,
  type LoomTree,
} from "@jam-overture/loom"
import { describeRenderDiagnostic, renderLoomTree, THEME_PROP_KEY } from "@jam-overture/loom/react"
import {
  auditRegistry,
  catalogueOf,
  type CataloguedPrimitive,
  type PrimitiveEntry,
} from "@jam-overture/loom/sdk"

import { docsRegistry, docsThemes } from "../loom/registry"

import { OWN_PRIMITIVE_TYPE, OWN_SOUND_PROPS, ownRegistry } from "./registry"

/**
 * Everything *A primitive of your own* claims about the primitive it writes,
 * produced by running it.
 *
 * The page could state all of this in prose and be right for a week. A list of
 * what a schema refuses is exactly the shape §4c's rule about the API reference
 * bans — *generated from the published entry points, not written* — one level
 * down: tighten the schema, loosen a bound, add a state, and a hand-typed list
 * goes on looking as convincing as it did while being wrong, because markdown
 * does not fail.
 *
 * So every row below is a **real render** through the real registry, and the
 * sentence beside each one is `describeRenderDiagnostic`'s rather than a
 * paraphrase of it. `proving.test.ts` is what insists each render reached the
 * fault it is filed under: a refusal that stops being refused fails the build
 * instead of printing a confident claim the framework no longer honours.
 *
 * This is `_lib/reporting/catalogue.ts`'s method pointed at one primitive
 * instead of at the diagnostic union, and `_lib/write/endings.ts`'s before that.
 */

const HOUSE_THEME: JsonObject = {
  palette: "minimal",
  fontPack: "minimal-sans",
  stylePreset: "precise",
}

/**
 * A page with one node on it, built from whatever props are being tried.
 *
 * The root is themed because every example on this site is, and because a tree
 * naming no theme reports a diagnostic of its own — which would put a second
 * sentence beside every row and make none of them evidence.
 */
const pageWith = (namespace: string, props: JsonObject, children: readonly LoomNode[] = []): LoomTree => {
  const ids: IdFactory = sequentialIdFactory(namespace)

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { width: "readable", fills: true, [THEME_PROP_KEY]: HOUSE_THEME },
      children: [buildElement(ids, { type: OWN_PRIMITIVE_TYPE, props, children })],
    }),
    ids
  )
}

export type OwnRefusal = {
  /** What the tree said, as a reader would write it. */
  readonly asked: string
  /**
   * The site's half: the ordinary mistake that produces it.
   *
   * Plain text. It is rendered into a paragraph rather than through MDX, which
   * is the example caption's rule for the same reason — a backtick in here
   * reaches the reader as a backtick.
   */
  readonly story: string
  /** The code the render reported, so the page can say which it was. */
  readonly code: string
  /** The runtime's own sentence, verbatim. */
  readonly reported: string
}

type Attempt = {
  readonly asked: string
  readonly story: string
  readonly code: string
  readonly namespace: string
  readonly props: JsonObject
  /** The registry to render through. The starter library is the one that lacks it. */
  readonly through?: "starter"
}

/**
 * The attempts, in the order a reader makes them.
 *
 * `unknown-primitive` is first because forgetting to register is the first
 * mistake everybody makes, and because it is the one row here that is not about
 * the schema at all: the tree is perfect and the deployment has never heard of
 * it.
 */
const ATTEMPTS: readonly Attempt[] = [
  {
    asked: "a tree holding the node, rendered through a registry without it",
    story: "You wrote the primitive and never added it to the registry.",
    code: "unknown-primitive",
    namespace: "ownunregistered",
    props: OWN_SOUND_PROPS,
    through: "starter",
  },
  {
    asked: `state: "on fire"`,
    story: "A state outside the three the schema names.",
    code: "invalid-props",
    namespace: "ownbadstate",
    props: { ...OWN_SOUND_PROPS, state: "on fire" },
  },
  {
    asked: "no state at all",
    story: "A node that says which service and never says how it is doing.",
    code: "invalid-props",
    namespace: "ownnostate",
    props: { service: "Checkout" },
  },
  {
    asked: `service: "…" past its maximum`,
    story: "A sentence where a name belongs, which is what an unbounded string invites.",
    code: "invalid-props",
    namespace: "ownlongname",
    props: { ...OWN_SOUND_PROPS, service: "Checkout".padEnd(61, " and everything behind it") },
  },
  {
    asked: `tone: "danger"`,
    story: "A prop the schema never declared. Calling .strict() on the schema is what refuses it.",
    code: "invalid-props",
    namespace: "ownextraprop",
    props: { ...OWN_SOUND_PROPS, tone: "danger" },
  },
]

const registryFor = (attempt: Attempt) => (attempt.through === "starter" ? docsRegistry : ownRegistry)

/**
 * One attempt, rendered — and held to the code it is filed under.
 *
 * A render is total: an unknown primitive or a refused prop still produces an
 * element, so "it rendered" proves nothing and the diagnostics are the whole
 * answer. The first one is taken because a node whose props are refused is never
 * called, so nothing underneath it is reached and a render has exactly one
 * complaint about a fault at the top of a subtree.
 */
const refusalOf = (attempt: Attempt): OwnRefusal => {
  const registry = registryFor(attempt)

  const { diagnostics } = renderLoomTree(pageWith(attempt.namespace, attempt.props), {
    resolver: registry,
    validator: registry,
    themes: docsThemes,
  })

  const first = diagnostics[0]

  if (first === undefined) {
    throw new Error(
      `loom: "${attempt.asked}" was expected to report ${attempt.code} and the render had nothing to say about it`
    )
  }

  if (first.code !== attempt.code) {
    throw new Error(
      `loom: "${attempt.asked}" was filed under ${attempt.code} and the render reported ${first.code}`
    )
  }

  return {
    asked: attempt.asked,
    story: attempt.story,
    code: first.code,
    reported: describeRenderDiagnostic(first),
  }
}

export const ownRefusals = (): readonly OwnRefusal[] => ATTEMPTS.map(refusalOf)

/**
 * A node the runtime had nothing to say about, which is the row the table above
 * is measured against.
 *
 * A list of refusals with no accepted case on the page beside it is the same
 * defect as a policy test that only checks the protected prop: it passes just as
 * well against a schema that refuses everything.
 */
export const ownAcceptedTree = (): LoomTree =>
  pageWith("ownsound", OWN_SOUND_PROPS, [buildText(sequentialIdFactory("ownsoundkid"), "Card payments are retrying.")])

export const ownAcceptedDiagnostics = (): readonly string[] =>
  renderLoomTree(ownAcceptedTree(), {
    resolver: ownRegistry,
    validator: ownRegistry,
    themes: docsThemes,
  }).diagnostics.map(describeRenderDiagnostic)

/* -------------------------------------------------------------------------- */
/* What a model is told                                                       */
/* -------------------------------------------------------------------------- */

const entryOf = (type: string): PrimitiveEntry => {
  const entry = ownRegistry.primitives.find((candidate) => candidate.type === type)

  if (entry === undefined) throw new Error(`loom: "${type}" is not in the registry this page renders through`)

  return entry
}

export const ownEntry = (): PrimitiveEntry => entryOf(OWN_PRIMITIVE_TYPE)

/**
 * The catalogue row, which is what an interpreter puts in front of a model.
 *
 * It is deliberately shallower than the schema it comes from — names and
 * whether each is required, never types — and that shallowness is worth a
 * reader seeing rather than being told about, because it is the reason a
 * `description` carries so much weight.
 */
export const ownCatalogueEntry = (): CataloguedPrimitive => {
  const catalogued = catalogueOf(ownRegistry).find((candidate) => candidate.type === OWN_PRIMITIVE_TYPE)

  if (catalogued === undefined) {
    throw new Error(`loom: "${OWN_PRIMITIVE_TYPE}" is registered and absent from the catalogue`)
  }

  return catalogued
}

/**
 * The type of one closed choice, read off the entry that carries them.
 *
 * `ClosedChoice` is the name of this shape in the runtime and it is exported
 * from no published door, while `PrimitiveEntry.choices` and
 * `probeConfigurations` both have it in their signatures. Indexing the entry
 * type is how a consumer names it today, and the asymmetry is filed.
 */
export type OwnClosedChoice = PrimitiveEntry["choices"][number]

/** The props whose accepted values can be listed rather than guessed. */
export const ownClosedChoices = (): readonly OwnClosedChoice[] => ownEntry().choices

/** The strings declared beside the component, as pairs, in declaration order. */
export const ownDeclaredText = (): readonly { readonly key: string; readonly value: string }[] =>
  Object.entries(ownEntry().text).map(([key, value]) => ({ key, value }))

/* -------------------------------------------------------------------------- */
/* Whether a person can edit it                                               */
/* -------------------------------------------------------------------------- */

export type OwnAuditReading = {
  /** Whether the probe found the editable decoration on what the component drew. */
  readonly decorated: boolean
  /** Whether any probed configuration placed the children it was handed. */
  readonly rendersChildren: boolean
  /** Declared regions no probed configuration placed. Empty is the only good answer. */
  readonly unplacedSlots: readonly string[]
  /** Configurations built from its own schema that it threw on. Empty is the only good answer. */
  readonly threw: readonly string[]
  /** How many configurations the probe built from the schema's closed choices. */
  readonly configurations: number
}

/**
 * `auditRegistry` run over the registry this page renders through, read for the
 * one primitive the page wrote.
 *
 * *Scaffolding a project* explains what the audit is and why the scaffolder
 * writes the test that runs it. This is that audit actually run, on a primitive
 * a reader has just watched being written — which is the half the written page
 * could not show, because it has no primitive of its own to run it on.
 *
 * The probe calls the component once per configuration it can build from the
 * schema's closed choices, so a three-state primitive is probed in all three
 * states. That is the number the page quotes, and it is counted rather than
 * typed.
 */
export const ownAuditReading = (): OwnAuditReading => {
  const audit = auditRegistry(ownRegistry)
  const entry = audit.audits.find((candidate) => candidate.type === OWN_PRIMITIVE_TYPE)

  if (entry === undefined) {
    throw new Error(`loom: the audit did not reach "${OWN_PRIMITIVE_TYPE}"`)
  }

  const placement = entry.placement

  if (placement.outcome !== "probed") {
    throw new Error(
      `loom: the probe could not judge "${OWN_PRIMITIVE_TYPE}" — ${placement.reason}`
    )
  }

  return {
    decorated: entry.verdict.outcome === "decorates",
    rendersChildren: placement.rendersChildren,
    unplacedSlots: placement.unplacedSlots,
    threw: placement.threw.map((failure) => failure.reason),
    configurations: placement.probed.length,
  }
}
