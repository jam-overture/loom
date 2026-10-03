import type { UndoStanding } from "@/app/(portal)/_lib/undoing"
import { hasUndoObstacle } from "@/app/(portal)/_lib/undoing"

/**
 * Why a change cannot be cleanly undone, set where a reader has just been told
 * that it cannot.
 *
 * ## Where it sits, and why that is the whole design
 *
 * Directly under the clause that raises the question. Every line in this portal
 * that mentions undo ends in `this one can't be undone` and then moves on to
 * the next fact, so a reader meets a warning and is given nothing to do with
 * it. This is the sentence that follows it, at the same altitude as the warning
 * rather than behind a disclosure — because *which* of the two obstacles fired
 * decides what the person should do next, and a reader who does not open the
 * disclosure is exactly the reader who most needed to know.
 *
 * The runtime's codes are not here. They go in the technical record on the same
 * card, where every other code already is. That is the governing rule applied
 * once more rather than a judgement call: the words lead, the code is one click
 * down, nothing is dropped.
 *
 * ## It draws nothing for the ordinary case
 *
 * A change the Gate called undoable gets no block at all. The clause above it
 * already says `you could undo it`; a paragraph underneath confirming that
 * nothing is wrong is how a screen gets longer without saying more, and the
 * review queue has three of those per card already.
 *
 * ## The tone is borrowed rather than invented
 *
 * `bg-awaiting` is the mark the portal uses for *somebody has to decide this* —
 * the same one `ReversalNote` puts on a contested undo, which is the nearest
 * neighbour this block has on any screen. It is deliberately not the rejected
 * mark: an irreversible change was not refused, it was handed to a person, and
 * colouring it as a refusal would tell a reader the decision had been made for
 * them.
 */
export const UndoStandingNote = ({ standing }: { readonly standing: UndoStanding }) => {
  if (!hasUndoObstacle(standing)) return null

  return (
    <div className="bg-awaiting text-awaiting-ink flex flex-col gap-1 rounded-sm px-2 py-1">
      {/*
       * The unexplained case is a sentence rather than an entry in the list,
       * because it is a statement about the record and not about the change.
       * A reader given "no reason was recorded" as one bullet among reasons
       * would read it as a third obstacle.
       */}
      {standing.unexplained ? (
        <p className="text-2xs">
          Loom recorded that this change cannot be taken back cleanly and did not record why.
          Nothing has been lost from the page — what is missing is the explanation. Treat it as a
          change you cannot undo.
        </p>
      ) : (
        standing.obstacles.map((obstacle) => (
          <p key={obstacle.technical} className="text-2xs">
            <strong className="font-medium">{obstacle.label}.</strong> {obstacle.meaning}
          </p>
        ))
      )}
    </div>
  )
}
