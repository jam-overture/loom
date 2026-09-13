import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { READER_SIGNAL_KINDS } from "@loom/runtime/signals"
import { describe, expect, it } from "vitest"

import { produceAddressedMarkup } from "./markup"
import { produceBatch, produceKinds, produceReadBack } from "./page"

/**
 * What *What your readers do* says in its own words, held against what it shows.
 *
 * The blocks on that page are produced and cannot lie. The prose around them
 * can: it counts the kinds, it tells a reader which row of a table to look at,
 * it quotes a node id out of the batch below it, and it names the two entry
 * points and the size difference between them. Every one of those is typed by
 * hand and is a claim about something further down the same page.
 *
 * A number that drifted would leave the page confidently wrong rather than
 * merely out of date, and nothing renders differently when it does.
 */

const page = readFileSync(
  fileURLToPath(new URL("../../docs/the-runtime/what-your-readers-do/page.mdx", import.meta.url)),
  "utf8"
)

/** The prose with its line breaks flattened — every sentence here is hard-wrapped. */
const flowed = page.replace(/\s+/g, " ")

describe("the counts this page writes out", () => {
  it("says four kinds, and there are four", () => {
    expect(READER_SIGNAL_KINDS.length).toBe(4)
    expect(produceKinds().length).toBe(4)
    expect(flowed).toContain("Four things, and nothing else.")
    expect(flowed).toContain("There is no fifth kind")
  })

  it("names each kind in the prose or in the block it prints", () => {
    for (const kind of READER_SIGNAL_KINDS) {
      expect(flowed, `the page never mentions ${kind}`).toContain(kind)
    }
  })
})

describe("the rows this page points at", () => {
  /**
   * "The fourth row is the interesting one" is an instruction to look at a
   * specific line of a produced table. Reordering that table silently turns this
   * sentence into a lie, and this is the only thing that would notice.
   */
  it("has the content-carrying signal fourth in the read-back table", () => {
    const rows = produceReadBack()

    expect(flowed).toContain("The fourth row is the interesting one")
    expect(rows[3]?.what).toContain("words a reader saw")
    expect(rows[3]?.accepted).toBe(false)
  })
})

describe("the node id this page quotes", () => {
  /**
   * The page says `n_readersignals8` at revision 0 means one thing forever. It
   * is quoted out of the batch printed two blocks below, and an edit to the
   * example tree can renumber it.
   */
  it("is an address really in the batch below it", () => {
    const quoted = /`(n_readersignals\d+)` at revision (\d+)/.exec(flowed)

    expect(quoted, "the page no longer quotes a node id").not.toBeNull()

    const batch = JSON.parse(produceBatch().json) as {
      readonly revision: number
      readonly signals: readonly { readonly nodeId: string }[]
    }

    expect(batch.signals.map((signal) => signal.nodeId)).toContain(quoted?.[1])
    expect(String(batch.revision)).toBe(quoted?.[2])
  })
})

describe("what the page says addressing costs", () => {
  it("claims two attributes per element, and the render writes two", () => {
    expect(flowed).toContain("Two attributes per decorated element")
    expect(produceAddressedMarkup().onAnElement.length).toBe(2)
  })

  it("claims the root additionally carries the tree and the revision", () => {
    expect(flowed).toContain("the tree and revision on the root")
    expect(produceAddressedMarkup().onTheRoot.length).toBe(2)
  })
})

describe("the two entry points", () => {
  /**
   * The callout tells a reader to import the broadcaster from the browser entry
   * and the parser from the plain one. The live component on this page is the
   * thing that would be caught doing otherwise — it is in the same bundle the
   * callout is describing.
   */
  const live = readFileSync(
    fileURLToPath(new URL("../../_components/reader-signals-live.tsx", import.meta.url)),
    "utf8"
  )

  it("tells a reader to import the broadcaster from the browser entry", () => {
    expect(flowed).toContain("Import it from `@loom/runtime/signals/broadcast`")
  })

  it("is followed by this page's own live block, which imports it that way", () => {
    expect(live).toContain('from "@loom/runtime/signals/broadcast"')
    expect(live).not.toMatch(/^import \{[^}]*\} from "@loom\/runtime\/signals"$/m)
  })

  it("sends the reader to the plain entry for parsing", () => {
    expect(flowed).toContain('import { parseReaderSignalBatch } from "@loom/runtime/signals"')
  })

  /**
   * The paragraph under the live block tells a reader which kind is being asked
   * for about which part of the page. That is a claim about the `TYPES` constant
   * in the component directly above it, and the two are edited months apart.
   */
  it("describes the live block's configuration as the live block configures it", () => {
    const types = /const TYPES = \{([\s\S]*?)\n\} as const/.exec(live)?.[1] ?? ""

    expect(types, "the live block no longer has a TYPES constant").not.toBe("")

    const asks = (kind: string): readonly string[] =>
      [...(new RegExp(`${kind}: \\[([^\\]]*)\\]`).exec(types)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map(
        (found) => found[1] ?? ""
      )

    expect(asks("viewed")).toEqual(["loom.section", "loom.faq-list"])
    expect(asks("dwelled")).toEqual(["loom.section"])
    expect(asks("activated")).toEqual(["loom.action", "loom.link"])
    expect(asks("disclosed")).toEqual(["loom.faq"])

    expect(flowed).toContain("`viewed` for the two sections and the questions band")
    expect(flowed).toContain("`dwelled` for the sections only")
    expect(flowed).toContain("`activated` for the link and the call to action")
    expect(flowed).toContain("`disclosed` for the questions")
  })
})

describe("the limits this page admits to", () => {
  /**
   * Three of these are open findings against other lanes, and the page's value
   * rests on saying so rather than describing a seam that is finished. A run
   * that quietly dropped one would be the documentation drifting *towards*
   * optimism, which is the direction that costs a reader most.
   */
  it("says nothing stores or interprets signals yet", () => {
    expect(flowed).toContain("Nothing stores or interprets these")
  })

  it("says a broadcaster watches only the nodes present when it started", () => {
    expect(flowed).toContain("watches the nodes that were there when it started")
  })

  it("says a new revision needs a new broadcast", () => {
    expect(flowed).toContain("A new revision is a new broadcast")
  })

  it("says consent is the host's, not the runtime's", () => {
    expect(flowed).toContain("It does not give you a lawful basis")
  })
})
