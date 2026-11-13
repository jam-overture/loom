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
 *
 * ## The address and the key are not in here any more
 *
 * They were, from 10 November until today, as a mutable `loomProject` object
 * the panel imported alongside these two. That was a workaround and this file
 * carried the whole of why: `tools/sources/deployment.ts` reads every
 * environment variable the application's **code** names and holds
 * `apps/loom/.env.example` to offering each one, and it could not tell a
 * setting this deployment reads from one a printed specimen reads. The two
 * reads a reader actually writes arrived in that sweep as two settings of the
 * Loom site, which they are not.
 *
 * `Loom daily build` closed that the same evening.
 * [0379](../../../../../../decisions/0379-a-file-may-publish-part-of-its-body-as-somebody-elses-code-and-a-check-that-reads-this-deployment-stops-at-the-marker.md)
 * stops that sweep at `SHOWN_MARKER`, so everything a visitor copies is read as
 * the visitor's setting and never as this deployment's. **So the panel prints
 * `process.env.LOOM_URL` and `process.env.LOOM_PROJECT_KEY`**, which is what
 * the published entry point's own example prints, and the one indirection
 * between the panel and the file a reader would write is gone.
 *
 * Two things that follow, and the second is the one to know before editing
 * either file:
 *
 * - **The exemption is the region and not the file.** Whatever `wired/page.tsx`
 *   reads *above* its marker is still this deployment's setting. There is
 *   nothing above it today and a read put there would be a real finding.
 * - **`wired.test.ts` writes the two variables rather than an object**, around
 *   each render and back again afterwards. The module-scope read is what makes
 *   that the honest spelling: the panel takes its deployment as it evaluates,
 *   so the test sets the environment, resets the module registry and imports
 *   the panel fresh. That is one step shorter than it was, because the
 *   configuration module it used to write to no longer has anything to write.
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
