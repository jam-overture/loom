import { z } from "zod"

/**
 * The schemes a URL in an AI-authored tree may use.
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

const withScheme = (allowed: readonly string[]): z.ZodEffects<z.ZodString, string, string> =>
  z.string().superRefine((value, context) => {
    const parsed = ((): URL | undefined => {
      try {
        return new URL(value)
      } catch {
        return undefined
      }
    })()

    if (!parsed) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "must be an absolute URL" })
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
export const linkUrlSchema = withScheme(["http:", "https:", "mailto:", "tel:"])

/**
 * Where an image may come from. Narrower than a link on purpose: `data:` is
 * excluded because an inline SVG document is a script host, and the size of the
 * thing would sit in the tree and in every delta that touched it.
 */
export const mediaUrlSchema = withScheme(["http:", "https:"])
