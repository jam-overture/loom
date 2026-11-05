import { describe, expect, it } from "vitest"

import { nodeIdSchema, treeIdSchema, type Result } from "@jam-overture/loom"

import { goalIdSchema, MAX_GOALS, type Goal, type GoalDraft, type GoalStore } from "./goal"

/** Both implementations of a project's goals, held to the same behaviour. */

const HOME = treeIdSchema.parse("t_home")

const id = (n: number) => goalIdSchema.parse(`g_${n.toString(16).padStart(32, "0")}`)

const draft = (n: number, overrides: Partial<GoalDraft> = {}): GoalDraft => ({
  goalId: id(n),
  name: `Goal ${n}`,
  kind: "activated",
  nodeId: nodeIdSchema.parse("n_start"),
  pages: null,
  createdAt: n * 10,
  createdBy: "jonathan",
  ...overrides,
})

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

const marks = (goals: readonly Goal[]) =>
  goals.map((goal) => [goal.goalId, goal.primarySince] as const)

export const describeGoalStoreContract = (
  name: string,
  make: () => GoalStore | Promise<GoalStore>
): void => {
  describe(`${name} — GoalStore contract`, () => {
    it("keeps no goal for a project nobody set one for", async () => {
      expect(unwrap(await (await make()).list())).toEqual([])
    })

    it("makes the first goal primary, from when it was made, and keeps what was asked", async () => {
      const store = await make()
      const pages = [HOME]

      unwrap(
        await store.add(draft(1, { kind: "completed", pages }), {
          primary: false,
        })
      )

      expect(unwrap(await store.list())).toEqual([
        { ...draft(1, { kind: "completed", pages }), primarySince: 10 },
      ])
    })

    it("lists the primary goal first, then the rest oldest first", async () => {
      const store = await make()

      unwrap(await store.add(draft(1), { primary: false }))
      unwrap(await store.add(draft(2), { primary: false }))
      unwrap(await store.add(draft(3), { primary: true }))

      expect(marks(unwrap(await store.list()))).toEqual([
        [id(3), 30],
        [id(1), null],
        [id(2), null],
      ])
    })

    it("moves the mark, and a goal that already holds it keeps its date", async () => {
      const store = await make()

      unwrap(await store.add(draft(1), { primary: false }))
      unwrap(await store.add(draft(2), { primary: false }))
      unwrap(await store.makePrimary(id(1), 99))
      unwrap(await store.makePrimary(id(2), 100))

      expect(marks(unwrap(await store.list()))).toEqual([
        [id(2), 100],
        [id(1), null],
      ])
    })

    it("passes the mark to the oldest goal left when the primary one is removed", async () => {
      const store = await make()

      unwrap(await store.add(draft(1), { primary: false }))
      unwrap(await store.add(draft(2), { primary: false }))
      unwrap(await store.add(draft(3), { primary: true }))
      unwrap(await store.remove(id(3), 500))

      expect(marks(unwrap(await store.list()))).toEqual([
        [id(1), 500],
        [id(2), null],
      ])
    })

    it("leaves the mark where it is when another goal is removed", async () => {
      const store = await make()

      unwrap(await store.add(draft(1), { primary: false }))
      unwrap(await store.add(draft(2), { primary: false }))
      unwrap(await store.remove(id(2), 500))

      expect(marks(unwrap(await store.list()))).toEqual([[id(1), 10]])
    })

    it("answers not found for a goal it does not keep", async () => {
      const store = await make()

      expect(await store.makePrimary(id(9), 1)).toMatchObject({
        error: { code: "not_found" },
      })
      expect(await store.remove(id(9), 1)).toMatchObject({
        error: { code: "not_found" },
      })
    })

    it(`keeps at most ${MAX_GOALS}`, async () => {
      const store = await make()

      for (const n of Array.from({ length: MAX_GOALS }, (_, index) => index + 1)) {
        unwrap(await store.add(draft(n), { primary: false }))
      }

      expect(await store.add(draft(MAX_GOALS + 1), { primary: false })).toMatchObject({
        error: { code: "full" },
      })
      expect(unwrap(await store.list())).toHaveLength(MAX_GOALS)
    })
  })
}
