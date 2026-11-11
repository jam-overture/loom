import { describe, expect, it } from "vitest"

import { audienceIdSchema, type AudienceId } from "../audience/audience.js"
import type {
  AudienceOverlayStore,
  RecordAudienceRulesRequest,
} from "../audience/overlay-store.js"
import type { AudienceRule } from "../audience/rule.js"
import { treeIdSchema, type TreeId } from "../ids.js"
import { treeDeltaSchema, type TreeDelta } from "../tree/delta.js"

/**
 * One suite, run against every `AudienceOverlayStore`.
 *
 * `memoryAudienceOverlayStore` calls itself the reference implementation; this
 * is what makes that claim checkable rather than aspirational, on the terms
 * `store-contract.ts`, `policy-log-contract.ts` and `project-contract.ts`
 * already set. The alternative — each store asserted against its own
 * expectations — is how two stores that disagree both stay green.
 *
 * What is checked here is what the type cannot say: that the rules are a log
 * rather than a column, that their order survives a round trip, that a save
 * with nothing in it does not append, that two editors racing cannot both
 * commit, and that a form is replaced rather than accumulated.
 */

export const CONTRACT_TREE: TreeId = treeIdSchema.parse("t_overlaycontract")

export const audienceNamed = (name: string): AudienceId => audienceIdSchema.parse(`aud_${name}`)

export const ruleFor = (audienceId: AudienceId, key: string, value: string): AudienceRule => ({
  audienceId,
  clauses: [{ key, anyOf: [value] }],
})

/**
 * A delta that is well-formed and is never applied by this suite — what is
 * under test is custody, not composition, which `compose.test.ts` covers
 * against the tree it belongs to.
 */
export const formDelta = (over: Partial<TreeDelta> = {}): TreeDelta =>
  treeDeltaSchema.parse({
    deltaId: "d_contract",
    treeId: CONTRACT_TREE,
    baseRevision: 3,
    operations: [{ op: "remove", nodeId: "n_footer" }],
    ...over,
  })

const EU = audienceNamed("eu")
const UK = audienceNamed("uk")

const recording = (
  rules: readonly AudienceRule[],
  over: Partial<RecordAudienceRulesRequest> = {}
): RecordAudienceRulesRequest => ({
  rules,
  actor: "person:ana",
  recordedAt: "2026-11-10T09:00:00.000Z",
  ...over,
})

const authoring = (audienceId: AudienceId, delta: TreeDelta = formDelta()) => ({
  audienceId,
  delta,
  actor: "person:ana",
  authoredAt: "2026-11-10T09:00:00.000Z",
})

export const describeAudienceOverlayStoreContract = (
  name: string,
  make: () => Promise<AudienceOverlayStore> | AudienceOverlayStore
): void => {
  describe(`${name} — the audience overlay contract`, () => {
    it("answers an empty overlay for a page nobody has written rules for, rather than not-found", async () => {
      const store = await make()

      expect(await store.overlay(CONTRACT_TREE)).toEqual({
        ok: true,
        value: { rules: [], forms: [] },
      })
      expect(await store.rules(CONTRACT_TREE)).toEqual({ ok: true, value: undefined })
    })

    it("reads back the rules it recorded, as revision 1", async () => {
      const store = await make()
      const rules = [ruleFor(EU, "region", "eu")]

      const recorded = await store.recordRules(CONTRACT_TREE, recording(rules))

      expect(recorded.ok && recorded.value.outcome).toBe("recorded")
      expect(recorded.ok && recorded.value.revision.revision).toBe(1)
      expect(recorded.ok && recorded.value.revision.actor).toBe("person:ana")

      const read = await store.rules(CONTRACT_TREE)
      expect(read.ok && read.value?.rules).toEqual(rules)
    })

    /**
     * The property the whole table exists for. The order is the precedence — the
     * last matching rule wins a contested node — so a store that round-trips
     * the same rules in another order has changed what the deployment serves
     * without anybody editing anything (0359).
     */
    it("keeps the rule order, which is the precedence", async () => {
      const store = await make()
      const general = ruleFor(EU, "region", "eu")
      const specific = ruleFor(UK, "country", "gb")

      await store.recordRules(CONTRACT_TREE, recording([general, specific]))

      const read = await store.overlay(CONTRACT_TREE)
      expect(read.ok && read.value.rules.map((rule) => rule.audienceId)).toEqual([EU, UK])
    })

    it("appends rather than overwriting, so who changed who sees what is a record", async () => {
      const store = await make()
      await store.recordRules(CONTRACT_TREE, recording([ruleFor(EU, "region", "eu")]))

      const second = await store.recordRules(
        CONTRACT_TREE,
        recording([ruleFor(EU, "region", "eu"), ruleFor(UK, "country", "gb")], {
          actor: "person:ben",
          recordedAt: "2026-11-10T10:00:00.000Z",
        })
      )

      expect(second.ok && second.value.revision.revision).toBe(2)
      expect(second.ok && second.value.revision.actor).toBe("person:ben")
    })

    /**
     * The read that makes the log a record. A store that overwrote instead of
     * appending would pass every other assertion here: the revision numbers
     * come off the head either way.
     */
    it("keeps every edit, newest first, so who changed who sees what can be read back", async () => {
      const store = await make()
      await store.recordRules(CONTRACT_TREE, recording([ruleFor(EU, "region", "eu")]))
      await store.recordRules(
        CONTRACT_TREE,
        recording([ruleFor(UK, "country", "gb")], {
          actor: "person:ben",
          recordedAt: "2026-11-10T10:00:00.000Z",
        })
      )

      const history = await store.history(CONTRACT_TREE)

      expect(history.ok && history.value.map((edit) => [edit.revision, edit.actor])).toEqual([
        [2, "person:ben"],
        [1, "person:ana"],
      ])
    })

    it("answers an empty history for a page nobody has written rules for", async () => {
      const store = await make()

      expect(await store.history(CONTRACT_TREE)).toEqual({ ok: true, value: [] })
    })

    it("bounds the history it hands back, whether a caller names a large limit or none", async () => {
      const store = await make()
      for (const index of [0, 1, 2]) {
        await store.recordRules(
          CONTRACT_TREE,
          recording([ruleFor(EU, "region", `eu${index}`)], {
            recordedAt: `2026-11-10T0${index}:00:00.000Z`,
          })
        )
      }

      const asked = await store.history(CONTRACT_TREE, { limit: 2 })
      const flooded = await store.history(CONTRACT_TREE, { limit: 10_000 })

      expect(asked.ok && asked.value).toHaveLength(2)
      expect(flooded.ok && flooded.value).toHaveLength(3)
    })

    it("does not record an unchanged save in the history", async () => {
      const store = await make()
      const rules = [ruleFor(EU, "region", "eu")]
      await store.recordRules(CONTRACT_TREE, recording(rules))
      await store.recordRules(CONTRACT_TREE, recording(rules, { actor: "person:ben" }))

      const history = await store.history(CONTRACT_TREE)

      expect(history.ok && history.value).toHaveLength(1)
    })

    it("treats the same rules in the same order as unchanged, so a screen that saves on blur writes nothing", async () => {
      const store = await make()
      const rules = [ruleFor(EU, "region", "eu")]
      await store.recordRules(CONTRACT_TREE, recording(rules))

      const again = await store.recordRules(
        CONTRACT_TREE,
        recording(rules, { actor: "person:ben", recordedAt: "2026-11-10T11:00:00.000Z" })
      )

      expect(again.ok && again.value.outcome).toBe("unchanged")
      expect(again.ok && again.value.revision.revision).toBe(1)
      expect(again.ok && again.value.revision.actor).toBe("person:ana")
    })

    /** A reorder is an edit, because the order is the thing that decides. */
    it("treats the same rules in another order as an edit", async () => {
      const store = await make()
      const general = ruleFor(EU, "region", "eu")
      const specific = ruleFor(UK, "country", "gb")
      await store.recordRules(CONTRACT_TREE, recording([general, specific]))

      const flipped = await store.recordRules(CONTRACT_TREE, recording([specific, general]))

      expect(flipped.ok && flipped.value.outcome).toBe("recorded")
      expect(flipped.ok && flipped.value.revision.revision).toBe(2)
    })

    it("refuses an edit of a revision that is no longer the current one", async () => {
      const store = await make()
      await store.recordRules(CONTRACT_TREE, recording([ruleFor(EU, "region", "eu")]))

      const lost = await store.recordRules(
        CONTRACT_TREE,
        recording([ruleFor(UK, "country", "gb")], { expectedRevision: 0 })
      )

      expect(lost).toEqual({
        ok: false,
        error: { code: "out-of-date", treeId: CONTRACT_TREE, expected: 0, current: 1 },
      })

      const read = await store.rules(CONTRACT_TREE)
      expect(read.ok && read.value?.rules[0]?.audienceId).toBe(EU)
    })

    it("records an empty list, because a page served to everybody the same way is a decision somebody made", async () => {
      const store = await make()
      await store.recordRules(CONTRACT_TREE, recording([ruleFor(EU, "region", "eu")]))

      const cleared = await store.recordRules(CONTRACT_TREE, recording([]))

      expect(cleared.ok && cleared.value.revision.revision).toBe(2)
      const read = await store.overlay(CONTRACT_TREE)
      expect(read.ok && read.value.rules).toEqual([])
    })

    it("refuses an actor nobody is named by and a stamp that is not an instant", async () => {
      const store = await make()

      const unattributed = await store.recordRules(CONTRACT_TREE, recording([], { actor: "" }))
      const unstamped = await store.recordRules(CONTRACT_TREE, recording([], { recordedAt: "yesterday" }))

      expect(unattributed.ok).toBe(false)
      expect(unstamped.ok).toBe(false)
      expect(await store.rules(CONTRACT_TREE)).toEqual({ ok: true, value: undefined })
    })

    it("reads back a form under the audience that earned it", async () => {
      const store = await make()

      expect(await store.setForm(CONTRACT_TREE, authoring(EU))).toEqual({
        ok: true,
        value: {
          treeId: CONTRACT_TREE,
          audienceId: EU,
          delta: formDelta(),
          actor: "person:ana",
          authoredAt: "2026-11-10T09:00:00.000Z",
        },
      })

      const read = await store.overlay(CONTRACT_TREE)
      expect(read.ok && read.value.forms).toEqual([{ audienceId: EU, delta: formDelta() }])
    })

    it("replaces an audience's form rather than keeping both, which is what rebasing one is", async () => {
      const store = await make()
      await store.setForm(CONTRACT_TREE, authoring(EU))

      const rebased = formDelta({ baseRevision: 4 })
      await store.setForm(CONTRACT_TREE, authoring(EU, rebased))

      const read = await store.overlay(CONTRACT_TREE)
      expect(read.ok && read.value.forms).toEqual([{ audienceId: EU, delta: rebased }])
    })

    it("keeps two audiences' forms apart", async () => {
      const store = await make()
      await store.setForm(CONTRACT_TREE, authoring(EU))
      await store.setForm(CONTRACT_TREE, authoring(UK, formDelta({ baseRevision: 5 })))

      const read = await store.overlay(CONTRACT_TREE)
      expect(read.ok && read.value.forms.map((form) => form.audienceId)).toEqual([EU, UK])
    })

    /**
     * The reading a moved base makes necessary — *a base edit stales every
     * audience delta* — without the deltas, which is the whole reason the
     * listing is a separate read (0359).
     */
    it("lists a form's base revision without handing over its delta", async () => {
      const store = await make()
      await store.setForm(CONTRACT_TREE, authoring(EU, formDelta({ baseRevision: 7 })))

      expect(await store.forms(CONTRACT_TREE)).toEqual({
        ok: true,
        value: [
          {
            audienceId: EU,
            baseRevision: 7,
            actor: "person:ana",
            authoredAt: "2026-11-10T09:00:00.000Z",
          },
        ],
      })
    })

    it("refuses a form carrying a delta for another page, which could never be served", async () => {
      const store = await make()
      const elsewhere = treeIdSchema.parse("t_elsewhere")

      const refused = await store.setForm(
        CONTRACT_TREE,
        authoring(EU, formDelta({ treeId: elsewhere }))
      )

      expect(refused).toEqual({
        ok: false,
        error: { code: "tree-mismatch", treeId: CONTRACT_TREE, delta: elsewhere },
      })
      const read = await store.overlay(CONTRACT_TREE)
      expect(read.ok && read.value.forms).toEqual([])
    })

    it("keeps one page's rules and forms out of another's", async () => {
      const store = await make()
      const other = treeIdSchema.parse("t_otherpage")
      await store.recordRules(CONTRACT_TREE, recording([ruleFor(EU, "region", "eu")]))
      await store.setForm(CONTRACT_TREE, authoring(EU))

      expect(await store.overlay(other)).toEqual({ ok: true, value: { rules: [], forms: [] } })
    })
  })
}
