import type { ChangeInterpreter } from "../runtime/interpreter.js"
import type { CompositionRuntime } from "../runtime/pipeline.js"

/**
 * The runtime a change the runtime computed is judged under.
 *
 * An undo and a reseed are both changes nothing interpreted: the operations are
 * derived, and what reaches the Gate is a proposal wearing a deterministic
 * interpreter instead of a model (`inverseInterpreter`). Both therefore want the
 * same thing from the host's runtime — every seam that *judges* a change, and
 * not the one that would offer a smaller version of it.
 *
 * ## Why this is a function and not two object literals
 *
 * `revertRevision` built its runtime field by field, and the comment above it
 * said why: dropping the repairer should be a statement rather than an omission.
 * That reasoning was right about the repairer and wrong about the method, and the
 * difference only showed when `CompositionRuntime` grew. `propsVocabulary` and
 * `bindingReader` arrived afterwards (0179, 0208), and a literal that names five
 * fields does not fail to compile when a sixth appears — it silently stops
 * passing it.
 *
 * So every undo was judged as though the host had wired neither check. Two
 * consequences, and the second is worse than the first:
 *
 * - a deployment that refuses AI-authored props its own schemas reject did not
 *   refuse them on the undo path, which is a real hole in a real check;
 * - `Disposition.wiredChecks` recorded the undo as judged with both seams
 *   absent, which is **0248's point inverted**. That field exists because the
 *   policy fingerprint cannot see a seam, so wiring one has to leave a record of
 *   the day it was wired. A record saying a wired check was not wired is worse
 *   than no record, because a later reading of the log cannot tell it from the
 *   truth.
 *
 * Nothing was failing. Nothing was going to start failing on its own, either:
 * the drop is invisible to every test that does not wire a vocabulary *and* then
 * undo something, and it would have been copied into the reseed path by anybody
 * reading the revert path as the pattern — which is exactly what this run set
 * out to do.
 *
 * ## How the drop is made impossible rather than remembered
 *
 * The repairer is removed by name and everything else is carried by the rest
 * element, so the statement is still a statement — `repairer` is written down,
 * right here, as the one field a computed change does not get — while a seventh
 * seam on `CompositionRuntime` reaches the Gate on the day it lands without
 * anybody editing this file.
 *
 * Repair (0006) exists to let a model try a smaller version of what the Gate
 * refused, and there is no smaller version of putting something back. A computed
 * change the Gate refuses is refused.
 */

/**
 * The host's runtime, with every judging seam carried and the repairer dropped.
 *
 * `repairer` is removed by name and the rest is spread, so the omission is still
 * written down while a seam added to `CompositionRuntime` tomorrow reaches the
 * Gate without anybody editing this file.
 */
export const computedChangeRuntime = (
  runtime: CompositionRuntime,
  interpreter: ChangeInterpreter
): CompositionRuntime => {
  const { repairer: _norepair, ...judging } = runtime

  return { ...judging, interpreter }
}
