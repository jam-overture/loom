import {
  FENCE_KINDS,
  FENCE_LANGUAGES,
  isAlternative,
  isCheckable,
  type Fence,
  type FenceKind,
  type FenceLanguage,
} from "./model"
import { writtenDocsSections } from "../nav"
import { readPageSource } from "../search/headings"

/**
 * Reading the code out of a page.
 *
 * The site already scans for fences twice — the search index skips them when it
 * reads headings, and again when it reads prose. This is the third scan and the
 * only one that wants what is *inside*, so it is the one that has to be strict:
 * a fence whose language nobody has decided about, or whose declaring word is
 * misspelled, stops the build rather than being quietly treated as a program.
 *
 * A misspelling is the failure worth being loud about. `sketchy` silently
 * meaning `program` would put an abridged snippet through the compiler and
 * produce a wall of errors on a block that was never meant to compile; the
 * other direction is worse, because `objectbody` meaning "not a program"
 * anywhere would mean the check quietly stopped looking.
 */

const OPENING = /^\s*(?<ticks>```|~~~)(?<info>.*)$/

const isLanguage = (word: string): word is FenceLanguage =>
  (FENCE_LANGUAGES as readonly string[]).includes(word)

const isKindWord = (word: string): word is Exclude<FenceKind, "program"> =>
  word !== "program" && (FENCE_KINDS as readonly string[]).includes(word)

type Opening = {
  readonly language: FenceLanguage
  readonly kind: FenceKind
  readonly ticks: string
}

const parseInfo = (info: string, ticks: string, where: string): Opening => {
  const words = info.trim().split(/\s+/).filter(Boolean)
  const [language, ...rest] = words

  if (language === undefined) {
    throw new Error(`loom: ${where} — a fence with no language. Say ts, tsx or bash.`)
  }

  if (!isLanguage(language)) {
    throw new Error(
      `loom: ${where} — the language "${language}" is not one this site has decided about. ` +
        `Add it to FENCE_LANGUAGES in _lib/fences/model.ts and say whether it is compiled.`
    )
  }

  const [word, ...extra] = rest

  if (extra.length > 0) {
    throw new Error(`loom: ${where} — a fence declares one word after its language, not ${rest.length}.`)
  }

  if (word === undefined) return { language, kind: "program", ticks }

  if (!isKindWord(word)) {
    throw new Error(
      `loom: ${where} — "${word}" is not a kind of fence. Use object-body, function-body or sketch, ` +
        `or say nothing at all for a program.`
    )
  }

  return { language, kind: word, ticks }
}

/**
 * An alternative needs something to be an alternative to.
 *
 * The word means *the same job as the block above, done differently*, so the
 * first compiled block on a page cannot be one. The damage a leading alternative
 * would do is silent rather than loud: it gets a module of its own, the page's
 * one program quietly loses its opening, and everything still compiles.
 */
const refuseALeadingAlternative = (fences: readonly Fence[], where: string): void => {
  const first = fences.find(isCheckable)

  if (first !== undefined && isAlternative(first)) {
    throw new Error(
      `loom: ${where}:${first.line} — the first code block on a page cannot be an alternative. ` +
        `It says "the same job as the block above", and there is no block above it.`
    )
  }
}

/**
 * Every fenced block on one page, in reading order.
 *
 * Written as a scan rather than by compiling the markdown, because the meta word
 * is the one thing MDX throws away: it reaches neither the rendered page nor any
 * plugin this site installs. The page source is the only place it survives, so
 * the page source is what gets read.
 */
export const fencesIn = (source: string, where: string): readonly Fence[] => {
  const lines = source.split("\n")
  const fences: Fence[] = []

  let open: (Opening & { readonly line: number }) | undefined
  let body: string[] = []

  lines.forEach((line, index) => {
    const match = OPENING.exec(line)

    if (open === undefined) {
      if (match?.groups === undefined) return

      const { ticks, info } = match.groups

      open = { ...parseInfo(info ?? "", ticks ?? "```", `${where}:${index + 1}`), line: index + 1 }
      body = []
      return
    }

    if (match?.groups !== undefined && match.groups["info"]?.trim() === "" && match.groups["ticks"] === open.ticks) {
      fences.push({ language: open.language, kind: open.kind, code: body.join("\n"), line: open.line })
      open = undefined
      return
    }

    body.push(line)
  })

  if (open !== undefined) {
    throw new Error(`loom: ${where}:${open.line} — a fence that is never closed.`)
  }

  refuseALeadingAlternative(fences, where)

  return fences
}

export type PageFences = {
  readonly sectionSlug: string
  readonly pageSlug: string
  readonly fences: readonly Fence[]
}

export const fencesOnPage = (sectionSlug: string, pageSlug: string): readonly Fence[] =>
  fencesIn(readPageSource(sectionSlug, pageSlug), `${sectionSlug}/${pageSlug}`)

/** Every written page that has at least one fence, in the site's own order. */
export const pagesWithFences = (): readonly PageFences[] =>
  writtenDocsSections.flatMap((section) =>
    section.pages
      .map((page) => ({
        sectionSlug: section.slug,
        pageSlug: page.slug,
        fences: fencesOnPage(section.slug, page.slug),
      }))
      .filter((page) => page.fences.length > 0)
  )
