import {
  FENCE_KINDS,
  FENCE_LANGUAGES,
  isAlternative,
  isCheckable,
  type Fence,
  type FenceKind,
  type FenceLanguage,
} from "./model"
import { fenceSpansIn } from "./spans"
import { writtenDocsSections } from "../nav"
import { readPageSource } from "../search/headings"

/**
 * Reading the code out of a page.
 *
 * **Where** a fence is, is `spans.ts`, and it is now the only thing on this
 * site that decides that — four scanners each decided it separately until this
 * module's own scan became the fourth, which is the point at which a shared
 * reader has two real users rather than one. **What** a fence claims to be is
 * this module's, and it is the half that has to be strict: a fence whose
 * language nobody has decided about, or whose declaring word is misspelled,
 * stops the build rather than being quietly treated as a program.
 *
 * A misspelling is the failure worth being loud about. `sketchy` silently
 * meaning `program` would put an abridged snippet through the compiler and
 * produce a wall of errors on a block that was never meant to compile; the
 * other direction is worse, because `objectbody` meaning "not a program"
 * anywhere would mean the check quietly stopped looking.
 */

const isLanguage = (word: string): word is FenceLanguage =>
  (FENCE_LANGUAGES as readonly string[]).includes(word)

const isKindWord = (word: string): word is Exclude<FenceKind, "program"> =>
  word !== "program" && (FENCE_KINDS as readonly string[]).includes(word)

type Declaration = {
  readonly language: FenceLanguage
  readonly kind: FenceKind
}

const parseInfo = (info: string, where: string): Declaration => {
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

  if (word === undefined) return { language, kind: "program" }

  if (!isKindWord(word)) {
    throw new Error(
      `loom: ${where} — "${word}" is not a kind of fence. Use object-body, function-body or sketch, ` +
        `or say nothing at all for a program.`
    )
  }

  return { language, kind: word }
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
 * Every fenced block on one page, in reading order, with what each one claims.
 *
 * The blocks come from `spans.ts`, which is a scan rather than a markdown parse
 * for the reason the meta word gives: MDX throws it away, so it reaches neither
 * the rendered page nor any plugin this site installs, and the page source is
 * the only place it survives. What is added here is the declaration and the two
 * refusals — a fence that never closes, and a page whose first compiled block
 * calls itself an alternative to something.
 */
export const fencesIn = (source: string, where: string): readonly Fence[] => {
  const fences = fenceSpansIn(source).map((span): Fence => {
    if (span.closesAt === undefined) {
      throw new Error(`loom: ${where}:${span.opensAt} — a fence that is never closed.`)
    }

    return {
      ...parseInfo(span.info, `${where}:${span.opensAt}`),
      code: span.code,
      line: span.opensAt,
    }
  })

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
