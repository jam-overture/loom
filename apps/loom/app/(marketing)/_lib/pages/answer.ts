import { buildElement, buildText, type IdFactory, type LoomNode } from "@loom/runtime"

import { writeChangeSequence } from "../adapt/history"
import type { ChangeRecord } from "../adapt/record"
import { action, prose, stack } from "../nodes"
import { askHref, recordHref, type SiteThemeName } from "../site"

/**
 * The answer, where the visitor lands.
 *
 * The band further down lets a visitor ask this page for a change and shows the
 * whole of what the page wrote down about it. It works, and until this run
 * nobody could see it happen: a choice is an ordinary link, so the browser
 * navigates and puts the reader at the top of the document — and the top of the
 * document is a hero that is a full screen tall and identical in every state.
 *
 * The measurement is the argument. At 1440×900 the opening band runs from 156px
 * to 1036px, so **the first screen after a visitor asks for something is byte
 * for byte the screen they arrived on.** Ask *Get to the point*, say yes to the
 * hold, and the page really does lift the whole band about what Loom is for to
 * just under the headline — 11 pieces, one step, recorded — and the visitor sees
 * a headline they have already read. The one change on this site that a
 * competitor cannot copy was happening below the fold.
 *
 * So the page answers where it is being read. This band exists **only once the
 * visitor has asked for something**: a stranger arriving at `/` meets exactly
 * the page they met before, and the reader who has engaged meets the verdict
 * first.
 *
 * **It is the headline of the record and not a second copy of it.** The panel
 * owns the five steps — what was asked, what it was worked out to be, how much
 * it moved, which rule decided, and what putting it back would restore. This
 * says the two things that are useless further down the page: what the rules
 * decided, and what the visitor may now do about it.
 *
 * Every word of it is read off `ChangeRecord`. Nothing here composes a sentence
 * of its own about what happened, which is the property that matters on the one
 * band of this site that speaks in the imperative: a top-of-page notice that
 * drifted from the panel below it would be the site failing at exactly the claim
 * it is making.
 */

export type AnswerContext = {
  readonly origin: string
  readonly theme: SiteThemeName
  readonly record: ChangeRecord
}

/**
 * The one control that is worth putting above the fold, and it is the one the
 * visitor is being asked for.
 *
 * These mirror the panel's own actions rather than adding new ones, and the
 * mirroring is deliberate: two controls on one page that both say *put it back*
 * and disagree about where they go would be this site demonstrating drift. What
 * is **not** repeated is the panel's *Start again* beside a held change — up
 * here the question is "will you allow this?", and offering the way out beside
 * the way through turns a decision into a pair of exits.
 */
const decision = (ids: IdFactory, context: AnswerContext): LoomNode => {
  const { record } = context
  const home = askHref(context.origin, { theme: context.theme })

  return stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
    record.awaitingYou
      ? action(
          ids,
          "I say yes — go ahead",
          askHref(context.origin, { theme: context.theme, ask: record.ask, approve: true }),
          { variant: "primary" }
        )
      : action(ids, record.landed ? "Put it back" : "Start again", home, {
          variant: record.landed ? "primary" : "secondary",
        }),
    /**
     * The whole record, on the page built for it.
     *
     * The panel below carries the same five steps, and a link *to* it is the
     * one thing this band cannot offer: a tree can hold a fragment — the scheme
     * allowlist would pass `#…` without complaint — and no primitive in the
     * library renders an `id` for it to point at. Filed rather than worked
     * around, because the workaround would be a local component and this lane
     * does not get one.
     *
     * The record page is the better destination anyway. It replays this exact
     * request from the front door as it is published, so what it shows is a
     * page anyone can reach with the address rather than a state this visitor
     * happens to be in.
     */
    action(
      ids,
      "See the whole record",
      recordHref(context.origin, {
        theme: context.theme,
        changes: writeChangeSequence([
          { ask: record.ask, approved: record.verdict === "approved" },
        ]),
      }),
      { variant: "quiet" }
    ),
  ])
}

/**
 * Accent when there is something for the visitor to do, neutral when there is
 * not — which is the same question the primary button answers.
 *
 * The obvious rule was *accent for every verdict, neutral for nothing-to-do*,
 * and it shipped a refusal in the palette's green. The library has two tones and
 * no red, deliberately and for a recorded reason, so a refusal cannot be painted
 * as one; what it can be is **not painted as the tone this page uses to say
 * "look here"**. A page that colours *Refused* the same as *You said yes* is
 * asking a reader to get the answer from the word alone, on the one band they
 * read fastest.
 *
 * So the tone tracks the action rather than the sentiment, which is a thing the
 * palette can honestly express: held and landed both hand the visitor a decision
 * and wear the accent; refused and nothing-to-do hand them nothing and are an
 * aside. The title carries the verdict in both, and it is the only thing that
 * does.
 *
 * **Exported because the share card asks the same question.** A card carries no
 * control at all, so the rule as written — *wear the accent if and only if you
 * offer a primary control* — does not decide it on its own; what does is the
 * half underneath, that a refusal must not be painted the tone this site uses to
 * say "look here". The predicate is the same predicate and it lives here, once,
 * rather than being restated in a file nobody reads beside this one.
 */
export const toneFor = (record: ChangeRecord): "accent" | "neutral" =>
  record.awaitingYou || record.landed ? "accent" : "neutral"

export const answerBand = (ids: IdFactory, context: AnswerContext): LoomNode => {
  const { record } = context

  return buildElement(ids, {
    type: "loom.callout",
    props: { tone: toneFor(record), title: record.verdictLabel },
    children: [
      /**
       * The request, in the visitor's own words, exactly as the panel quotes it.
       *
       * Both lines are measured, and the band is the reason: a callout spans
       * whatever it is given, this one is a child of a `wide` page, and the
       * rules' sentence is long enough to run the whole 1,450px of it. A
       * reader's eye does not return accurately across a line that wide, and
       * this is the one band on the site they read under time pressure.
       */
      buildElement(ids, {
        type: "loom.prose",
        props: { size: "lead", measured: true },
        children: [buildText(ids, `“${record.asked}”`)],
      }),
      prose(ids, record.verdictLine, { tone: "muted", measured: true }),
      decision(ids, context),
    ],
  })
}
