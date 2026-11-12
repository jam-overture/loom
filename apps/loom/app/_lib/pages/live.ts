import type { LoomTree, Result, TreeId } from "@jam-overture/loom"
import type { Application, ApplicationId, AudienceRule } from "@jam-overture/loom/store"

import { ingestKeySchema, type IngestKeyStore } from "@/app/_lib/reader-signals/keys"

import type { SitePull } from "./pulls"
import { bearerOf } from "./receive"

/**
 * `GET /api/pages/live` — the read door a customer's server pulls the
 * project's live pages from (0358 clause 3).
 *
 * **It takes the project's public key and nothing else.** The key is the one
 * its pages already post signals with (0298): what it hands back is what those
 * pages show every reader, so a key printed in their source guards nothing a
 * reader cannot already see. A request that carries anything more is refused,
 * because a pull that could say which reader it was for, or which audience,
 * would put Loom back in the render path that 0262 keeps it out of. That is
 * enforced here rather than promised by the client.
 *
 * **It answers each page's audience rules beside the pages** (0371 clause 4):
 * `{ pages, rules }`, where `rules` holds one entry per live page that has a
 * rule list, `{ treeId, rules }`, the list in its order, as 0376's store keeps
 * it. A page with no entry is served as it is to every reader. The site gets
 * every rule and sorts each reader itself, so the request still names nobody.
 * Pages and rules are read in one answer and fail together: a site must never
 * hold rules from one pull beside pages from another.
 *
 * **It answers with an entity tag.** A server pulling on a short interval
 * mostly asks for what it already holds, and `If-None-Match` lets it be told
 * so in a few bytes.
 *
 * Everything it decides is here and the route file wires it, for `receive.ts`'s
 * reason: every refusal is testable without a request, a database or a running
 * Next. Its callers are servers and people with `curl`, so a refusal is a
 * sentence meant for a log.
 */
export type ReadDoor = {
  readonly keys: Pick<IngestKeyStore, "applicationWithKey">
  readonly applicationOf: (
    application: ApplicationId
  ) => Promise<Result<Application | null, { readonly detail: string }>>
  readonly livePagesOf: (
    application: ApplicationId
  ) => Promise<Result<readonly LoomTree[], { readonly detail: string }>>
  /** The current rule list of each of the pages, or why they cannot all be read. */
  readonly rulesOf: (
    application: ApplicationId,
    pages: readonly TreeId[]
  ) => Promise<Result<readonly PageRulesHead[], { readonly detail: string }>>
  /**
   * Told of every answer a site took, `200` and `304` alike, after it is
   * answered: whether a site pulls is what tells a person whether *Accept*
   * reaches readers. Fire and forget, because a pull that could fail on its
   * own record would cost the site its pages over a fact about the site.
   */
  readonly pulled: (pull: SitePull) => void
  readonly now: () => number
}

/** One page's rules as its store holds them: `undefined` where nobody wrote any. */
export type PageRulesHead = {
  readonly treeId: TreeId
  readonly rules: readonly AudienceRule[] | undefined
}

/** One page's rule list in the door's answer. */
export type LiveRules = { readonly treeId: TreeId; readonly rules: readonly AudienceRule[] }

/**
 * The `rules` of the answer: the pages with a list to sort readers by, in the
 * pages' order. A page with none, or whose list was emptied, has no entry,
 * because both mean the same thing to a site, and one spelling keeps the tag
 * still while nothing a reader could be served has changed.
 */
export const liveRulesOf = (heads: readonly PageRulesHead[]): readonly LiveRules[] =>
  heads.flatMap(({ treeId, rules }) =>
    rules === undefined || rules.length === 0 ? [] : [{ treeId, rules }]
  )

/** A pull is always checked with the door, and kept by the site rather than anything between. */
const REVALIDATE = { "cache-control": "private, no-cache" } as const

const answer = (status: number, detail: string, headers: Record<string, string> = {}): Response =>
  new Response(`${detail}\n`, {
    status,
    headers: { ...REVALIDATE, ...headers, "content-type": "text/plain; charset=utf-8" },
  })

const unauthorised = (detail: string): Response =>
  answer(401, detail, { "www-authenticate": 'Bearer realm="loom live pages"' })

/** A strong tag for the exact bytes answered: the same pages answer with the same tag. */
export const entityTagOf = async (body: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body))
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")

  return `"${hex.slice(0, 32)}"`
}

/** Whether `If-None-Match` names the tag, as one of a list or as `*`. Weak tags compare by value. */
export const matchesTag = (header: string | null, tag: string): boolean =>
  header !== null &&
  header
    .split(",")
    .map((candidate) => candidate.trim().replace(/^W\//, ""))
    .some((candidate) => candidate === "*" || candidate === tag)

export const serveLivePages = async (request: Request, door: ReadDoor): Promise<Response> => {
  if (new URL(request.url).search !== "") {
    return answer(
      400,
      "the live pages door takes the project's key and nothing else: no reader, no audience, no query"
    )
  }

  const presented = ingestKeySchema.safeParse(bearerOf(request))

  if (!presented.success) {
    return unauthorised(
      "send the project's key as `Authorization: Bearer lk_…`; it is the key in the snippet on Connect your site"
    )
  }

  const named = await door.keys.applicationWithKey(presented.data)

  if (!named.ok) return answer(503, `live pages are unavailable: ${named.error.detail}`)
  if (named.value === null) {
    return unauthorised("that is not a project key this deployment issued, or it has been replaced")
  }

  const application = await door.applicationOf(named.value)

  if (!application.ok) return answer(503, `live pages are unavailable: ${application.error.detail}`)
  if (application.value === null) {
    return unauthorised("that key names a project this deployment no longer holds")
  }
  if (application.value.closedAt !== undefined) {
    return answer(403, "that project is closed, and a closed project serves no live pages")
  }

  const pages = await door.livePagesOf(named.value)

  if (!pages.ok) return answer(503, `live pages are unavailable: ${pages.error.detail}`)

  const rules = await door.rulesOf(
    named.value,
    pages.value.map((page) => page.treeId)
  )

  if (!rules.ok) return answer(503, `live pages are unavailable: ${rules.error.detail}`)

  const body = JSON.stringify({ pages: pages.value, rules: liveRulesOf(rules.value) })
  const tag = await entityTagOf(body)
  const headers = { ...REVALIDATE, etag: tag }

  const kept = matchesTag(request.headers.get("if-none-match"), tag)

  door.pulled({ application: named.value, tag, at: door.now(), kept })

  return kept
    ? new Response(null, { status: 304, headers })
    : new Response(body, {
        status: 200,
        headers: { ...headers, "content-type": "application/json; charset=utf-8" },
      })
}
