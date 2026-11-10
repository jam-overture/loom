import { describe, expect, it, vi } from "vitest"

import { pgliteTemplate } from "../../tools/pglite/template.js"
import { applicationIdSchema } from "../application/application.js"
import {
  audienceNamed,
  CONTRACT_TREE,
  describeAudienceOverlayStoreContract,
  formDelta,
  ruleFor,
} from "../testing/audience-overlay-contract.js"
import { rowSecurityOn } from "../testing/row-security.js"

import { ensureAudienceOverlaySchema } from "./migrate.js"
import { postgresAudienceOverlayStore } from "./postgres-audience.js"
import { loomAudienceForms, loomAudienceRules } from "./schema.js"

/**
 * Run against PGlite — Postgres compiled to WebAssembly — so these exercise real
 * Postgres semantics with no external database and no Docker, and `pnpm verify`
 * stays green offline.
 */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = pgliteTemplate(ensureAudienceOverlaySchema)

describeAudienceOverlayStoreContract("postgresAudienceOverlayStore", async () =>
  postgresAudienceOverlayStore(await freshDatabase())
)

const EU = audienceNamed("eu")

const recording = {
  rules: [ruleFor(EU, "region", "eu")],
  actor: "person:ana",
  recordedAt: "2026-11-10T09:00:00.000Z",
}

const authoring = {
  audienceId: EU,
  delta: formDelta(),
  actor: "person:ana",
  authoredAt: "2026-11-10T09:00:00.000Z",
}

describe("postgresAudienceOverlayStore — Postgres specifics", () => {
  it("creates both tables locked, so a REST layer cannot read them the moment they exist", async () => {
    const db = await freshDatabase()

    expect(await rowSecurityOn(db, "loom_audience_rules")).toBe(true)
    expect(await rowSecurityOn(db, "loom_audience_forms")).toBe(true)
  })

  it("is idempotent, so a deployment that runs the DDL twice is a no-op", async () => {
    const db = await freshDatabase()
    await postgresAudienceOverlayStore(db).recordRules(CONTRACT_TREE, recording)

    await ensureAudienceOverlaySchema(db)

    expect(await db.select().from(loomAudienceRules)).toHaveLength(1)
  })

  it("writes the actor and the stamp as columns, not inside the rules", async () => {
    const db = await freshDatabase()

    await postgresAudienceOverlayStore(db).recordRules(CONTRACT_TREE, recording)

    const rows = await db.select().from(loomAudienceRules)

    expect(rows[0]?.actor).toBe("person:ana")
    expect(rows[0]?.recordedAt).toBe("2026-11-10T09:00:00.000Z")
    expect(rows[0]?.revision).toBe(1)
  })

  /**
   * The denormalised column, and the reason it is one: a screen asking which
   * forms are behind the page reads this and never the delta beside it.
   */
  it("writes a form's base revision as a column taken from the delta rather than from the caller", async () => {
    const db = await freshDatabase()

    await postgresAudienceOverlayStore(db).setForm(CONTRACT_TREE, {
      ...authoring,
      delta: formDelta({ baseRevision: 9 }),
    })

    expect((await db.select().from(loomAudienceForms))[0]?.baseRevision).toBe(9)
  })

  /**
   * The property the composite primary key is there for, and the reason this
   * implementation needs no transaction. Both calls read the same head before
   * either writes, so without the key both would append revision 1.
   */
  it("refuses the second of two editors racing at the same head", async () => {
    const db = await freshDatabase()
    const store = postgresAudienceOverlayStore(db)

    const [first, second] = await Promise.all([
      store.recordRules(CONTRACT_TREE, recording),
      store.recordRules(CONTRACT_TREE, {
        ...recording,
        rules: [ruleFor(audienceNamed("uk"), "country", "gb")],
        actor: "person:ben",
      }),
    ])

    expect([first?.ok, second?.ok].filter(Boolean)).toHaveLength(1)
    const refused = first?.ok === false ? first : second
    expect(refused?.ok === false && refused.error.code).toBe("out-of-date")
    expect(await db.select().from(loomAudienceRules)).toHaveLength(1)
  })

  /**
   * The one property a dimension that decides who sees what cannot get wrong
   * (0260): two applications whose trees happen to share an id must not serve
   * each other's forms.
   */
  it("keeps one application's overlay out of another's", async () => {
    const db = await freshDatabase()
    const theirs = applicationIdSchema.parse("app_theirs")

    await postgresAudienceOverlayStore(db).recordRules(CONTRACT_TREE, recording)
    await postgresAudienceOverlayStore(db).setForm(CONTRACT_TREE, authoring)

    const other = postgresAudienceOverlayStore(db, { application: theirs })

    expect(await other.overlay(CONTRACT_TREE)).toEqual({
      ok: true,
      value: { rules: [], forms: [] },
    })
  })

  it("reads a row written by an older version as unreadable rather than handing it on", async () => {
    const db = await freshDatabase()
    await db.insert(loomAudienceRules).values({
      treeId: CONTRACT_TREE,
      revision: 1,
      rules: [{ audienceId: "aud_eu", clauses: [] }],
      actor: "person:ana",
      recordedAt: "2026-11-10T09:00:00.000Z",
    })

    const read = await postgresAudienceOverlayStore(db).rules(CONTRACT_TREE)

    expect(read.ok === false && read.error.code).toBe("unreadable")
  })
})
