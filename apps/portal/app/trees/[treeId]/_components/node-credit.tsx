import type { NodeCredit } from "@/lib/attribution-view"

/**
 * Who put the selected node here.
 *
 * Its own component because the selection pane already had one job — saying what
 * a click addresses — and attribution is a second one. They share a selection
 * and nothing else.
 *
 * A credit with no revision links nowhere, which is the honest rendering of both
 * cases that produce one: a node the seed carried was placed by nobody, and a
 * node the walk did not reach was placed by somebody this page cannot name.
 */
export const NodeCreditLine = ({ credit }: { readonly credit: NodeCredit | undefined }) => {
  if (!credit) return null

  return (
    <div className="border-edge-subtle flex flex-col gap-1 border-t pt-2">
      <p className={credit.partial ? "text-ink-muted italic" : "text-ink-muted"}>{credit.placed}</p>
      {credit.since && <p className="text-ink-muted">{credit.since}</p>}
    </div>
  )
}
