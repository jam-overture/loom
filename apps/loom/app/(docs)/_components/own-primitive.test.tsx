import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  ownAuditReading,
  ownCatalogueEntry,
  ownClosedChoices,
  ownDeclaredText,
  ownRefusals,
} from "@/app/(docs)/_lib/own/proving"
import { OWN_PRIMITIVE_FILENAME } from "@/app/(docs)/_lib/own/registry"
import { readOwnPrimitiveSource } from "@/app/(docs)/_lib/own/source"

import {
  OwnPrimitiveAudit,
  OwnPrimitiveCatalogue,
  OwnPrimitiveFile,
  OwnPrimitiveRefusals,
} from "./own-primitive"

/**
 * What the four blocks owe a reader once what is in them is real.
 *
 * `proving.ts` is tested beside itself and refuses to produce a row that stopped
 * reaching its fault. The failure left over is the one a generated block is
 * prone to and nothing else on this site would notice: printing only some of
 * what it was handed. A refused state silently dropped, or a declared word
 * missing, leaves a page that still reads perfectly well and is no longer the
 * whole answer.
 */

describe("the file the page shows", () => {
  it("prints the whole file, named the way a reader would save it", () => {
    const { container } = render(<OwnPrimitiveFile />)

    expect(container.textContent).toContain(OWN_PRIMITIVE_FILENAME)
    expect(container.textContent).toContain(readOwnPrimitiveSource())
  })
})

describe("the catalogue row", () => {
  const catalogue = () => render(<OwnPrimitiveCatalogue />)

  it("names every prop the catalogue carries", () => {
    catalogue()

    const printed = [...document.querySelectorAll("[data-own-prop]")].map((node) =>
      node.getAttribute("data-own-prop")
    )

    expect(printed).toEqual((ownCatalogueEntry().props ?? []).map((prop) => prop.name))
  })

  it("says which props are required", () => {
    catalogue()

    for (const prop of ownCatalogueEntry().props ?? []) {
      const cell = document.querySelector(`[data-own-prop="${prop.name}"]`)

      expect(cell?.textContent, prop.name).toContain(prop.required ? "required" : "optional")
    }
  })

  it("prints every value the closed prop may take", () => {
    catalogue()

    for (const choice of ownClosedChoices()) {
      const cell = document.querySelector(`[data-own-choice="${choice.name}"]`)

      for (const option of choice.options) {
        expect(cell?.textContent, `${choice.name} is missing ${String(option)}`).toContain(
          String(option)
        )
      }
    }
  })

  it("prints the author's own description rather than a summary of it", () => {
    const { container } = catalogue()

    expect(container.textContent).toContain(ownCatalogueEntry().description)
  })

  it("prints every declared word, with the key beside it", () => {
    catalogue()

    for (const pair of ownDeclaredText()) {
      const row = document.querySelector(`[data-own-text="${pair.key}"]`)

      expect(row?.textContent, `nothing was printed for ${pair.key}`).toContain(pair.value)
    }
  })
})

describe("the refusals", () => {
  it("shows one block per attempt, in the order they are produced", () => {
    render(<OwnPrimitiveRefusals />)

    const printed = [...document.querySelectorAll("[data-own-refusal]")].map((node) =>
      node.getAttribute("data-own-refusal")
    )

    expect(printed).toEqual(ownRefusals().map((refusal) => refusal.asked))
  })

  it("prints the runtime's own sentence on every one of them", () => {
    const { container } = render(<OwnPrimitiveRefusals />)

    for (const refusal of ownRefusals()) {
      expect(container.textContent, `nothing was printed for ${refusal.asked}`).toContain(
        refusal.reported
      )
    }
  })
})

describe("the audit", () => {
  it("reports every row as clear while the primitive is sound", () => {
    render(<OwnPrimitiveAudit />)

    const rows = [...document.querySelectorAll("[data-own-audit-row]")]

    expect(rows.length).toBeGreaterThan(0)
    expect(rows.map((row) => row.getAttribute("data-own-audit-row"))).toEqual(
      rows.map(() => "clear")
    )
  })

  it("says how many configurations the probe built", () => {
    const { container } = render(<OwnPrimitiveAudit />)

    expect(container.textContent).toContain(String(ownAuditReading().configurations))
  })
})
