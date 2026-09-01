import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  ADDED_PRIMITIVE_TYPE,
  commandRefusals,
  SCAFFOLD_DIRECTORY,
  scaffoldSession,
} from "@/app/(docs)/_lib/cli/scaffold"

import {
  CliUsage,
  CommandRefusals,
  DirectoryOption,
  ScaffoldedFile,
  ScaffoldTranscript,
} from "./scaffold"

/**
 * What actually reaches the page.
 *
 * These are server components that await a CLI run, so they are called as
 * functions and the element they resolve to is rendered — there is no client
 * boundary to cross and nothing to mock. What each test asserts is recomputed
 * from the same run rather than typed here, for the reason the theming tests
 * give: a component test that hard-codes the output it expects is a second copy
 * of the thing being checked.
 */

describe("a terminal block", () => {
  it("shows the command and every path the run wrote", async () => {
    const session = await scaffoldSession()
    const [init] = session.steps

    render(await ScaffoldTranscript({ command: "loom init" }))

    expect(screen.getByText("loom init")).toBeTruthy()

    for (const path of init?.written ?? []) {
      expect(screen.getByText(path), path).toBeTruthy()
    }
  })

  it("shows the closing lines the CLI printed", async () => {
    const session = await scaffoldSession()
    const [, added] = session.steps

    render(await ScaffoldTranscript({ command: `loom add primitive ${ADDED_PRIMITIVE_TYPE}` }))

    for (const note of added?.notes ?? []) {
      expect(screen.getByText(note), note).toBeTruthy()
    }
  })

  it("refuses a command the session does not run", async () => {
    await expect(ScaffoldTranscript({ command: "loom deploy" })).rejects.toThrow("loom deploy")
  })

  it("puts the --dir run under the directory it named", async () => {
    render(await DirectoryOption())

    expect(screen.getByText("loom init --dir src/loom")).toBeTruthy()
  })
})

describe("a scaffolded file", () => {
  it("prints the contents the run produced, byte for byte", async () => {
    const path = `${SCAFFOLD_DIRECTORY}/primitives/app.page.ts`
    const session = await scaffoldSession()

    const { container } = render(await ScaffoldedFile({ path }))

    expect(container.querySelector("pre")?.textContent).toBe(session.files.get(path))
  })

  it("refuses a path the scaffold did not write", async () => {
    await expect(ScaffoldedFile({ path: "loom/primitives/nowhere.ts" })).rejects.toThrow("nowhere")
  })
})

describe("the refusals table", () => {
  it("has a row for every refusal, with the sentence the CLI prints", async () => {
    const refusals = await commandRefusals()

    const { container } = render(await CommandRefusals())

    /**
     * `getAllByText` for the command: two refusals share `loom init` and
     * differ only in the disk they were given, which is the honest shape —
     * one of them is the command clashing and the other is the disk failing.
     * The *message* is unique to each, and that is the assertion that matters.
     *
     * The message is read off the cell rather than queried by text, because it
     * is rendered as one unbreakable span per word: the sentence a reader sees
     * is the cell's text content, and that is what this compares.
     */
    for (const refusal of refusals) {
      expect(screen.getAllByText(refusal.command).length, refusal.code).toBeGreaterThan(0)
      expect(
        container.querySelector(`[data-refusal="${refusal.code}"]`)?.textContent,
        refusal.code
      ).toBe(refusal.message)
    }
  })

  it("says what a refused init left behind", async () => {
    render(await CommandRefusals())

    expect(screen.getByText(/still holds the 1 file/)).toBeTruthy()
  })
})

describe("the usage block", () => {
  it("prints what --help printed", async () => {
    const { container } = render(await CliUsage())

    expect(container.querySelector("pre")?.textContent).toContain(
      "loom — scaffolding for the Loom primitive registry"
    )
  })
})
