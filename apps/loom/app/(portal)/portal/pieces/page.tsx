import Link from "next/link"

import { renderCatalogue } from "@jam-overture/loom"
import { catalogueOf } from "@jam-overture/loom/sdk"

import { CardGrid, Measured, Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { portalRegistry } from "@/app/(portal)/_lib/registry"

import { PieceCard } from "./_components/piece-card"

/**
 * What the AI is allowed to put on a page here, and nothing else.
 *
 * This was `/portal/primitives`. A primitive is the framework's word — it is in
 * the marketing lane's own list of words a visitor has never heard — and the
 * page led with it in lower case over the sentence *"This is exactly what a
 * model is told it may build."* Both halves of that sentence are the most
 * valuable thing on the screen and neither was written for the person reading
 * it.
 *
 * The route is `/portal/pieces` because *piece* is what the rest of the portal
 * already calls one. A change's plain reading says *"it brings 3 more pieces
 * with it"* and *"the 4 pieces inside it"*; a reviewer moving from that sentence
 * to this page should not have to learn a second word for the thing they just
 * read about. `/portal/primitives` answers permanently with a 308, the same
 * shape the three earlier renames took.
 *
 * The claim the page exists to make is the one a repository cannot make: **this
 * list bounds what an AI can do to your pages.** It is not a document about the
 * catalogue, it is the catalogue — the same projection `catalogueOf` hands the
 * interpreter, read from the same registry (0013) — so a piece on this page that
 * a proposal cannot use, or the reverse, is impossible rather than unlikely.
 * Each card carries the line the model is given, produced by the runtime's own
 * formatter, which is what turns the claim into something a reader can check.
 */
const PiecesPage = async () => {
  await requireActor("/portal/pieces")

  const catalogue = catalogueOf(portalRegistry)

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl tracking-tight">What Loom can put on your page</h1>
          {catalogue.length > 0 && (
            <Link href="/portal/pages" className="text-xs">
              Ask for a change →
            </Link>
          )}
        </div>

        {/*
         * Two leads rather than one with a clause in it, and neither says what
         * the notice below already says. The first draft of this screen had the
         * empty lead reading "the AI has nothing it can build with" directly
         * above a notice headed "There is nothing here for the AI to build
         * with" — the same fact twice, one line apart, which is the defect this
         * lane has now shipped and photographed four times. Found by looking at
         * the page.
         */}
        <Measured>
          <p className="text-ink-muted text-sm">
            {catalogue.length === 0
              ? "This is the list of pieces the AI is handed every time you ask for a change."
              : `Your project is set up with ${catalogue.length} kinds of piece. The AI is handed this exact list every time you ask for a change — anything that is not on it has nothing to draw it, so it would never appear on your page.`}
          </p>
        </Measured>
      </header>

      {catalogue.length === 0 ? (
        /*
         * The clearest instance of "what do I do now?" on this surface, and the
         * one a new person is most likely to meet: a deployment that has
         * registered nothing renders no pages at all, and the old screen said so
         * with the heading, the count `0 registered.` and an empty list.
         *
         * An empty catalogue is a developer's problem with a developer's fix, so
         * the action leaves the portal. That is the honest next move, and it is
         * better than a reassuring sentence that leads nowhere.
         */
        <StateNotice
          tone="empty"
          title="There is nothing here for the AI to build with."
          action={
            <Link href="/docs/building-with-loom/primitives">How to add the first one →</Link>
          }
        >
          <p>
            Loom brings no components of its own. It can only use what this project has
            registered, and this project has registered none — so a request to add anything
            would come back with nothing to show for it.
          </p>
          <p>
            That is the whole bargain, seen from its empty end: what you register is the
            complete list of what an AI can do to your site.
          </p>
        </StateNotice>
      ) : (
        /*
         * A grid, which is what the eighteen of these were always waiting for.
         * They were a single column: eighteen self-contained cards, each a name,
         * a sentence and a row of chips, stacked down a 768-pixel strip. Nothing
         * on one of them refers to the one above it, which is the test for
         * whether a list wants to be a column at all.
         *
         * 320 rather than the page cards' 288. A piece card's widest line is its
         * description — a real sentence — and at 288 the common ones wrap to four
         * lines and the cards stop being the same height as each other.
         */
        <CardGrid min={320}>
          {catalogue.map((primitive) => (
            <li key={primitive.type}>
              <PieceCard primitive={primitive} />
            </li>
          ))}
        </CardGrid>
      )}

      {catalogue.length > 0 && (
        <TechnicalDetail summary="The whole list, as the AI receives it">
          <p className="text-ink-secondary">
            This block is sent with every request for a change, ahead of your page itself. It
            is the same catalogue this screen is built from, rendered by the runtime rather
            than by this page, so the two cannot disagree.
          </p>
          <pre className="text-ink-secondary border-edge-subtle bg-surface-hover overflow-x-auto rounded-sm border p-2 font-mono whitespace-pre-wrap">
            {renderCatalogue(catalogue)}
          </pre>
          <p>
            Adding to it is a developer&rsquo;s job and a code change, not a setting in here —{" "}
            <Link href="/docs/building-with-loom/primitives">how to register a piece</Link>.
          </p>
        </TechnicalDetail>
      )}
    </Screen>
  )
}

export default PiecesPage
