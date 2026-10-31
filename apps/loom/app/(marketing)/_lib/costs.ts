import { buildElement, type IdFactory, type LoomNode } from "@jam-overture/loom"

import { BAND } from "./bands"
import { section } from "./nodes"

/**
 * What Loom costs, which this site has never said.
 *
 * ## Where the permission comes from, because this is the one subject a run
 * may not invent
 *
 * Positioning and pricing are the maintainer's, and the standing instruction of
 * 27 September was blunt: *no reference to pricing should remain, we haven't
 * figured that out yet.* `voice.test.ts` has held the site to it since, and the
 * site has been silent about money for five weeks.
 *
 * **He answered it on 24 October**, and `docs/positioning.md` records the
 * answer in his words:
 *
 * > *"Someone installs it, if they want easy hook up for signals and to their
 * > AI models, they'll pay for the portal."*
 *
 * The file's reading of that, written the same day, is the two sentences below
 * and the sentence that bounds them:
 *
 * > - **The framework is free and installed.** `npm install`, and it works.
 * > - **The portal is the paid part.** What it sells is not having to wire up
 * >   the signals and the model connection yourself.
 * >
 * > The front door may say both. Pricing beyond *the framework is free and the
 * > portal is paid* is not settled and is not this lane's to invent.
 *
 * So this band says exactly those two things and stops. `costs.test.ts` holds
 * it to that from both ends: the claims are here rather than typed into the
 * page, and the band may not grow a third one.
 *
 * ## The instruction of 27 September is not overruled, and nothing was relaxed
 * to land this
 *
 * Worth saying plainly, because the obvious way to write this band is to widen
 * the rule that was stopping it. Nothing was widened. `PRICED` in
 * `voice.test.ts` catches amounts, periods, named plans and the word *pricing*;
 * it has never caught *free* or *paid* on their own, and the copy below passes
 * it unchanged. The rule as the maintainer left it already permits the only
 * claim he has authorised and still refuses everything past it, which is the
 * happiest possible relationship between an instruction given in September and
 * an answer given in October.
 *
 * ## Why it is a band rather than a better answer in the band of questions
 *
 * It was already in the band of questions, and that is how this was found.
 * *Do I need an account to use this?* carried a 94-word answer — **the longest
 * single string on this site** — which spent two of its five sentences on what
 * the portal is and whether it is a service you sign up for. A reader only
 * meets it by opening the fifth row of an accordion on the eighth band of the
 * page, and the one thing a developer wants to know before running an install
 * command is not something to hide behind a disclosure control.
 *
 * That answer is now the length of its question, and the two sentences it was
 * carrying on this subject are here, said once, where somebody deciding whether
 * to install something can see them.
 */

/** One side of the answer: what you get, and whether you pay for it. */
export type CostClaim = {
  /** What it is called. The same two words the rest of the site uses. */
  readonly what: string
  /** What you get, and what it asks of you. */
  readonly body: string
}

/**
 * The two claims, in the order the maintainer's sentence puts them.
 *
 * **Two, and a test holds it to two.** A third card is this lane inventing
 * positioning, whatever it says, because the file that authorises these two is
 * explicit that everything past them is unsettled.
 *
 * The bodies are deliberately about **what you do and do not have to build**
 * rather than about value. His sentence prices the portal in work avoided —
 * *easy hook up for signals and to their AI models* — and that is the most
 * useful thing it can say to the reader `docs/positioning.md` names, who is a
 * junior developer weighing an afternoon.
 */
export const COST_CLAIMS: readonly CostClaim[] = [
  {
    what: "The framework",
    body: "You install the two packages above and build with them. It keeps working whether or not you ever open the portal.",
  },
  {
    what: "The portal",
    body: "It connects your page to your AI model and collects what your readers do, so you do not have to build either one.",
  },
]

/**
 * The band, under the install command and above the band of ways in.
 *
 * **Under the install command** because the question is *what is this going to
 * cost me*, and a reader asks it the moment they are shown something to run.
 * **Above the ways in** because the portal is one of the four cards there, and
 * a reader who meets that card having already been told what the portal is for
 * presses it for the right reason.
 *
 * `loom.feature-grid` rather than `loom.tier-table` or `loom.offering-grid`,
 * and the choice is the whole of the restraint this band needs. Both of those
 * are built to put an amount beside a name — a tier's price is its headline —
 * and a band that *looks* like a pricing table invites the next run to fill in
 * the number that belongs in it. Two features say the two facts and have
 * nowhere to put a third thing.
 */
export const costs = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: BAND.costs },
    "The framework is free. You pay for the portal.",
    [
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "two", density: "tight" },
        children: COST_CLAIMS.map(({ what, body }) =>
          buildElement(ids, {
            type: "loom.feature",
            props: { title: what, body, surface: "plain" },
          })
        ),
      }),
    ]
  )
