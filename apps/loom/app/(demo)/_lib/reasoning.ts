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
 * The second telling is not always the card below. **It is sometimes the same
 * card, one press later** — and that is the case this file missed for a
 * fortnight.
 *
 * The demo's one invited sequence is two presses: *Take the numbers off*, then
 * *Apply this change*. The first produces a card that is **a question**, and its
 * reasoning is open on it because it has to be: the reversal answer is the
 * sentence that makes the green button pressable. The second press answers that
 * question, and the very same card comes back as **a receipt** — same
 * `recordId`, same stakes, same reversibility, the same weighing panel, the same
 * rule, the same ceiling comparison, all of it word for word — with *You said
 * yes* added above it and **Put it back** added below it.
 *
 * So a visitor who has just read that argument in order to act on it is handed
 * it again, unchanged, as the answer to *what did I just do*. Nothing about it
 * is new and nothing about it is what they are now asking.
 *
 * ## What the second telling costs, measured
 *
 * It is not a tidiness argument, because the repetition is standing on the
 * demo's closing line. Driven at 1280 × 900 against a production `next build`,
 * at the moment the whole demonstration is for:
 *
 * | | |
 * | --- | --- |
 * | the applied card | **975px** |
 * | the rail's viewport | **857px** |
 * | so the card, landed at the rail's top | **118px too tall to be read at once** |
 * | **Put it back**, the inverse this surface exists to offer | bottom edge **23px below the frame** |
 * | the caution under it | off screen with it |
 * | the blocks the visitor had already read, on that card | the weighing panel, the rule, the ceiling — **≈190px** |
 *
 * The demonstration shows the change *and the record of it*, and the record's
 * most-load-bearing part is the inverse: a button that really puts it back.
 * That button was off the bottom of the payoff frame **because the card was
 * making its case twice**, and the run before this one had to choose which end
 * of the card to lose. Folding the second telling is what makes the choice
 * unnecessary: the whole card fits the frame.
 *
 * ## The rule, and why it is these two conditions
 *
 * A card folds its reasoning once **the visitor answered it and the change
 * landed**. Both halves are load-bearing and neither is a proxy for the other:
 *
 * - **`answeredBy`** is the evidence that they have *already read it*. A hold's
 *   reasoning is open while it waits (below), so an answer is proof the argument
 *   was on screen at the moment it was being acted on. A change that applied on
 *   its own was never held and never argued in front of anybody — the card is
 *   the *first* telling, and it stays open. That is the whole claim for a
 *   low-risk ask: Loom did this by itself, and here is what it weighed.
 * - **`revision`** is the evidence there is now something *else* on the card to
 *   read. A declined ask has `answeredBy` set too and produces no revision: it
 *   grows no undo, no *what came off*, no kept band, so folding it would buy
 *   nothing and hide the only content it has.
 *
 * Everything else is unchanged. The newest card opens, every card under it
 * folds, and a card still waiting on the visitor opens wherever it has ended up.
 */
const alreadyReadWhileDeciding = (record: ChangeRecord): boolean =>
  record.answeredBy !== undefined && record.revision !== undefined

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
 *
 * **And the answered card is the one exception to the newest card opening**,
 * for the reason above it: being newest is what makes a card the account, and
 * having been answered is what makes it the *same* account a second time.
 */
export const reasoningFor = (
  record: ChangeRecord,
  records: readonly ChangeRecord[],
  moved: boolean
): Reasoning =>
  !alreadyReadWhileDeciding(record) &&
  (records[0]?.recordId === record.recordId || (record.heldProposalId !== undefined && !moved))
    ? "open"
    : "folded"
