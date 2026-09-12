import { createServer } from "node:http"

import { buildPage } from "./page.mjs"
import { confirmHeld, orderOf, proposeFrom } from "./propose.mjs"
import { renderPage } from "./render.mjs"
import { emptyReadings, questionsOpened, record, summarise } from "./signals.mjs"

/**
 * A dev server, in the smallest form that makes the point.
 *
 * There is no bundler and no framework: a Loom page is data, and serving it is a
 * function call and a string.
 *
 * **The tree is state here, and that is the difference from a static site.** It
 * starts as `buildPage()` and is replaced whenever a change is applied — so a
 * suggestion a reader accepts is visible on the next load, because the page they
 * get is a different tree from the one they got before.
 *
 * All of it lives in three variables for the life of the process. That is wrong
 * for anything real — a second reader would pollute the first — and right here,
 * because the demo is one person scrolling and a session store would be the only
 * interesting thing in the file.
 */

const PORT = Number(process.env.PORT ?? 4321)

let tree = buildPage()
let readings = emptyReadings()
let held
/** Derivations already acted on or waved away. Re-offering them would be nagging. */
let dismissed = []
/**
 * What has actually happened this session.
 *
 * Kept because a suggestion that lands and then vanishes from the rail looks
 * exactly like one that was never made. The rail is the only place a person can
 * see that their reading changed the page.
 */
let done = []

const json = (response, status, body) => {
  response.writeHead(status, { "content-type": "application/json" })
  response.end(JSON.stringify(body))
}

const readBody = async (request) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

/** What the sidebar gets back on every tick. */
const state = (proposal) => ({
  sections: summarise(readings, orderOf(tree)),
  questions: questionsOpened(readings),
  revision: tree.revision,
  order: orderOf(tree),
  done,
  proposal,
})

const look = async () => {
  if (held !== undefined) return { ...held.summary, awaitingYou: true }

  const result = await proposeFrom(readings, tree, { skip: dismissed })

  if (result.tree !== undefined) {
    tree = result.tree
    dismissed = [...dismissed, result.summary.derivation.id]
    done = [...done, { utterance: result.summary.derivation.utterance, asked: false, revision: tree.revision }]
    process.stdout.write(`applied on its own: ${result.summary.derivation.utterance}\n`)
  }

  if (result.held !== undefined) {
    held = { ...result.held, summary: result.summary }
    process.stdout.write(`held for you: ${result.summary.derivation.utterance}\n`)
    return { ...result.summary, awaitingYou: true }
  }

  return result.summary
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${PORT}`)

  if (request.method === "POST" && url.pathname === "/signals") {
    try {
      const { events = [] } = await readBody(request)
      for (const event of events) readings = record(readings, event)
      json(response, 200, state(await look()))
    } catch (error) {
      json(response, 400, { error: String(error) })
    }
    return
  }

  /**
   * A person said yes.
   *
   * The confirmation names nothing — the server already holds the proposal, so a
   * page cannot invent one to apply (0021). All the browser is saying is "the
   * one you showed me."
   */
  if (request.method === "POST" && url.pathname === "/confirm") {
    if (held === undefined) {
      json(response, 409, { error: "nothing is waiting" })
      return
    }

    /**
     * The answer has to name what it is answering.
     *
     * The proposal itself still never leaves the server (0021) — the id here is
     * the *derivation*, which the rail was already shown. It costs nothing and
     * it means a bare POST cannot apply whatever happens to be held: a stray
     * request, a replayed one, or a click on a prompt that has since been
     * replaced by a different suggestion.
     */
    const { answering } = await readBody(request).catch(() => ({}))

    if (answering !== held.derivation.id) {
      process.stdout.write(`refused a confirmation naming ${JSON.stringify(answering)}; holding ${held.derivation.id}\n`)
      json(response, 409, { error: "that is not what is waiting", waiting: held.derivation.id })
      return
    }

    const outcome = confirmHeld(held, tree)

    if (outcome.applied && outcome.tree !== undefined) {
      tree = outcome.tree
      dismissed = [...dismissed, held.derivation.id]
      done = [...done, { utterance: held.derivation.utterance, asked: true, revision: tree.revision }]
      process.stdout.write(`applied: ${held.derivation.utterance} — revision ${tree.revision}\n`)
    }

    held = undefined
    json(response, 200, { ...outcome, tree: undefined, revision: tree.revision })
    return
  }

  if (request.method === "POST" && url.pathname === "/dismiss") {
    const { answering } = await readBody(request).catch(() => ({}))

    if (held !== undefined && answering !== held.derivation.id) {
      json(response, 409, { error: "that is not what is waiting", waiting: held.derivation.id })
      return
    }

    if (held !== undefined) {
      dismissed = [...dismissed, held.derivation.id]
      process.stdout.write(`dismissed: ${held.derivation.utterance}\n`)
      held = undefined
    }
    json(response, 200, state(await look()))
    return
  }

  /** Back to the page as written, with the readings cleared. Handy twice in a row. */
  if (url.pathname === "/reset") {
    tree = buildPage()
    readings = emptyReadings()
    held = undefined
    dismissed = []
    done = []
    process.stdout.write("reset — tree rebuilt, readings cleared\n")
    json(response, 200, { ok: true })
    return
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      const rail = url.searchParams.get("rail") !== "off"
      const { document, diagnostics, nodeCount } = renderPage({ rail, tree })

      const note = diagnostics.length === 0 ? "clean" : `${diagnostics.length} diagnostic(s)`
      process.stdout.write(`rendered ${nodeCount} nodes at revision ${tree.revision} — ${note}\n`)
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
  process.stdout.write(`  ?rail=off  the page on its own · /reset  back to the page as written\n`)
})
