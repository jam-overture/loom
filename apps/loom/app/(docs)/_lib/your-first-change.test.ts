import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { sequentialIdFactory, type LoomTree } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { docsExamples } from "./examples/catalogue"
import { docsEntryAt } from "./nav"
import { availableDocsPresets, docsPresetById, type DocsPresetId } from "./propose/presets"
import { answerDocsHold, askDocsChange, type DocsChange } from "./propose/run"
import { openDocsSession, type DocsSession } from "./propose/session"

/**
 * "Your first change" walks a reader through the propose box by name: it tells
 * them which chip to press and what the Gate will say when they do. That is a
 * promise a page cannot keep on its own — a preset renamed in `presets.ts`, or a
 * verdict that moved because the policy changed, would leave the page telling a
 * reader to press a chip that is not there or to expect an answer they will not
 * get, and nothing would fail but the reader.
 *
 * `propose/run.test.ts` already holds the verdicts against the runtime. This
 * holds the *page* against the same verdicts: the label it prints is the label
 * on the chip, the chip is one this example actually offers, and the answer it
 * promises is the answer the pipeline gives. Rename a chip and the page has to be
 * rewritten in the same commit or this goes red.
 */

const EXAMPLE_ID = "first-tree"

const pageSource = readFileSync(
  fileURLToPath(new URL("../docs/getting-started/your-first-change/page.mdx", import.meta.url)),
  "utf8"
)

const seedTree = (): LoomTree => {
  const example = docsExamples.get(EXAMPLE_ID)
  if (example === undefined) throw new Error(`no example is registered as "${EXAMPLE_ID}"`)

  return example.build()
}

const open = (): Promise<DocsSession> => openDocsSession(seedTree())

const ask = async (session: DocsSession, presetId: DocsPresetId): Promise<DocsChange> => {
  const preset = docsPresetById(presetId)
  if (preset === undefined) throw new Error(`no preset is registered as "${presetId}"`)

  return askDocsChange({ session, exampleId: EXAMPLE_ID, tree: seedTree(), preset, step: 1 })
}

/**
 * The three chips the page names, and the answer it tells the reader to expect
 * from each. The order is the order the page presses them in.
 */
const WALKTHROUGH: readonly { readonly id: DocsPresetId; readonly verdict: DocsChange["outcome"]["kind"] }[] =
  [
    { id: "add-a-sentence", verdict: "committed" },
    { id: "demote-the-heading", verdict: "held" },
    { id: "remove-the-heading", verdict: "refused" },
  ]

describe("your first change: the page names chips that exist and answers they give", () => {
  it("prints the label of every chip it tells the reader to press", () => {
    for (const { id } of WALKTHROUGH) {
      const preset = docsPresetById(id)
      if (preset === undefined) throw new Error(`no preset is registered as "${id}"`)

      expect(pageSource, id).toContain(preset.label)
    }
  })

  it("only walks chips this example actually offers", () => {
    const offered = availableDocsPresets(seedTree(), sequentialIdFactory("firstchange"))

    for (const { id } of WALKTHROUGH) {
      expect(offered, id).toContain(id)
    }
  })

  it("promises the verdict the runtime gives, for each chip", async () => {
    for (const { id, verdict } of WALKTHROUGH) {
      const session = await open()
      const change = await ask(session, id)

      expect(change.outcome.kind, id).toBe(verdict)
    }
  })
})

describe("your first change: accepting the held one", () => {
  it("shows the button that answers a hold", () => {
    expect(pageSource).toContain("Apply it anyway")
  })

  it("applies the held change once a person says yes", async () => {
    const session = await open()
    const held = await ask(session, "demote-the-heading")

    expect(held.outcome.kind).toBe("held")

    const answered = await answerDocsHold({ session, exampleId: EXAMPLE_ID, change: held })

    expect(answered.outcome.kind).toBe("committed")
  })
})

describe("your first change: the page it stands on", () => {
  it("mounts the example the walkthrough depends on", () => {
    expect(pageSource).toContain(`<Example id="${EXAMPLE_ID}" />`)
  })

  it("only links to pages that exist", () => {
    const links = [...pageSource.matchAll(/\]\((\/docs\/[^)#]+)/g)].map((match) => match[1] ?? "")

    expect(links.length).toBeGreaterThan(0)

    for (const href of links) {
      expect(docsEntryAt(href), href).toBeDefined()
    }
  })
})
