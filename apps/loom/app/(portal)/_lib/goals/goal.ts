import { randomUUID } from "node:crypto"

import { z } from "zod"

import {
  nodeIdSchema,
  treeIdSchema,
  type NodeId,
  type Result,
  type TreeId,
} from "@jam-overture/loom"

/**
 * A project's goals (8b of `docs/portal.md`, *3 · Goals* of
 * `docs/portal-wireframes.md`, record 0350): what the project is trying to get
 * its readers to do, built only from signals already collected.
 *
 * A goal is one kind of thing a reader does to one part, counted on every page
 * that has the part or on the pages chosen. **Exactly one goal is primary
 * whenever there is any**: the first one made is, making another primary moves
 * the mark, and removing the primary one passes it to the oldest left.
 */

export const goalIdSchema = z
  .string()
  .regex(/^g_[0-9a-f]{32}$/u)
  .brand<"GoalId">()

export type GoalId = z.infer<typeof goalIdSchema>

/** A fresh id. The only impure thing in this file, and the store never mints. */
export const newGoalId = (): GoalId => goalIdSchema.parse(`g_${randomUUID().replaceAll("-", "")}`)

/**
 * What a reader does that a goal counts, by the signal kind it is collected as.
 *
 * *Stays on a part* (dwelled past a threshold) is in the wireframes and is not
 * here: the tallies keep a part's time on screen as one total, so how many
 * readers stayed past a threshold cannot be counted until events are kept
 * (0349). A kind a goal could not be measured on is not offered (0350).
 */
export const goalKindSchema = z.enum(["activated", "completed", "disclosed"])

export type GoalKind = z.infer<typeof goalKindSchema>

export const GOAL_KINDS: readonly GoalKind[] = goalKindSchema.options

export type Goal = {
  readonly goalId: GoalId
  readonly name: string
  readonly kind: GoalKind
  readonly nodeId: NodeId
  /** The pages it is counted on, or `null` for every page that has the part. */
  readonly pages: readonly TreeId[] | null
  /** When it became the primary goal, `null` while another one is. */
  readonly primarySince: number | null
  readonly createdAt: number
  readonly createdBy: string | null
}

/** A goal as somebody asked for it, before the store has said whether it is primary. */
export type GoalDraft = Omit<Goal, "primarySince">

export const MAX_GOAL_NAME_LENGTH = 80

/** More than a person can weigh at once; a project with this many has stopped choosing. */
export const MAX_GOALS = 20

export type GoalStoreError =
  | { readonly code: "unavailable"; readonly detail: string }
  | { readonly code: "not_found"; readonly detail: string }
  | { readonly code: "full"; readonly detail: string }

/** One application's goals, scoped at construction. */
export interface GoalStore {
  /** The primary goal first, then the rest oldest first. */
  readonly list: () => Promise<Result<readonly Goal[], GoalStoreError>>
  /**
   * Keeps a goal. It is primary when `primary` asks for it or when no goal is,
   * at `draft.createdAt`. Refused as `full` once `MAX_GOALS` are kept.
   */
  readonly add: (
    draft: GoalDraft,
    options: { readonly primary: boolean }
  ) => Promise<Result<void, GoalStoreError>>
  /** Moves the mark to this goal; a goal that already holds it keeps its date. */
  readonly makePrimary: (goalId: GoalId, at: number) => Promise<Result<void, GoalStoreError>>
  /** Removing the primary goal passes the mark to the oldest left, from `at`. */
  readonly remove: (goalId: GoalId, at: number) => Promise<Result<void, GoalStoreError>>
}

/** The order `list` promises, for every implementation to share. Pure. */
export const primaryFirst = (goals: readonly Goal[]): readonly Goal[] =>
  [...goals].sort(
    (left, right) =>
      Number(right.primarySince !== null) - Number(left.primarySince !== null) ||
      left.createdAt - right.createdAt ||
      left.goalId.localeCompare(right.goalId)
  )

/** The goal that would take the mark if none held it: the oldest. Pure. */
export const heirOf = (goals: readonly Goal[]): Goal | undefined =>
  [...goals].sort(
    (left, right) => left.createdAt - right.createdAt || left.goalId.localeCompare(right.goalId)
  )[0]

/** Which goal is primary, if any. Pure. */
export const primaryOf = (goals: readonly Goal[]): Goal | undefined =>
  goals.find((goal) => goal.primarySince !== null)

export type GoalField = "name" | "kind" | "part" | "pages"

export type GoalFault = { readonly field: GoalField; readonly detail: string }

/** What the *New goal* form sent, read and checked. */
export type GoalAsked = {
  readonly name: string
  readonly kind: GoalKind
  readonly nodeId: NodeId
  readonly pages: readonly TreeId[] | null
  readonly primary: boolean
}

/** The parts a goal may be built on, by page: what the site published (0312). */
export type PartsByPage = ReadonlyMap<string, ReadonlySet<string>>

/**
 * What the *New goal* form sent, as typed: kept apart from what it means so a
 * refused form can be drawn again with everything still in it.
 */
export type GoalTyped = {
  readonly name: string
  readonly kind: string
  readonly part: string
  readonly where: string
  readonly pages: readonly string[]
  readonly primary: boolean
}

const text = (value: FormDataEntryValue | null): string =>
  typeof value === "string" ? value.trim() : ""

/** The form's fields as text; a file where text belongs is nothing typed. Pure. */
export const goalTypedOf = (form: FormData): GoalTyped => ({
  name: text(form.get("name")),
  kind: text(form.get("kind")),
  part: text(form.get("part")),
  where: text(form.get("where")),
  pages: form.getAll("pages").map(text),
  primary: form.get("primary") === "on",
})

/**
 * The *New goal* form, read against what the site published. Pure.
 *
 * A part must be on a page the goal covers, because a goal on a part no
 * covered page has would count nothing for ever and say nothing about why.
 * Every fault is reported at once, under the field it belongs to.
 */
export const readGoalForm = (
  form: GoalTyped,
  published: PartsByPage
): Result<GoalAsked, readonly GoalFault[]> => {
  const { name } = form
  const kind = goalKindSchema.safeParse(form.kind)
  const part = nodeIdSchema.safeParse(form.part)
  const some = form.where === "some"
  const chosen = form.pages.flatMap((page) => {
    const parsed = treeIdSchema.safeParse(page)

    return parsed.success && published.has(parsed.data) ? [parsed.data] : []
  })
  const pages = some ? [...new Set(chosen)].sort() : null
  const covered = pages ?? [...published.keys()]

  const faults: readonly (GoalFault | undefined)[] = [
    name === ""
      ? { field: "name", detail: "Give the goal a name." }
      : name.length > MAX_GOAL_NAME_LENGTH
        ? {
            field: "name",
            detail: `Keep the name to ${MAX_GOAL_NAME_LENGTH} characters.`,
          }
        : undefined,
    kind.success ? undefined : { field: "kind", detail: "Choose what a reader does." },
    some && chosen.length === 0
      ? {
          field: "pages",
          detail: "Choose at least one page, or count it on all of them.",
        }
      : undefined,
    !part.success
      ? { field: "part", detail: "Choose the part of the page it counts." }
      : covered.some((page) => published.get(page)?.has(part.data) === true)
        ? undefined
        : {
            field: "part",
            detail: "That part is not on any page this goal covers.",
          },
  ]
  const found = faults.filter((fault): fault is GoalFault => fault !== undefined)

  if (found.length > 0 || !kind.success || !part.success) return { ok: false, error: found }

  return {
    ok: true,
    value: {
      name,
      kind: kind.data,
      nodeId: part.data,
      pages,
      primary: form.primary,
    },
  }
}
