import Link from "next/link"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  NOTHING_HAS_CHECKED,
  reachDetail,
  reachReading,
  type CheckupReach,
} from "@/app/(portal)/_lib/checkup-reach"

/**
 * The front door's third question, and the invitation to answer it.
 *
 * The front door says what is waiting for you and what Loom did without asking.
 * Both are read from records, and neither of them checks whether those records
 * still describe the pages people are actually being served. That check exists,
 * over every page, one press away at `/portal/checkup/everything` — and until
 * this component nothing on the screen a person opens every morning mentioned
 * it. A screen nobody is invited to is a screen nobody opens.
 *
 * ## Why it is a press and not a verdict
 *
 * Vercel puts `Ready · 2m ago` on its front door because it stores the result of
 * every build. Loom stores no checkup result: the check reads and writes nothing,
 * by design, so there is no *last checked* to print and this component must not
 * invent one. What it prints instead is the **reach** — what a press could speak
 * for, and what it would cost — which falls out of the listing and the heads this
 * screen has already read. See `_lib/checkup-reach.ts`.
 *
 * That is the honest version of a status line, and the one fact on it a person
 * cannot get anywhere else is the uncomfortable one: **a page whose starting
 * shape this deployment has no record of is absent from every verdict the portal
 * can give.** It passes nothing, fails nothing, and nothing anywhere says so.
 *
 * ## Shape
 *
 * Not a `StateNotice`. All four of those tones are answers — *nothing here yet*,
 * *Loom looked and it is good*, *the read did not happen*, *a condition worth
 * knowing* — and this is a question that has not been asked yet. A green box
 * would be the confident empty state in its purest form: reassurance from a
 * check that has not run. So it is a plain section with a heading, a sentence and
 * a press, which is the shape the checkup screen's own landing uses for exactly
 * the same offer.
 */
export const CheckupInvitation = ({ reach }: { readonly reach: CheckupReach }) => {
  const reading = reachReading(reach)

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        {/*
         * The heading is the question, not the mechanism. `Checkup` is what the
         * rail calls the place; this is what a person is trying to find out, and
         * the two are allowed to differ because a rail is a list of places and a
         * heading is a question.
         */}
        <h2 className="text-lg tracking-tight">Is everything still accounted for?</h2>
        {/*
         * The answer to the heading, and it is the same answer every time.
         *
         * The first screenshot of this section had the reach here — *"Loom can
         * check 1 of your 4 pages."* directly under a question it does not
         * answer, which a reader can take as reassurance that something has
         * looked. Nothing has. The two sections above this one each put what
         * they *found* under their heading, so this position is where a reader
         * has been taught to look for a result, and the honest result is that
         * there isn't one yet.
         */}
        <p className="text-ink-muted text-sm">{NOTHING_HAS_CHECKED}</p>
      </header>

      <div className="border-edge-subtle flex flex-col gap-3 rounded-md border p-4">
        {/*
         * The reach leads the card, because it is the scope of the offer below
         * it: what pressing would cover. It was under the heading and read as an
         * answer there; here it reads as the size of the question.
         */}
        <p className="text-ink text-sm">{reading.headline}</p>
        <p className="text-ink-secondary text-sm">{reading.meaning}</p>

        {/*
         * Each gap on the surface, above the press rather than below it.
         *
         * A reader deciding whether to press has to know what the answer will
         * not cover before they read it — the sweep says the same things again
         * on its own screen, and by then it is a caveat on a verdict rather than
         * a reason to expect one.
         */}
        {reading.gaps.length > 0 && (
          <ul className="flex flex-col gap-2">
            {reading.gaps.map((gap) => (
              <li
                key={gap.key}
                className="border-edge-subtle text-ink-muted border-l-2 pl-3 text-sm"
              >
                {gap.plain}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          {/*
           * A link rather than a form, because a sweep reads and writes nothing —
           * so the result is an address a reviewer can send somebody, which is
           * the argument the checkup screen's own press already makes.
           */}
          <Link
            href="/portal/checkup/everything"
            className="bg-affirm text-affirm-ink border-affirm-edge self-start rounded-md border px-3 py-1.5 text-sm no-underline"
          >
            Check every page →
          </Link>
          <p className="text-ink-muted text-xs">{reading.cost}</p>
        </div>

        <TechnicalDetail summary="What a checkup can and can't be run against here">
          {reachDetail(reach).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </TechnicalDetail>
      </div>
    </section>
  )
}
