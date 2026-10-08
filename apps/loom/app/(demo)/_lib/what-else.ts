import type { DemoPresetId } from "./presets"

/**
 * What the rail has left to say once a change has actually landed — **the end
 * of the sixty seconds, which this surface did not have one of.**
 *
 * ## The screen this exists for
 *
 * Measured on a production build of `main` at `6686895`, 1280 × 900, driven
 * cold through the one sequence the demo invites: press **Take the numbers
 * off**, then **Apply this change**. That is the whole demonstration, and it
 * is about forty seconds in. What is on the rail at the end of it:
 *
 * | | |
 * | --- | --- |
 * | the record card the press produced | `y 44`, **765px** of an 857px scroller |
 * | the ask panel | `y −470` — **above the viewport** |
 * | its three remaining rows | `y −262`, `y −195`, `y −128` — all of them |
 * | the green button the panel nominates next | above the viewport with it |
 * | the footer, with the one way out of the demo | `y 891`, in a rail whose last pixel is **901** |
 *
 * So the surface's answer to *what now?* is a record card and **one pressable
 * control: Put it back** — which undoes the thing the visitor came to see.
 * Everything else the demo offers is off the top of a scroller, in a direction
 * nothing invites, and *Want this on a page of your own? Read the docs* is ten
 * pixels tall.
 *
 * Nothing here is broken. The panel still nominates a lead and still carries a
 * green button; `already-asked.ts` withdrew only the ask that was spent. The
 * visitor cannot see any of it, and a surface whose whole job is sixty seconds
 * of a stranger's attention cannot spend the last twenty of them on a screen
 * with nowhere to go.
 *
 * ## Why a count and a sentence rather than a second panel
 *
 * **Because there is room for exactly one of them.** The card lands at the top
 * of the rail (`arrival.ts`) and is 765 of 857, so what follows it has 92
 * pixels. A duplicate of the ask list does not fit, and a duplicate of the
 * controls is the defect `ask-panel.tsx` opens by arguing against — a rail with
 * two primary actions has none. What does fit is the one line the rail already
 * knows and has never said, and a way back to the controls that exist.
 *
 * **The count is real, like the arrival screen's.** `available` is what
 * `stillToAsk` left after the spent ask was withdrawn, planned against the tree
 * as it stands now — so a visitor who presses the link finds exactly that many
 * rows, and a preset that stopped being applicable is not counted at one end
 * and missing at the other. It is the same discipline `how-many-wait-for-you.ts`
 * holds on the first screen: a number the next press checks.
 *
 * ## And the sentence is the one thing nothing on this surface says
 *
 * The brief's objective is that a stranger understands what Loom does **and why
 * the record matters**. The record is *shown*, completely, and at no point is
 * the second half of that said. Every card speaks about itself — this ask, this
 * verdict, this undo — and a stranger can read the whole sequence as a tool
 * that narrates itself without ever meeting the claim, which is that the
 * account exists whether or not anyone was there to ask for it.
 *
 * It is said **here and nowhere else**, and that is the placement rule rather
 * than a preference: on arrival it would be a promise, and this lane has twice
 * now replaced a promise on the first screen with something the next press
 * checks (`how-many-wait-for-you.ts`, `what-it-will-say.ts`). After a landing
 * it is a caption on evidence the visitor is looking at.
 *
 * ## The three silences
 *
 * - **Nothing has landed.** `landing` is the rail's reading of whether the
 *   revision the page is at was produced by this visitor's own press
 *   (`landed.ts`). Before that there is no loop to have closed, so the arrival
 *   screen is untouched — byte for byte, which is the property this lane
 *   checks.
 * - **A question is still open.** The visitor's next move is the **Apply this
 *   change** under it, and `set-aside.ts` already says what asking for
 *   something else would cost them. A row counting other asks under an open
 *   question is the surface arguing with its own caution.
 * - **Nothing is left to ask.** A link to an empty panel is the silently-dead
 *   control this whole demonstration argues against (`read-the-docs.tsx`). The
 *   sentence goes with it rather than standing alone: it is a caption on the
 *   way on, and there is no way on.
 */

export type WhatElse = {
  /** How many asks are still on offer, which is what the link says. */
  readonly count: number
  /** The claim, in plain words, at the one moment the evidence for it is on screen. */
  readonly sentence: string
  /** The words on the way back to the controls. */
  readonly label: string
}

/**
 * The claim, and every word of it is load-bearing.
 *
 * *The page moved* is the half any demonstration can show. *The reason is
 * written down beside it* is the half that is this project's, and it is said
 * about the card directly above rather than in the abstract. **Whether or not
 * anyone was watching** is the *why*: a record a person has to be present to
 * collect is a log, and a record that exists because the runtime wrote it is
 * the thing you can hand to somebody who was not there.
 *
 * No runtime word in it — no policy, no rule id, no stakes level, no revision.
 * All four are one disclosure away on the card it is a caption for, which is
 * the standing direction for this surface: plain language is the default, the
 * technical record is one click away, nothing is ever removed.
 */
export const WHAT_ELSE_SENTENCE =
  "That is the whole loop. The page moved, and the reason it moved is written down beside it — whether or not anyone was watching."

/**
 * What the way back is called.
 *
 * *more* rather than *other*, because the asks it points at are the ones left
 * after the spent one was taken out — a visitor who has made one change has
 * four more available, not five others.
 *
 * **And "taken out" meant one thing when this was written and means two now.**
 * A removal spends its preset: the numbers are off the page, so
 * `availablePresets` can find nothing for that ask to do and it does not come
 * back. A **toggle** spends nothing — `palette` and `backdrop` are applicable
 * again the moment they are applied, in the other direction — so the list after
 * a one-press change was the same five it was on arrival, and this row said
 * *five more changes to ask for* to a visitor who had just made one of them.
 * Literally true of the list, and read by a stranger as *nothing I did counted*.
 *
 * So what is counted is the asks that would move the page **on**, and an ask
 * that would only put the last change back is not one of them. It is not being
 * hidden: the row is still in the panel, now saying what it does
 * (`what-each-row-says.ts`), and the same press is already offered by name as
 * **Put it back** on the card this row is a caption for. Counting it here would
 * be offering the way back as a way on, which is the one direction this row
 * exists to point.
 */
const labelFor = (count: number): string =>
  count === 1 ? "1 more change to ask for" : `${count} more changes to ask for`

/**
 * **Keyed on the rail's own readings rather than on the records.** Whether a
 * change landed, whether a question is open and which asks survive are three
 * answers the rail has already worked out against the tree and the store
 * together (`landed.ts`, `set-aside.ts`, `already-asked.ts`), and a second
 * reading of the records here would be a fourth opinion free to disagree with
 * all three.
 */
export const whatElseToAsk = ({
  available,
  landing,
  waiting,
  putsBack,
}: {
  readonly available: readonly DemoPresetId[]
  readonly landing?: unknown
  readonly waiting?: unknown
  /**
   * The asks whose press would only put the visitor's last change back
   * (`what-it-will-say.ts`), which are the ones this row must not count.
   */
  readonly putsBack?: ReadonlySet<DemoPresetId>
}): WhatElse | undefined => {
  if (landing === undefined) return undefined
  if (waiting !== undefined) return undefined

  const forward = available.filter((id) => putsBack?.has(id) !== true)
  if (forward.length === 0) return undefined

  return {
    count: forward.length,
    sentence: WHAT_ELSE_SENTENCE,
    label: labelFor(forward.length),
  }
}
