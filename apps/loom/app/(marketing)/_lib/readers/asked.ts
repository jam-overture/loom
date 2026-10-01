import type { ReaderSignalTypes } from "@jam-overture/loom/signals/broadcast"

/**
 * What this site asks to be told about the people reading it.
 *
 * The broadcaster reports every kind about every addressed primitive unless a
 * host narrows it, and a host narrowing it is not an optimisation — it is the
 * whole of what a deployment is promising. So the promise is written here, in
 * one object, and `/what-readers-do` is the page that says it in words.
 *
 * **Nothing in this module reaches anything at runtime.** The only import is a
 * type, which is erased, so it costs a browser bundle its own two dozen lines
 * and no schemas — the property `deliver.ts` and `view.ts` have and the reason
 * `counting.ts` is a separate file: that one reads the environment and the
 * portal's proxy settings, and neither belongs in a page a stranger downloads.
 *
 * **Pinned here, derived in the test.** `asked.test.ts` walks every page this
 * site serves and asserts that what is named below is what the site actually
 * renders — so a band type nothing uses, or a control the site grew that
 * nothing asks about, is a red test. The lists are not computed from the pages,
 * because a list computed from the thing it describes cannot notice the thing
 * changing: that is the lesson #315 paid for with two funnel mutations that
 * passed.
 */

/**
 * The bands: what a reader travels through on the way down a page.
 *
 * The opening and the sections under it, which is what the counters are
 * interesting about, because *how far down did people get* is a question about
 * bands.
 *
 * **There was a third, and the test that found it is the reason it is gone.**
 * The row of four plain words on the front door was a `loom.logo-cloud`
 * standing at the top level of the page, so this list had to name that type to
 * count a band a reader scrolls through like any other — found by the test
 * rather than by writing the list, because nothing else would have said so. On
 * 20 September that row became an ordinary `loom.section` with an eyebrow and
 * no heading, for reasons that had nothing to do with counting, and the entry
 * stopped being reachable the same day. Two types covering every band of every
 * page is the shape this list should have; the third was a band wearing the
 * wrong primitive, and the list was carrying the cost of it.
 *
 * **The menu and the foot of the page are deliberately not here**, and the
 * menu is the one that matters: the bar is `position: sticky`, so it is on
 * screen for every second of every visit. Counting time on screen for it would
 * produce the largest figure on any report, about the one band nobody reads,
 * and a band that always wins is a band that makes every other reading look
 * small. The footer is left out for a quieter version of the same reason: it is
 * where the page stops rather than something a reader chose to reach, and
 * *they got to the bottom* is already what the last section's own reading says.
 */
export const BAND_TYPES = ["loom.hero", "loom.section"] as const

/**
 * The things a reader aims at: this site's buttons, its links, and its
 * wordmark.
 *
 * An activation is filed against **the control, not the band it sits in** — the
 * broadcaster reads the nearest addressed element to what was pressed, and a
 * link is a node of its own. That is a fact about the machinery worth knowing
 * before reading any report built out of this: *which button* is answerable,
 * and *which band somebody pressed something in* is not (filed 17 September,
 * for the lane that owns the arithmetic).
 *
 * The wordmark is included because leaving it out would not attribute its
 * presses elsewhere — a type this list does not name is a press counted
 * nowhere, and *they went back to the front door* is the most ordinary thing a
 * reader can do here.
 *
 * **`loom.card` joined them on 22 September, with the band that says what to
 * read next.** A card given an `href` renders an anchor and is registered
 * `interactive` for it, so it is a control by the library's own definition —
 * and it was the one such control this site rendered and did not ask about.
 * Two bands are answerable now that were not: *did the reader go on to the next
 * page of the argument*, which is the best question this site can ask about its
 * own reading order, and *which of the four destinations on the front door did
 * they take* — a card each, and every press on both was landing nowhere.
 */
export const CONTROL_TYPES = [
  "loom.action",
  "loom.card",
  "loom.link",
  "loom.brand",
] as const

/**
 * The one thing on this site that opens: a question in a questions band.
 *
 * Worth its own kind because opening something is a reader choosing to read
 * more, which is the argument `/what-readers-do` makes for the kind existing at
 * all.
 */
export const DISCLOSURE_TYPES = ["loom.faq"] as const

/**
 * Nothing on this site is a form, so nothing on it can be completed.
 *
 * Empty rather than absent, and the difference is the whole of what this list
 * does: a kind `types` does not name is reported for **every** addressed type,
 * so leaving `completed` out would have this site asking about a kind it has
 * no subject for. Empty asks about none, which is the true answer until there
 * is something here to submit.
 *
 * Written by `Loom signals` on 1 October, landing the fifth kind, because the
 * alarm below is red until somebody answers — and this is the answer a site
 * with no form has. The day marketing grows one, this is the line that says
 * what the site wants to hear about it (filed in `FINDINGS.md` the same day).
 */
export const COMPLETION_TYPES = [] as const

/**
 * The five kinds, each aimed at the types it means something for.
 *
 * A list per kind rather than one list for all four, which is what the shape
 * exists for (0136): time on screen is a question about bands, a press is a
 * question about controls, and asking both of everything would bury the reading
 * that matters under a `dwelled` for every link on screen several times a
 * minute.
 *
 * **A new kind is a red test rather than a silent gap.** `asked.test.ts`
 * holds these keys against `READER_SIGNAL_KINDS`, so the day a kind is added to
 * the runtime somebody has to decide what this site asks of it — the same alarm
 * `/what-readers-do` already carries for the words it prints, and for the same
 * reason: a surface that describes what Loom counts should not quietly stop
 * asking for part of it.
 */
export const SITE_SIGNAL_TYPES: ReaderSignalTypes = {
  viewed: [...BAND_TYPES],
  dwelled: [...BAND_TYPES],
  activated: [...CONTROL_TYPES],
  disclosed: [...DISCLOSURE_TYPES],
  completed: [...COMPLETION_TYPES],
}
