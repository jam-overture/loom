"use client"

import { type LoomTree } from "@loom/runtime"
import { describeRenderDiagnostic, renderLoomTree } from "@loom/runtime/react"
import { useState } from "react"

import { docsExamples } from "@/app/(docs)/_lib/examples/catalogue"
import { docsRegistry, docsThemes } from "@/app/(docs)/_lib/loom/registry"

import { ProposalBox } from "./proposal-box"

/**
 * An example, rendered — and changeable.
 *
 * What is inside the frame is not a screenshot, an iframe or a copy of the
 * output. It is `renderLoomTree` walking the same tree the catalogue holds,
 * through the same registry a host would use, with the same theme resolution —
 * so the page a reader is looking at is the claim the prose is making.
 *
 * **Why this is a client component.** §4c settles that every example has a
 * working propose-a-change box beside it, and a change produces a *new tree*
 * that has to be rendered. The tree therefore lives in React state and the walk
 * happens wherever the state does. The cost is real and worth naming: the
 * starter library ships to the browser on any page with an example on it. The
 * thing bought with it is that the whole runtime — interpret, analyse, weigh,
 * judge, apply — runs in front of the reader with no server, no key and no
 * session, which is what makes it work on a preview deployment and in a clone.
 *
 * The first render is still server-rendered and hydrates cleanly, because
 * building a tree is deterministic: the same id factory, the same counters, the
 * same bytes. Nothing here reads a clock until a reader clicks something.
 *
 * An unknown id throws rather than rendering an empty frame. A page that names
 * an example nobody wrote is a broken page, and the build is the right place to
 * find that out; `content.test.ts` finds it earlier still.
 *
 * Diagnostics are shown rather than swallowed. A render that could not honour
 * something the tree said is the most interesting thing on the page when it
 * happens, and a documentation site that hid it would be teaching the reader
 * that it cannot happen.
 */
export const Example = ({ id, interactive = true }: { readonly id: string; readonly interactive?: boolean }) => {
  const example = docsExamples.get(id)

  if (example === undefined) {
    throw new Error(`loom: no documented example is registered as "${id}"`)
  }

  const [tree, setTree] = useState<LoomTree>(example.build)
  /**
   * Revision 0, held apart from the tree that moves.
   *
   * The propose-a-change box opens a store on it and the revert planner replays
   * the log from it (0028), so it has to be the *same* tree the log's first
   * entry applied to. Building it a second time would produce an equal one —
   * every example is built by a deterministic id factory — and relying on that
   * would make an invariant of what is currently a convenience.
   */
  const [seed] = useState<LoomTree>(example.build)
  const changed = tree.revision > 0

  const rendered = renderLoomTree(tree, {
    resolver: docsRegistry,
    validator: docsRegistry,
    themes: docsThemes,
  })

  return (
    <figure className="not-prose my-8 flex flex-col gap-0" data-example={example.id}>
      <div className="border-edge bg-surface-sunken flex items-center justify-between gap-3 rounded-t-lg border px-3 py-2">
        <span className="text-ink-muted text-xs font-medium">{example.title}</span>
        <span className="text-ink-faint font-mono text-[0.65rem] tracking-wide uppercase">
          {changed ? `live · revision ${tree.revision}` : "live · rendered through the runtime"}
        </span>
      </div>

      {/*
       * A viewport onto the page, not the page. Every example is rooted at
       * `loom.page` — that is the primitive that mounts a theme — and a page is
       * a page: it brings its own vertical rhythm, and a tall one would push
       * the prose that explains it off the screen. Capping the height and
       * letting it scroll shows the real render at its real size rather than a
       * shrunken one.
       */}
      <div className="border-edge bg-surface-page max-h-[32rem] overflow-auto border-x border-b px-2 py-4 sm:px-4">
        {rendered.element}
      </div>

      {rendered.diagnostics.length > 0 && (
        <ul className="border-edge bg-warning-surface text-warning-ink border-x border-b px-3 py-2 text-xs">
          {rendered.diagnostics.map((diagnostic, index) => (
            <li key={index}>{describeRenderDiagnostic(diagnostic)}</li>
          ))}
        </ul>
      )}

      {interactive && (
        <ProposalBox
          exampleId={example.id}
          tree={tree}
          seed={seed}
          onTree={setTree}
          changed={changed}
          onReset={() => setTree(seed)}
        />
      )}

      <details className="border-edge bg-surface-sunken group rounded-b-lg border-x border-b">
        <summary className="text-ink-muted cursor-pointer list-none px-3 py-2 text-xs select-none">
          <span className="group-open:hidden">show the tree</span>
          <span className="hidden group-open:inline">hide the tree</span>
        </summary>
        <pre className="text-ink overflow-x-auto px-3 pb-3 font-mono text-xs leading-relaxed">
          {JSON.stringify(tree.root, null, 2)}
        </pre>
      </details>

      <figcaption className="text-ink-muted mt-2 text-sm">{example.caption}</figcaption>
    </figure>
  )
}
