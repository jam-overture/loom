import type { SignInPressure } from "@/app/(portal)/_lib/auth/pressure"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { toneClasses } from "@/app/(portal)/_lib/outcome"
import {
  describePressure,
  nextMove,
  pressureFacts,
  toneOfPressure,
} from "@/app/(portal)/_lib/signin-view"

/**
 * What is happening at the front door, and what to do about it.
 *
 * Colour is a second channel and never the only one, the same rule
 * `/portal/checkup` follows: the band names the state in words and the sentence
 * under it says it again, so nothing here depends on telling the palette apart.
 *
 * Three things in this order, which is the order the question is actually asked
 * in: **is something happening**, **what should I do**, **show me the numbers**.
 * It used to be two — the band, and then six monospace cells of
 * `callers counted` / `failures held` / `locked now` on the surface, with no
 * answer to the middle question anywhere on the screen. The numbers were the
 * runtime's phrasing of the sentence immediately above them, printed at the
 * reader as though they were the point, and the one thing a person opening this
 * screen wants — *do I need to do something?* — was in a source comment.
 *
 * Nothing has been removed. All six are behind the disclosure, joined by
 * `counted`, which this screen has never shown, and each one now names the
 * `SignInPressure` members it is made of.
 */
export const PressureSummary = ({
  pressure,
  now,
}: {
  readonly pressure: SignInPressure
  readonly now: number
}) => {
  const reading = describePressure(pressure, now)
  const move = nextMove(reading.tone)

  return (
    <section className="flex flex-col gap-3">
      <div
        data-pressure={reading.tone}
        className={
          "flex flex-col gap-1 rounded-md px-3 py-2 " + toneClasses(toneOfPressure(reading.tone))
        }
      >
        <span className="text-sm">{reading.headline}</span>
        <span className="text-2xs opacity-80">{reading.detail}</span>
      </div>

      {/*
       * Outside the coloured band on purpose. Inside it, the move would inherit
       * the tone of the thing it is a response to — a next move set in the
       * refusal colour reads as a fourth line of alarm rather than as the way
       * out of it. This is the same defect the checkup screen's correction had:
       * a sentence shipped in the size and colour of the lines above it is read
       * as one more of them.
       */}
      <div className="border-edge-subtle flex flex-col gap-1 rounded-md border p-3">
        <p className="text-ink-muted text-2xs uppercase">What to do</p>
        <p className="text-sm">{move.label}</p>
        <p className="text-ink-muted text-xs">{move.meaning}</p>
      </div>

      {/*
       * `text-ink-muted` on everything inside, because `TechnicalDetail` sets no
       * colour of its own and inherits whatever it is mounted in. Inside a
       * `StateNotice` that is already muted; at page level it is the body ink,
       * which rendered the record *louder* than the plain sentence above it — the
       * hierarchy the whole disclosure rule exists to establish, upside down. It
       * is fixed here rather than in the component because the component's
       * default is ten screens wide and this run can only look at one of them.
       */}
      <TechnicalDetail summary="The numbers this is counted from">
        <dl className="text-ink-muted flex flex-col gap-1">
          {pressureFacts(pressure, now).map((fact) => (
            <div key={fact.label} className="flex flex-wrap items-baseline gap-x-2">
              <dt>{fact.label}</dt>
              <dd className="text-ink-secondary font-mono">{fact.value}</dd>
              <dd className="font-mono opacity-70">{fact.fields.join(", ")}</dd>
            </div>
          ))}
        </dl>

        <p className="text-ink-muted">
          The third column is what each number is called in the record this page reads, so a
          reviewer with the type in front of them does not have to guess which cell is which.
        </p>
      </TechnicalDetail>
    </section>
  )
}
