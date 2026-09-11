import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { storeFailureCodes } from "@/app/(docs)/_lib/deployment/failures"
import { storageSeams } from "@/app/(docs)/_lib/deployment/schema"

import { StorageSchema, StoreFailures } from "./deployment-tables"

/**
 * What these two tables must not do is quietly show less than they know.
 *
 * A generated table that dropped a row would look completely fine — that is the
 * whole hazard of generating one — so what is checked here is coverage rather
 * than appearance: every table the runtime creates, every column in it, and
 * every code the store can refuse with.
 */

describe("StorageSchema", () => {
  it("shows every table the runtime's statements create", () => {
    render(<StorageSchema />)

    for (const seam of storageSeams) {
      for (const table of seam.tables) expect(screen.getByText(table.name)).toBeTruthy()
    }
  })

  it("shows every column of every table, with its type", () => {
    const { container } = render(<StorageSchema />)

    for (const seam of storageSeams) {
      for (const table of seam.tables) {
        const caption = screen.getByText(table.name).closest("table")

        expect(caption).not.toBeNull()

        const rows = within(caption as HTMLElement).getAllByRole("row")
        const cells = rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent))

        for (const column of table.columns) {
          expect(cells).toContainEqual([column.name, column.type, expect.any(String)])
        }
      }
    }

    expect(container.querySelectorAll("table")).toHaveLength(
      storageSeams.flatMap((seam) => seam.tables).length
    )
  })

  it("says which call creates each seam's tables", () => {
    render(<StorageSchema />)

    for (const seam of storageSeams) expect(screen.getByText(`${seam.ensure}(db)`)).toBeTruthy()
  })

  /**
   * The page's security paragraph is about this word. A table rendered without
   * it would leave the paragraph making a promise the table beside it does not
   * repeat, which is the version of this failure a reader would believe.
   */
  it("says of every table whether row level security is on", () => {
    render(<StorageSchema />)

    expect(screen.getAllByText("row level security on")).toHaveLength(
      storageSeams.flatMap((seam) => seam.tables).length
    )
  })

  it("marks a column that only reaches an existing database by a later migration", () => {
    render(<StorageSchema />)

    expect(screen.getAllByText(/added by a later migration/).length).toBeGreaterThan(0)
  })
})

describe("StoreFailures", () => {
  it("shows every code a store can refuse with", () => {
    render(<StoreFailures />)

    for (const code of storeFailureCodes) expect(screen.getByText(code)).toBeTruthy()
  })

  it("leads with the outage, which is the one a deployment meets first", () => {
    render(<StoreFailures />)

    const [, first] = screen.getAllByRole("row")

    expect(within(first as HTMLElement).getAllByRole("cell")[0]?.textContent).toBe("unavailable")
  })
})
