import { describe, expect, it } from "vitest"

import { storageSeams, tablesIn } from "./schema"

/**
 * The parser, against statements written here to exercise it.
 *
 * Deliberately not against the runtime's own DDL: a test that asserted what
 * `TREE_STORE_DDL` currently contains would go red every time another lane adds
 * a column, which is ordinary work rather than a fault, and a red test that is
 * usually noise is a test people learn to re-run rather than read. What the
 * runtime's real statements are held to is one claim — that this page can read
 * all of them — and that lives in `claims.test.ts`.
 */

const CREATE = `CREATE TABLE IF NOT EXISTS widgets (
  widget_id text PRIMARY KEY,
  weight integer NOT NULL,
  note text,
  seen_at timestamptz NOT NULL DEFAULT now()
)`

describe("tablesIn", () => {
  it("reads a column's name and its type exactly as the statement writes them", () => {
    const [table] = tablesIn([CREATE])

    expect(table?.name).toBe("widgets")
    expect(table?.columns.map((column) => `${column.name} ${column.type}`)).toEqual([
      "widget_id text",
      "weight integer",
      "note text",
      "seen_at timestamptz",
    ])
  })

  it("does not split a definition at a comma inside brackets", () => {
    const [table] = tablesIn([
      `CREATE TABLE IF NOT EXISTS widgets (
        owner text NOT NULL,
        widget_id text NOT NULL,
        PRIMARY KEY (owner, widget_id)
      )`,
    ])

    expect(table?.columns.map((column) => column.name)).toEqual(["owner", "widget_id"])
    expect(table?.columns.every((column) => column.key)).toBe(true)
  })

  it("marks a column the primary key names, wherever it is declared", () => {
    const [table] = tablesIn([
      `CREATE TABLE IF NOT EXISTS widgets (
        owner text NOT NULL,
        weight integer NOT NULL,
        PRIMARY KEY (owner)
      )`,
    ])

    expect(table?.columns.find((column) => column.name === "owner")?.key).toBe(true)
    expect(table?.columns.find((column) => column.name === "weight")?.key).toBe(false)
  })

  it("counts a primary key as required without being told twice", () => {
    const [table] = tablesIn([CREATE])

    expect(table?.columns.find((column) => column.name === "widget_id")?.required).toBe(true)
  })

  it("does not require a column that only has a default", () => {
    const [table] = tablesIn([
      `CREATE TABLE IF NOT EXISTS widgets (
        widget_id text PRIMARY KEY,
        note text
      )`,
    ])

    expect(table?.columns.find((column) => column.name === "note")?.required).toBe(false)
  })

  it("separates a column that arrives by ALTER from one the table was created with", () => {
    const [table] = tablesIn([
      CREATE,
      "ALTER TABLE widgets ADD COLUMN IF NOT EXISTS answered_by text",
    ])

    expect(table?.columns.filter((column) => column.addedLater).map((column) => column.name)).toEqual(
      ["answered_by"]
    )
    expect(table?.columns.filter((column) => !column.addedLater)).toHaveLength(4)
  })

  it("does not list a column twice when it is both created and added", () => {
    const [table] = tablesIn([
      `CREATE TABLE IF NOT EXISTS widgets (
        widget_id text PRIMARY KEY,
        note text
      )`,
      "ALTER TABLE widgets ADD COLUMN IF NOT EXISTS note text",
    ])

    expect(table?.columns.map((column) => column.name)).toEqual(["widget_id", "note"])
    expect(table?.columns.find((column) => column.name === "note")?.addedLater).toBe(true)
  })

  it("reads an index and the columns it covers", () => {
    const [table] = tablesIn([
      CREATE,
      "CREATE INDEX IF NOT EXISTS widgets_owner_seen_idx ON widgets (weight, seen_at)",
    ])

    expect(table?.indexes).toEqual([
      { name: "widgets_owner_seen_idx", columns: ["weight", "seen_at"] },
    ])
  })

  it("says a table is unlocked until a statement locks it", () => {
    expect(tablesIn([CREATE])[0]?.rowLevelSecurity).toBe(false)
    expect(
      tablesIn([CREATE, "ALTER TABLE widgets ENABLE ROW LEVEL SECURITY"])[0]?.rowLevelSecurity
    ).toBe(true)
  })

  it("keeps the tables in the order the statements create them", () => {
    expect(
      tablesIn([
        CREATE,
        "CREATE TABLE IF NOT EXISTS gadgets (\n  gadget_id text PRIMARY KEY\n)",
      ]).map((table) => table.name)
    ).toEqual(["widgets", "gadgets"])
  })

  it("refuses a statement it does not understand rather than dropping it", () => {
    expect(() => tablesIn(["DROP TABLE widgets"])).toThrow(/does not know what/)
  })

  it("refuses to describe a change to a table these statements do not create", () => {
    expect(() => tablesIn(["ALTER TABLE elsewhere ENABLE ROW LEVEL SECURITY"])).toThrow(
      /do not create/
    )
  })
})

describe("storageSeams", () => {
  it("names a different table in every seam, so a deployment can take them one at a time", () => {
    const names = storageSeams.flatMap((seam) => seam.tables.map((table) => table.name))

    expect(new Set(names).size).toBe(names.length)
  })

  it("gives every seam at least one table to create", () => {
    for (const seam of storageSeams) expect(seam.tables.length).toBeGreaterThan(0)
  })
})
