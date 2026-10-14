import type { RenderDiagnostic } from "@jam-overture/loom/react"

/**
 * The codes a render can report, and the order a page prints them in.
 *
 * A file of its own, holding no benches and opening no registries, because two
 * things need the list and only one of them wants what producing it costs.
 * `catalogue.ts` builds the twenty-four renders; `counts.ts` wants nothing but
 * the length, and a site count that pulled a broken primitive and two
 * registries into every page that states a number would be paying for a
 * measurement with a side effect.
 */

/** The codes, as the runtime's own union states them. */
export type RenderDiagnosticCode = RenderDiagnostic["code"]

/**
 * Who has to do something about it, which is the first thing a reader wants and
 * the thing the codes themselves do not say.
 *
 * Three answers rather than a severity, because severity is not what a reader
 * is deciding. They are holding a code and working out whether to open the
 * tree, the composition root or the component — and the runtime's own doc
 * comments already say which, in almost these words: *"a composition-root fault
 * rather than anything the tree did"*, *"addressed to whoever wrote the
 * component"*, *"this one is addressed to whoever wrote the tree"*.
 */
export type DiagnosticAudience = "tree" | "wiring" | "component"

/**
 * Reading order, which is audience order: the ones a tree causes, the ones a
 * deployment's wiring causes, and the one only a component can.
 *
 * It is not the union's order and could not be. A reader arrives having been
 * handed a code, so the grouping a page needs is the grouping of who opens
 * which file. `catalogue.test.ts` holds this list against the recipes — a code
 * with a recipe and no place in this list would compile and never be printed,
 * which is the one gap the `Record` over the union cannot see.
 */
export const RENDER_DIAGNOSTIC_ORDER: readonly RenderDiagnosticCode[] = [
  "unknown-primitive",
  "invalid-props",
  "theme-unresolved",
  "theme-misplaced",
  "reserved-prop-unrecognised",
  "slot-unplaced",
  "data-misdeclared",
  "data-unread",
  "submit-misdeclared",
  "anchor-unusable",
  "anchor-claimed",
  "props-undeclared",
  "theme-unregistered",
  "data-unavailable",
  "data-unresolved",
  "data-unshown",
  "submit-unavailable",
  "submit-unresolved",
  "frame-refused",
  "frame-same-origin",
  "behaviour-unnamed",
  "theme-values-unmounted",
  "excerpt-absent",
  "unshown-unreadable",
]

/** What a reader is told the group is, and the order the groups are printed in. */
export const DIAGNOSTIC_AUDIENCES: readonly {
  readonly audience: DiagnosticAudience
  /** The heading over the group. */
  readonly title: string
  /** One sentence: what these have in common, and which file to open. */
  readonly blurb: string
}[] = [
  {
    audience: "tree",
    title: "The tree asked for something it cannot have",
    blurb:
      "A node names a primitive, a prop, a region or an anchor that the registry does not back up. These are the ones a proposal can cause, so they are the ones a policy is there to bound. They are fixed in the tree or in the registry.",
  },
  {
    audience: "wiring",
    title: "The render was not given everything it needed",
    blurb:
      "The tree is fine. The seams around it are missing something: a registry, a resolution, an allowlist, a dictionary entry. Every one of these is fixed in the composition root, which is the code that calls the render.",
  },
  {
    audience: "component",
    title: "A primitive did something it promised not to",
    blurb:
      "One code, and it is here because it is addressed to somebody else entirely: whoever wrote the component. Nothing a tree says and nothing a deployment wires can cause it.",
  },
]
