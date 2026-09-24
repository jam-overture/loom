/**
 * What the portal calls a revision.
 *
 * ## The word already existed, on one screen
 *
 * `revision` is the runtime's word for an entry in a tree's log, and it is on
 * the plain-language list this lane judges its own sentences against
 * (`_test/plain-language.ts`). It was also the heading of every row on
 * `/portal/history`, the text of every `RevisionLink` on four screens, the label
 * on the box you type a number into, and four sentences on `/portal/readers` —
 * so the rule had to be suspended wherever it was actually tested. Two test
 * files carried `runtimeWordsIn(said, ["revision"])`, and the comment on one of
 * them said out loud why:
 *
 * > *`revision` is exempted at the point of use rather than removed from the
 * > list … a blanket ban would have this rule enforcing an inconsistency.*
 *
 * That reasoning was right about the inconsistency and wrong about which side
 * to resolve it on, because the portal had **already chosen a plain word for
 * exactly this thing** and was using it a screen away. `plainObstacle` tells a
 * reviewer *"This was worked out on an older version of this page"*, and
 * `standingNote`'s own commentary calls the number *"the version"* four times
 * while printing `revision` at the reader.
 *
 * So the word is `version`, it was the portal's before this module existed, and
 * what this module does is stop it being written out by hand in eight places.
 *
 * ## The number stays on the surface
 *
 * A revision number is **identity**, not technical detail — the 22 August rule —
 * and it travels: it is in a URL, in a node's attribution, in a report, in a
 * message from whoever asked for the change. Somebody holding one has to be able
 * to match it against what a screen shows them. Nothing here removes it; what
 * changes is the word in front of it.
 *
 * ## And the runtime's word is one click down
 *
 * `onTheRecord` is the third of these and the reason there are three. A reader
 * checking the portal's wording against the log, or grepping a deployment's
 * telemetry, needs the runtime's own name for the thing — so the row that lost
 * `Revision 4` from its heading gains `revision 4` in the disclosure beneath it.
 * Plain language is the default; the technical record is one click away; nothing
 * is ever removed.
 */

/** In the middle of a sentence — *"counted on version 12 of this page"*. */
export const versionMention = (revision: number): string => `version ${revision}`

/** Opening a sentence, or heading a row. */
export const versionHeading = (revision: number): string => `Version ${revision}`

/**
 * The runtime's own name for the same number, for the record behind a
 * disclosure. It is deliberately the one of the three that does **not** read
 * plainly, and `version.test.ts` asserts that in both directions.
 */
export const versionOnTheRecord = (revision: number): string => `revision ${revision}`
