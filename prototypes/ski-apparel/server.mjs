import { createServer } from "node:http"

import { build } from "esbuild"
import { parseReaderSignalBatch } from "@jam-overture/loom/signals"

import { buildPage } from "./page.mjs"
import { renderPage } from "./render.mjs"

/**
 * A dev server, in the smallest form that makes the point.
 *
 * It does three things. It renders the tree. It bundles `rail.client.mjs` —
 * which imports the framework's broadcaster — once at startup, because a
 * browser cannot resolve `@jam-overture/loom/signals` on its own. And it receives
 * every batch the broadcaster sends, parses it the way a real receiver must, and
 * prints what arrived. It stores nothing.
 */

const PORT = Number(process.env.PORT ?? 4321)

const tree = buildPage()

const bundled = await build({
  entryPoints: [new URL("./rail.client.mjs", import.meta.url).pathname],
  bundle: true,
  format: "iife",
  platform: "browser",
  write: false,
  logLevel: "warning",
})
const railScript = bundled.outputFiles[0].text

const readBody = async (request) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return Buffer.concat(chunks).toString("utf8")
}

const countsOf = (signals) =>
  Object.entries(
    signals.reduce((counts, signal) => ({ ...counts, [signal.kind]: (counts[signal.kind] ?? 0) + 1 }), {})
  )
    .map(([kind, count]) => `${kind} ${count}`)
    .join(", ")

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${PORT}`)

  /**
   * A browser is not a trusted author, so the batch is parsed rather than
   * believed. A malformed one is refused with the reasons, and a good one is
   * printed — which is the whole of what "readable" means before anything is
   * stored.
   */
  if (request.method === "POST" && url.pathname === "/signals") {
    let input
    try {
      input = JSON.parse(await readBody(request))
    } catch {
      input = undefined
    }

    const parsed = parseReaderSignalBatch(input)

    if (!parsed.ok) {
      process.stdout.write(`refused a batch: ${JSON.stringify(parsed.error.issues)}\n`)
      response.writeHead(400, { "content-type": "application/json" })
      response.end(JSON.stringify(parsed.error))
      return
    }

    const batch = parsed.value
    process.stdout.write(`batch ${batch.treeId} rev ${batch.revision} — ${countsOf(batch.signals)}\n`)
    response.writeHead(204)
    response.end()
    return
  }

  if (url.pathname === "/rail.js") {
    response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" })
    response.end(railScript)
    return
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      const rail = url.searchParams.get("rail") !== "off"
      const { document, diagnostics, nodeCount } = renderPage({ rail, tree })

      const note = diagnostics.length === 0 ? "clean" : `${diagnostics.length} diagnostic(s)`
      process.stdout.write(`rendered ${nodeCount} nodes${rail ? ", addressed" : ""} — ${note}\n`)
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
  process.stdout.write(`  ?rail=off  the page a visitor gets: no rail, no node ids\n`)
})
