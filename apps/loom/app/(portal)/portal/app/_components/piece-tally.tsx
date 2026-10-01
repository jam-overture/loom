import Link from "next/link"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { PieceUsage } from "@/app/(portal)/_lib/app-view"

/**
 * What the AI may build with, and how much of it your app has ever used.
 *
 * ## Why this is not `/portal/pieces` again
 *
 * That screen is the **catalogue**: every registered piece, what each one is for,
 * and the line the model is handed. It is true before anything has been built and
 * it says nothing about this app.
 *
 * This is the **usage**, which is the half no repository has. A piece registered
 * and never used is a thing the AI is offered every single time it is asked for a
 * change and has never once reached for. That is either a gap in the pages or a
 * gap in the catalogue, and which one it is is a judgement only the person who
 * owns the app can make — so it is put in front of them rather than counted and
 * forgotten.
 *
 * The two screens read the same registry in the same order, so a piece here that
 * is not there, or the reverse, is impossible rather than unlikely.
 *
 * ## The unused ones are named, and the used ones are counted
 *
 * Opposite shapes for opposite questions. *How often* is the interesting number
 * for a piece that is in use — a card used fourteen times is the shape of the
 * app — and for a piece used zero times the number is not the news, the name is.
 * A single list with a `0` in the corner buries the one row worth acting on among
 * the thirteen that are fine.
 *
 * ## And what the app has not turned on
 *
 * A registry is a decision, and the decision is invisible from inside the
 * deployment: a developer looking at four registered pieces cannot tell whether
 * four is all there is. So the library's own count sits beside it, with the names
 * one click down because ninety of them is a list and not a sentence.
 *
 * **Neutral, deliberately.** Registering fewer pieces is how a host keeps a page
 * on-brand, and a portal nagging somebody to turn ninety components on would be
 * worse than one that said nothing. The number is the news; what to do about it
 * is not this screen's opinion to have.
 */
export const PieceTally = ({
  pieces,
  missing,
  library,
}: {
  readonly pieces: readonly PieceUsage[]
  /** What Loom ships and this app has not registered. Named one click down. */
  readonly missing: readonly { readonly type: string; readonly name: string }[]
  /** How much of the library is on, in a sentence. `null` when all of it is. */
  readonly library: string | null
}) => {
  const used = pieces.filter((piece) => piece.used > 0)
  const unused = pieces.filter((piece) => piece.used === 0)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg tracking-tight">What it is built from</h2>
        <Link href="/portal/pieces" className="text-xs">
          What each piece is →
        </Link>
      </div>

      {used.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {used.map((piece) => (
            <li key={piece.type} className="flex items-baseline gap-1.5">
              <span>{piece.name}</span>
              <span className="text-ink-muted">×{piece.used}</span>
            </li>
          ))}
        </ul>
      )}

      {unused.length > 0 && (
        <div className="bg-surface-hover flex flex-col gap-1 rounded-sm p-3 text-xs">
          <strong className="font-medium">
            {unused.length === 1
              ? "One piece is registered and nothing uses it"
              : `${unused.length} pieces are registered and nothing uses them`}
          </strong>
          <p className="text-ink-muted">
            The AI is offered {unused.length === 1 ? "it" : "these"} every time you ask for a
            change, and has never put {unused.length === 1 ? "it" : "one"} on a page. That is
            either something your pages are missing, or something your project no longer needs.
          </p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
            {unused.map((piece) => (
              <li key={piece.type}>{piece.name}</li>
            ))}
          </ul>
        </div>
      )}

      {library !== null && (
        <div className="flex flex-col gap-1">
          <p className="text-ink-muted text-xs">{library}</p>
          {missing.length > 0 && (
            <TechnicalDetail summary="The pieces this app has not turned on">
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {missing.map((piece) => (
                  <li key={piece.type} className="font-mono">
                    {piece.type}
                  </li>
                ))}
              </ul>
            </TechnicalDetail>
          )}
        </div>
      )}

      {/*
        * The registry's own words, which are also exactly what the model is told
        * (0013). On the surface this screen speaks about pieces in a person's
        * words; a reader checking what the AI was actually handed needs the
        * runtime's, unaltered, and this is where it goes rather than nowhere.
        */}
      <TechnicalDetail summary="Every piece, as the catalogue has it">
        <dl className="flex flex-col gap-1">
          {pieces.map((piece) => (
            <div key={piece.type} className="flex flex-wrap gap-x-2">
              <dt className="font-mono">{piece.type}</dt>
              <dd className="text-ink-muted">{piece.description}</dd>
            </div>
          ))}
        </dl>
      </TechnicalDetail>
    </section>
  )
}
