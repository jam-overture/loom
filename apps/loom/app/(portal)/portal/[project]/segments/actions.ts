"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { z } from "zod"

import {
  outcomeSentence,
  planMove,
  planRemove,
  planSave,
  targetOf,
  type Planned,
} from "@/app/(portal)/_lib/segments/editing"
import {
  audienceRulesFor,
  readPageRules,
  rulesPagesOf,
  writePageRules,
  type RulesPage,
  type WritesOutcome,
} from "@/app/(portal)/_lib/segments/rules"
import {
  audienceOfSegment,
  directionSchema,
  readConditions,
  segmentWordSchema,
  type ConditionsFault,
  type PageRules,
} from "@/app/(portal)/_lib/segments/segment"
import { publishedPagesFor } from "@/app/_lib/pages/store"

import { ownedSite, type SiteFor } from "../_lib/owned-site"

/** What saving a segment says back: what was wrong with each field, or with the whole edit. */
export type SegmentReport = {
  readonly word?: string
  readonly conditions?: readonly ConditionsFault[]
  /** What was typed, so a refused form is drawn again with it still there. */
  readonly typed?: { readonly word: string; readonly conditions: string; readonly on: string }
  readonly detail?: string
}

/** What removing or moving a segment says back, when it went wrong. */
export type SegmentChangeReport = {
  readonly detail?: string
}

type Opened =
  | {
      readonly ok: true
      readonly site: Extract<SiteFor, { ok: true }>
      readonly pages: readonly PageRules[]
    }
  | { readonly ok: false; readonly detail: string }

/**
 * The open project's site, owned by whoever is asking, and every page it
 * published with that page's rules as they stand. Segments decide which form
 * of a page each reader is served, so only an owner edits them, as only an
 * owner sets the goals that steer what is proposed (0350).
 */
const opened = async (form: FormData): Promise<Opened> => {
  const site = await ownedSite(form)

  if (!site.ok) return { ok: false, detail: site.report.detail ?? "Nothing was changed." }

  const published = await publishedPagesFor(site.application.applicationId).list()

  if (!published.ok) {
    return { ok: false, detail: "The site's pages could not be read, so nothing was changed." }
  }

  const rules = await readPageRules(
    audienceRulesFor(site.application.applicationId),
    rulesPagesOf(published.value)
  )

  return rules.ok
    ? { ok: true, site, pages: rules.pages }
    : { ok: false, detail: "The segments could not be read, so nothing was changed." }
}

const written = async (
  site: Extract<SiteFor, { ok: true }>,
  pages: readonly RulesPage[],
  planned: Extract<Planned, { ok: true }>
): Promise<string | undefined> => {
  const outcome: WritesOutcome = await writePageRules(
    audienceRulesFor(site.application.applicationId),
    planned.writes,
    site.actor,
    new Date().toISOString()
  )

  revalidatePath(`/portal/${site.projectId}/segments`)

  return outcomeSentence(
    outcome,
    (treeId) => pages.find((page) => page.treeId === treeId)?.name ?? treeId
  )
}

/**
 * An owner saving a segment: its word, its conditions, and the pages it is
 * on (0371 clause 3). Saving a word that is already a segment changes its
 * conditions on those pages and keeps its place in each page's order.
 *
 * Saved on every page it was asked for, it closes the drawer by going back to
 * the list, where the segment is; saved on only some, it stays and says which.
 */
export const saveSegmentAction = async (
  _previous: SegmentReport | null,
  form: FormData
): Promise<SegmentReport> => {
  const typed = {
    word: String(form.get("word") ?? ""),
    conditions: String(form.get("conditions") ?? ""),
    on: String(form.get("on") ?? "every"),
  }
  const word = segmentWordSchema.safeParse(typed.word)
  const conditions = readConditions(typed.conditions)

  if (!word.success || !conditions.ok) {
    return {
      typed,
      ...(word.success
        ? {}
        : {
            word: "One word of lowercase letters and digits, starting with a letter, and not “everyone”.",
          }),
      ...(conditions.ok ? {} : { conditions: conditions.faults }),
    }
  }

  const open = await opened(form)

  if (!open.ok) return { typed, detail: open.detail }

  const planned = planSave(open.pages, targetOf(form.get("on")), {
    audienceId: audienceOfSegment(word.data),
    clauses: conditions.clauses,
  })

  if (!planned.ok) return { typed, detail: planned.says }

  const detail = await written(open.site, open.pages, planned)

  if (detail !== undefined) return { typed, detail }

  redirect(`/portal/${open.site.projectId}/segments`)
}

const changed = async (
  form: FormData,
  plan: (pages: readonly PageRules[]) => Planned
): Promise<SegmentChangeReport> => {
  const open = await opened(form)

  if (!open.ok) return { detail: open.detail }

  const planned = plan(open.pages)

  if (!planned.ok) return { detail: planned.says }

  const detail = await written(open.site, open.pages, planned)

  return detail === undefined ? {} : { detail }
}

const NOT_A_SEGMENT = { detail: "That segment is not there any more. The list below is current." }

/** An owner taking a segment off one page, or off every page, which removes it. */
export const removeSegmentAction = async (
  _previous: SegmentChangeReport | null,
  form: FormData
): Promise<SegmentChangeReport> => {
  const word = segmentWordSchema.safeParse(form.get("word"))

  if (!word.success) return NOT_A_SEGMENT

  return await changed(form, (pages) =>
    planRemove(pages, targetOf(form.get("on")), audienceOfSegment(word.data))
  )
}

const moveSchema = z.object({
  word: segmentWordSchema,
  treeId: z.string().min(1),
  direction: directionSchema,
  revision: z.coerce.number().int().nonnegative(),
})

/** An owner moving a segment one place earlier or later in one page's order. */
export const moveSegmentAction = async (
  _previous: SegmentChangeReport | null,
  form: FormData
): Promise<SegmentChangeReport> => {
  const move = moveSchema.safeParse(Object.fromEntries(form))

  if (!move.success) return NOT_A_SEGMENT

  return await changed(form, (pages) =>
    planMove(
      pages,
      move.data.treeId,
      audienceOfSegment(move.data.word),
      move.data.direction,
      move.data.revision
    )
  )
}
