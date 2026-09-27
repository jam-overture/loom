import { parseTree } from "@jam-overture/loom"
import type { ReactNode } from "react"

import { renderTree } from "./loom"

/**
 * A held fragment, turned back into something on a page.
 *
 * Loaded on demand and never at import time — this module pulls the starter
 * primitive library into whatever bundle names it, and a reader working through
 * a lesson should not be paying for the renderer of an answer they have not
 * earned. The dynamic `import()` in `held.tsx` is what keeps that true, so
 * nothing else may import this file statically.
 *
 * What arrives over the wire is `unknown`, and it goes through the runtime's own
 * boundary parse before anything walks it. That is not ceremony: the response is
 * a static file, but it is a static file this code did not build, fetched at
 * runtime by a browser, and `parseTree` is the function the whole system uses
 * for exactly this moment. A tree that does not parse is a defect worth saying
 * out loud rather than a blank space where an answer was.
 */
export const renderHeld = (document: unknown, slot: string): ReactNode => {
  if (typeof document !== "object" || document === null || !("slots" in document)) {
    throw new Error("loom: a held document arrived without any slots in it")
  }

  const slots = (document as { readonly slots: unknown }).slots

  if (typeof slots !== "object" || slots === null) {
    throw new Error("loom: a held document's slots are not an object")
  }

  const found = (slots as Record<string, unknown>)[slot]

  if (found === undefined) {
    throw new Error(`loom: a held document has no slot "${slot}"`)
  }

  const parsed = parseTree(found)

  if (!parsed.ok) {
    throw new Error(`loom: a held tree did not parse — ${parsed.error.code}`)
  }

  return renderTree(parsed.value, `held ${slot}`)
}
