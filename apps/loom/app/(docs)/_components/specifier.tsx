import { Fragment } from "react"

import { specifierSegments } from "@/app/(docs)/_lib/api/specifier"

/**
 * An import specifier, printed with the places it may break.
 *
 * A `<wbr/>` is a break opportunity and nothing else: it has no width, it adds
 * no character to the text, and a reader who copies the heading gets the
 * specifier they can paste into an import. That last part is the whole reason
 * this is a `<wbr/>` and not a hyphen, a zero-width space or a line break —
 * the heading of a reference page is a thing people copy.
 *
 * **It is deliberately not styled and deliberately not a heading.** The `h1`
 * and its classes stay on the page that owns them, so this renders text and a
 * reader can be shown the same treatment somewhere else later without
 * inheriting a page's type scale.
 *
 * **What this cannot be checked by, and why the test below exists.**
 * `prerender:check` reads the built HTML for two text runs that a reader sees
 * run together, and it is blind by its own account to anything lost *across a
 * tag* — `16<!-- --><span>of</span>` reads `16of` and passes. Every junction
 * this component makes is across a tag. So the instrument that caught the
 * original defect cannot see this one, and `specifier.test.tsx` renders through
 * `react-dom/server` — the transform the artefact actually comes from — and
 * reads the words back out.
 */
export const Specifier = ({ of: specifier }: { readonly of: string }) => {
  const segments = specifierSegments(specifier)

  return (
    <>
      {segments.map((segment, at) => (
        /*
         * The index is the key, which is right here and is usually not: the list
         * is derived from one string in render and has no identity to preserve
         * across one. Two segments of a specifier can be the same word —
         * `@jam-overture/loom/signals/postgres` has no repeat but nothing stops
         * one — so the segment itself would be a worse key, not a better one.
         */
        <Fragment key={at}>
          {segment}
          {at < segments.length - 1 ? <wbr /> : null}
        </Fragment>
      ))}
    </>
  )
}
