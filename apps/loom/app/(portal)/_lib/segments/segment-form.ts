import {
  applyDelta,
  type DeltaId,
  type LoomTree,
  type ProposalId,
  type TreeOperation,
} from "@jam-overture/loom"
import type { AudienceForm, AudienceId } from "@jam-overture/loom/store"

import type { SegmentChange } from "./segment-changes"

/**
 * Each segment's form of one page, built from the changes accepted for it
 * (0386 clauses 5 and 6). Pure.
 *
 * A form is one delta against the page as it is live, so every segment's
 * changes are applied again, oldest first, to that page whenever it moves. A
 * change whose operations no longer apply, on top of the ones before it, is
 * dropped from its segment's form and named, and the ones after it go on
 * without it, which is what 0358 clause 6 does for a change for everyone when a
 * newer version of the site's page arrives.
 *
 * A segment none of whose changes fit has no form here. The row 0376's store
 * holds for it is then behind the page, and the site serves that segment's
 * readers the page as it is for everyone (0392 clause 4).
 */
export type SegmentForms = {
  /** In the order each segment first had a change accepted for it. */
  readonly forms: readonly AudienceForm[]
  readonly dropped: readonly ProposalId[]
}

type Folding = {
  readonly operations: readonly TreeOperation[]
  readonly dropped: readonly ProposalId[]
}

/** One segment's operations that still apply to the page, in order, and the changes that do not. */
const foldOnto = (live: LoomTree, changes: readonly SegmentChange[], deltaId: DeltaId): Folding =>
  changes.reduce<Folding>(
    (folding, change) => {
      const operations = [...folding.operations, ...change.operations]
      const applies = applyDelta(live, {
        deltaId,
        treeId: live.treeId,
        baseRevision: live.revision,
        operations,
      })

      return applies.ok
        ? { ...folding, operations }
        : { ...folding, dropped: [...folding.dropped, change.proposalId] }
    },
    { operations: [], dropped: [] }
  )

/** The segments in the order their first change was accepted. */
const segmentsOf = (changes: readonly SegmentChange[]): readonly AudienceId[] => [
  ...new Set(changes.map((change) => change.audienceId)),
]

/**
 * Every segment's form of `live`, from the changes still standing, oldest
 * accepted first. `deltaId` mints each form's id.
 */
export const segmentFormsOn = (
  live: LoomTree,
  changes: readonly SegmentChange[],
  deltaId: () => DeltaId
): SegmentForms =>
  segmentsOf(changes).reduce<SegmentForms>(
    (built, audienceId) => {
      const id = deltaId()
      const folded = foldOnto(
        live,
        changes.filter((change) => change.audienceId === audienceId),
        id
      )
      const form: readonly AudienceForm[] =
        folded.operations.length === 0
          ? []
          : [
              {
                audienceId,
                delta: {
                  deltaId: id,
                  treeId: live.treeId,
                  baseRevision: live.revision,
                  operations: folded.operations,
                },
              },
            ]

      return { forms: [...built.forms, ...form], dropped: [...built.dropped, ...folded.dropped] }
    },
    { forms: [], dropped: [] }
  )
