/**
 * The path a change takes, named once.
 *
 * Every page of this site talks about the same journey, and until today each of
 * them counted it separately. The steps were enumerated in one place — the
 * milestone list on the mechanism page — and the *number* of them was typed out
 * as an English word in six other sentences across three files. Five of those
 * said five. The front door said four.
 *
 * That is the same failure `FACTS` was built to end, one level in. A number the
 * page can count should be counted; a number typed from memory is a claim that
 * happens to be true today. The difference is that `FACTS` counts the
 * repository and this counts the site's own argument — which is the harder one
 * to notice going wrong, because nothing outside this directory moves when it
 * does. A sixth step would have left six correct-looking sentences behind,
 * every test green, and a stranger reading two different numbers for one thing.
 *
 * So the list is here, the count comes off `JOURNEY.length`, and no sentence on
 * this site spells a step count of its own.
 */

/** One step of the journey: what happens, and what that means in plain words. */
export type JourneyStep = {
  /** The heading a reader sees. A sentence, not one of our nouns. */
  readonly title: string
  /** What it means, written for somebody who has never heard of any of this. */
  readonly body: string
}

/**
 * The five steps, in the order they happen, and this is the only place they are
 * written down.
 *
 * They were literal `loom.milestone` props on the mechanism page until this
 * run. Nothing about the words has changed — they are moved, not rewritten,
 * because the copy is not what was wrong with them.
 */
export const JOURNEY: readonly JourneyStep[] = [
  {
    title: "Someone asks for something",
    body: "In their own words, about one particular page. Nothing has been worked out yet and nothing has moved.",
  },
  {
    title: "The AI writes down what it wants to change",
    body: "It is shown an outline of the page and the list of pieces it is allowed to use. It answers with an exact list of changes — add this, remove that, move the other, change a setting — and with why it wants them and who asked. That list is called a delta, and it is the only thing that travels from here on.",
  },
  {
    title: "The change is measured",
    body: "Facts before opinions: what it touches, how much of the page it moves, and whether it can be taken back cleanly.",
  },
  {
    title: "Your rules decide",
    body: "They read those measurements and give one of three answers — do it, hold it for a person to look at, or refuse it — and name the rule that answered. The part that applies them is called the Gate.",
  },
  {
    title: "What happened is written down",
    body: "The change goes into a log with who asked for it and the change that would undo it. That log is the page’s history — nothing is overwritten and nothing is lost.",
  },
]

/**
 * A small number as the word a sentence wants.
 *
 * The site writes *five steps* rather than *5 steps*, which is right for prose
 * and is exactly why the number went stale: `JOURNEY.length` does not read as
 * an English sentence, so whoever wrote the sentence typed the word instead.
 * This is the missing half — the count, spelled — so the sentence can be
 * composed from the list and still read like a sentence.
 *
 * Bounded deliberately, and a numeral is a better failure than a wrong word, so
 * anything larger comes back as digits rather than throwing on a page a visitor
 * is loading.
 *
 * **The bound was ten until 13 September**, on the reasoning that past ten a
 * marketing sentence should not be counting at all. `/who-can-ask` is the
 * counter-example: its whole band is four requests put by four askers, and
 * *sixteen answers* is the claim rather than an incidental tally. So it runs to
 * twenty — far enough for a page to count something it deliberately counted,
 * and short of the range where the reasoning above starts being right again.
 */
const NUMBER_WORDS: readonly string[] = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
]

export const spell = (count: number): string =>
  Number.isInteger(count) && count >= 0 && count < NUMBER_WORDS.length
    ? (NUMBER_WORDS[count] as string)
    : String(count)

/**
 * The same, as a sentence starts it.
 *
 * The mechanism page opens with the count — *Five steps, every time* — and a
 * headline that began with a lowercase word because it was composed would be a
 * worse page than the one with the literal in it.
 */
export const spellCapitalised = (count: number): string => {
  const word = spell(count)

  return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`
}

/** How many steps there are, as prose says it. */
export const STEPS = spell(JOURNEY.length)

/** The same, to open a sentence with. */
export const STEPS_CAPITALISED = spellCapitalised(JOURNEY.length)

/**
 * The ordinal, for the sentences that point at one line rather than count them.
 *
 * The refusal band says *this is the fifth, and there is no sixth* about the
 * record it is printing. Both of those are positions in a list the page holds,
 * so both are derivable — and both were typed.
 */
const ORDINALS: readonly string[] = [
  "zeroth",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
]

export const ordinal = (position: number): string =>
  Number.isInteger(position) && position >= 0 && position < ORDINALS.length
    ? (ORDINALS[position] as string)
    : `${position}th`

/**
 * The four words on the front door, which are **not** the steps.
 *
 * This is the distinction the site had lost, and the reason the two numbers
 * disagreed rather than one of them simply being wrong. The band under the
 * hero shows four plain words a stranger already knows; the mechanism page
 * shows five steps a change goes through. Four words is not a shorter count of
 * five steps — *Undo* is not a step at all, it is the thing the last step
 * leaves behind, and it is on the front door because it is the most reassuring
 * word this product owns.
 *
 * Both were correct. What was wrong was calling this list *steps*, one screen
 * above a button leading to a page headed with a different number. A visitor
 * who notices has been shown, on the first screen, that this site cannot count
 * the thing it says it counts for you.
 *
 * So the words stay, the label stops claiming a step count, and
 * `journey.test.ts` holds the front door to it.
 */
export const PLAIN_WORDS: readonly string[] = ["Ask", "Check", "Record", "Undo"]

/** What the front door calls them, counted off the list rather than typed. */
export const PLAIN_WORDS_LABEL = `Every change, in ${spell(PLAIN_WORDS.length)} words`
