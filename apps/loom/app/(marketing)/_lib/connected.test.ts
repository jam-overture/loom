import { createServer, type Server } from "node:http"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { modelInterpreter, sequentialIdFactory } from "@jam-overture/loom"
import { buildIntent, fixedClock, INSERT_NOTE_REPLY, sampleTree } from "@jam-overture/loom/testing"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  CONNECTED_FILES,
  CONNECTED_LANGUAGE,
  REFUSAL_CODES,
  SHOWN_MARKER,
  YOUR_MODEL,
} from "./connected"
import { yourModel } from "./connected/your-model"

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * The published region of the specimen: everything after the marker, trimmed.
 *
 * Read here rather than in `connected.ts` for the reason `written.test.ts`
 * gives in as many words — a test runs in the repository and a marketing route
 * runs in a function that does not have one.
 */
const publishedRegionOf = (from: string): string => {
  const text = readFileSync(join(HERE, from), "utf8")
  const at = text.indexOf(SHOWN_MARKER)

  if (at === -1) throw new Error(`loom: ${from} has no published-region marker`)

  return text.slice(at + SHOWN_MARKER.length).trim()
}

describe("the code this site prints under hook up your model", () => {
  it.each(CONNECTED_FILES)("$caption is the published region of $from, exactly", (file) => {
    expect(file.source).toBe(publishedRegionOf(file.from))
  })

  /**
   * And the reader is reading something: a marker that stopped matching would
   * make every region empty and the assertion above pass on `"" === ""`.
   */
  it.each(CONNECTED_FILES)("$caption has a region with code in it", (file) => {
    expect(file.source.length).toBeGreaterThan(400)
    expect(publishedRegionOf(file.from).length).toBeGreaterThan(400)
  })

  it("prints no comment to the reader", () => {
    for (const file of CONNECTED_FILES) {
      expect(file.source).not.toContain("//")
      expect(file.source).not.toContain("/*")
    }
  })

  /**
   * The copy under the panel names two refusals and claims Loom does different
   * things with them. Both words have to be in the code the claim sits over.
   */
  it.each(REFUSAL_CODES)("hands back %s, which the copy beside it names", (code) => {
    expect(YOUR_MODEL.source).toContain(`code: "${code}"`)
  })

  /** It is TypeScript and not a component, so the panel says so. */
  it("declares the language the file is written in", () => {
    expect(CONNECTED_LANGUAGE).toBe("ts")
    expect(YOUR_MODEL.source).not.toContain("</")
  })
})

/**
 * The budget this panel is kept to.
 *
 * `measure.ts` does not count what is inside a source panel and `voice.test.ts`
 * does not read it for sentences, so something has to bound it. Stated in the
 * units a code panel is read in — lines, and how far a line runs — which is
 * `written.test.ts`' arrangement and its argument.
 *
 * **The line length is why `wrap: false` is honest.** A long line scrolls
 * sideways and a phone shows roughly the first forty characters of it, so this
 * is a bound on how far rather than a promise that nothing scrolls. The
 * specimen was written to the repository's own hundred-column habit and then
 * cut to this, which is what took `authorization` and `content-type` onto
 * their own lines.
 */
describe("the budget this panel is kept to", () => {
  const LINES_IN_A_PANEL = 40
  const CHARACTERS_IN_A_PANEL = 1_300
  const CHARACTERS_IN_A_LINE = 80
  const A_CEILING_IS_BINDING_ABOVE = 0.6

  const lines = YOUR_MODEL.source.split("\n")

  it("is a file a reader takes in, not a tutorial", () => {
    expect(lines.length).toBeLessThanOrEqual(LINES_IN_A_PANEL)
    expect(YOUR_MODEL.source.length).toBeLessThanOrEqual(CHARACTERS_IN_A_PANEL)
  })

  it("runs no line further than a reader can see", () => {
    const over = lines.filter((line) => line.length > CHARACTERS_IN_A_LINE)

    expect(over.map((line) => `${line.length}: ${line}`)).toEqual([])
  })

  /** And no ceiling here can be raised quietly to let a longer file in. */
  it("every ceiling is one this panel is near", () => {
    const nearest: Readonly<Record<string, readonly [number, number]>> = {
      "the panel's lines": [lines.length, LINES_IN_A_PANEL],
      "the panel's characters": [YOUR_MODEL.source.length, CHARACTERS_IN_A_PANEL],
      "a line": [Math.max(...lines.map((line) => line.length)), CHARACTERS_IN_A_LINE],
    }

    for (const [what, [widest, ceiling]] of Object.entries(nearest)) {
      expect(
        widest / ceiling,
        `${what}: widest is ${widest} against a ceiling of ${ceiling} — either the ceiling is too high to mean anything, or the code it was set for is gone`
      ).toBeGreaterThanOrEqual(A_CEILING_IS_BINDING_ABOVE)
    }
  })
})

/**
 * **The assertion this whole arrangement exists for, and it is not a
 * transcription check.**
 *
 * The band claims that connecting a model of your own is this one function.
 * What makes that true is not that the file compiles: it is that a model
 * reached through it produces a change Loom can act on. So the function is
 * pointed at a server this file starts, and what comes back is handed to
 * `modelInterpreter` — the same seam a deployment configures.
 *
 * **Nothing is mocked and nothing is stubbed**, which is deliberate and is
 * this lane's finding of 6 November applied one file later: a mock replaces
 * what a module resolves as it is evaluated, so a suite that keeps a warm
 * module cache decides whether the mock arrives in time. There is no such
 * window here. The specimen takes its endpoint as an argument because a reader
 * needs it to, and that is also what lets this be real.
 *
 * `INSERT_NOTE_REPLY` is the framework's own published fixture rather than a
 * reply written here, so a change to what the interpreter will accept goes red
 * in `src/` where it belongs rather than passing against a copy this lane keeps.
 */
describe("a model connected the way this panel shows", () => {
  let origin = ""
  let server: Server | undefined
  const keys: string[] = []

  /** What the request carried, so the field names in the panel can be checked. */
  const bodies: string[] = []

  /** The status the next request is answered with, set per case. */
  let status = 200

  beforeAll(async () => {
    server = createServer((request, response) => {
      const chunks: Buffer[] = []

      request.on("data", (chunk: Buffer) => chunks.push(chunk))
      request.on("end", () => {
        bodies.push(Buffer.concat(chunks).toString("utf8"))
        keys.push(request.headers.authorization ?? "")

        if (status !== 200) {
          response.writeHead(status).end("no")
          return
        }

        response.writeHead(200, { "content-type": "application/json" })
        response.end(JSON.stringify({ text: INSERT_NOTE_REPLY, model: "a-model-v2" }))
      })
    })

    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve))

    const address = server?.address()

    if (address === null || address === undefined || typeof address === "string") {
      throw new Error("loom: the test server did not report a port")
    }

    origin = `http://127.0.0.1:${address.port}/v1/answers`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (server === undefined) return resolve()
      server.close(() => resolve())
    })
  })

  /** One interpreter, one intent, built the way the framework's own tests do. */
  const asked = () => {
    const { tree } = sampleTree()
    const idFactory = sequentialIdFactory("x")
    const interpreter = modelInterpreter({
      client: yourModel("a-key", origin),
      idFactory,
      clock: fixedClock(),
    })

    return {
      tree,
      interpreter,
      intent: buildIntent(idFactory, {
        treeId: tree.treeId,
        baseRevision: tree.revision,
        utterance: "add a note to the footer saying Thanks for visiting",
      }),
    }
  }

  it("produces a change the interpreter understood", async () => {
    status = 200

    const { interpreter, intent, tree } = asked()
    const outcome = await interpreter.interpret(intent, tree)

    expect(outcome.ok).toBe(true)
  })

  it("sent the key and the fields the panel names", () => {
    const body = JSON.parse(bodies[0] ?? "{}") as Record<string, unknown>

    expect(keys[0]).toBe("Bearer a-key")
    expect(Object.keys(body).sort()).toEqual([
      "input",
      "instructions",
      "max_output_tokens",
      "model",
      "reply_shape",
    ])
  })

  /**
   * The two refusals the copy distinguishes, each driven through the
   * interpreter rather than read off the function. What makes the distinction
   * worth a sentence on the page is that the interpreter does different things
   * with them, so that is what is asserted.
   */
  it.each([
    [401, "interpreter-misconfigured"],
    [503, "interpreter-unavailable"],
  ])("turns a %i into %s", async (answered, expected) => {
    status = answered

    const { interpreter, intent, tree } = asked()
    const outcome = await interpreter.interpret(intent, tree)

    expect(outcome.ok ? "accepted" : outcome.error.code).toBe(expected)
  })
})
