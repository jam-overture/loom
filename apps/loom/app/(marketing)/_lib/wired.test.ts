import { createServer, type Server } from "node:http"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { environmentNames, publishedFrom } from "../../../../../tools/sources/deployment"

import { SHOWN_MARKER, THE_TWO_CALLS, WIRED_FILES, WIRED_LANGUAGE, YOUR_ROUTE } from "./wired"
import { BUILT_HEADING } from "./wired/loom"

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * The published region of the specimen: everything after the marker, trimmed.
 *
 * Read here rather than in `wired.ts` for the reason `written.test.ts` gives in
 * as many words — a test runs in the repository and a marketing route runs in a
 * deployed function that does not have one.
 */
const publishedRegionOf = (from: string): string => {
  const text = readFileSync(join(HERE, from), "utf8")
  const at = text.indexOf(SHOWN_MARKER)

  if (at === -1) throw new Error(`loom: ${from} has no published-region marker`)

  return text.slice(at + SHOWN_MARKER.length).trim()
}

describe("the code this site prints under on your own site", () => {
  it.each(WIRED_FILES)("$caption is the published region of $from, exactly", (file) => {
    expect(file.source).toBe(publishedRegionOf(file.from))
  })

  /**
   * And the reader is reading something: a marker that stopped matching would
   * make every region empty and the assertion above pass on `"" === ""`.
   */
  it.each(WIRED_FILES)("$caption has a region with code in it", (file) => {
    expect(file.source.length).toBeGreaterThan(400)
    expect(publishedRegionOf(file.from).length).toBeGreaterThan(400)
  })

  it("prints no comment to the reader", () => {
    for (const file of WIRED_FILES) {
      expect(file.source).not.toContain("//")
      expect(file.source).not.toContain("/*")
    }
  })

  /**
   * The copy under the panel says *two calls*, and names neither in prose — the
   * reader is looking at them. So what is held is that the two the band is
   * about are the two in the file, and that there is no third import from the
   * live door quietly doing the work.
   */
  it.each(THE_TWO_CALLS)("calls %s, which is one of the two the band claims", (call) => {
    expect(YOUR_ROUTE.source).toContain(call)
  })

  /**
   * The copy under the panel calls `??` *the whole fallback*, which is 0361
   * clause 2's own word for it.
   *
   * **What holds that is no longer a count.** Until today one `??` in the file
   * was the whole assertion, and it was only true because the two values the
   * panel pulls with came out of an object rather than off the environment.
   * There are three now, so the case names each of them: the one the copy is
   * about, and the two defaults that make a read of a variable nobody has set
   * a string. A fourth, or a second deciding which page a reader gets, is the
   * failure this stops — and it is a stronger case than the count was, because
   * the count would have passed on any single `??` anywhere in the file.
   */
  it("accounts for every `??` in the file, and one of them decides the page", () => {
    const occurrences = (needle: string): number => YOUR_ROUTE.source.split(needle).length - 1

    const accounted = [
      'deployment: process.env.LOOM_URL ?? ""',
      'key: process.env.LOOM_PROJECT_KEY ?? ""',
      "livePageOf(await live.ready(), homePage.treeId) ?? homePage",
    ]

    for (const one of accounted) expect(occurrences(one)).toBe(1)

    expect(occurrences("??")).toBe(accounted.length)
  })

  /**
   * **The panel reads the two values off the environment, by the names the
   * published entry point reads**, and this case said the opposite until today.
   *
   * It had to: `tools/sources/deployment.ts` reads every variable the
   * application's code names and could not tell a printed specimen from a
   * setting the Loom site has, so the two reads arrived in that sweep as two
   * settings of this deployment. 0379 stops the sweep at the marker and the
   * workaround came out. `wired/loom.ts` has the history.
   *
   * What is held here is the spelling a reader copies. The half that would
   * drift back silently — the sweep's own reading of this file — is the case
   * below, which runs the sweep rather than describing it.
   */
  it("reads the address and the key off the environment, by their published names", () => {
    expect(YOUR_ROUTE.source).toContain('deployment: process.env.LOOM_URL ?? ""')
    expect(YOUR_ROUTE.source).toContain('key: process.env.LOOM_PROJECT_KEY ?? ""')
    expect(YOUR_ROUTE.source).not.toContain("loomProject")
  })

  /**
   * **And the sweep agrees, which is the half a sentence cannot hold.**
   *
   * 0379's exemption is the *region* and not the file: whatever
   * `wired/page.tsx` reads above its marker is still read as a setting of this
   * deployment, and a read put there would make the Loom site owe two
   * variables it does not have. Nothing is above the marker today.
   *
   * So this runs `tools/sources/deployment.ts`' own two functions over the
   * specimen the way the sweep does — cut at `publishedFrom`, then
   * `environmentNames` over what is left — and holds the answer at none. It
   * fails on the branch that moves the marker, drops it, or reads a variable
   * above it, rather than on another lane's branch three days later.
   *
   * The two reads below the marker are asserted to be there as well, so this
   * cannot pass by the region being empty. Sorted, because what the sweep
   * returns is in its own order and this case is about which names it found.
   */
  it("names no setting of this deployment, read the way the sweep reads it", () => {
    const text = readFileSync(join(HERE, YOUR_ROUTE.from), "utf8")

    expect(environmentNames(text.slice(0, publishedFrom(text)))).toEqual([])
    expect(environmentNames(text)).toEqual([])
    expect([...environmentNames(publishedRegionOf(YOUR_ROUTE.from))].sort()).toEqual([
      "LOOM_PROJECT_KEY",
      "LOOM_URL",
    ])
  })

  /** It is a React component, so the panel says `tsx` rather than `ts`. */
  it("declares the language the file is written in", () => {
    expect(WIRED_LANGUAGE).toBe("tsx")
    expect(YOUR_ROUTE.source).toContain("const Page = async () =>")
  })

  /**
   * `voice.test.ts` sweeps every source panel for the words this site may not
   * say to a stranger, and `registry` is one of them. The binding is called
   * `components` for that reason, which is also the word the copy three bands
   * above uses, and this is the half of it that cannot drift: a run renaming it
   * back would go red here as well as there.
   */
  it("calls the thing it draws with by the word the rest of the site uses", () => {
    expect(YOUR_ROUTE.source).toContain("resolver: components")
    expect(YOUR_ROUTE.source).toContain("validator: components")
    expect(YOUR_ROUTE.source).not.toMatch(/\bregistry\b/)
  })
})

/**
 * The budget this panel is kept to.
 *
 * `measure.ts` does not count what is inside a source panel and `voice.test.ts`
 * does not read it for sentences, so something has to bound it. Stated in the
 * units a code panel is read in — lines, and how far a line runs — which is
 * `written.test.ts`' arrangement and `connected.test.ts`' numbers, and the
 * argument for it is theirs.
 *
 * **The line length is why `wrap: false` is honest.** A long line scrolls
 * sideways and a phone shows roughly the first forty characters of it, so this
 * is a bound on how far rather than a promise that nothing scrolls. It is what
 * took the render call's two options onto lines of their own.
 */
describe("the budget this panel is kept to", () => {
  const LINES_IN_A_PANEL = 28
  const CHARACTERS_IN_A_PANEL = 800
  const CHARACTERS_IN_A_LINE = 80
  const A_CEILING_IS_BINDING_ABOVE = 0.6

  const lines = YOUR_ROUTE.source.split("\n")

  it("is a file a reader takes in, not a tutorial", () => {
    expect(lines.length).toBeLessThanOrEqual(LINES_IN_A_PANEL)
    expect(YOUR_ROUTE.source.length).toBeLessThanOrEqual(CHARACTERS_IN_A_PANEL)
  })

  it("runs no line further than a reader can see", () => {
    const over = lines.filter((line) => line.length > CHARACTERS_IN_A_LINE)

    expect(over.map((line) => `${line.length}: ${line}`)).toEqual([])
  })

  /** And no ceiling here can be raised quietly to let a longer file in. */
  it("every ceiling is one this panel is near", () => {
    const nearest: Readonly<Record<string, readonly [number, number]>> = {
      "the panel's lines": [lines.length, LINES_IN_A_PANEL],
      "the panel's characters": [YOUR_ROUTE.source.length, CHARACTERS_IN_A_PANEL],
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
 * The band claims that two calls put the live page on a reader's route. What
 * makes that true is not that the file compiles: it is that a page served
 * through it is the one Loom answered with rather than the one the code built.
 * So the specimen is pointed at a server that answers the live-pages door, the
 * page is rendered, and the heading is read out of the markup.
 *
 * `connected.test.ts` is the standard being matched and its sentence is the
 * right one: *that is the difference between a panel that compiles and a panel
 * that works.*
 *
 * ## Nothing is mocked, and the one hazard is handled rather than hoped about
 *
 * The specimen reads its deployment and its key at module scope, so the test
 * has to set them before `wired/page.tsx` evaluates. This suite's node pool
 * runs with `isolate: false` — a module an earlier file loaded is **not**
 * re-evaluated, which is the hazard this lane filed on 6 November and
 * `apps/loom/vitest.config.ts` has a section about. `vi.resetModules()` is the
 * remedy that file names, and `served` below uses it.
 *
 * **And the belt is checked by a brace.** If the import were served from a warm
 * cache the loop would have been built with whatever the environment held when
 * some other file first loaded the panel, so no request would reach the server — and `asked the door with the key it was configured with`
 * fails. The failure mode of a stale module here is red rather than a quiet
 * green, which is the property the 6 November entry asks for and the one a mock
 * cannot have.
 */
describe("a route wired the way this panel shows", () => {
  const LIVE_HEADING = "Doors, made to order, fitted in a week"

  let server: Server | undefined
  let origin = ""

  /** What the door was asked, so the two halves of the request can be checked. */
  const asked: { readonly path: string; readonly key: string }[] = []

  /** Whether the door answers with a page at all, set per case. */
  let answersAPage = true

  beforeAll(async () => {
    /**
     * The live version of the page, as the door would put it on the wire: the
     * same tree under the same id, carrying a different sentence. Made by
     * rewriting the serialised form rather than by building a second tree,
     * because what has to be true is that the **id matches** — `livePageOf`
     * finds a page by it, and two trees built here would have two ids and the
     * test would pass on the fallback while claiming the opposite.
     */
    const { homePage } = await import("./wired/loom")
    const built = JSON.parse(JSON.stringify(homePage)) as { revision: number }
    const live = {
      ...JSON.parse(JSON.stringify(homePage).replace(BUILT_HEADING, LIVE_HEADING)),
      revision: built.revision + 1,
    }

    server = createServer((request, response) => {
      asked.push({
        path: request.url ?? "",
        key: request.headers.authorization ?? "",
      })

      response.writeHead(200, { "content-type": "application/json", etag: '"one"' })
      response.end(JSON.stringify({ pages: answersAPage ? [live] : [] }))
    })

    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve))

    const address = server?.address()

    if (address === null || address === undefined || typeof address === "string") {
      throw new Error("loom: the test server did not report a port")
    }

    origin = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (server === undefined) return resolve()
      server.close(() => resolve())
    })
  })

  /**
   * The page as the specimen serves it, pointed at the door this file answers.
   *
   * `vi.resetModules()` first, then the panel's own module: it gets a fresh
   * evaluation, so the environment written here is the environment
   * `wired/page.tsx` reads as it evaluates. Nothing is mocked and nothing
   * depends on which file the suite loaded first.
   *
   * **It writes the two variables and puts them back**, which is one step
   * shorter than it was: until today the panel took its deployment from a
   * mutable object in `wired/loom.ts`, so this imported that module to write to
   * it. The variables are restored in a `finally`, because a suite that leaves
   * `LOOM_URL` set would hand it to whatever file runs next in this pool —
   * `isolate: false` means the process is shared, and that is the same hazard
   * the module cache one below is about.
   */
  const served = async (deployment: string, key: string): Promise<string> => {
    const before = {
      url: process.env.LOOM_URL,
      key: process.env.LOOM_PROJECT_KEY,
    }

    process.env.LOOM_URL = deployment
    process.env.LOOM_PROJECT_KEY = key

    try {
      vi.resetModules()

      const route = (await import("./wired/page")) as { default: () => Promise<ReactNode> }

      return renderToStaticMarkup(await route.default())
    } finally {
      if (before.url === undefined) delete process.env.LOOM_URL
      else process.env.LOOM_URL = before.url

      if (before.key === undefined) delete process.env.LOOM_PROJECT_KEY
      else process.env.LOOM_PROJECT_KEY = before.key
    }
  }

  it("serves the page Loom answered with rather than the one the code built", async () => {
    answersAPage = true

    const markup = await served(origin, "a-project-key")

    expect(markup).toContain(LIVE_HEADING)
    expect(markup).not.toContain(BUILT_HEADING)
  })

  it("asked the door with the key it was configured with", () => {
    expect(asked.map(({ path }) => path)).toContain("/api/pages/live")
    expect(asked.map(({ key }) => key)).toContain("Bearer a-project-key")
  })

  /**
   * The other half of the `??`, and the half a reader's deployment lives on
   * most of the time: Loom answering with nothing for this page. The door is a
   * working door here and the answer is a valid one, which is the case the copy
   * describes as *has nothing for this page*.
   */
  it("serves the page the code built when Loom has nothing for it", async () => {
    answersAPage = false

    const markup = await served(origin, "a-project-key")

    expect(markup).toContain(BUILT_HEADING)
    expect(markup).not.toContain(LIVE_HEADING)
  })

  /**
   * And the third case the copy names, which is the one a reader meets first:
   * a Loom that has not answered. Spelled as a deployment that is not
   * configured, because that is the only version of it a test can produce
   * without waiting out a timeout, and the code path is the same `??`.
   */
  it("serves the page the code built when there is no deployment to ask", async () => {
    const markup = await served("", "")

    expect(markup).toContain(BUILT_HEADING)
    expect(markup).not.toContain(LIVE_HEADING)
  })
})
