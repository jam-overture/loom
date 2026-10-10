import { spell } from "../journey"
import { ASKS, type Ask, type AskAnswer } from "./asks"

/**
 * What the band's five buttons actually do, counted rather than claimed.
 *
 * The front door's *see it happen* band ended its introduction with **"and one
 * of the five above will be refused, which is the part worth watching"**, under
 * a sentence promising that **"everything else a request may rearrange on its
 * own"**. Both halves had been there since 20 August and one of them was wrong:
 * three of the five go through on their own, one is refused, and the fifth —
 * *Get to the point* — **stops and asks the visitor**, which the sentence
 * offered no room for at all.
 *
 * That is worse than a wrong count. The middle answer is the product. Anything
 * with a model in it can show a page changing and a page refusing; what the
 * rules page calls *it waits for you* is the one this site exists to argue for,
 * and the band where a stranger first meets the mechanism described a world with
 * two answers in it. A visitor who pressed the button was told the page would
 * rearrange on its own and got a page that stopped to ask them — on a site whose
 * whole claim is that it can say in advance what will happen.
 *
 * So no sentence on this site counts what the five requests do. The count comes
 * off `ASKS`, and `answers.test.ts` puts every one of them through the real
 * sequence and holds the declaration to what came back. Same failure as the
 * step count on 1 September and the same fix: the number a page can count
 * should be counted.
 */

export type AnswerTally = Readonly<Record<AskAnswer, number>>

/**
 * The three, in the order the rules page introduces them — *it happens*, *it
 * waits for you*, *it does not happen*.
 *
 * Ascending severity, which is also the order a reader is least surprised by:
 * the ordinary case, then the one that involves them, then the one that cannot
 * be talked round. Two pages put the three in that order already and this is
 * what keeps a third from picking its own.
 */
export const ANSWER_ORDER: readonly AskAnswer[] = ["landed", "held", "refused"]

export const answerTallyOf = (asks: readonly Ask[] = ASKS): AnswerTally =>
  asks.reduce<AnswerTally>(
    (counted, ask) => ({ ...counted, [ask.answer]: counted[ask.answer] + 1 }),
    { landed: 0, held: 0, refused: 0 }
  )

/**
 * Each answer as the clause a sentence wants, singular and plural.
 *
 * Written in the visitor's words rather than the runtime's: nothing here says
 * *held*, *disposition* or *the Gate*, because this is the first band on the
 * first page and a stranger has met none of them. *Stops and asks you first* is
 * the same thing the rules page says as *it waits for you*.
 */
const CLAUSE: Readonly<Record<AskAnswer, (count: number) => string>> = {
  landed: (count) =>
    count === 1 ? "one goes through on its own" : `${spell(count)} go through on their own`,
  held: (count) =>
    count === 1 ? "one stops and asks you first" : `${spell(count)} stop and ask you first`,
  refused: (count) =>
    count === 1 ? "one is refused outright" : `${spell(count)} are refused outright`,
}

/**
 * A list of clauses as English joins them: nothing before a pair, and a comma
 * before the *and* of three or more.
 *
 * The site's other list — what the rules protect — joins noun phrases and never
 * reaches three, so it has no comma and needs none. These are clauses with
 * their own verbs, and one of them is *stops **and** asks you first*: without
 * the comma, "one stops and asks you first and one is refused outright" hands a
 * reader two *and*s doing different jobs in the same breath.
 */
const listed = (parts: readonly string[]): string => {
  if (parts.length < 2) return parts[0] ?? ""

  const last = parts[parts.length - 1] as string
  const rest = parts.slice(0, -1)

  return parts.length === 2 ? `${rest[0]} and ${last}` : `${rest.join(", ")}, and ${last}`
}

/** How many of the five are not simply applied: the held ones and the refused ones. */
export const exceptionsIn = (tally: AnswerTally): number => tally.held + tally.refused

/**
 * What the five do, in one sentence, for the band that offers them.
 *
 * Only the answers that actually occur are named. A band whose choices all
 * landed should not be introducing a refusal that is not on it — that is the
 * defect being fixed here, pointed the other way.
 */
export const whatTheChoicesDo = (asks: readonly Ask[] = ASKS): string => {
  const tally = answerTallyOf(asks)
  const clauses = ANSWER_ORDER.flatMap((answer) =>
    tally[answer] === 0 ? [] : [CLAUSE[answer](tally[answer])]
  )

  return `Of the ${spell(asks.length)} above, ${listed(clauses)}.`
}

/**
 * And which of them is worth staying for.
 *
 * The old sentence pointed at the refusal alone. Both exceptions are the point:
 * a refusal shows a floor, a hold shows the visitor being asked, and a reader
 * who watches only the first has seen the half that every competitor can also
 * demonstrate.
 */
export const worthWatching = (asks: readonly Ask[] = ASKS): string => {
  const exceptions = exceptionsIn(answerTallyOf(asks))

  return exceptions === 1
    ? "The one that does not just go through is the one worth watching."
    : `The ${spell(exceptions)} that do not just go through are the ones worth watching.`
}

/**
 * Why they are buttons rather than a text box, with the count read off the list.
 *
 * **This is the third sentence on this site to count the choices, and the only
 * one that was still typing the number.** The two above it were derived on
 * 1 October after the band spent sixteen runs telling a visitor that four of
 * the five requests went through on their own when three of them did. The note
 * at the top of this file ends *"a run that adds a sixth choice used to get a
 * page still calling the exception singular. Neither can happen now"* — and a
 * run adding a sixth choice got a page opening the next paragraph with *"These
 * five are prepared."*
 *
 * So it moved here, beside the other two, and the rule is the one the first fix
 * stated: **the number a page can count should be counted.** What the sentence
 * says is unchanged.
 */
export const whyTheyArePrepared = (asks: readonly Ask[] = ASKS): string =>
  `These ${spell(asks.length)} are prepared, so the whole sequence runs here without calling an AI model. To ask for something in your own words, try the demo. It is a page you can type into.`

/**
 * How many run into the rules, for the page that says so in the middle of a
 * sentence rather than at the end of one.
 *
 * The rules page has had this right since it was written — *"two of them run
 * into the rules in the table above"* — and had it right by having typed the
 * correct word. It is the same number as the front door's, so it comes off the
 * same list, and a sixth choice cannot leave one of the two pages behind.
 */
export const EXCEPTIONS_SPELLED = spell(exceptionsIn(answerTallyOf()))
