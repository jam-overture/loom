import type { LoomTree, Result } from "@jam-overture/loom"
import type { Application, ApplicationId } from "@jam-overture/loom/store"

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
  /**
   * Told of every answer a site took, `200` and `304` alike, after it is
   * answered: whether a site pulls is what tells a person whether *Accept*
   * reaches readers. Fire and forget, because a pull that could fail on its
   * own record would cost the site its pages over a fact about the site.
   */
  readonly pulled: (pull: SitePull) => void
  readonly now: () => number
}

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

  const body = JSON.stringify({ pages: pages.value })
  const tag = await entityTagOf(body)
  const headers = { ...REVALIDATE, etag: tag }

  door.pulled({ application: named.value, tag, at: door.now() })

  return matchesTag(request.headers.get("if-none-match"), tag)
    ? new Response(null, { status: 304, headers })
    : new Response(body, {
        status: 200,
        headers: { ...headers, "content-type": "application/json; charset=utf-8" },
      })
}
