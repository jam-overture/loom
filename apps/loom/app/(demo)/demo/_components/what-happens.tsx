import { WEIGHED_QUESTIONS } from "@/app/(demo)/_lib/weighed"

/**
 * What is about to happen, before anything has.
 *
 * This replaces the worst forty-five words on the old demo. Its empty record
 * panel read:
 *
 * > *"Ask for something. What appears here is the proposal, its rationale and
 * > provenance, the stakes and reversibility the Gate weighed, which rule
 * > decided it under which policy, the revision it produced, and an undo that is
 * > a real change rather than a rewind."*
 *
 * Eleven pieces of vocabulary, none of them defined, in the one place a
 * first-time visitor meets the record — and every one of them a *description* of
 * a record rather than a record. Somebody who already understood that sentence
 * did not need the demo; somebody who did not was told nothing.
 *
 * What is here instead is the sequence, in three plain steps, in the order the
 * visitor is about to live them. It is not a summary of the record: the record
 * is still complete and still one click away on every card. It is the thing a
 * demo owes a stranger and this one never had — *what am I looking at, and what
 * happens when I press that.*
 *
 * The steps stay after the first change lands rather than disappearing, because
 * they are the frame a visitor reads the cards through. What changes is that
 * step three stops being a promise and becomes the cards underneath it.
 *
 * **Step three no longer says *really*.** The word was there to mean *a real
 * change rather than a rewind*, which is the interesting claim (0032) and is
 * still made in the clause after it. What a stranger read it as was
 * *immediately* — and the undo this frame is describing is held by the Gate, so
 * pressing it moves nothing until they answer a second question. A frame that
 * over-promises the payoff is worse than one that says less: the sentence now
 * says the undo is weighed like any other change, which is both the honest
 * expectation and the better claim.
 *
 * **Step two's two questions are a constant rather than prose**, because the
 * card now answers them in the words they were asked in (`_lib/weighed.ts`).
 * They were a promise this surface made and did not keep for a fortnight — the
 * answers were on the record the whole time, one click down, as `stakes:
 * medium` and `undo carries: 4 nodes`. Sharing the strings is what stops a
 * future edit to either half from quietly reopening the gap: a reworded
 * question here and an unchanged heading there is exactly the drift that put
 * them out of step in the first place.
 */

const STEPS: readonly { readonly title: string; readonly body: string }[] = [
  {
    title: "You ask",
    body: "In plain words, or with one of the buttons above. Nothing here is scripted: what you ask for is worked out against the page exactly as it stands right now.",
  },
  {
    title: "Loom decides",
    body: `Every ask is weighed on two questions — “${WEIGHED_QUESTIONS.damage}” and “${WEIGHED_QUESTIONS.reversal}” — and both answers land on the record below. A named rule reads them and decides whether the change goes ahead on its own or waits for you to say yes.`,
  },
  {
    title: "The record appears",
    body: "What you asked for, what was decided and why it was decided that way — and a button that puts the page back. Undoing is a change of its own rather than a rewind, so it is weighed the same way.",
  },
]

export const WhatHappens = () => (
  <section aria-labelledby="what-happens" className="flex flex-col gap-3">
    <h2 id="what-happens" className="text-ink-muted text-2xs tracking-wide uppercase">
      what happens when you ask
    </h2>

    <ol className="flex flex-col gap-3">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          {/*
            * The number is the whole reason this reads as a sequence rather than
            * as three unrelated claims, so it is a real element and not a list
            * marker: a marker cannot be given the accent, and the accent is what
            * carries the eye down the three of them.
            */}
          <span
            aria-hidden="true"
            className="border-edge text-ink-muted mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-2xs"
          >
            {index + 1}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm">{step.title}</p>
            <p className="text-ink-muted text-xs">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  </section>
)
