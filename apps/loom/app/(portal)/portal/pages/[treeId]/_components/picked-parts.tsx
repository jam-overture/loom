"use client"

import type { LoomTree } from "@jam-overture/loom"
import { describeRenderDiagnostic, renderLoomExcerpt } from "@jam-overture/loom/react"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { portalRegistry } from "@/app/(portal)/_lib/registry"

import { useSelection } from "./selection-context"

/**
 * The parts you picked, drawn on their own.
 *
 * `renderLoomExcerpt` has been published on `@jam-overture/loom/react` for weeks
 * with a docstring saying *"a preview, an inspector and a side-by-side are all
 * the same shape"*, and the portal had never called it — which `docs/portal.md`
 * recorded on 27 September as the largest piece of assembly this surface was
 * sitting on. This is that call.
 *
 * ## Why it is worth a pane of its own
 *
 * The preview above shows the whole page, with the picked parts outlined in it.
 * That answers *where is it*. It does not answer *what is it* — a heading inside
 * a card inside a page is three boxes of chrome away from being looked at, and a
 * reader about to ask for a change to it is entitled to see the thing itself,
 * once, at a size they can read. It is the same argument the phone screenshot
 * made about the rail in September: an address book is not the thing.
 *
 * And it is the first screen in this portal that can put two parts of one page
 * side by side without either of them being where the page put it.
 *
 * ## The render happens in the browser, and that is the whole cost decision
 *
 * Three ways exist to draw an excerpt of a selection the server does not know
 * about, and the other two are worse:
 *
 * 1. **Pre-render every row's excerpt on the server** and ship the map down.
 *    This is what `_lib/outline.ts` already refuses for a different reason, in
 *    its own words: *"a row holding its own subtree would send every node down
 *    the wire once per ancestor."* The rendered markup of the page, repeated
 *    once per level of nesting, to draw at most a handful of it.
 * 2. **Fetch the excerpt on click.** A round trip per click, on a pane whose
 *    whole point is that picking is instant. `SelectedNode` settled the same
 *    question for credits: *"a click that costs a round trip to the log would
 *    make the outline feel like it was loading something."*
 * 3. **Send the tree once and render in the browser.** One copy of the page's
 *    data — smaller than the rendered markup of it that this screen already
 *    ships — and every subsequent pick is free.
 *
 * The third is only available because the render seam is pure: `renderLoomExcerpt`
 * is a total projection over a tree in memory, 0008 made the renderer degrade
 * rather than throw, and the primitives this deployment registers are plain
 * components over plain props. Nothing about it is server-only, and 0018 is
 * satisfied because this reaches the framework exactly where a host does.
 *
 * ## What it is honest about
 *
 * **The options are the page screen's own** — `resolver` and `validator` and
 * nothing else — for the reason `PageThumbnail` gives at length: a picture that
 * resolves more than the preview it sits under would show a reader something
 * the page does not. When the page screen resolves more, this inherits it by
 * reading the same registry.
 *
 * **An excerpt wears the tree's theme** and the seam is what guarantees it:
 * 0049 mounts a theme on the root primitive, so a walk beginning anywhere else
 * would hand `var(--loom-…)` to a subtree with nothing above it to resolve
 * them. `renderLoomExcerpt` mounts the variables on a wrapper of its own, which
 * is why this pane can be a plain box and not a copy of the page's chrome.
 *
 * **A part that is no longer there says so.** `found: false` is the one thing
 * every caller branches on and the seam returns it rather than making this
 * scan diagnostics for it. It is reachable: the outline is derived from the
 * tree this screen rendered, but a reader can leave a part picked while a
 * change lands underneath them.
 *
 * **The widening is not said here.** Several parts picked means a change gets
 * asked about the one part that holds them all, which `_lib/selection-scope.ts`
 * works out and `PromptBox` states — beside the button it is about, and once.
 * This pane sits directly above that box, so a reader meets the pictures and
 * then the consequence; saying it in both places would be the same sentence
 * twice on one screen, and the copy nobody reads is the one not next to the
 * button.
 *
 * **Nothing is removed.** The render's diagnostics are the runtime's account of
 * what it could not draw, and they go behind a disclosure rather than being
 * dropped — this is the only screen in the portal where a reader can see them
 * for one part rather than for a whole page.
 */

/**
 * Page content, on the surface the page's own preview uses.
 *
 * `bg-surface-base` is the portal's card, and an excerpt in one reads as a row
 * of this tool rather than as a piece of the reader's page. It is the same
 * distinction the preview frame already draws with `bg-surface-preview`, which
 * is the colour a reader has learned means *this is your page and not us*.
 *
 * A ceiling, because a part of a page is as tall as it likes and three of them
 * would otherwise push the box that acts on them off the screen. It scrolls
 * rather than clipping: an excerpt cut off with no way to see the rest would be
 * this pane lying about what it drew.
 */
const EXCERPT = "border-edge-subtle bg-surface-preview max-h-96 overflow-auto rounded-md border p-4"

export const PickedParts = ({ tree }: { readonly tree: LoomTree }) => {
  const { picked, pick, clear } = useSelection()

  /**
   * Nothing picked is not an empty state here, and deliberately has no box. The
   * rail's own pane already says "Nothing picked yet" and says what picking is
   * for; a second empty box under the page would be the same sentence twice,
   * pushing the one obvious action further down the screen.
   */
  if (picked.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg tracking-tight">
          {picked.length === 1 ? "The part you picked" : `The ${picked.length} parts you picked`}
        </h2>
        <button
          type="button"
          onClick={clear}
          className="text-ink-muted hover:text-ink text-xs underline"
        >
          Let them go
        </button>
      </div>

      <ul className="flex flex-col gap-4">
        {picked.map((row) => {
          const excerpt = renderLoomExcerpt(tree, row.nodeId, {
            resolver: portalRegistry,
            validator: portalRegistry,
          })

          return (
            <li key={row.nodeId} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm">
                  {row.label}{" "}
                  <span className="text-ink-muted font-mono text-2xs">{row.nodeId}</span>
                </p>
                <button
                  type="button"
                  onClick={() => pick(row.nodeId)}
                  className="text-ink-muted hover:text-ink text-2xs underline"
                >
                  Let go of {row.label}
                </button>
              </div>

              {excerpt.found ? (
                <div className={EXCERPT}>{excerpt.element}</div>
              ) : (
                <StateNotice tone="notice" title="This part isn't on the page any more.">
                  <p>
                    Something has changed the page since you picked it. Nothing is broken and
                    nothing has been lost — pick it again from the list if it is still there.
                  </p>
                </StateNotice>
              )}

              {excerpt.diagnostics.length > 0 && (
                <TechnicalDetail summary="What Loom couldn't draw here">
                  <ul className="flex flex-col gap-1">
                    {excerpt.diagnostics.map((diagnostic, at) => (
                      <li key={`${diagnostic.code}-${at}`} className="font-mono">
                        {describeRenderDiagnostic(diagnostic)}
                      </li>
                    ))}
                  </ul>
                </TechnicalDetail>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
