import type { IdFactory, LoomTree } from "@jam-overture/loom"

import { partFromOperations, type PartInQuestion } from "./in-question"
import type { DemoPreset } from "./presets"

/**
 * The part of the page the one invited press is about, before it is pressed.
 *
 * **The demo's primary control can name a part of the page a stranger has
 * never laid eyes on.** *Take the numbers off* is an instruction about a stat
 * band that is below the fold at 1280×900 and about four thousand pixels down
 * at 390×844. A green button, a promise about *"the appointments, the years
 * and the waiting time"*, and no appointments, years or waiting time anywhere
 * on the screen asks a stranger to take somebody's word for what they are
 * about to remove.
 *
 * **It draws on the second press rather than the first, as of this run, and
 * the reason is the same reason.** The demo now opens with the re-theme
 * (`DEMO_OPENING_PRESET`), whose single operation configures the root — so
 * `partFromOperations` refuses it, by the rule it already had, and the arrival
 * screen has no preview under its button. That is right rather than a gap: the
 * part that press is about is the page, and the page is the other half of the
 * screen. The preview returns with the removal when the Gate's ask takes the
 * green button, which is exactly the press that names something out of sight.
 *
 * `in-question.ts` argued exactly this and fixed it one step too late:
 *
 * > So a stranger on a phone is asked, personally, to allow a change to a part
 * > of a page they have never laid eyes on […] **A part of a page is data, so
 * > it can be brought to the question instead.**
 *
 * It can be brought to the *ask* the same way, and for a better reason: a
 * question is something the visitor has already decided to have, and an ask is
 * the decision. The band under the button is the only thing on the arrival
 * screen that is the page rather than a sentence about the page, and it is the
 * thing the press will act on.
 *
 * ## Why this is not a mock, a screenshot or a second copy
 *
 * A preset is a deterministic interpreter
 * ([0057](../../../../../decisions/0057-a-preset-is-a-deterministic-interpreter.md)),
 * and its plan is computed from the tree on the stage. So the operations this
 * reads are the operations the press will produce — not a rehearsal of them —
 * and the node they name is looked up in the tree the page is rendering.
 * Re-theme the page and the preview re-themes; move the band and the preview
 * moves with it; take the band off and there is no preset left to lead with, so
 * the preview goes with the button.
 *
 * It costs no model call, which is the whole reason the default path is presets
 * at all: the demo must work with no API key configured, and an arrival screen
 * that only shows the page when a key is present is the failure the lane's
 * brief names by name.
 *
 * ## One, and the leading one
 *
 * The four secondary asks get nothing. That is `FIRST` in `in-question.ts`
 * applied to a list rather than to a delta, for the same reason it gives —
 * *three previews stacked inside a question is a quiz* — and five would be
 * worse. What the secondary asks have is a promise each, which is what a list
 * of alternatives needs; what the primary ask needed was the thing itself.
 */
export const partTheAskWouldTouch = (
  tree: LoomTree,
  ids: IdFactory,
  preset: DemoPreset
): PartInQuestion | undefined => {
  /**
   * The plan, which is `undefined` when this tree gives the preset nothing to
   * do — and `availablePresets` has already filtered those out, so this is the
   * second of two readings that must agree and the cheap one to get wrong.
   * Planned again rather than passed in: a plan is a pure function of the tree
   * (0057) and re-planning is how every other caller here avoids holding one.
   */
  const operations = preset.plan(tree, ids)

  return operations === undefined ? undefined : partFromOperations(tree, operations, "ask")
}
