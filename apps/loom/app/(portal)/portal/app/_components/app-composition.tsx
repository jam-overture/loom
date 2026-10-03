"use client"

import Link from "next/link"
import { useState } from "react"

import type { LoomTree, NodeId, TreeId } from "@jam-overture/loom"
import { describeRenderDiagnostic, renderLoomExcerpt } from "@jam-overture/loom/react"

import { ListOrder } from "@/app/(portal)/_components/list-order"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { OutlineRow } from "@/app/(portal)/_lib/outline"
import type { PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"
import { inPageOrder } from "@/app/(portal)/_lib/page-order"
import { pageViewHref } from "@/app/(portal)/_lib/page-views"
import { portalRegistry } from "@/app/(portal)/_lib/registry"

/**
 * The app, as the tree it is actually built as — and any part of it, drawn.
 *
 * ## What the maintainer asked for, in his words
 *
 * > *"Within each app, which components are registered as primitives. I should
 * > be able to see this as the literal tree they are constructed as. First as a
 * > base tree for my app… I should be able to select one or many primitives and
 * > see how they are rendered."*
 *
 * Both halves existed one floor down and neither existed at the top. The page
 * screen has an outline and a picked-parts pane **for one page**; the pieces
 * screen has the catalogue **with no pages in it**. Nothing put the app's own
 * structure on one screen, so the only way to learn what a deployment was built
 * from was to open each page in turn and remember.
 *
 * So the tree here has one more level than the page screen's does: **the app is
 * the root, each page is a branch, and the parts are the leaves.** That is
 * literally the tree the pages are constructed as, which is what was asked for,
 * and it is the level at which the question *which pieces am I actually using*
 * can be answered at all.
 *
 * ## Selection spans pages, so a key is not a node id
 *
 * Node ids are minted per tree, so two pages can hold the same one and a
 * selection keyed on it would light up a row on a page the reader never touched.
 * The key is the page and the part together. It costs one `split` and removes a
 * class of bug that would be invisible on a deployment with one page — which is
 * every deployment this portal has ever been photographed on.
 *
 * ## The render happens in the browser, and the argument is `picked-parts.tsx`'s
 *
 * One copy of each drawn page's tree goes down with the screen and every pick
 * after that is free. The alternatives are pre-rendering every row's excerpt on
 * the server — the page's markup once per level of nesting, per page — or a
 * round trip per click on a pane whose whole point is that picking is instant.
 * The third is only available because the render seam is pure (0008), and 0018
 * is satisfied because this reaches the framework exactly where a host does.
 *
 * **The options are the page screen's own** — a resolver and a validator and
 * nothing else — so a part drawn here looks like the same part drawn there. A
 * band that reads a data source draws empty in both. When the page screen
 * resolves more, this inherits it by reading the same registry.
 *
 * ## It arranges its own pages, in the file that renders them
 *
 * By name, which is the portal's shared tiebreak and the right top for a list
 * with no urgency in it: this is a structure, not a queue, and a page is not more
 * interesting here for having something waiting on it. The sort is here rather
 * than on the server because `every-page-list.test.ts` holds a rule worth
 * keeping honest — **a list of pages decides its own order rather than rendering
 * the store's** — and a list whose order was chosen one file up is a list that
 * cannot be read for whether it chose one. `inPageOrder` is pure and the cost is
 * a sort of at most twelve rows.
 *
 * ## Only a part the page draws an element for can be picked
 *
 * The words inside a part are a part of the tree and are not a *piece*: nothing
 * registered them, they have no type, and an excerpt of one is the sentence you
 * are already reading in the row above it. They are in the tree because leaving
 * them out would make the tree a different shape from the page, and they are not
 * buttons because there is nothing behind the button.
 */

const keyOf = (treeId: string, nodeId: NodeId): string => `${treeId}:${nodeId}`

/**
 * Page content, on the surface the page's own preview uses, with a ceiling.
 *
 * The same box `picked-parts.tsx` uses, for the same reason: `bg-surface-preview`
 * is the colour a reader has learned means *this is your page and not us*, and a
 * part of a page is as tall as it likes, so it scrolls rather than being cut off
 * with no way to see the rest.
 */
const EXCERPT = "border-edge-subtle bg-surface-preview max-h-96 overflow-auto rounded-md border p-4"

export type CompositionPage = {
  readonly treeId: TreeId
  readonly name: PageNameValue
  readonly tree: LoomTree
  readonly rows: readonly OutlineRow[]
}

const Excerpt = ({ page, nodeId }: { readonly page: CompositionPage; readonly nodeId: NodeId }) => {
  const { element, found, diagnostics } = renderLoomExcerpt(page.tree, nodeId, {
    resolver: portalRegistry,
    validator: portalRegistry,
  })

  const row = page.rows.find((candidate) => candidate.nodeId === nodeId)

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h3 className="text-sm font-medium">{row?.label ?? "This part"}</h3>
        {row?.technical !== null && row?.technical !== undefined && (
          <span className="text-ink-muted font-mono text-xs">{row.technical}</span>
        )}
        <span className="text-ink-muted text-xs">
          on <Link href={pageViewHref("page", page.treeId)}>{page.name.name}</Link>
        </span>
      </header>

      {found ? (
        <div className={EXCERPT}>{element}</div>
      ) : (
        /*
         * Reachable rather than defensive: the tree came down with the screen and
         * a change can land underneath a reader who left a part picked. `found`
         * is the seam's own answer, which is why this does not scan diagnostics
         * for it.
         */
        <StateNotice tone="notice">
          <p>
            This part isn&rsquo;t on the page any more — it was changed or taken away while you
            were looking. Pick it again from the list above.
          </p>
        </StateNotice>
      )}

      {diagnostics.length > 0 && (
        <TechnicalDetail summary="What the runtime could not draw">
          <ul className="flex flex-col gap-1">
            {diagnostics.map((diagnostic, index) => (
              <li key={index} className="font-mono">
                {describeRenderDiagnostic(diagnostic)}
              </li>
            ))}
          </ul>
        </TechnicalDetail>
      )}
    </section>
  )
}

export const AppComposition = ({ pages }: { readonly pages: readonly CompositionPage[] }) => {
  const [picked, setPicked] = useState<readonly string[]>([])

  const toggle = (key: string): void =>
    setPicked((held) =>
      held.includes(key) ? held.filter((candidate) => candidate !== key) : [...held, key]
    )

  const ordered = inPageOrder(pages, (page) => ({ rank: 0, page: page.name }))

  /**
   * Resolved out of the rows rather than parsed back out of the keys, which buys
   * two things and costs a walk of at most twelve small lists.
   *
   * A `NodeId` is a branded string, so splitting a key would hand back a plain
   * one and need a cast — and a cast is a claim the compiler stops checking, on
   * exactly the value this component addresses the tree with. The rows hold the
   * real ones.
   *
   * And the excerpts come out in **document order** rather than in the order the
   * reader happened to click. A set of parts has no arrangement of its own
   * (0199), and page order is the one arrangement that is not invented — the same
   * rule `picked-parts.tsx` keeps one floor down.
   */
  const chosen = ordered.flatMap((page) =>
    page.rows.flatMap((row) => {
      const key = keyOf(page.treeId, row.nodeId)

      return picked.includes(key) ? [{ key, page, nodeId: row.nodeId }] : []
    })
  )

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-lg tracking-tight">How your app is put together</h2>
          {picked.length > 0 && (
            <button
              type="button"
              onClick={() => setPicked([])}
              className="text-ink-muted text-xs underline"
            >
              Clear {picked.length} picked
            </button>
          )}
        </div>
        <p className="text-ink-muted text-sm">
          Every page, and every piece inside it. Pick one or more to see them drawn on their own.
        </p>

        <ListOrder order="by-name" />

        <ul className="border-edge-subtle bg-surface-base flex flex-col rounded-md border p-2">
          {ordered.map((page) => (
            <li key={page.treeId} className="flex flex-col">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-2 py-1.5">
                <Link href={pageViewHref("page", page.treeId)} className="text-sm font-medium">
                  {page.name.name}
                </Link>
                <span className="text-ink-muted font-mono text-xs">{page.name.treeId}</span>
              </div>

              <ul className="flex flex-col">
                {page.rows.map((row) => {
                  const key = keyOf(page.treeId, row.nodeId)
                  const on = picked.includes(key)

                  return (
                    <li
                      key={key}
                      style={{ paddingLeft: `${(row.depth + 1) * 14}px` }}
                      className="flex"
                    >
                      {row.kind === "element" ? (
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggle(key)}
                          className={
                            "flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-sm px-2 py-1 text-left text-xs " +
                            (on ? "bg-nav-active text-ink" : "hover:bg-surface-hover")
                          }
                        >
                          <span>{row.label}</span>
                          <span className="text-ink-muted font-mono">{row.technical}</span>
                        </button>
                      ) : (
                        /*
                         * Words, shown and not offered. They are part of the tree
                         * and they are not a piece — nothing registered them, so
                         * there is nothing to draw on its own and nothing a
                         * button could lead to.
                         */
                        <span className="text-ink-placeholder px-2 py-1 text-xs">{row.label}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {chosen.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg tracking-tight">
            {chosen.length === 1 ? "The piece you picked" : `The ${chosen.length} pieces you picked`}
          </h2>
          {chosen.map((one) => (
            <Excerpt key={one.key} page={one.page} nodeId={one.nodeId} />
          ))}
        </section>
      )}
    </div>
  )
}
