/**
 * What a code block on this site is claiming to be.
 *
 * Every rendered example on a page is a real tree mounted through the runtime,
 * so an example that cannot render is a failing test. The fenced code beside it
 * had no such guarantee: thirty blocks of TypeScript that a reader is invited to
 * copy, and nothing anywhere asked whether any of them would compile. A snippet
 * that names a function the runtime removed keeps looking exactly as convincing
 * as one that works.
 *
 * The blocks are not all the same kind of thing, and that is the whole reason
 * this vocabulary exists. Most are programs. Some are deliberately the *inside*
 * of something — an object literal being described field by field, or the body
 * of a request handler — and a checker that demanded those parse as a program
 * would be demanding the page be written worse. A few are abridged on purpose.
 *
 * So a fence says which it is, in one word after the language:
 *
 * ```` md
 * ```ts               a program
 * ```ts object-body   the inside of an object literal
 * ```ts function-body the inside of a function
 * ```ts alternative   the same job as the block above, done differently
 * ```ts sketch        abridged on purpose, and not compiled
 * ```
 * ````
 *
 * The word is markdown *meta* — it never reaches the page, and a reader sees
 * the same highlighted block either way.
 *
 * `alternative` is the one that pays for itself. *Going to production* shows
 * three stores wired to memory and then the same three wired to Postgres, under
 * the same three names, because being able to swap one line for another is the
 * entire lesson. Read as one program that is a redeclaration — so an
 * alternative is compiled as **its own module**, inheriting the page's imports
 * and its story, and neither branch of the choice goes unchecked. Without it the
 * only way to write that page is `sketch`, and a checker that pushes people
 * towards its own escape hatch is worse than no checker.
 *
 * `sketch` is the only way out of the check, and it costs something: a sketch
 * must contain an ellipsis, so the only blocks that escape compilation are the
 * ones already telling the reader they are incomplete. That is what stops the
 * word becoming a place to hide a snippet that stopped working.
 */

/**
 * The languages a fence on this site may be written in.
 *
 * A page reaching for a fifth is not an error in the page — it is a language
 * nobody has decided what to do about, so extraction refuses it and whoever
 * adds it says here whether it gets compiled.
 */
export const FENCE_LANGUAGES = ["ts", "tsx", "bash"] as const

export type FenceLanguage = (typeof FENCE_LANGUAGES)[number]

/**
 * The five kinds, and the word that declares each.
 *
 * `program` has no word, because the overwhelming majority of blocks are
 * programs and a vocabulary that made the common case verbose would be a
 * vocabulary people route around.
 */
export const FENCE_KINDS = ["program", "object-body", "function-body", "alternative", "sketch"] as const

export type FenceKind = (typeof FENCE_KINDS)[number]

/** What a sketch must contain to be allowed to skip compilation. */
export const ELLIPSIS = "…"

export type Fence = {
  readonly language: FenceLanguage
  readonly kind: FenceKind
  /** The code between the fences, verbatim, with no trailing newline. */
  readonly code: string
  /** 1-based line of the opening fence in the page source, for a failing test to name. */
  readonly line: number
}

/** Only TypeScript is compiled. A shell command is not a program in this sense. */
export const isCheckable = (fence: Fence): boolean =>
  (fence.language === "ts" || fence.language === "tsx") && fence.kind !== "sketch"

/** A block read on its own rather than as part of the page's one program. */
export const isAlternative = (fence: Fence): boolean => fence.kind === "alternative"
