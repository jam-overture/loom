import { isValidElement, type JSXElementConstructor, type ReactElement, type ReactNode } from "react"

import { ELIDED, plainWords } from "./words"

/**
 * The words a component renders, for the pages nobody wrote.
 *
 * **The plain version.** Most pages on this site are files: somebody wrote the
 * sentences, `prose.ts` reads them off disk, and the search box finds them. The
 * seventeen reference pages are not files — they are components over data
 * generated from the package — so there was nothing to read, and every sentence
 * on them was invisible to the search box. A reader who typed *do the imports
 * nest* was told the site says nothing on a subject it has a whole page about.
 *
 * This reads them the other way: it walks what the page's components return and
 * collects the text a reader would see. **Nothing is written down twice.** The
 * band says the sentence, this reads the band, and a sentence rewritten on
 * Tuesday is searchable in its new words on Tuesday — which is the same
 * property the written pages have, arrived at the same way.
 *
 * ## Why it walks the tree rather than rendering it
 *
 * The obvious implementation is `renderToStaticMarkup` and a tag-stripper, and
 * it cannot work here. These components are Server Components that import
 * `next/link`, which is a *client* component: inside the server build, `Link`
 * is not the function this file could call but an opaque reference for the
 * browser to resolve, and a server renderer handed one throws. Walking the tree
 * sidesteps that — a reference is an element like any other, and the words are
 * in the children it was given rather than in anything it would return.
 *
 * So the rule is: **a plain function component is called, and anything else is
 * read through.** What that costs is written down under `renderedWords` below,
 * and it costs nothing today.
 */

/** The props of an element, which React types as `unknown` until somebody looks. */
type Props = {
  readonly children?: ReactNode
  readonly ["data-search"]?: string
}

/** A component this file may call: a plain function of props, with no hooks in it. */
type PlainComponent = (props: Props) => ReactNode

/**
 * Tags whose text is code and is therefore not prose — the same rule
 * `prose.ts` applies to a name between backticks, and for the same reason.
 *
 * `<code>` is a name in a sentence and becomes an ellipsis. `<pre>` is a block
 * to copy — an install command, a signature — and a reader searching `import`
 * wants prose about importing rather than every block that begins with the
 * keyword.
 */
const CODE_TAGS: readonly string[] = ["code", "pre", "kbd", "samp"]

/** What a region says when it is not prose: `data-search="off"`. */
const OFF = "off"

/**
 * Headings, which are in a generated page's body and are not in a written
 * page's.
 *
 * On a written page a heading opens a section, so its words are the entry's
 * *title* and the body under it starts after them. A generated page has one
 * body for the whole page, so a band's heading sits inside it — and without
 * this it runs into the sentence beneath: *"…keeps its promises. No import has
 * everything behind it The usual shape of a package like this…"*, which is what
 * a reader was shown in the excerpt under their query.
 *
 * So a heading ends in a full stop where it does not already end in something.
 * It is the same boundary the written half draws by cutting the body at the
 * heading, drawn in the only place a one-body page has to put it.
 */
const HEADING_TAGS: readonly string[] = ["h1", "h2", "h3", "h4", "h5", "h6"]

const ENDS_A_SENTENCE = /[.!?:;…]$/

const stopped = (text: string): string => {
  const trimmed = text.trim()

  return trimmed === "" || ENDS_A_SENTENCE.test(trimmed) ? trimmed : `${trimmed}.`
}

const propsOf = (element: ReactElement): Props => (element.props ?? {}) as Props

/**
 * How a client component announces itself, in a server build and in React's own
 * renderer: `$$typeof` is this symbol, whatever else the object is.
 *
 * It is the check rather than `typeof type`, and the difference cost a build.
 * Inside the server bundle `next/link`'s default export **is** a function — a
 * proxy standing in for a module that is not here — and calling it does not fail
 * gracefully: it throws *"attempted to call the default export … from the server
 * but it's on the client"*, from the index route, during `Collecting page data`.
 */
const CLIENT_REFERENCE = Symbol.for("react.client.reference")

const isClientReference = (type: unknown): boolean =>
  (typeof type === "function" || (typeof type === "object" && type !== null)) &&
  (type as { readonly $$typeof?: unknown }).$$typeof === CLIENT_REFERENCE

/**
 * A component whose own text this file can reach.
 *
 * A plain function — the bands in `_components/api-*.tsx` and the little
 * components they are built from — is called, because its sentences are inside
 * it and there is no other way to them. Anything else is a type this file does
 * not call: a client reference (`next/link`), a `memo`, a `forwardRef`, a
 * fragment. Those are read through to their children instead, which is where
 * the words are in every case on this site: a link holds the words of the link.
 */
const callable = (type: string | JSXElementConstructor<unknown>): PlainComponent | undefined =>
  typeof type === "function" && !isClientReference(type)
    ? (type as unknown as PlainComponent)
    : undefined

const textIn = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") return ""

  if (typeof node === "string") return node

  if (typeof node === "number") return String(node)

  /* An array of children, which is what every `map` in a band produces. */
  if (Array.isArray(node)) return node.map((child) => textIn(child as ReactNode)).join(" ")

  /* An iterable or a promise: not something this site's bands produce, and not
     something that could be read without rendering it. */
  if (!isValidElement(node)) return ""

  const props = propsOf(node)

  /* A region that says it is not prose. The two on this site are the list of
     signatures and a page's own table of contents; both are answered by other
     bands of the index, and `api-reference.tsx` says so where it sets them. */
  if (props["data-search"] === OFF) return ""

  if (typeof node.type === "string") {
    if (CODE_TAGS.includes(node.type)) return ELIDED

    const text = textIn(props.children)

    return HEADING_TAGS.includes(node.type) ? stopped(plainWords(text)) : text
  }

  const component = callable(node.type)

  return component === undefined ? textIn(props.children) : textIn(component(props))
}

/**
 * One line of plain words from an element, ready to be a body in the index.
 *
 * **What it cannot read, all of it deliberate and none of it load-bearing
 * today:**
 *
 * - **Text a client component renders of its own**, rather than being handed as
 *   children. Nothing on a reference page does this; if something did, the
 *   sentence would simply be missing and the band's test would be the place to
 *   notice.
 * - **Anything a hook decides.** A component this file calls is called outside
 *   a render, so a hook in one would throw — loudly, at build time, in the
 *   route that builds the index, rather than quietly producing a shorter page.
 *   Every band here is a pure function of its props, which is what §4c's rule
 *   about generated pages makes them anyway.
 * - **Code**, per `CODE_TAGS`, and **a region marked `data-search="off"`**.
 */
export const renderedWords = (node: ReactNode): string => plainWords(textIn(node))
