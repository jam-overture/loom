/**
 * One pull of a project's live pages, and what it does to the pages a server
 * already holds.
 *
 * The request is deliberately the smallest thing that can be made: a `GET`, the
 * project's key as a bearer, the tag of what is held, and no query at all. A
 * request that could say which reader it was for, or which audience, would put
 * Loom back in the render path (0262) — so the client cannot build one. The
 * door refuses a query as well, and both halves saying so is the point: the
 * property does not rest on either side being well behaved.
 *
 * The work is split in two on purpose. `pullLivePages` makes the request and
 * reads the answer, and is the only part that touches a network. Deciding what
 * the answer means for what is held is `withPullOutcome`, which is a pure
 * function of the two — so every branch a server can take, including the ones
 * that only happen when the door misbehaves, is reachable in a test without a
 * running Loom.
 */

import { z } from "zod"

import { audienceIdSchema } from "../audience/audience.js"
import type { AudienceForm } from "../audience/compose.js"
import { audienceRuleSchema, type AudienceRule } from "../audience/rule.js"
import { ceilingOf, describeCeiling, withCeiling } from "../deadline.js"
import { treeIdSchema, type TreeId } from "../ids.js"
import { err, ok, type Result } from "../result.js"
import { treeDeltaSchema } from "../tree/delta.js"
import { describeTreeError } from "../tree/errors.js"
import { parseTree, type LoomTree } from "../tree/tree.js"

import { type LivePages } from "./pages.js"

/** The one path the client asks for, so no customer's configuration holds it. */
export const LIVE_PAGES_PATH = "/api/pages/live"

/** `10s`. A pull nobody is waiting for, with a ceiling well inside the interval. */
export const DEFAULT_PULL_CEILING_MS = 10_000

/**
 * Why a pull did not move what the server holds.
 *
 * The reason is what a log is read for, and the five are the five a deployment
 * acts on differently: its configuration is wrong, Loom is unreachable, Loom is
 * slow, its key is not accepted, or the answer was not one the client can
 * believe. None of them costs the page.
 */
export type SitePullFailure = {
  readonly reason: "unconfigured" | "unreachable" | "expired" | "refused" | "unreadable"
  readonly detail: string
  readonly status?: number
}

/**
 * One page's segment rules as the door answers them: the page, and its list in
 * the order the portal set (0371).
 */
export type LivePageRules = {
  readonly treeId: TreeId
  readonly rules: readonly AudienceRule[]
}

/**
 * One page's segment forms as the door answers them: the page, and a delta per
 * segment that has one, each authored against the revision of the page it
 * arrives beside (0371).
 */
export type LivePageForms = {
  readonly treeId: TreeId
  readonly forms: readonly AudienceForm[]
}

/** What one pull did: brought pages and their rules, confirmed the ones held, or failed. */
export type SitePullOutcome =
  | {
      readonly kind: "fresh"
      readonly pages: readonly LoomTree[]
      readonly rules: readonly LivePageRules[]
      readonly forms: readonly LivePageForms[]
      readonly tag: string | undefined
    }
  | { readonly kind: "unchanged" }
  | { readonly kind: "failed"; readonly failure: SitePullFailure }

/**
 * The shape of `fetch` a pull needs, which is narrower than the global.
 *
 * Narrower so that a test can be a function rather than a server, and so that a
 * host behind a proxy can hand over its own client without implementing the
 * parts of `fetch` nothing here calls.
 */
export type PullFetch = (
  url: string,
  init: {
    readonly method: "GET"
    readonly headers: Readonly<Record<string, string>>
    readonly signal: AbortSignal
    readonly cache: "no-store"
  }
) => Promise<Response>

export type PullLivePagesOptions = {
  /**
   * Where this project's Loom deployment is, as an origin — `https://loom.example.com`.
   * The path is this module's, so a project's configuration never carries one.
   */
  readonly deployment: string
  /**
   * The project's public key, the one its pages already post signals with
   * (0298). Opaque here: what a key may look like is the door's to say, and a
   * second spelling of the rule in the client would be a second place to be
   * wrong.
   */
  readonly key: string
  /** How long to wait for the door. `DEFAULT_PULL_CEILING_MS` when unset. */
  readonly ceilingMs?: number
  /** `globalThis.fetch` unless a host hands over its own. */
  readonly fetch?: PullFetch
}

/**
 * The URL a pull asks for, which by construction carries no query and no
 * fragment.
 *
 * A configured deployment can hold either, by a copied address or a trailing
 * `?`, and a query would be refused by the door with a `400` once a minute for
 * ever. Clearing both here means the one thing the client must not send is not
 * something it can send.
 *
 * The path is appended to whatever path the deployment carries rather than
 * resolved against its origin, so a Loom served under a path keeps it:
 * resolving `/api/pages/live` against `https://example.com/loom` would quietly
 * drop the `/loom`.
 */
export const livePagesUrlOf = (deployment: string): Result<URL, SitePullFailure> => {
  const configured = deployment.trim()

  if (configured === "") {
    return err({
      reason: "unconfigured",
      detail: "no Loom deployment was configured to pull live pages from",
    })
  }

  const url = ((): URL | undefined => {
    try {
      return new URL(configured)
    } catch {
      return undefined
    }
  })()

  if (url === undefined) {
    return err({ reason: "unconfigured", detail: `not a URL to pull from: ${configured}` })
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return err({
      reason: "unconfigured",
      detail: `live pages are pulled over http or https, not ${url.protocol}`,
    })
  }

  url.pathname = `${url.pathname.replace(/\/+$/, "")}${LIVE_PAGES_PATH}`
  url.search = ""
  url.hash = ""

  return ok(url)
}

/**
 * The envelope the door answers. The trees inside are parsed one at a time, so
 * a refusal can say which page could not be read.
 *
 * `rules` and `forms` are optional because a door from before 0371 answers
 * neither, and a site pulling from one has no segments — which is true of it
 * rather than a guess. They are read separately for the same reason: a door
 * that answers rules and no forms is every deployment whose segments are still
 * only names.
 */
const answerSchema = z.object({
  pages: z.array(z.unknown()),
  rules: z.array(z.unknown()).optional(),
  forms: z.array(z.unknown()).optional(),
})

const pageRulesSchema = z.object({
  treeId: treeIdSchema,
  rules: z.array(audienceRuleSchema),
})

const pageFormsSchema = z.object({
  treeId: treeIdSchema,
  forms: z.array(z.object({ audienceId: audienceIdSchema, delta: treeDeltaSchema })),
})

const refusals: Readonly<Record<number, string>> = {
  401: "the project key was not accepted: it is not a key this deployment issued, it has been replaced, or it is a publish key",
  403: "the project is closed, and a closed project serves no live pages",
}

const unreadable = (detail: string): SitePullOutcome => ({
  kind: "failed",
  failure: { reason: "unreadable", detail, status: 200 },
})

/**
 * A list the door answered per page, read against the pages it answered beside
 * them.
 *
 * **Any entry that cannot be read refuses the whole answer**, rather than
 * dropping that page's. A page whose rules were dropped files every reader
 * under `aud_everyone`, which is a segment's page views quietly counted as
 * everybody's — the number that looks right for ever (0284). A page whose
 * forms were dropped serves every reader the base while their signals still
 * say which segment they were in, which is the same fault one dimension
 * across. Keeping the last whole answer instead is what an unreadable page
 * already does.
 *
 * An entry for a page the answer does not hold, and two entries for one page,
 * are refused for the same reason two pages under one id are: the answer has
 * no single reading.
 */
const readPerPage = <T extends { readonly treeId: TreeId }>(
  answered: readonly unknown[],
  pages: ReadonlySet<TreeId>,
  label: string,
  parse: (entry: unknown) => Result<T, string>
): Result<readonly T[], string> => {
  const read: T[] = []
  const seen = new Set<TreeId>()

  for (const [index, entry] of answered.entries()) {
    const where = `${label} ${index + 1} of ${answered.length}`
    const parsed = parse(entry)

    if (!parsed.ok) return err(`${where} ${parsed.error}`)

    const { treeId } = parsed.value

    if (!pages.has(treeId)) return err(`${where} is for a page the answer does not hold: ${treeId}`)
    if (seen.has(treeId)) return err(`${where} repeats a page already answered: ${treeId}`)

    seen.add(treeId)
    read.push(parsed.value)
  }

  return ok(read)
}

/** Why one entry could not be read, as the clause that follows *rule list 2 of 3*. */
const unreadableEntry = (issues: readonly z.ZodIssue[], noun: string): string => {
  const [issue] = issues
  const at = issue === undefined ? "" : ` (${issue.path.join(".") || "the entry"}: ${issue.message})`

  return `is not a page's segment ${noun} this version can read${at}`
}

const readRules = (
  answered: readonly unknown[],
  pages: ReadonlySet<TreeId>
): Result<readonly LivePageRules[], string> =>
  readPerPage(answered, pages, "rule list", (entry) => {
    const parsed = pageRulesSchema.safeParse(entry)

    return parsed.success ? ok(parsed.data) : err(unreadableEntry(parsed.error.issues, "rules"))
  })

/**
 * The forms the door answered.
 *
 * A page with an entry and an empty list is read rather than refused: it is
 * what a door answers for a page whose every form was left out, and it means
 * the same thing as no entry at all.
 */
const readForms = (
  answered: readonly unknown[],
  pages: ReadonlySet<TreeId>
): Result<readonly LivePageForms[], string> =>
  readPerPage(answered, pages, "form list", (entry) => {
    const parsed = pageFormsSchema.safeParse(entry)

    return parsed.success ? ok(parsed.data) : err(unreadableEntry(parsed.error.issues, "forms"))
  })

const readPages = async (answer: Response): Promise<SitePullOutcome> => {
  const body = await answer.json().catch(() => undefined)
  const envelope = answerSchema.safeParse(body)

  if (!envelope.success) {
    return unreadable("the answer was not `{ pages: [...], rules: [...], forms: [...] }`")
  }

  const pages: LoomTree[] = []
  const seen = new Set<TreeId>()

  for (const [index, page] of envelope.data.pages.entries()) {
    const where = `page ${index + 1} of ${envelope.data.pages.length}`
    const parsed = parseTree(page)

    if (!parsed.ok) {
      return unreadable(`${where} is not a tree this version can read: ${describeTreeError(parsed.error)}`)
    }
    if (seen.has(parsed.value.treeId)) {
      /*
       * The door answers one page per id, so two under one id is an answer with
       * no single reading: taking the later one would serve a page nobody can
       * see named, and taking the earlier one would hide a change. Keeping the
       * last whole set instead is what every other unreadable answer does.
       */
      return unreadable(`${where} repeats a page already answered: ${parsed.value.treeId}`)
    }

    seen.add(parsed.value.treeId)
    pages.push(parsed.value)
  }

  const rules = readRules(envelope.data.rules ?? [], seen)

  if (!rules.ok) return unreadable(rules.error)

  const forms = readForms(envelope.data.forms ?? [], seen)

  if (!forms.ok) return unreadable(forms.error)

  return {
    kind: "fresh",
    pages,
    rules: rules.value,
    forms: forms.value,
    tag: answer.headers.get("etag") ?? undefined,
  }
}

/**
 * Asks the door once, and says what the answer was.
 *
 * It never throws and never rejects: a network that is down, a Loom that is
 * slow and a door answering something unreadable are all outcomes, because a
 * caller that has to catch has a path on which the page is lost (0358 clause
 * 4).
 */
export const pullLivePages = async (
  options: PullLivePagesOptions,
  held: LivePages
): Promise<SitePullOutcome> => {
  const url = livePagesUrlOf(options.deployment)

  if (!url.ok) return { kind: "failed", failure: url.error }
  if (options.key.trim() === "") {
    return {
      kind: "failed",
      failure: { reason: "unconfigured", detail: "no project key was configured to pull with" },
    }
  }

  const ask = options.fetch ?? (globalThis.fetch as PullFetch | undefined)

  if (ask === undefined) {
    return {
      kind: "failed",
      failure: { reason: "unconfigured", detail: "this runtime has no `fetch` to pull with" },
    }
  }

  const ceiling = ceilingOf(options.ceilingMs, DEFAULT_PULL_CEILING_MS)

  return withCeiling(
    ceiling,
    (): SitePullOutcome => ({
      kind: "failed",
      failure: { reason: "expired", detail: `no answer in ${describeCeiling(ceiling)}` },
    }),
    async (signal): Promise<SitePullOutcome> => {
      const answer = await ask(url.value.toString(), {
        method: "GET",
        headers: {
          authorization: `Bearer ${options.key.trim()}`,
          accept: "application/json",
          ...(held.tag === undefined ? {} : { "if-none-match": held.tag }),
        },
        signal,
        cache: "no-store",
      }).then(
        (response) => ok(response),
        (thrown: unknown) =>
          err(thrown instanceof Error ? thrown.message : "the request failed with no message")
      )

      if (!answer.ok) {
        return {
          kind: "failed",
          failure: { reason: "unreachable", detail: `could not reach Loom: ${answer.error}` },
        }
      }

      const { status } = answer.value

      if (status === 304) {
        /*
         * Only reachable from a door that answers `304` to a request that named
         * no pages, which this client does not send. Recording it as a pull
         * would say the server is current with pages it does not hold.
         */
        return held.tag === undefined
          ? {
              kind: "failed",
              failure: {
                reason: "unreadable",
                detail: "the door said nothing had changed, for a request that named no pages",
                status,
              },
            }
          : { kind: "unchanged" }
      }

      if (status === 200) return readPages(answer.value)

      const refused = refusals[status]

      return {
        kind: "failed",
        failure:
          refused === undefined
            ? { reason: "unreachable", detail: `Loom answered ${status}`, status }
            : { reason: "refused", detail: refused, status },
      }
    }
  )
}

/**
 * What the server holds after an outcome: the pure half, and the only place the
 * holding changes.
 *
 * A failed pull returns the pages untouched with one more failure against them,
 * which is clause 4 of the decision behind the pull (0358) as a line of code:
 * freshness is what is lost, never the page. A tag moves only with the pages it
 * names, so what is sent back as `If-None-Match` always describes what is held,
 * and the rules move only with the pages they sort readers of (0371 clause 4).
 */
export const withPullOutcome = (
  held: LivePages,
  outcome: SitePullOutcome,
  at: number
): LivePages => {
  if (outcome.kind === "failed") return { ...held, failures: held.failures + 1 }
  if (outcome.kind === "unchanged") return { ...held, pulledAt: at, failures: 0 }

  return {
    pages: new Map(outcome.pages.map((page) => [page.treeId, page])),
    rules: new Map(
      outcome.rules.filter(({ rules }) => rules.length > 0).map(({ treeId, rules }) => [treeId, rules])
    ),
    forms: new Map(
      outcome.forms.filter(({ forms }) => forms.length > 0).map(({ treeId, forms }) => [treeId, forms])
    ),
    tag: outcome.tag,
    pulledAt: at,
    freshAt: at,
    failures: 0,
  }
}

/** One sentence for a log, naming what failed and what it cost. */
export const describeSitePullFailure = (failure: SitePullFailure): string =>
  `live pages were not pulled (${failure.reason}): ${failure.detail}`
