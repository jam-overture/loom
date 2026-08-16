import { randomIdFactory } from "@loom/runtime"
import { renderLoomTree } from "@loom/runtime/react"

import { isDemoModelConfigured } from "@/lib/demo/interpreter"
import { demoPageTree } from "@/lib/demo/page-tree"
import { availablePresets } from "@/lib/demo/presets"
import { demoRegistry, demoThemes } from "@/lib/demo/registry"
import { demoPolicy, demoSession } from "@/lib/demo/session"
import { readVisitorId } from "@/lib/demo/visitor"
import { describeProposalEffect, type ProposalEffect } from "@/lib/proposal-effect"

import { AskBox } from "./_components/ask-box"
import { RecordCard } from "./_components/record-card"

/**
 * The demo: a page, and the record of how it got that way, side by side.
 *
 * Public on purpose. It is the one surface here whose job is to be looked at by
 * someone who has not been given an account, and it holds nothing worth
 * guarding — no portal store, no identity, no telemetry journal. A visitor's
 * whole session is a tree in memory that expires with the instance.
 *
 * The page on the left is not a screenshot, a video or a mock. It is a `LoomTree`
 * rendered through the runtime with the starter primitives resolving it, and
 * every change the rail records actually moved it.
 */
const DemoPage = async () => {
  const visitorId = await readVisitorId()
  const session = visitorId === undefined ? undefined : await demoSession(visitorId)
  const head = session === undefined ? undefined : await session.store.head(session.seed.treeId)

  /**
   * A visitor who has changed nothing has no session yet, and is shown the same
   * pristine tree a session would have been seeded with. Building it here rather
   * than creating a session on a read keeps a page view from allocating memory
   * on the instance — a crawler should cost nothing.
   */
  const tree = head?.ok ? head.value : demoPageTree()
  const rendered = renderLoomTree(tree, {
    resolver: demoRegistry,
    validator: demoRegistry,
    themes: demoThemes,
  })

  const records = session?.records ?? []

  /**
   * What each waiting proposal would replace, read against the tree on the left.
   *
   * Only the held ones. A record whose change already applied describes a tree
   * that no longer exists, so resolving its delta against the current one would
   * produce a confident and wrong "before" — the history view is where an
   * applied change is read, against the revision it was applied to.
   */
  const holds = session === undefined ? undefined : await session.holds.forTree(tree.treeId)
  const effects = new Map<string, ProposalEffect>(
    (holds?.ok ? holds.value : []).map((held) => [
      held.proposalId,
      describeProposalEffect(tree, held.proposal.delta),
    ])
  )

  /** Absent rather than `undefined`: the prop is optional, not nullable. */
  const effectProps = (record: (typeof records)[number]): { readonly effect?: ProposalEffect } => {
    const found = record.heldProposalId === undefined ? undefined : effects.get(record.heldProposalId)

    return found === undefined ? {} : { effect: found }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:h-[calc(100vh-3.5rem)] lg:flex-row">
      <div className="bg-surface-preview min-w-0 flex-1 overflow-y-auto">{rendered.element}</div>

      <aside className="border-edge-subtle bg-surface-page flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-t p-4 lg:w-[26rem] lg:border-t-0 lg:border-l">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg tracking-tight">ask this page to change</h1>
          <p className="text-ink-muted text-xs">
            Nothing here is markup. The page is a tree of registered primitives, and every change
            below was proposed, weighed and recorded before it landed.
          </p>
          <dl className="text-ink-muted mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-2xs">
            <div className="flex gap-1">
              <dt>revision</dt>
              <dd className="text-ink">{tree.revision}</dd>
            </div>
            <div className="flex gap-1">
              <dt>policy</dt>
              <dd className="text-ink">{demoPolicy.policyId}</dd>
            </div>
            <div className="flex gap-1">
              <dt>theme</dt>
              <dd className="text-ink">{rendered.theme?.palette.id ?? "none"}</dd>
            </div>
          </dl>
        </header>

        <AskBox
          revision={tree.revision}
          available={availablePresets(tree, randomIdFactory)}
          modelConfigured={isDemoModelConfigured}
        />

        {rendered.diagnostics.length > 0 && (
          <p className="bg-inapplicable text-inapplicable-ink rounded-md p-2 text-2xs">
            {rendered.diagnostics.length} render diagnostic
            {rendered.diagnostics.length === 1 ? "" : "s"} — the tree named something this surface
            could not honour.
          </p>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-ink-muted text-2xs tracking-wide uppercase">the record</h2>

          {records.length === 0 ? (
            <p className="border-edge-subtle text-ink-muted rounded-md border border-dashed p-3 text-xs">
              Ask for something. What appears here is the proposal, its rationale and provenance, the
              stakes and reversibility the Gate weighed, which rule decided it under which policy, the
              revision it produced, and an undo that is a real change rather than a rewind.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {records.map((record) => (
                <RecordCard key={record.recordId} record={record} {...effectProps(record)} />
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  )
}

export default DemoPage
