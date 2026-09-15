import type { ChangeRecord } from "./record"

/**
 * Whether a card shows the Gate's reasoning, or folds it under one line.
 *
 * **The measurement this exists for.** Driven at 1280×900 against a real
 * `next build`, five asks leave five cards of 496–593px in a rail 3,851px long
 * — four and a half screens — and the cards are near-identical: one of them is
 * twelve of its fourteen lines word for word the same as the first. The
 * repeated part is the same three blocks every time: the weighing panel
 * (140–156px), the rule's sentence (16px) and the ceiling comparison (32px).
 * Roughly two hundred pixels a card, saying what the card above it already
 * said.
 *
 * Two runs of this lane measured that and recommended the same fix, and both
 * left it as a product call rather than take it. The call is the maintainer's
 * own standing direction for this surface — *plain language is the default, the
 * technical record is one click away, nothing is ever removed* — and what this
 * applies it to is the second telling rather than the first.
 *
 * **The argument is made once, not never.** A card that folds its reasoning has
 * not stopped accounting for itself; it has stopped accounting for itself
 * *again*, to a reader who has the same three blocks open eight inches above.
 * `record-card.tsx` states the rule it is bending — that a demo whose whole
 * claim is that the runtime can account for itself must not put the account
 * behind a click — and it is exactly right about the card a visitor is reading
 * as the account. This decides which card that is.
 */
export type Reasoning = "open" | "folded"

/**
 * Open on the newest card, and on any card still waiting on the visitor.
 *
 * The second clause is not symmetry, it is a safety property, and it is why
 * this is a function rather than an index check. `weighed.ts` records that the
 * reversal answer — *"The 4 pieces it takes off the page are kept, so the exact
 * opposite of this change already exists"* — is **the sentence that makes the
 * green button pressable**: it is the only thing on the card telling a stranger
 * that saying yes to a described loss is safe. Folding it on a card whose
 * **Apply this change** is still live would put the reassurance behind a click
 * and leave the commitment in the open, which is worse than the repetition this
 * fixes and would be a real regression rather than a tidier rail.
 *
 * A hold the page has moved past is *not* waiting on the visitor — no answer
 * they can give will land it — so it folds like any other read card, and those
 * are the tallest cards in the rail. `moved` is passed in rather than read off
 * the record because the revision a hold was judged against lives on the hold
 * and not on the record (`moved.ts`), which is the same reason the card cannot
 * work this out for itself.
 *
 * Identity by `recordId` rather than by reference: answering a hold replaces
 * the record (`session.ts`), so the object in `records[0]` need not be the one
 * a caller is holding.
 */
export const reasoningFor = (
  record: ChangeRecord,
  records: readonly ChangeRecord[],
  moved: boolean
): Reasoning =>
  records[0]?.recordId === record.recordId || (record.heldProposalId !== undefined && !moved)
    ? "open"
    : "folded"
