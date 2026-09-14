import { z } from "zod"

import { anchorSchema } from "./anchor.js"

/**
 * The schemes a URL in an AI-authored tree may use, and the two kinds of
 * relative destination it may hold.
 *
 * Zod's `.url()` asks whether the string parses as a URL, which
 * `javascript:alert(1)` does. Every URL in this library reaches an `href` or a
 * `src`, so a props schema that accepts any parseable URL accepts script
 * execution from the one part of the tree a model writes freely — and the
 * renderer would emit it faithfully, because rendering is a projection and not
 * a filter.
 *
 * So the check is an allowlist, not a parse. `props.ts` already refuses to
 * transform what it validates: a bad URL makes the node invalid and it is
 * omitted with a diagnostic, rather than being quietly rewritten into something
 * safe that the tree does not say.
 */

/**
 * An origin to resolve a candidate path against. Nothing is ever fetched from
 * it. It exists so the check can ask the URL parser the question it actually
 * cares about — *does this stay on the origin serving the page?* — instead of
 * pattern-matching the string and hoping the pattern agrees with the parser.
 *
 * It does not, four ways. `//host`, `/\host`, `/<tab>/host` and `/<newline>/host`
 * all reach another origin, because the parser treats a backslash as a slash and
 * strips tabs and newlines before it decides anything. A rule written as "starts
 * with a slash but not two" passes three of those. Resolving is exact by
 * construction: the parser deciding here is the one that will decide in the
 * browser.
 *
 * `.invalid` is reserved by RFC 2606 and resolves nowhere, so a value that
 * somehow escaped into a real request would fail rather than reach a host
 * someone owns.
 */
const SAME_ORIGIN_PROBE = "https://loom.invalid"

/**
 * A destination on the page's own origin, written as an absolute path.
 *
 * The leading slash is required, and it is the whole of what separates this
 * from the relative URLs 0053 refused. `/pricing` names the same document under
 * every deployment of a site; `pricing` names a different one per route the
 * tree happens to be mounted at, which is the objection 0053 raised and which
 * still stands.
 */
const isSameOriginPath = (value: string): boolean => {
  if (!value.startsWith("/")) return false

  try {
    return new URL(value, SAME_ORIGIN_PROBE).origin === SAME_ORIGIN_PROBE
  } catch {
    return false
  }
}

/**
 * A destination on the page the reader is already on, written as a bare
 * fragment.
 *
 * `loom.section`, `loom.hero` and `loom.callout` have taken an `anchor` since
 * 26 August, so the library could **mark a destination it had no way to link
 * at**: `#helmets` is not a path and not a URL, so it was refused, and a page
 * with a nav bar over six sections had to write `/#helmets` instead. That is
 * worse than the refusal it replaces — it is correct only on the site root, and
 * anywhere else it silently leaves the page the reader is on and lands them at
 * the front door's anchor. Nothing reports it, because nothing is wrong.
 * Maintainer-filed on 12 September, building `prototypes/ski-apparel`.
 *
 * **Why the allowlist's argument does not reach it.** 0053 refuses what it
 * cannot check the origin of. A bare fragment reaches no origin at all — it is
 * the one href that provably cannot leave the document — so there is nothing
 * for a scheme check to have an opinion about. `javascript:#x` is a scheme and
 * fails the test below on its first character.
 *
 * **The grammar is `anchorSchema`'s, deliberately not a looser one.** What may
 * be linked at is exactly what may be marked, in one regex read from one file,
 * so the two halves cannot drift into a library that accepts `#Helmets` at the
 * link end and writes `id="helmets"` at the other. It also inherits that
 * schema's reason for being narrow: an anchor is the one value a model writes
 * straight into the document as markup.
 *
 * **It does not check that the anchor exists.** That is the same fact about a
 * tree rather than about a node that `anchor.ts` records for uniqueness, and it
 * belongs to whatever walks the whole tree. A schema that pretended to enforce
 * it would be enforcing nothing.
 */
const isSamePageFragment = (value: string): boolean =>
  value.startsWith("#") && anchorSchema.safeParse(value.slice(1)).success

const withScheme = (
  allowed: readonly string[],
  { fragments }: { readonly fragments: boolean }
): z.ZodEffects<z.ZodString, string, string> =>
  z.string().superRefine((value, context) => {
    if (isSameOriginPath(value)) return
    if (fragments && isSamePageFragment(value)) return

    const parsed = ((): URL | undefined => {
      try {
        return new URL(value)
      } catch {
        return undefined
      }
    })()

    if (!parsed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: fragments
          ? "must be an absolute URL, a path beginning with / on this site, or #an-anchor on this page"
          : "must be an absolute URL, or a path beginning with / on this site",
      })
      return
    }

    if (!allowed.includes(parsed.protocol)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `scheme ${parsed.protocol} is not allowed here; use ${allowed.join(" or ")}`,
      })
    }
  })

/** Where a call to action may point. `mailto:` and `tel:` are ordinary CTAs. */
export const linkUrlSchema = withScheme(["http:", "https:", "mailto:", "tel:"], {
  fragments: true,
})

/**
 * Where an image may come from. Narrower than a link on purpose: `data:` is
 * excluded because an inline SVG document is a script host, and the size of the
 * thing would sit in the tree and in every delta that touched it.
 *
 * It is narrower by one more thing since the fragment landed: a `src` is
 * fetched, and `#helmets` fetches the document that is already open. The one
 * real use for a fragment in a `src` is an SVG sprite reference, which needs
 * the file's path in front of it and so is an ordinary URL here.
 */
export const mediaUrlSchema = withScheme(["http:", "https:"], { fragments: false })
