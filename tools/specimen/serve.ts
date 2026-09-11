import { readFile } from "node:fs/promises"
import { createServer, type Server } from "node:http"
import { extname, join, normalize, sep } from "node:path"

/**
 * A page has to be **served**, not opened from disk, and that is not fussiness.
 *
 * `mediaUrlSchema` takes `http:` and `https:` only — `data:` is refused
 * deliberately, because a data URL is a script host (0053) — so a specimen
 * carrying an avatar, a logo or any other image cannot be rendered over
 * `file://` at all. The lane that found this lost a run to it. Serving the
 * directory costs nine lines and removes the whole class.
 */

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
}

export const contentTypeFor = (path: string): string =>
  CONTENT_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream"

/**
 * A request path resolved inside the served directory, or `undefined` when it
 * escapes. The harness serves a scratch directory it wrote itself, so this is
 * not defending against an attacker — it is defending against a specimen whose
 * relative link is wrong reading something surprising and photographing it.
 */
export const resolveServedPath = (root: string, requestPath: string): string | undefined => {
  /**
   * `decodeURIComponent` throws on a malformed escape, and this runs inside the
   * request handler — an uncaught one would take the whole command down partway
   * through a set of shots.
   */
  let decoded: string
  try {
    decoded = decodeURIComponent(requestPath.split("?")[0] ?? "/")
  } catch {
    return undefined
  }

  const resolved = join(root, normalize(decoded))
  return resolved === root || resolved.startsWith(`${root}${sep}`) ? resolved : undefined
}

export type StaticServer = {
  readonly origin: string
  readonly close: () => Promise<void>
}

const listening = (server: Server): Promise<number> =>
  new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (address === null || typeof address === "string") {
        reject(new Error("the specimen server was given no TCP address"))
        return
      }
      resolve(address.port)
    })
  })

/** Port 0: the harness may run beside a lane's own dev server, and often does. */
export const serveDirectory = async (root: string): Promise<StaticServer> => {
  const server = createServer((request, response) => {
    const resolved = resolveServedPath(root, request.url ?? "/")
    if (resolved === undefined) {
      response.writeHead(403).end("outside the served directory")
      return
    }

    readFile(resolved)
      .then((body) => {
        response.writeHead(200, { "content-type": contentTypeFor(resolved) }).end(body)
      })
      .catch(() => {
        response.writeHead(404).end("no such specimen page")
      })
  })

  const port = await listening(server)

  return {
    origin: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(() => {
          resolve()
        })
      }),
  }
}
