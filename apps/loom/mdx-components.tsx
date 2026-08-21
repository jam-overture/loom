import type { MDXComponents } from "mdx/types"

import { ArchitectureIdeas } from "@/app/(docs)/_components/architecture-ideas"
import { Callout } from "@/app/(docs)/_components/callout"
import { CodeBlock } from "@/app/(docs)/_components/code-block"
import { DecisionRecords } from "@/app/(docs)/_components/decision-records"
import { EntryPoints } from "@/app/(docs)/_components/entry-points"
import { Example } from "@/app/(docs)/_components/example"

/**
 * What a page written in MDX may use without importing it.
 *
 * Two kinds of thing are here and nothing else. `pre` is an override — every
 * fenced block on the site becomes a copyable one, and a page that had to
 * remember to ask would eventually forget. `Callout` and `Example` are the two
 * components a page is allowed to reach for, and the other three are tables
 * rendered from something the repository already knows rather than typed:
 * `EntryPoints` from the runtime's own exports, `ArchitectureIdeas` and
 * `DecisionRecords` from `lessons/` and `decisions/`. Prose is the medium here
 * (§4c), so the list of things that are not prose stays short enough to hold in
 * the head.
 */
export const useMDXComponents = (components: MDXComponents): MDXComponents => ({
  ...components,
  pre: CodeBlock,
  ArchitectureIdeas,
  Callout,
  DecisionRecords,
  EntryPoints,
  Example,
})
