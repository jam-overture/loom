import {
  buildElement,
  createTree,
  describeSubmissionUnavailable,
  planTreeSubmissions,
  resolveTreeSubmissions,
  sequentialIdFactory,
  submissionCatalogue,
  SUBMIT_PROP_KEY,
  walkTree,
  type EndpointId,
  type LoomNode,
  type LoomTree,
  type NodeId,
  type SubmissionOutcome,
} from "@jam-overture/loom"

import { contactExampleTree } from "@/app/(docs)/_lib/examples/catalogue"
import { docsRegistry } from "@/app/(docs)/_lib/loom/registry"

import {
  CONTACT_ENDPOINT,
  docsEndpoints,
  NEWSLETTER_ENDPOINT,
  TROUBLE,
  troubleEndpoints,
} from "./endpoints"

/**
 * What the submission seam did, produced by doing it.
 *
 * Every block on *What a form posts to* comes from this file, and everything in
 * it is a real run: a real tree is planned, real endpoints are asked, and the
 * sentences printed are the ones `describeSubmissionUnavailable` wrote about
 * what came back. Nothing here is a table of plausible outcomes.
 *
 * The one asymmetry with the data seam's producers is worth naming, because a
 * reader of both will notice it. `resolveTreeData` is given a ceiling here and
 * `resolveTreeSubmissions` is not: every endpoint in this file answers from an
 * already-resolved promise, so the page costs microseconds, and the seam that
 * *does* need a ceiling has its own page. The link between them is one way —
 * this page points at that one.
 *
 * A producer that stops reaching its outcome throws. A documentation page
 * printing a confident lie is worse than a build that stops.
 */

/** The node on the contact page that declared where it posts. */
const submittingNodeId = (tree: LoomTree): NodeId => {
  const node = Array.from(walkTree(tree.root)).find(
    (candidate) => candidate.kind === "element" && candidate.props[SUBMIT_PROP_KEY] !== undefined
  )

  if (node === undefined) throw new Error("loom: the connected contact page declares no submission")

  return node.id
}

const outcomeFor = async (
  tree: LoomTree,
  registry: ReturnType<typeof docsEndpoints>
): Promise<SubmissionOutcome> => {
  const resolution = await resolveTreeSubmissions(tree, { registry })
  const outcome = resolution.lookup(submittingNodeId(tree))

  if (outcome === undefined) throw new Error("loom: a planned submission was never resolved")

  return outcome
}

/**
 * The connected contact form, as a deployment serves it.
 *
 * The tree is the same one the unconnected example on the page is built from,
 * with an endpoint id on the form and nothing else changed. That is the claim
 * the two frames make together, so both come from one builder.
 */
export const connectedContactTree = (): LoomTree => contactExampleTree(CONTACT_ENDPOINT)

export type ResolvedTarget = {
  /** What the tree says, verbatim, as it appears under `loom:submit`. */
  readonly declared: string
  /** The form's action, method and hidden fields, as the endpoint answered. */
  readonly action: string
  readonly method: string
  readonly fields: readonly { readonly name: string; readonly value: string }[]
  /** The endpoint's own line about itself, from its registration. */
  readonly description: string
}

/**
 * One real resolution of the site's own contact form.
 *
 * The distance between `declared` and `action` is the page. A tree that can be
 * changed by a model holds five words naming a registration; the address a
 * visitor's typing is sent to is supplied by the deployment, after the tree has
 * been read and before anything is drawn.
 */
export const produceResolvedTarget = async (): Promise<ResolvedTarget> => {
  const tree = connectedContactTree()
  const registry = docsEndpoints()
  const outcome = await outcomeFor(tree, registry)

  if (outcome.status !== "ready") {
    throw new Error(
      `loom: the documented contact endpoint did not answer — ${describeSubmissionUnavailable(outcome.unavailable)}`
    )
  }

  const registered = registry.endpoint(CONTACT_ENDPOINT as EndpointId)

  if (registered === undefined) throw new Error("loom: the contact endpoint is not registered")

  return {
    declared: JSON.stringify({ to: CONTACT_ENDPOINT }),
    action: outcome.target.action,
    method: outcome.target.method,
    fields: outcome.target.fields,
    description: registered.description,
  }
}

/** One named way of having no target, reached by an endpoint that behaves that way. */
export type Trouble = {
  /** What happened, in the words a person would use. */
  readonly what: string
  /** The endpoint the tree named. */
  readonly to: string
  /** The seam's reason code. */
  readonly reason: string
  /** `describeSubmissionUnavailable`, verbatim — what the diagnostics carry. */
  readonly sentence: string
}

const troubleAt = async (to: string, what: string): Promise<Trouble> => {
  const tree = contactExampleTree(to)
  const outcome = await outcomeFor(tree, troubleEndpoints())

  if (outcome.status === "ready") {
    throw new Error(`loom: ${to} answered with a target, so this row has nothing to show`)
  }

  return {
    what,
    to,
    reason: outcome.unavailable.reason,
    sentence: describeSubmissionUnavailable(outcome.unavailable),
  }
}

/**
 * Every way a form ends up with no target, each one reached rather than
 * described.
 *
 * In the order a deployment meets them: the id was wrong, the host said no, the
 * host could not answer, the host fell over, and the host answered with an
 * address the seam will not carry. Five is the whole list — the type is a union
 * of five reasons, and `claims.test.ts` holds this against it, so a sixth added
 * to the runtime fails in this lane rather than going unwritten.
 */
export const produceTrouble = async (): Promise<readonly Trouble[]> =>
  Promise.all([
    troubleAt(TROUBLE.missing, "The tree names an endpoint the deployment never registered"),
    troubleAt(TROUBLE.refused, "The endpoint will not take this submission"),
    troubleAt(TROUBLE.unavailable, "The endpoint could not answer just now"),
    troubleAt(TROUBLE.threw, "The endpoint threw instead of answering"),
    troubleAt(TROUBLE.offOrigin, "The endpoint answered with an address the seam refuses"),
  ])

/** What a visitor is told, in the primitive's own declared words. */
export type FormNotice = {
  readonly key: string
  readonly sentence: string
}

/**
 * The three sentences `loom.form` owns, read off the registry rather than
 * retyped.
 *
 * They are the primitive's, not the seam's: declared text (0063), so a
 * deployment serving another language replaces them through a dictionary and
 * this page would print whatever it registered. A reason code never reaches a
 * visitor, and none of these three says "endpoint".
 */
export const produceFormNotices = (): readonly FormNotice[] => {
  const form = docsRegistry.primitives.find((primitive) => primitive.type === "loom.form")

  if (form === undefined) throw new Error("loom: the starter library has no loom.form")

  const notices = Object.entries(form.text).map(([key, sentence]) => ({ key, sentence }))

  if (notices.length === 0) throw new Error("loom: loom.form declares no text")

  return notices
}

export type CataloguedDestination = {
  readonly id: string
  readonly description: string
}

export type WhatAModelSees = {
  readonly destinations: readonly CataloguedDestination[]
  /** How many primitives in the starter library post anywhere at all. */
  readonly posting: readonly string[]
  /** How many are in it altogether, for the ratio the page is making. */
  readonly primitives: number
}

/**
 * Everything a model is told about where a form may post, and everything it is
 * not.
 *
 * The catalogue is an id and a line. There is no address in it, no method, and
 * nothing to compose — so the widest a mistake can be is *the wrong registered
 * destination*, which is a mistake a person can read in a diff. That is the
 * bargain this seam is an instance of, and it is worth seeing at its actual
 * size beside the count of primitives that can post at all.
 */
export const produceWhatAModelSees = (): WhatAModelSees => {
  const catalogued = submissionCatalogue(docsEndpoints())

  if (catalogued.length === 0) throw new Error("loom: the documented registry catalogues nothing")

  return {
    destinations: catalogued.map((entry) => ({ id: entry.id, description: entry.description })),
    posting: docsRegistry.primitives
      .filter((primitive) => primitive.submits)
      .map((primitive) => primitive.type),
    primitives: docsRegistry.primitives.length,
  }
}

export type PlannedForms = {
  /** How many nodes on the page declared where they post. */
  readonly declaring: number
  /** How many distinct endpoints those come to. */
  readonly asked: number
  readonly endpoints: readonly string[]
}

/**
 * Two forms on one page, both posting to the same list.
 *
 * Planning deduplicates, for the reason the data seam's planner does and one
 * more besides: a per-form nonce minted twice would invalidate whichever of the
 * two a visitor did not use. The page prints the count rather than asserting it.
 */
export const produceSharedPlan = (): PlannedForms => {
  const tree = twoFormsOnOnePage()
  const plan = planTreeSubmissions(tree)

  return {
    declaring: plan.submissions.length,
    asked: plan.endpoints.length,
    endpoints: plan.endpoints.map(String),
  }
}

/**
 * A page with the same newsletter form in two places, which is what a real one
 * looks like: once in the body and once in the footer.
 *
 * Nothing is rendered from this, so the two forms are bare — the fact being
 * produced is about the plan, and the plan reads `loom:submit` and nothing
 * else.
 */
const twoFormsOnOnePage = (): LoomTree => {
  const ids = sequentialIdFactory("twoforms")

  const form = (): LoomNode =>
    buildElement(ids, {
      type: "loom.form",
      props: { [SUBMIT_PROP_KEY]: { to: NEWSLETTER_ENDPOINT } },
    })

  return createTree(
    buildElement(ids, { type: "loom.page", props: {}, children: [form(), form()] }),
    ids
  )
}
