import type { MDXComponents } from "mdx/types"

import { ArchitectureIdeas } from "@/app/(docs)/_components/architecture-ideas"
import { Callout } from "@/app/(docs)/_components/callout"
import { CodeBlock } from "@/app/(docs)/_components/code-block"
import { DecisionRecords } from "@/app/(docs)/_components/decision-records"
import { StorageSchema, StoreFailures } from "@/app/(docs)/_components/deployment-tables"
import { EntryPoints } from "@/app/(docs)/_components/entry-points"
import { Example } from "@/app/(docs)/_components/example"

/**
 * What a page written in MDX may use without importing it.
 *
 * Two kinds of thing are here and nothing else. `pre` is an override — every
 * fenced block on the site becomes a copyable one, and a page that had to
 * remember to ask would eventually forget. `Callout` and `Example` are the two
 * components a page is allowed to reach for, and the rest are tables rendered
 * from something the repository already knows rather than typed: `EntryPoints`
 * from the runtime's own exports, `ArchitectureIdeas` and `DecisionRecords`
 * from `lessons/` and `decisions/`, and `StorageSchema` and `StoreFailures`
 * from the statements the runtime runs against a host's database and the codes
 * its store refuses with. Prose is the medium here (§4c), so the list stays
 * short enough to hold in the head, and the bar for joining it is not that a
 * page wanted a nicer layout — it is that the repository already owns the fact
 * and a second copy of it would rot.
 */
export const useMDXComponents = (components: MDXComponents): MDXComponents => ({
  ...components,
  pre: CodeBlock,
  ArchitectureIdeas,
  Callout,
  DecisionRecords,
  EntryPoints,
  Example,
  StorageSchema,
  StoreFailures,
})
