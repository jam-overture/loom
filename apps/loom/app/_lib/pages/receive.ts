import {
  describeTreeError,
  err,
  ok,
  parseTree,
  type LoomTree,
  type Result,
} from "@jam-overture/loom"
import type { Application, ApplicationId } from "@jam-overture/loom/store"

import { readAtMost } from "@/app/_lib/app/read-at-most"

import { publishKeyDigest, publishKeySchema, type PublishKeyStore } from "./publish-keys"
import type { PublishedPageStore } from "./published"

/**
 * `/api/pages` — where a site's build hands Loom its pages (0312).
 *
 * Everything it decides is here, and the route file wires it, for
 * `reader-signals/receive.ts`'s reason: every refusal is testable without a
 * request, a database or a running Next.
 *
 * Unlike the signals door, its callers are builds and people with `curl`, so
 * every answer is a sentence meant to be read in a build log.
 */

/** A snapshot is a site's pages, not its content library: comfortably above any real site's. */
export const MAX_SNAPSHOT_BYTES = 1_000_000
export const MAX_SNAPSHOT_PAGES = 200

export type PublishDoor = {
  readonly keys: Pick<PublishKeyStore, "applicationWithDigest">
  /** The application a key named, to ask whether it is still open. */
  readonly applicationOf: (
    application: ApplicationId
  ) => Promise<Result<Application | null, { readonly detail: string }>>
  readonly pagesFor: (application: ApplicationId) => Pick<PublishedPageStore, "publish">
  readonly now: () => number
}

const NO_STORE = { "cache-control": "no-store" } as const

const answer = (status: number, detail: string, headers: Record<string, string> = {}): Response =>
  new Response(`${detail}\n`, {
    status,
    headers: { ...NO_STORE, ...headers, "content-type": "text/plain; charset=utf-8" },
  })

/** 401 carries the challenge its status promises; the scheme is the one the key is sent with. */
const unauthorised = (detail: string): Response =>
  answer(401, detail, { "www-authenticate": 'Bearer realm="loom pages"' })

const bearerOf = (request: Request): string | null => {
  const header = request.headers.get("authorization")
  const match = header === null ? null : /^Bearer\s+(\S+)$/i.exec(header.trim())

  return match?.[1] ?? null
}

/**
 * What a body says, as trees or the first reason it is not a snapshot.
 *
 * Every tree is parsed before any is kept, and one bad tree refuses the whole
 * snapshot (clause 5), so the sentence names which one.
 */
export const readSnapshot = (text: string): Result<readonly LoomTree[], string> => {
  let body: unknown

  try {
    body = JSON.parse(text)
  } catch {
    return err('a snapshot is JSON: { "pages": [ …trees ] }')
  }

  const pages =
    typeof body === "object" && body !== null && "pages" in body ? body.pages : undefined

  if (!Array.isArray(pages)) return err('a snapshot is an object with a "pages" array of trees')
  if (pages.length === 0) return err("a snapshot names at least one page")
  if (pages.length > MAX_SNAPSHOT_PAGES) {
    return err(
      `a snapshot may carry ${MAX_SNAPSHOT_PAGES} pages and this one carried ${pages.length}`
    )
  }

  const parsed = pages.map(parseTree)
  const refused = parsed.findIndex((tree) => !tree.ok)
  const first = parsed[refused]

  if (first !== undefined && !first.ok) {
    return err(`page ${refused} is not a Loom tree: ${describeTreeError(first.error)}`)
  }

  const trees = parsed.flatMap((tree) => (tree.ok ? [tree.value] : []))
  const ids = trees.map((tree) => tree.treeId)
  const repeated = ids.find((id, index) => ids.indexOf(id) !== index)

  return repeated === undefined
    ? ok(trees)
    : err(`page ${repeated} appears twice; a snapshot names each page once`)
}

export const receivePages = async (request: Request, door: PublishDoor): Promise<Response> => {
  const presented = publishKeySchema.safeParse(bearerOf(request))

  if (!presented.success) {
    return unauthorised(
      "send the project's publish key as `Authorization: Bearer lp_…`; an owner makes one on Connect your site"
    )
  }

  const named = await door.keys.applicationWithDigest(await publishKeyDigest(presented.data))

  if (!named.ok) return answer(503, `pages are unavailable: ${named.error.detail}`)
  if (named.value === null) {
    return unauthorised("that is not a publish key this deployment issued, or it has been replaced")
  }

  const application = await door.applicationOf(named.value)

  if (!application.ok) return answer(503, `pages are unavailable: ${application.error.detail}`)
  if (application.value === null) {
    return unauthorised("that key names a project this deployment no longer holds")
  }
  if (application.value.closedAt !== undefined) {
    return answer(403, "that project is closed, and a closed project takes no pages")
  }

  const { text, bytes } = await readAtMost(request, MAX_SNAPSHOT_BYTES)

  if (bytes > MAX_SNAPSHOT_BYTES) {
    return answer(413, `a snapshot may be ${MAX_SNAPSHOT_BYTES} bytes`)
  }

  const snapshot = readSnapshot(text)

  if (!snapshot.ok) return answer(400, snapshot.error)

  const kept = await door.pagesFor(named.value).publish(snapshot.value, door.now())

  if (!kept.ok) return answer(503, `pages are unavailable: ${kept.error.detail}`)

  const count = snapshot.value.length

  return answer(200, `published ${count} page${count === 1 ? "" : "s"}`)
}
