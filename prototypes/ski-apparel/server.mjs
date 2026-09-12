import { createServer } from "node:http"

import { renderPage } from "./render.mjs"

/**
 * A dev server, in the smallest form that makes the point.
 *
 * The page is rebuilt on every request rather than cached, because the whole
 * value of a prototype is editing `page.mjs` and hitting refresh. There is no
 * bundler and no framework: a Loom page is data, and serving it is a function
 * call and a string.
 */

const PORT = Number(process.env.PORT ?? 4321)

createServer((request, response) => {
  if (request.url !== "/" && request.url !== "/index.html") {
    response.writeHead(404, { "content-type": "text/plain" })
    response.end("not here")
    return
  }

  try {
    const { document, diagnostics, nodeCount } = renderPage()

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
}).listen(PORT, () => process.stdout.write(`ski apparel prototype — http://localhost:${PORT}\n`))
