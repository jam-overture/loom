/**
 * The two things `wired/page.tsx` imports, which are the two things a reader
 * already has by the time they reach this band.
 *
 * **Nothing in this file is printed on the site.** It exists so that the file
 * that *is* printed compiles against the published API as a real module, the
 * way `written/price-tag.tsx` does for the registration panel: a page cannot
 * be shown a reader unless it typechecks, and it cannot typecheck without the
 * registry it renders with and the page it renders.
 *
 * Both are the shortest honest version of what a host writes:
 *
 * - **`components`** is the starter library, built the way this site builds its
 *   own in `_lib/registry.ts` — six lines, including the refusal. A reader has
 *   met this three bands earlier, under *What you write*, where the panel is
 *   the `definePrimitive` call that adds one of their own to it.
 * - **`homePage`** is a page written down as data. It is two nodes, because
 *   what the printed file does with it does not depend on how big it is, and a
 *   fuller page here would read as the interesting part of a file whose point
 *   is that it is uninteresting.
 * - **`loomProject`** is the address and the key the printed file pulls with.
 *
 * ## Why `loomProject` is an object, and why it is not read off `process.env`
 *
 * **A reader's own version of this reads the environment**, and the published
 * entry point's example says so in as many words: `process.env.LOOM_URL`,
 * `process.env.LOOM_PROJECT_KEY`. The panel does not, and the reason is a check
 * rather than a preference.
 *
 * `tools/sources/deployment.ts` reads every environment variable the
 * application's **code** names and holds `apps/loom/.env.example` to offering
 * each one. It cannot tell a setting this deployment reads from one a printed
 * specimen reads, and the discipline that makes these panels trustworthy is
 * that they are real compiled modules — so the read in a specimen arrives in
 * that sweep as a nineteenth setting of the Loom site, which it is not.
 * Measured on this branch: `LOOM_URL` and `LOOM_PROJECT_KEY` turn two of its
 * cases red.
 *
 * Both ways out of that are another lane's file. Offering them in
 * `.env.example` would document two settings this deployment does not have, and
 * adding them to that sweep's `NOT_SET_BY_AN_OPERATOR` is an edit to `tools/`.
 * **So it is filed and the panel is shaped around it** — the copy beside the
 * panel says the address and the key come out of a reader's environment, which
 * is the fact, and the file takes them from the configuration module it already
 * imports two things from.
 *
 * **It is mutable, and that is what lets `wired.test.ts` be real.** The test
 * points the specimen at a server answering the live-pages door, which means
 * setting these two before `wired/page.tsx` evaluates. `vi.resetModules()`
 * followed by importing this module and then that one gives both a fresh
 * evaluation out of one registry, so the object the test writes to is the
 * object the panel's code reads. No mock, and nothing that depends on which
 * file the suite loaded first.
 *
 * The printed file imports both from `"./loom"` rather than from two modules,
 * so that its import block is three lines instead of four. That is a choice
 * about the panel and not about how a host arranges their application, and
 * `wired.ts` says so in the copy the band prints under it.
 */

import {
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  type LoomTree,
} from "@jam-overture/loom"
import { createStarterPrimitiveRegistry } from "@jam-overture/loom/primitives"
import { describeRegistryError, type PrimitiveRegistry } from "@jam-overture/loom/sdk"

const built = createStarterPrimitiveRegistry()

if (!built.ok) {
  throw new Error(`loom: the specimen registry was refused — ${describeRegistryError(built.error)}`)
}

export const components: PrimitiveRegistry = built.value

/**
 * The address and the key the printed file pulls with. See above for why this
 * is an object a test can write to rather than two reads of the environment.
 */
export const loomProject: { url: string; key: string } = { url: "", key: "" }

/**
 * The page as the host's own code writes it down, which is what a reader is
 * served when Loom has nothing live for it.
 *
 * The heading is what `wired.test.ts` reads to tell the built page and the live
 * page apart: the test answers the door with the same tree carrying a different
 * sentence, so what comes out of the render says which of the two was served.
 */
export const BUILT_HEADING = "Hand-built doors, made to order"

const ids = sequentialIdFactory("wired")

export const homePage: LoomTree = createTree(
  buildElement(ids, {
    type: "loom.page",
    props: {},
    children: [
      buildElement(ids, {
        type: "loom.heading",
        props: { level: 1 },
        children: [buildText(ids, BUILT_HEADING)],
      }),
    ],
  }),
  ids
)
