/**
 * The two files `/why-use-it` prints, as the text the page renders.
 *
 * The site has claimed four times that registering a component is the whole of
 * the setup — the maintainer's own second step, the second link of his chain,
 * and the two bands those point at — and until today it never showed the code.
 * The audience `docs/positioning.md` names is *"the casual web developer…
 * junior level"*, the first link of the chain is *React/TypeScript components*,
 * and a developer who wants to know what they would type had to leave for the
 * documentation to find out.
 *
 * ## Why the source is a constant here and a file over there
 *
 * `written/price-tag.tsx` and `written/register.tsx` are real modules. They
 * compile against the published API on every run of the gate, so the day
 * `definePrimitive` changes shape the build goes red on this lane rather than a
 * stranger pasting something that no longer works. That is the whole reason
 * they exist as files.
 *
 * **The page does not read them from disk, and that is deliberate.**
 * `(docs)` prints its quickstart with a `readFileSync` and is right to: those
 * pages are prerendered, so the read happens at build time, where the
 * repository is. Every marketing route is `force-dynamic` by
 * [0331](../../../../../decisions/0331-a-marketing-page-is-served-per-request-because-the-store-governs-it.md),
 * so the same read would happen **per request, in the deployed function**,
 * where the source tree is not. Next traces imports and not paths assembled at
 * runtime, so the file would be missing from the bundle — and the failure would
 * be invisible here, because a local `next start` runs in a checkout where the
 * read succeeds. A green run, a green preview build, and a 500 on the page the
 * chain points at.
 *
 * So the text is written down once, here, and `written.test.ts` reads both
 * files **in the test**, where the repository is, and fails if either has moved
 * away from what this module publishes. Nothing is read at render time and
 * nothing can drift unnoticed.
 */

/** The marker in each specimen; everything after it is what the site prints. */
export const SHOWN_MARKER = "// ── shown on the site ──"

export type WrittenFile = {
  /** What the panel is captioned with, which is the filename a reader would use. */
  readonly caption: string
  /** The specimen this came from, relative to this directory. */
  readonly from: string
  /** The published region of that file, exactly. */
  readonly source: string
}

/**
 * Your component. Ordinary React, and the panel's whole job is that a reader
 * recognises it.
 */
export const YOUR_COMPONENT: WrittenFile = {
  caption: "price-tag.tsx",
  from: "written/price-tag.tsx",
  source: `export type PriceTagProps = {
  readonly amount: string
  readonly was?: string | undefined
}

export const PriceTag = ({ amount, was }: PriceTagProps) => (
  <p className="price-tag">
    {was === undefined ? null : <s>{was}</s>} <strong>{amount}</strong>
  </p>
)`,
}

/**
 * Telling Loom about it, which is the claim: this much, and the page can use
 * your component from then on.
 */
export const THE_REGISTRATION: WrittenFile = {
  caption: "price-tag.loom.tsx",
  from: "written/register.tsx",
  source: `import { z } from "zod"

import type { LoomPrimitiveProps } from "@jam-overture/loom/react"
import { definePrimitive } from "@jam-overture/loom/sdk"

import { PriceTag } from "./price-tag"

const priceTagProps = z
  .object({ amount: z.string(), was: z.string().optional() })
  .strict()

type Settings = z.infer<typeof priceTagProps>

export const priceTag = definePrimitive({
  type: "shop.price-tag",
  description: "A price, with any earlier price beside it.",
  props: priceTagProps,
  component: ({ loom, props }: LoomPrimitiveProps<Settings>) => (
    <span {...loom.editable}>
      <PriceTag amount={props.amount} was={props.was} />
    </span>
  ),
})`,
}

export const WRITTEN_FILES: readonly WrittenFile[] = [YOUR_COMPONENT, THE_REGISTRATION]

/**
 * The language the panels declare, which is one value rather than two because
 * both files are the same kind of thing and a reader scanning them should not
 * be told otherwise.
 */
export const WRITTEN_LANGUAGE = "tsx"

/**
 * The name the registration gives the component, quoted in the copy under the
 * panels so that the sentence and the snippet cannot say different things.
 */
export const REGISTERED_TYPE = "shop.price-tag"
