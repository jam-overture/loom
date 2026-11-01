import { err, ok, type LoomTree, type Result } from "@jam-overture/loom"

import type { PublishKey } from "./publish-keys"

/**
 * The other side of `/api/pages`: what a site's build does to hand a
 * deployment its pages (0312), as one function of where, with what, and how
 * a request is sent.
 *
 * `send` is `fetch` in a build and the door itself in a test, so the two
 * sides are tested against each other with no network between them.
 */
export const PAGES_PATH = "/api/pages"

export type Publication = {
  /** The deployment's address, such as `https://www.loomjs.org`. */
  readonly origin: string
  readonly key: PublishKey
  readonly pages: readonly LoomTree[]
  readonly send: (request: Request) => Promise<Response>
}

/** Where a snapshot goes, however the origin was written. */
export const pagesAddress = (origin: string): string =>
  `${origin.replace(/\/+$/u, "")}${PAGES_PATH}`

/** The door's own sentence either way, because it is written to be read in a build log. */
export const publishPages = async ({
  origin,
  key,
  pages,
  send,
}: Publication): Promise<Result<string, string>> => {
  const response = await send(
    new Request(pagesAddress(origin), {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ pages }),
    })
  )
  const said = (await response.text()).trim()

  return response.ok ? ok(said) : err(`${response.status}: ${said}`)
}
