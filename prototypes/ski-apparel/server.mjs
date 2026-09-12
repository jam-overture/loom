import { createServer } from "node:http"

import { buildPage } from "./page.mjs"
import { renderPage } from "./render.mjs"
import { emptyReadings, questionsOpened, record, summarise } from "./signals.mjs"

/**
 * A dev server, in the smallest form that makes the point.
 *
 * There is no bundler and no framework: a Loom page is data, and serving it is a
 * function call and a string.
 *
 * The readings live in one variable for the life of the process. That is wrong
 * for anything real — a second reader would pollute the first — and right here,
 * because the demo is one person scrolling and a session store would be the only
 * interesting thing in the file.
 */

const PORT = Number(process.env.PORT ?? 4321)

const tree = buildPage()

/** The section order, read off the tree the page is rendered from. */
const order = tree.root.children
  .map((child) => child.props?.anchor)
  .filter((anchor) => typeof anchor === "string")

let readings = emptyReadings()

const json = (response, status, body) => {
  response.writeHead(status, { "content-type": "application/json" })
  response.end(JSON.stringify(body))
}

const readBody = async (request) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

/** What the rail gets back on every tick. */
const state = () => ({
  sections: summarise(readings, order),
  questions: questionsOpened(readings),
  feed: readings.feed,
})

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${PORT}`)

  if (request.method === "POST" && url.pathname === "/signals") {
    try {
      const { events = [] } = await readBody(request)
      const at = Date.now()
      for (const event of events) readings = record(readings, event, at)
      json(response, 200, state())
    } catch (error) {
      json(response, 400, { error: String(error) })
    }
    return
  }

  /**
   * Clears the readings. POST, because a GET that changes state is one a link
   * prefetcher or a page scanner can fire without anybody asking.
   */
  if (request.method === "POST" && url.pathname === "/reset") {
    readings = emptyReadings()
    process.stdout.write("reset — readings cleared\n")
    json(response, 200, { ok: true })
    return
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      const rail = url.searchParams.get("rail") !== "off"
      const { document, diagnostics, nodeCount } = renderPage({ rail, tree })

      const note = diagnostics.length === 0 ? "clean" : `${diagnostics.length} diagnostic(s)`
      process.stdout.write(`rendered ${nodeCount} nodes — ${note}\n`)
      for (const diagnostic of diagnostics) process.stdout.write(`  ! ${JSON.stringify(diagnostic)}\n`)

      response.writeHead(200, { "content-type": "text/html; charset=utf-8" })
      response.end(document)
    } catch (error) {
      process.stdout.write(`render failed: ${String(error)}\n`)
      response.writeHead(500, { "content-type": "text/plain" })
      response.end(String(error))
    }
    return
  }

  response.writeHead(404, { "content-type": "text/plain" })
  response.end("not here")
})

server.listen(PORT, () => {
  process.stdout.write(`ski apparel prototype — http://localhost:${PORT}\n`)
  process.stdout.write(`  ?rail=off  the page on its own\n`)
})
