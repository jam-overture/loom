import type { ElementNode, LoomNode, LoomTree } from "@loom/runtime"
import {
  LOOM_NODE_ATTRIBUTE,
  LOOM_REVISION_ATTRIBUTE,
  LOOM_TREE_ATTRIBUTE,
  LOOM_TYPE_ATTRIBUTE,
  editableAttributes,
} from "@loom/runtime/react"

import { docsExamples } from "@/app/(docs)/_lib/examples/catalogue"

/**
 * What `addressed: true` writes, asked of the function that writes it.
 *
 * The renderer hands each primitive an `editable` bag and the primitive spreads
 * it onto its own root element — so `editableAttributes` is the whole of what
 * addressing adds, and calling it on the real nodes of the real tree is a
 * shorter route to the truth than rendering twice and diffing HTML.
 *
 * It is also the only route available to a page. Next refuses `react-dom/server`
 * inside a Server Component, and rendering to a DOM needs a DOM. The claim that
 * needs a render — that stripping these attributes back out gives the other
 * document byte for byte — is held by `addressing.test.tsx`, which has a jsdom
 * to do it in.
 */

const SUBJECT_ID = "a-page-a-reader-scrolls"

export const addressingSubject = (): LoomTree => {
  const example = docsExamples.get(SUBJECT_ID)

  if (example === undefined) {
    throw new Error(`loom: the reader-signals page needs the "${SUBJECT_ID}" example`)
  }

  return example.build()
}

/** Every element node, in document order. Slots hold children like anything else. */
const elementsIn = (node: LoomNode): readonly ElementNode[] => {
  if (node.kind === "text") return []

  const below = node.children.flatMap(elementsIn)

  return node.kind === "element" ? [node, ...below] : below
}

/** One attribute as it reaches the browser, which is also how it is measured. */
const written = (name: string, value: string): string => ` ${name}="${value}"`

export type AddressedAttribute = {
  readonly attribute: string
  readonly value: string
}

export type AddressedMarkup = {
  /** How many elements gain an identity. */
  readonly addressedElements: number
  /** The two every decorated element gains, shown on one real element. */
  readonly onAnElement: readonly AddressedAttribute[]
  /** The type of the element those came from, so the sample is not anonymous. */
  readonly thatElementIs: string
  /** What the root gains beyond those two. */
  readonly onTheRoot: readonly AddressedAttribute[]
  /** Bytes of attributes added across the whole page. */
  readonly bytesAdded: number
  /** True when nothing beyond these four attribute names is ever written. */
  readonly nothingElseIsWritten: boolean
}

/**
 * The cost of addressing this page, counted attribute by attribute.
 *
 * `nothingElseIsWritten` is the row that matters. `editableAttributes` is what
 * edit mode uses too, and edit mode means a great deal more than identity — so
 * the useful question is not "did it write the four" but "did it write *only*
 * the four". A fifth key appearing in that bag is a change to what a published
 * page discloses, and it would arrive here silently.
 */
export const produceAddressedMarkup = (): AddressedMarkup => {
  const tree = addressingSubject()
  const elements = elementsIn(tree.root)

  const root = elements[0]
  /** The second element, so the sample shown is an ordinary one rather than the root. */
  const sample = elements[1]

  if (root === undefined || sample === undefined) {
    throw new Error("loom: the reader-signals example tree is too small to show addressing on")
  }

  const allowed = new Set([
    LOOM_NODE_ATTRIBUTE,
    LOOM_TYPE_ATTRIBUTE,
    LOOM_TREE_ATTRIBUTE,
    LOOM_REVISION_ATTRIBUTE,
  ])

  const bags = elements.map((element) =>
    editableAttributes(element, element.id === root.id ? tree : undefined)
  )

  const named = (bag: Record<string, string | undefined>): readonly AddressedAttribute[] =>
    Object.entries(bag)
      .filter(([, value]) => value !== undefined)
      .map(([attribute, value]) => ({ attribute, value: value ?? "" }))

  const rootBag = named(bags[0] ?? {})

  return {
    addressedElements: elements.length,
    onAnElement: named(bags[1] ?? {}),
    thatElementIs: sample.type,
    onTheRoot: rootBag.filter(
      (one) => one.attribute === LOOM_TREE_ATTRIBUTE || one.attribute === LOOM_REVISION_ATTRIBUTE
    ),
    bytesAdded: bags
      .flatMap((bag) => named(bag))
      .reduce((total, one) => total + written(one.attribute, one.value).length, 0),
    nothingElseIsWritten: bags.every((bag) => Object.keys(bag).every((key) => allowed.has(key))),
  }
}
