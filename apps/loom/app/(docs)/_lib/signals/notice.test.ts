import { READER_SIGNAL_KINDS, SIGNAL_FIELDS, collectionNoticeOf } from "@jam-overture/loom/signals"
import { describe, expect, it } from "vitest"

import { beyondTheAddress } from "./notice"

/**
 * The fields the vocabulary panel names, held against the runtime that names
 * them.
 *
 * `src/signals/notice.test.ts` holds the derivation itself: it drives the real
 * broadcaster over a real page and fails if a kind or a field arrives that the
 * value does not name. What is left for this file is the half that is about the
 * page — that nothing the runtime publishes about a signal's shape is dropped
 * on the way to a row.
 *
 * **Every count here is held against the runtime's own list**, never against
 * what `beyondTheAddress` happened to return: *a test derived from the list it
 * checks cannot see the list shrink* (this lane, 28 September).
 */

describe("the fields a kind carries beyond the address", () => {
  /** Of the whole vocabulary, because the panel is of the whole vocabulary. */
  it("covers every kind the runtime has", () => {
    expect(READER_SIGNAL_KINDS.length).toBeGreaterThan(1)
    expect(Object.keys(beyondTheAddress()).sort()).toEqual([...READER_SIGNAL_KINDS].sort())
  })

  /**
   * The completeness check, and the one this unit was filed for: the fields
   * named for a kind, plus the three every kind carries, are **exactly** the
   * fields the runtime's table gives that kind.
   *
   * The page said `activated` carries `at` for the five weeks after `within`
   * landed. With this, a field added to a kind is red on the commit that adds
   * it, from either direction — a field in the table with no row, or a row for a
   * field the table dropped.
   */
  it("names exactly the fields the schema's table holds, for every kind", () => {
    const fields = beyondTheAddress()

    for (const kind of READER_SIGNAL_KINDS) {
      const named = (fields[kind] ?? []).map((field) => field.field)

      expect([...named, "kind", "nodeId", "type"].sort(), kind).toEqual(
        [...Object.keys(SIGNAL_FIELDS[kind])].sort()
      )
    }
  })

  /** Each with a name and a sentence a reader could repeat. */
  it("gives every field a sentence", () => {
    for (const [kind, fields] of Object.entries(beyondTheAddress())) {
      expect(fields.length, kind).toBeGreaterThan(0)

      for (const field of fields) {
        expect(field.field.length, `${kind}.${field.field}`).toBeGreaterThan(0)
        expect(field.says.length, `${kind}.${field.field}`).toBeGreaterThan(20)
      }
    }
  })

  /**
   * The row that was wrong, named. `within` is on every delegated kind since
   * 0167 and the page said nothing about it on any of the three.
   */
  it("names the field three rows of this page used to leave out", () => {
    const fields = beyondTheAddress()

    for (const kind of ["activated", "disclosed", "completed"] as const) {
      expect(fields[kind]?.map((field) => field.field), kind).toContain("within")
    }
  })

  /**
   * The shared block is an intersection rather than a list, and the three it
   * holds are the address every kind carries — so no row repeats them.
   */
  it("leaves the address every kind carries out of every row", () => {
    for (const [kind, fields] of Object.entries(beyondTheAddress())) {
      for (const shared of ["kind", "nodeId", "type"]) {
        expect(fields.map((field) => field.field), `${kind} repeats ${shared}`).not.toContain(shared)
      }
    }
  })

  /**
   * One kind is a legal configuration, and *what every kind carries* is not a
   * useful division of one kind's fields. That branch gets a test rather than
   * being a line nothing has ever run: asked for one kind, the notice's own
   * intersection is empty and the kind keeps its complete list.
   */
  it("gives a single-kind configuration one complete list instead", () => {
    const one = collectionNoticeOf({ page: { kinds: ["viewed"] } })

    expect(one.collects).toHaveLength(1)
    expect(one.collects[0]?.carries.map((field) => field.field).sort()).toEqual(
      [...Object.keys(SIGNAL_FIELDS.viewed)].sort()
    )
  })
})
