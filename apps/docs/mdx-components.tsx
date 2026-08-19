import type { MDXComponents } from "mdx/types"

import { Callout } from "@/components/callout"
import { CodeBlock } from "@/components/code-block"
import { EntryPoints } from "@/components/entry-points"
import { Example } from "@/components/example"

/**
 * What a page written in MDX may use without importing it.
 *
 * Two kinds of thing are here and nothing else. `pre` is an override — every
 * fenced block on the site becomes a copyable one, and a page that had to
 * remember to ask would eventually forget. `Callout` and `Example` are the two
 * components a page is allowed to reach for, and `EntryPoints` is the one table
 * that is rendered from data rather than typed. Prose is the medium here (§4c),
 * so the list of things that are not prose stays short enough to hold in the head.
 */
export const useMDXComponents = (components: MDXComponents): MDXComponents => ({
  ...components,
  pre: CodeBlock,
  Callout,
  EntryPoints,
  Example,
})
