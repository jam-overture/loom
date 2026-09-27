import {
  createEndpointRegistry,
  defineEndpoint,
  DEFAULT_ENDPOINT_CEILING_MS,
  DEFAULT_INTERPRETER_CEILING_MS,
  DEFAULT_SOURCE_CEILING_MS,
  describeCeiling,
  describeDataUnavailable,
  describeEndpointRegistryError,
  describeInterpretationError,
  describeSubmissionUnavailable,
  modelInterpreter,
  planTreeData,
  resolveTreeData,
  resolveTreeSubmissions,
  sequentialIdFactory,
  type EndpointRegistry,
} from "@jam-overture/loom"
import { buildIntent, fixedClock, formTree, hangingModelClient } from "@jam-overture/loom/testing"

import { boundPage, shopWithASilentSource } from "@/app/(docs)/_lib/data/shop"

/**
 * What *When nothing comes back* prints, produced by making it not come back.
 *
 * Every block on that page is a real await into code that never answers, held to
 * a ceiling of a few milliseconds so that the documentation build does not spend
 * the real one. Nothing here is a fixture, a table of plausible sentences, or a
 * `setTimeout` standing in for an integration: the model client, the data source
 * and the submission endpoint all return a promise that is never resolved, which
 * is the only honest imitation of a socket nobody is going to answer.
 *
 * The ceilings a **deployment** gets are read from the runtime's own published
 * constants and printed beside the produced sentences, so the page can say
 * "three minutes" and "ten seconds" without anybody here typing either.
 *
 * The one thing this file chooses is the small ceiling. It is named in the type
 * below and printed on the page, because a reader comparing `no reply in 5ms`
 * against a documented default of three minutes deserves to be told which of the
 * two numbers a page chose.
 */

/**
 * Five milliseconds, for every seam.
 *
 * Short enough that three expiries cost less than a frame, and safe because the
 * race is not close: every other source and endpoint in these blocks answers
 * from an already-resolved promise, and a timer cannot fire before the
 * microtasks in front of it have run.
 */
export const DOCS_CEILING_MS = 5

/** Whichever door this row is about, as a reader would name it. */
export type Door = {
  /** What the deployment is waiting for, in plain words. */
  readonly door: string
  /** The call that does the waiting. */
  readonly call: string
  /** The runtime's own default, read from the constant the package publishes. */
  readonly standard: string
  /** The name of the constant, so a reader can find it in the reference. */
  readonly constant: string
  /** What came back, produced by reaching the ceiling at `DOCS_CEILING_MS`. */
  readonly sentence: string
  /** The value's own code, which is the ordinary one the seam already had. */
  readonly code: string
  /** What the adapter on the other side heard when the runtime gave up. */
  readonly abort: string
}

/**
 * Asking a model what to change, with a client that never replies.
 *
 * `hangingModelClient` is published by `@jam-overture/loom/testing` for exactly this:
 * every surface with a prompt box has an "it did not come back" state to show,
 * and this is the only way to reach it without waiting three minutes. It also
 * reports what the abort said, which is the half of the ceiling nothing else can
 * observe.
 */
const askAModelThatNeverReplies = async (): Promise<Door> => {
  const client = hangingModelClient()
  const idFactory = sequentialIdFactory("ceiling")
  const { tree } = boundPage()
  const interpreter = modelInterpreter({
    client,
    idFactory,
    clock: fixedClock(),
    ceilingMs: DOCS_CEILING_MS,
  })

  const answered = await interpreter.interpret(
    buildIntent(idFactory, {
      treeId: tree.treeId,
      baseRevision: tree.revision,
      utterance: "make the heading say something about the winter menu",
    }),
    tree
  )

  if (answered.ok) {
    throw new Error("loom: a model that never replies answered, so this page has nothing to show")
  }

  return {
    door: "Asking a model what to change",
    call: "modelInterpreter({ … })",
    standard: describeCeiling(DEFAULT_INTERPRETER_CEILING_MS),
    constant: "DEFAULT_INTERPRETER_CEILING_MS",
    sentence: describeInterpretationError(answered.error),
    code: answered.error.code,
    abort: client.abortedWith() ?? "nothing — the call was never aborted",
  }
}

/**
 * Asking a source for a binding's answer, with an adapter that never answers.
 *
 * The tree is the shop's own page from *Where the content comes from*, resolved
 * against a registry in which the one source it asks twice has gone silent. That
 * is deliberate: the other two sources answer, and the block below this one is
 * about the fact that they do.
 */
const askASourceThatNeverAnswers = async (): Promise<Door> => {
  const { tree } = boundPage()
  const shop = shopWithASilentSource()
  const plan = planTreeData(tree)
  const resolution = await resolveTreeData(tree, {
    registry: shop.registry,
    ceilingMs: DOCS_CEILING_MS,
  })

  const binding = plan.bindings.find((candidate) => candidate.name === "services")

  if (binding === undefined) throw new Error("loom: the shop's page no longer asks for services")

  const outcome = resolution.lookup(binding.nodeId)[binding.name]

  if (outcome === undefined || outcome.status === "ready") {
    throw new Error("loom: a source that never answers answered, so this page has nothing to show")
  }

  return {
    door: "Asking your app for a binding's answer",
    call: "resolveTreeData(tree, { … })",
    standard: describeCeiling(DEFAULT_SOURCE_CEILING_MS),
    constant: "DEFAULT_SOURCE_CEILING_MS",
    sentence: describeDataUnavailable(outcome.unavailable),
    code: outcome.unavailable.reason,
    abort: shop.abortedWith() ?? "nothing — the adapter was never aborted",
  }
}

const SILENT_ENDPOINT = "billing.checkout"

const endpointRegistry = (aborted: (reason: string) => void): EndpointRegistry => {
  const built = createEndpointRegistry([
    defineEndpoint({
      id: SILENT_ENDPOINT,
      description: "Where the basket posts, once a token has been minted for it.",
      endpoint: {
        target: ({ signal }) =>
          new Promise(() => {
            signal?.addEventListener("abort", () => {
              const { reason } = signal

              aborted(reason instanceof Error ? reason.message : "unnamed")
            })
          }),
      },
    }),
  ])

  if (!built.ok) {
    throw new Error(`loom: the documented endpoint registry was refused — ${describeEndpointRegistryError(built.error)}`)
  }

  return built.value
}

/**
 * Asking where a form posts, with an endpoint that never says.
 *
 * A form's target is resolved while the page is being served, because minting a
 * token per request is exactly what the seam is for. That is the budget a
 * ceiling protects: a token store having a bad afternoon costs the forms on the
 * page, and a token store saying nothing at all used to cost the page.
 */
const askAnEndpointThatNeverSays = async (): Promise<Door> => {
  let heard: string | undefined
  const { tree, ids } = formTree(SILENT_ENDPOINT)
  const resolution = await resolveTreeSubmissions(tree, {
    registry: endpointRegistry((reason) => {
      heard = reason
    }),
    ceilingMs: DOCS_CEILING_MS,
  })

  const outcome = resolution.lookup(ids.form)

  if (outcome === undefined || outcome.status === "ready") {
    throw new Error("loom: an endpoint that never answers answered, so this page has nothing to show")
  }

  return {
    door: "Asking your app where a form posts",
    call: "resolveTreeSubmissions(tree, { … })",
    standard: describeCeiling(DEFAULT_ENDPOINT_CEILING_MS),
    constant: "DEFAULT_ENDPOINT_CEILING_MS",
    sentence: describeSubmissionUnavailable(outcome.unavailable),
    code: outcome.unavailable.reason,
    abort: heard ?? "nothing — the endpoint was never aborted",
  }
}

/**
 * The three doors, each one actually held open until the runtime shut it.
 *
 * In the order a reader meets them on this site: the model call they connect
 * first, the data they bind next, and the forms this site has yet to write a
 * page about. Three is the whole list — every other await in the runtime is into
 * its own code or into a store the host chose, and the page says so.
 */
export const produceDoors = async (): Promise<readonly Door[]> =>
  Promise.all([askAModelThatNeverReplies(), askASourceThatNeverAnswers(), askAnEndpointThatNeverSays()])

/** One region of a page, and whether it got its answer while another was waiting. */
export type Region = {
  /** What the region is, in the page's own words rather than by node id. */
  readonly where: string
  readonly reads: string
  readonly source: string
  readonly status: "ready" | "unavailable"
  /** The answer, or the runtime's sentence about not having one. */
  readonly value: string
}

/**
 * The whole shop page, resolved with one source that never answers.
 *
 * This is the block the decision is really about. Before the ceiling, one silent
 * integration did not cost its own region — it cost the page, because
 * `Promise.all` waits for the slowest of its questions and a question nobody
 * answers is not slow. Every row here is one `lookup` through the same
 * resolution, so the two that came back did so while the third was still being
 * waited for.
 */
export const produceRegions = async (): Promise<readonly Region[]> => {
  const { tree, labels } = boundPage()
  const shop = shopWithASilentSource()
  const plan = planTreeData(tree)
  const resolution = await resolveTreeData(tree, {
    registry: shop.registry,
    ceilingMs: DOCS_CEILING_MS,
  })

  return plan.bindings.map((binding) => {
    const outcome = resolution.lookup(binding.nodeId)[binding.name]

    if (outcome === undefined) throw new Error(`loom: ${binding.name} was planned and never resolved`)

    const source = plan.requests.find((request) => request.key === binding.key)?.source

    if (source === undefined) throw new Error(`loom: ${binding.name} has no request in the plan`)

    const where = labels.get(binding.nodeId)

    if (where === undefined) throw new Error(`loom: this page has no name for the node ${binding.nodeId}`)

    return {
      where,
      source,
      reads: `loom.data.${binding.name}`,
      status: outcome.status,
      value:
        outcome.status === "ready"
          ? JSON.stringify(outcome.value)
          : describeDataUnavailable(outcome.unavailable),
    }
  })
}

/** What a reader is asked to believe about the two numbers, read off the package. */
export type Defaults = {
  readonly interpreter: string
  readonly source: string
  readonly endpoint: string
  /** The one this file chose, so the page can say which number is whose. */
  readonly docs: string
}

export const produceDefaults = (): Defaults => ({
  interpreter: describeCeiling(DEFAULT_INTERPRETER_CEILING_MS),
  source: describeCeiling(DEFAULT_SOURCE_CEILING_MS),
  endpoint: describeCeiling(DEFAULT_ENDPOINT_CEILING_MS),
  docs: describeCeiling(DOCS_CEILING_MS),
})
