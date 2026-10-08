"use client"

import type { ReactNode } from "react"
import { useActionState } from "react"

import { offeredPresets, presetById, type DemoPresetId } from "@/app/(demo)/_lib/presets"
import { toneClasses, type WriteReport } from "@/app/(demo)/_lib/report"
import {
  ASKS_HEADING,
  ASKS_HEADING_WHILE_WAITING,
  type SetAside,
} from "@/app/(demo)/_lib/set-aside"
import { howManyWaitForYou } from "@/app/(demo)/_lib/how-many-wait-for-you"
import { promiseOf, STANDING_ROW } from "@/app/(demo)/_lib/what-each-row-says"
import type { AskVerdicts } from "@/app/(demo)/_lib/what-it-will-say"

import { askForChange } from "../actions"

/**
 * Where a visitor asks for something, and — the part that was missing — where
 * they are told what to press.
 *
 * The first version offered five identical grey pills above a text box, in a
 * rail whose heading was smaller than the specimen page's body copy. Everything
 * on it was equally weighted, so nothing was an invitation: a stranger with
 * sixty seconds had no first move, and the most prominent control was a
 * textarea that is *disabled* on a deployment with no model key.
 *
 * So this panel has exactly one primary action and says out loud what pressing
 * it will do to the page. The other four are secondary and carry the same
 * promise in smaller type. The free-text box is last, because it is the one
 * thing here that can be unavailable, and a surface that leads with the control
 * it might not have is a surface that fails on its own front door.
 *
 * **Which one is primary is `presets.ts`'s call** (`DEMO_LEADING_PRESET`), and
 * the reasoning is there because it is a claim about the table rather than
 * about this markup. What this file owes it is the sentence above the buttons:
 * the lead is now a change the Gate *holds*, so the panel has to say before the
 * first press that some asks wait for an answer, or the first press reads as a
 * button that did nothing.
 *
 * Two ways in, and they are not two systems. A chip posts a preset id and the
 * change is computed from the tree; the box posts a sentence and a model
 * interprets it. Everything after that point — assessment, Gate, application,
 * log — is the same code, which is the claim the demo is making and the reason
 * the chips are not a scripted animation.
 *
 * The revision the visitor was looking at travels with the ask. That is not
 * client authority: it is the client saying what it saw, so the server can
 * refuse a change aimed at a page that has moved.
 *
 * **The panel has a second state, and it is the one a stranger reaches on their
 * second press.** Once an ask is waiting on an answer, every control here moves
 * the page on and kills it — so the panel says so before the press, offers the
 * way down to the open question, and gives up its green button to the one under
 * that question. `set-aside.ts` owns both the words and the measurement they are
 * for.
 */

/**
 * What is true of every button on this panel, said once, and always on the
 * same screen as the press it is about.
 *
 * *Above* them on a wide screen and *under* the primary one on a narrow screen,
 * which the block that renders it argues at length. What is invariant, and what
 * every reason below is actually about, is that a visitor has met this sentence
 * before they have scrolled anywhere.
 *
 * This is the line that makes the primary control legible, and it had to be
 * added the moment the lead became a change the Gate holds
 * (`DEMO_LEADING_PRESET`). Press *Take the numbers off* without it and the page
 * does not move: a stranger has pressed the one thing this surface invited them
 * to press and watched nothing happen, which reads as a broken button for the
 * two seconds before they find the amber card. Told first that some asks wait
 * for them, the same two seconds read as the product working.
 *
 * It says *some* and never *which*, for the reason `presets.ts` gives about
 * every promise on this panel: the verdict is computed at assessment time
 * against the tree as it stands, and a surface that predicted it would be wrong
 * the first time the policy or the page moved.
 *
 * It is also where "the record" now enters the demo, because the sentence it
 * replaced in the rail's header was an abstract list of what a record contains —
 * and this one lands three inches above the first card, which is the moment it
 * becomes true rather than promised.
 */
const WHAT_EVERY_ASK_MEETS =
  "Loom weighs every ask before it lands: some changes it makes on its own, some it won’t make without asking you first. Either way, it writes down what it did."

/**
 * The same claim, less the hedge — for the screen where the hedge has been
 * replaced by the truth about the button under it.
 *
 * **Nothing is removed and this is not a second voice.** The sentence above
 * does two jobs: it says Loom weighs every ask and writes down what it did,
 * which is the claim; and it says *some* asks wait for you, which is a hedge
 * standing in for a fact the surface could not state. `what-it-will-say.ts`
 * can state it — for the one ask this panel invites, computed by the Gate
 * itself — so on that screen the hedge is three lines of *maybe* directly
 * above a line of *this one will*. The claim stays; the stand-in goes.
 *
 * It is not deleted, because a deployment can still have nothing to foretell:
 * an ask the tree gives nothing to do, or a panel with no leading ask at all,
 * gets the full sentence exactly as it has always had it. Both are asserted,
 * and `ask-panel.test.tsx` holds the property that matters either way — a
 * visitor meets the claim before they meet anything to press.
 */
const WHAT_EVERY_ASK_MEETS_BRIEFLY =
  "Loom weighs every ask before it lands, and writes down what it did."

export const AskPanel = ({
  revision,
  available,
  modelConfigured,
  waiting,
  leading,
  willSay,
}: {
  readonly revision: number
  readonly available: readonly DemoPresetId[]
  readonly modelConfigured: boolean
  /**
   * The question the visitor already has open, when they have one.
   *
   * Computed by the page rather than here, for the reason every other reading on
   * this surface is: whether a hold can still be answered is a fact about the
   * store and the tree's revision together, and the panel has neither.
   */
  readonly waiting?: SetAside
  /**
   * The ask that gets the green button, and the part of the page it would
   * touch — both decided by `rail.ts`, and absent together.
   *
   * **The nomination used to be computed here and it was the same answer to the
   * same question, twice.** Showing a stranger what the press would do means
   * rendering a part of the tree through the registry, which is the server's
   * job; choosing which ask is primary was this file's. Two copies of one
   * choice is how a panel comes to preview one ask and offer another, and there
   * is no test that would fail while they agreed.
   *
   * Its absence is also how this panel knows a question is open, which it used
   * to work out from `waiting`. The rule is unchanged and stated in one place
   * now: the green on this rail belongs to the demo's next step, and once a
   * question exists that step is *Apply this change*, down inside the card.
   */
  readonly leading?: {
    readonly preset: DemoPresetId
    /** Absent when the ask names the page itself, which the re-theme does. */
    readonly part?: ReactNode
  }
  /**
   * What the Gate says about **every** ask on this panel, run against this tree
   * before anybody pressed anything (`_lib/what-it-will-say.ts`).
   *
   * Computed by the page for the reason the nomination is not: reaching a
   * verdict is `async`, and a client component cannot await one. What crosses
   * the boundary is a record of answers the runtime produced, not a runtime.
   *
   * **It was one verdict until 2 October and is now a keyed set, and it is one
   * prop rather than two on purpose.** `page.tsx` is the one file in this lane
   * no `vitest` run can mount, so every reading taken there is a reading
   * nothing can hold — the lane's open finding of 29 September counts the props
   * arriving here one at a time, and the run before this one added the sixth.
   * The lead's own verdict is now a lookup and the split is a pure reading over
   * the values (`how-many-wait-for-you.ts`), so both are taken **here**, where
   * a test can reach them, and the page gained no argument it could silently
   * drop.
   *
   * Absent on its own terms rather than with `leading`: there is a lead
   * whenever an ask is on offer, and there is a verdict only when that ask
   * reached the Gate. The panel reads the two separately, and an empty set is
   * what restores the fuller sentence above.
   */
  readonly willSay?: AskVerdicts
}) => {
  const [report, submit, pending] = useActionState<WriteReport | null, FormData>(askForChange, null)

  const offered = offeredPresets(available)

  /**
   * The green button, and it steps aside while a question is open.
   *
   * **The green on this rail belongs to the demo's next step, and once a
   * question exists that step is not a new ask.** With nothing open the green is
   * *Take the numbers off* — the press that meets the Gate. With a question open
   * it is **Apply this change**, down inside the card (`record-card.tsx`), which
   * is the press that gets past it. A green here at the same time would have the
   * panel competing with the question it just produced, at the size that wins,
   * for the press that costs the visitor the question.
   *
   * So the claim is about this panel rather than about the count: a card that is
   * waiting carries exactly one green (`record-card.test.tsx`), and while any is,
   * this panel carries none. A visitor holding two questions has two cards
   * offering an answer, which is right — each is the next step for its own ask.
   *
   * **The preset itself is gone from the list too, and that is the page's call
   * rather than this one's.** It used to drop back into the list at its table
   * position, which offered a second press whose only outcome was a duplicate
   * question — so `already-asked.ts` takes it out of `available` while its
   * question is open, and the four asks already in the list stay exactly where
   * they were. This panel cannot see that: whether an ask is waiting on an answer
   * is a fact about the store, and everything here knows is which ids it was
   * handed.
   *
   * What is *not* withdrawn is everything else. The other asks stay live and
   * pressable while a question is open, because a stranger who wants to watch the
   * page move twice should be allowed to — which is the shape of this fix this
   * lane argued against (`set-aside.ts`), and it is still argued against.
   */
  const lead = leading === undefined ? undefined : presetById(leading.preset)
  const rest = offered.filter((preset) => preset.id !== lead?.id)

  /**
   * The two readings taken off those verdicts, both here rather than on the
   * page that fetched them.
   *
   * `said` is this panel's old `willSay` by another route — the lead's own
   * answer, under its own button, unchanged in wording and in position.
   *
   * `split` is the new one, and it counts the asks **this panel is offering**,
   * which is not the same as the preset table: `already-asked.ts` withdraws an
   * ask while its question is open, so the sentence shrinks with the list it
   * describes rather than describing a list that is not on the screen.
   */
  const said = lead === undefined ? undefined : willSay?.[lead.id]
  const split = howManyWaitForYou(
    offered.flatMap((preset) => {
      const answer = willSay?.[preset.id]
      return answer === undefined ? [] : [answer]
    })
  )

  return (
    <div id="ask" className="flex flex-col gap-4">
      {/*
        * The opening block: what every ask meets, and the one press this
        * surface invites. **It is read in one order and laid out in two**, and
        * the reversal is narrow-widths-only.
        *
        * On a wide screen the sentence is above the button and nothing here
        * moves. On a narrow one the button is above the sentence, because of
        * what was measured on the arrival screen: at 348 × 465 — the size of
        * this demonstration inside the front door's embed on a phone — the
        * first control sat 398px down, so a visitor met a bar, a heading and
        * three paragraphs and 67px of a green button, with the page all of it
        * is about 1,360px below. A box of prose with nothing to press is the
        * clunk this lane exists to remove, and it is the one screen where
        * every word is competing for the same 465 pixels.
        *
        * **Flex order rather than a second copy of the sentence**, and the
        * distinction is the whole reason this is safe: `flex-col-reverse`
        * moves the boxes and not the document, so the sentence still precedes
        * the form in the markup. A screen reader, a crawler and
        * `ask-panel.test.tsx`'s *before offering anything to press* all meet it
        * first exactly as they did. What changes is where a sighted visitor's
        * eye lands, and on a narrow screen it now lands on the button with the
        * promise and this sentence directly under it — which is the same three
        * facts in the same 200 pixels, rather than three facts and no button.
        *
        * **What is on the first screen, re-measured, and the claim this
        * comment used to make is no longer true.** It said that at 348 × 465
        * the button, its promise and this sentence were all above the fold
        * together. Driven against a production build at that size today, the
        * button is 325–471, the promise 383–415, and the sentence **487–524**:
        * it is below the fold, and arithmetic says it already was before the
        * verdict was added — the header has gained a line and a chip row since
        * the measurement was taken, and nothing re-took it.
        *
        * What is above the fold is the thing the property was *for*. The lead
        * is a change the Gate holds, so the first press moves nothing, and a
        * stranger who was not told that has watched a button do nothing. The
        * sentence was the stand-in that said so; `willSay` says it about this
        * button, computed, and it sits 423–471 — inside the form, where the
        * reversal keeps it welded to the press. At 390 × 844 all four are on
        * the first screen. At 348 × 465 the verdict's third line is clipped by
        * **6px**, which is this run's cost and is in its report.
        *
        * A measurement in a comment is a claim with a date on it. This one is
        * 1 October 2026, and the next run to move anything above this block
        * owes it another.
        */}
      <div className="flex flex-col-reverse gap-4 lg:flex-col">
        <p className="text-ink-secondary text-sm">
          {split?.sentence ??
            (said === undefined ? WHAT_EVERY_ASK_MEETS : WHAT_EVERY_ASK_MEETS_BRIEFLY)}
        </p>

        {lead && (
          <form action={submit} className="flex flex-col gap-1.5">
            <input type="hidden" name="baseRevision" value={revision} />
            <input type="hidden" name="presetId" value={lead.id} />
            <button
              type="submit"
              disabled={pending}
              className="bg-affirm text-affirm-ink border-affirm-edge group flex items-center justify-between gap-3 rounded-md border px-4 py-3.5 text-md font-semibold tracking-tight transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Asking…" : lead.label}
              <span
                aria-hidden="true"
                className="shrink-0 transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </button>
            {/*
              * Under the button rather than inside it, at every width. What the
              * button says is the ask; what this says is the consequence, and a
              * visitor deciding whether to press something wants both without
              * the button becoming a paragraph.
              *
              * It travels *inside* the form, which is what keeps the reversal
              * above honest: the promise is a fact about this button and it
              * stays welded to it rather than being reordered away from it.
              */}
            {/*
              * `promiseOf` rather than `lead.promise`, and the substitution is
              * never nothing: the lead is whichever ask `leadingAsk` nominates
              * out of what is left, so once *Take the numbers off* has been
              * spent the green button is a toggle — and the second press of a
              * toggle puts the page back. A green button promising *every
              * colour and typeface on the page changes at once* while it undoes
              * the visitor's last change is the same defect as the row's, at
              * the loudest size this panel has. `what-each-row-says.ts` says
              * why the promise is the sentence that moves and the chip is not.
              */}
            <p className="text-ink-muted text-xs">{promiseOf(lead.promise, said?.putsBack)}</p>

            {/*
              * And what Loom will say about it, which is the other half of
              * what a stranger needs before pressing anything and the half
              * this panel has never had.
              *
              * The promise above is about the *page* — it is `presets.ts`'s
              * and it is deliberately silent about the verdict, because a
              * typed label naming one would be a surface predicting a decision
              * it does not make. This line is about the *Gate*, and it is
              * silent about nothing because it is not typed: `composeChange`
              * ran, against this tree, under this policy, with this preset's
              * own interpreter, and what is printed is its answer
              * (`_lib/what-it-will-say.ts`).
              *
              * **Inside the form, directly under the promise**, for the reason
              * the promise is: both are facts about this one button and the
              * narrow layout reorders the block around them. Welded here, the
              * press, what it does to the page, and what Loom does about it
              * travel as one thing to whichever end of the screen the layout
              * puts them.
              *
              * The lead is the sentence that stops the first press reading as
              * a broken button. `DEMO_LEADING_PRESET` is a change the Gate
              * holds — that is the whole of why it is the lead — so *Pressing
              * this raises a question, not a change* is the expectation this
              * surface most needs to set and the one a stranger has had to
              * infer from a hedge about asks in general.
              *
              * **Two lines and no panel**, which is the restraint that keeps
              * this from being the card's argument made early. The weighing,
              * the rule and the ceiling comparison stay on the card, where the
              * tense is right and where a visitor is deciding rather than
              * browsing; what is here is strictly less than what lands there,
              * so the press reads as a promise kept.
              *
              * **And the rule is the neutral edge, not the awaiting amber**,
              * although the words say a question is coming. Amber on this rail
              * means *there is a question open and it is yours* — it is the
              * badge, the ring on the stage, the sticky caution and the rule
              * on the card's *what would happen*, all about one live hold. No
              * hold exists here: nobody has asked for anything, and a fifth
              * amber mark standing for a question that has not been raised
              * would make the arrival screen look like a screen with work on
              * it. The tone is earned by the press, which is the same rule the
              * spotlight follows.
              */}
            {said && (
              <p className="text-ink-secondary border-edge-subtle mt-0.5 border-l-2 pl-2.5 text-xs">
                <strong className="text-ink font-medium">{said.lead}</strong> {said.detail}
              </p>
            )}
          </form>
        )}
      </div>

      {/*
        * What that press is about, as the thing itself — **one click away, as
        * of 3 October.**
        *
        * **The one control this surface invites names a part of the page a
        * stranger has never seen.** *Take the numbers off* promises "the
        * appointments, the years and the waiting time", and on arrival there
        * are no appointments, years or waiting time on the screen: the band is
        * below the fold at 1280×900 and about four thousand pixels down at
        * 390×844. `before-the-press.ts` argues it and the rail computes it.
        * None of that has changed and none of it is withdrawn.
        *
        * **What changed is what it was competing with.** Open, this excerpt
        * was 358px of an 857px scroller — measured on a production build at
        * 1280×900 — and the four asks under it, each carrying the Gate's own
        * verdict about itself, began at **797**. The arrival screen made a
        * counted claim and put every piece of its evidence three pixels under
        * the fold. The excerpt is now a `<details>` (`part-in-question.tsx`),
        * its sentence is its control, and the rows are on the first screen at
        * both sizes this surface is judged at. Nothing is removed: one press
        * of a native control, with no script, puts the band back exactly as it
        * was.
        *
        * **Still after the block and not inside it**, and the reason survives
        * the fold rather than being made moot by it. Inside, it would ride the
        * `flex-col-reverse` above, and at 348 × 465 — the embed on a phone —
        * everything below the verdict moves down by the control's 21px and its
        * gap. That is the frame where the whole argument is already fighting
        * for 465 pixels, and the sentence this block exists to keep on it is
        * `WHAT_EVERY_ASK_MEETS`. Adjacency is worth less than that, so the
        * control takes the position the band had.
        */}
      {leading?.part}

      {/*
        * What the next press would cost, above everything it is true of — and
        * pinned, because the one thing a caution has to be is on screen.
        *
        * **Measured, after the first version of it was scrolled past.** A
        * caution sitting statically above the list was carried off the top of
        * the rail by the scroll the press produced, leaving four live buttons
        * and the question they would kill on screen with nothing between them
        * saying so: the warning had been written and placed exactly where the
        * visitor was not looking.
        *
        * So it sticks to the top of the rail's scroller for as long as any ask
        * control is in view, and releases when the panel does.
        *
        * **And sticking is why it must never be the whole of what is on
        * screen.** `AnswerInView` used to stop the rail the minimum distance —
        * scrollTop about 330 at 1280×900 — which left the panel in the scroller
        * with the question below it, so this strip pinned itself over the first
        * ask and became the loudest thing on the frame a stranger's first
        * correct press produced. On a phone it was worse: the strip was clipped
        * to 40px by the panel's own bottom edge, its first line cut through the
        * middle, with no ask control anywhere on the screen it could have been
        * about. `arrival.ts` carries the fix and the numbers — the card lands
        * at the top of the scroller now, which leaves this panel, and therefore
        * this strip, behind. Nothing here changed, and nothing here should: a
        * visitor who scrolls back to a control still meets it above that
        * control, in amber, before the press, which is every property it was
        * built for.
        *
        * **The fives here are the rail's own `p-5`**, and they are a deliberate
        * coupling rather than magic: `-mx-5` and `px-5` take the strip to both
        * edges so nothing shows beside it, and `lg:-top-5` pins it flush with
        * the scroller's top rather than twenty pixels down — measured, because a
        * sticky `top-0` inside a padded scroller leaves exactly that gap and a
        * button's bottom edge slides through it. The bottom border is what makes
        * the card passing underneath read as passing underneath.
        *
        * Only on a wide screen, because only there is the rail a scroller. On a
        * phone the document scrolls and the strip pins to the viewport, where a
        * negative offset would take the first line of the sentence off the top
        * of it. The card the **Answer it first** link points at needs no
        * clearance from this any more, and `arrival.ts` says why: the fragment
        * lands it at the top of the scroller, which is a position this panel is
        * not on screen in.
        *
        * **Amber, which is not decoration.** It is the tone this rail gives an
        * open question everywhere else it has one — the `Waiting on you` badge,
        * the rule on the card's *what would happen*, the ring on the stage — and
        * this is a fourth place saying the same thing about the same question.
        *
        * It governs the free-text box as well as the buttons, which is why it is
        * a sibling above both rather than a line inside the list: a sentence
        * posted to the model moves the page exactly as a preset does.
        */}
      {waiting && (
        <div className="bg-surface-page border-edge-subtle sticky top-0 z-10 -mx-5 border-b px-5 py-3 lg:-top-5 lg:pt-5">
          <div className="border-awaiting-ink flex flex-col gap-1.5 border-l-2 pl-2.5">
            <p className="text-ink-secondary text-xs">{waiting.sentence}</p>
            {/*
              * The way out, and it is a link rather than a button because it
              * goes somewhere rather than doing something. `record-card.tsx`
              * puts the record id on the card's own element, so this lands on
              * the card carrying **Apply this change** — the answer is given
              * there, on the card that says what it is answering, and never
              * from up here where the question is not in sight.
              */}
            <a
              href={`#${waiting.recordId}`}
              className="text-ink-secondary hover:text-ink group inline-flex items-center gap-1.5 self-start text-xs transition-colors"
            >
              {waiting.answerLabel}
              <span aria-hidden="true" className="transition-transform group-hover:translate-y-0.5">
                ↓
              </span>
            </a>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-ink-muted font-mono text-2xs tracking-[0.16em] uppercase">
            {waiting === undefined ? ASKS_HEADING : ASKS_HEADING_WHILE_WAITING}
          </p>
          <ul className="flex flex-col gap-1">
            {rest.map((preset) => {
              const answer = willSay?.[preset.id]

              return (
                <li key={preset.id}>
                  <form action={submit}>
                    <input type="hidden" name="baseRevision" value={revision} />
                    <input type="hidden" name="presetId" value={preset.id} />
                    <button
                      type="submit"
                      disabled={pending}
                      className="border-edge-subtle hover:border-edge hover:bg-surface-hover flex w-full flex-col items-start gap-0.5 rounded-md border px-3.5 py-2.5 text-left transition-colors disabled:opacity-60"
                    >
                      {/*
                        * The label, and beside it what Loom will do about it.
                        *
                        * **This row is where the sentence above becomes
                        * checkable.** *Loom will make 2 on its own, and ask you
                        * first about 3* is a count a stranger has no way to
                        * verify — until the rows under it visibly do not all
                        * read the same. That is the whole argument for putting
                        * two words at the end of a line that already fits, and
                        * it is why they are here rather than one disclosure
                        * down with everything else this surface defers.
                        *
                        * `items-baseline`, so a label that wraps to two lines
                        * keeps its marker beside the first of them rather than
                        * centred against both; `shrink-0` on the marker,
                        * because the label is the half that may give way.
                        *
                        * The chip treatment is the header's, deliberately: a
                        * bordered mono 2xs is already this screen's word for
                        * *a fact about the thing beside it, stated flat*, and
                        * a second vocabulary for the same job would be the
                        * fifth mark on a rail that has spent five runs keeping
                        * four straight.
                        *
                        * Absent when the ask reached no verdict, which is the
                        * silence `willSayOf` keeps: a row that could not be
                        * answered says nothing rather than guessing, and the
                        * count above has not counted it either.
                        */}
                      <span className="flex w-full items-baseline justify-between gap-3">
                        <span className="text-sm">{preset.label}</span>
                        {answer && (
                          <span className="border-edge-subtle text-ink-muted shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-2xs tracking-wide uppercase">
                            {STANDING_ROW[answer.standing]}
                          </span>
                        )}
                      </span>
                      {/*
                        * The promise, which is the preset's own until the
                        * history makes it false. A toggle comes back onto this
                        * list after it has been applied — `availablePresets`
                        * plans against the tree as it stands and finds it
                        * applicable in the other direction — and the sentence it
                        * shipped with then describes a change the page is about
                        * to be moved away from.
                        */}
                      <span className="text-ink-muted text-2xs">
                        {promiseOf(preset.promise, answer?.putsBack)}
                      </span>
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/*
        * Last, quiet, and folded away until asked for.
        *
        * Two reasons, and the second is the one that decided it. It is the only
        * control on this panel a deployment can fail to provide — the demo runs
        * with no API key configured, by design, because a demo that only
        * demonstrates when a key is present is not a demo — so it must never be
        * the thing a visitor tries first. And open, it costs about a hundred and
        * forty vertical pixels, which is the difference between the first record
        * card landing on a laptop screen and landing below the fold. The card is
        * the demo's argument; the box is a way of reaching it.
        *
        * A `<details>` rather than state, for the reasons the record's own
        * disclosure gives: it works with JavaScript off, costs no bundle, and
        * the browser gives it keyboard and screen-reader semantics free.
        */}
      <details className="group">
        <summary className="text-ink-muted hover:text-ink cursor-pointer list-none font-mono text-2xs tracking-wide uppercase transition-colors select-none">
          <span className="inline-flex items-center gap-1.5">
            <svg
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
              className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90"
            >
              <path d="M4 2.5L8 6l-4 3.5" />
            </svg>
            or type your own
          </span>
        </summary>

        <form action={submit} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="baseRevision" value={revision} />
        <label htmlFor="utterance" className="sr-only">
          What would you like changed?
        </label>
        <textarea
          id="utterance"
          name="utterance"
          rows={2}
          disabled={!modelConfigured}
          placeholder={
            modelConfigured
              ? "“Make the questions two columns.”"
              : "No model is configured on this deployment, so free text is off. Everything above still works."
          }
          className="border-edge-subtle bg-surface-base placeholder:text-ink-placeholder focus:border-edge resize-y rounded-md border p-2.5 text-sm transition-colors disabled:opacity-60"
        />
        {modelConfigured && (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="bg-neutral text-neutral-ink border-neutral-edge hover:bg-surface-hover rounded-md border px-4 py-1.5 text-sm transition-colors disabled:opacity-60"
            >
              {pending ? "Composing…" : "Send it to the model"}
            </button>
            <span className="text-ink-muted text-2xs">interpreted on the server, then gated</span>
          </div>
        )}
        </form>
      </details>

      {/*
        * Only what the record does not already say. Everything the runtime
        * narrated has a card under this panel with the same words on it; what
        * lands here is the ask that never reached the runtime at all — an empty
        * form, an unknown preset, free text with no model or no allowance left.
        */}
      {report && !report.recorded && (
        <div className={`rounded-md p-2.5 text-xs ${toneClasses(report.tone)}`}>
          <strong className="font-medium">{report.headline}</strong>
          <p className="mt-1">{report.meaning}</p>
        </div>
      )}
    </div>
  )
}
