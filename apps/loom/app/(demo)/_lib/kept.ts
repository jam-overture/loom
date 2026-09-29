import type { LoomTree } from "@jam-overture/loom"

import { partFromOperations, type PartInQuestion } from "./in-question"
import type { ChangeRecord } from "./record"

/**
 * What a change took off the page, still there, on the card that took it.
 *
 * ## The claim this closes, and why it was the one a stranger never reached
 *
 * The demo's brief names three things to show: the page adapting, the record of
 * it, **and the inverse, as a button that really puts it back.** The first two
 * are on the arrival screen or one press from it. The third was three presses
 * in, and this lane measured the sequence on 27 September:
 *
 * | press | what they meet | seconds |
 * | --- | --- | --- |
 * | 1 — *Take the numbers off* | the Gate's question about the band | ~15 |
 * | 2 — *Apply this change* | the band goes, the page is marked, the card is a receipt | ~35 |
 * | 3 — *Put it back* | the band returns, node for node, with the ids it had | **past the minute** |
 *
 * So the sentence the whole record exists to support — *the exact opposite of
 * this change already exists* — was the one claim a visitor was **told** rather
 * than shown. The card says it well, in the Gate's own language, before the
 * second press: *"The 4 pieces it takes off the page are kept, so the exact
 * opposite of this change already exists"* (`weighed.ts`). It is the right
 * sentence in the right place and it is still a sentence.
 *
 * **This is that sentence with the four pieces under it.** No fourth control,
 * no animation, and not another press: the same presses, and the second one now
 * produces the proof instead of promising it. The finding that filed this asked
 * for exactly that shape and named this one as the version that does not cost a
 * press — *the excerpt outlives the change*.
 *
 * ## Why it is the nodes and not a picture of them
 *
 * `assessReversibility` computes the inverse up front, whether or not anybody
 * undoes anything, saying why: *"can this be undone" is answered by handing
 * over the thing that undoes it.* For a removal that inverse is an **insert
 * carrying the removed node** — parent, position, props, children and all —
 * because there is nowhere else for the content to have gone. `retainedNodeCount`
 * is the count of it and this surface has been printing the count since it was
 * built.
 *
 * So the excerpt here is rendered from the record's own inverse, through the
 * same registry the stage resolved, wearing the same theme. It is not a copy of
 * the band kept beside the page: there is no copy of the clinic's page anywhere
 * in this repository. It is the content the runtime is holding so that the undo
 * can be real, drawn once so a visitor can see that it is.
 *
 * **Which makes it the one excerpt on this surface that is not also on the
 * stage.** A question's preview and an ask's preview are both second renderings
 * of something the page still has — worth it because on a phone it is four
 * thousand pixels away, and exempted on a wide screen for exactly that reason
 * (`globals.css`). This one is on no screen at any width, because the change
 * has happened. That is the whole argument, and it is why the wide-screen
 * exemption must not be extended to it.
 *
 * ## What it refuses, and what does the refusing
 *
 * Nothing here holds state and nothing here is withdrawn by a press. The two
 * conditions below are facts about the record, and `in-question.ts` carries the
 * two that are facts about the tree — chiefly that the node must not be on the
 * page. Between them they mean the excerpt disappears the moment the undo lands,
 * because the node comes back with the id it had (0032) and the tree can then
 * find it.
 */

/**
 * The part a landed change is still holding, or nothing.
 *
 * **Applied only.** A held change has taken nothing off the page yet and its
 * card already shows the band, in the conditional, above the two buttons
 * deciding it (`partInQuestion`). A refused or discarded one removed nothing,
 * so there is nothing kept and the record says so.
 *
 * **And only where the record reached assessment**, which is the same condition
 * `weighedOf` is absent under: an ask no interpreter could make a delta from has
 * no inverse, and there is nothing to have kept.
 *
 * The rest of the refusing is `partFromOperations`' — including the one that
 * matters most here, that the tree must not already have the node. That is what
 * makes this a pure reading of the page as it stands rather than a flag
 * somebody has to remember to clear: press *Put it back*, allow it, and the
 * band is on the stage again with its own ids, so this returns nothing and the
 * excerpt goes with the offer it stood over.
 */
export const partTheRecordKept = (
  tree: LoomTree,
  record: ChangeRecord
): PartInQuestion | undefined => {
  if (record.outcome !== "applied") return undefined

  const inverse = record.reversibility?.inverse
  if (inverse === undefined) return undefined

  return partFromOperations(tree, inverse, "kept")
}
