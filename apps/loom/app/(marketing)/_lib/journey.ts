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
 * **Rewritten on 26 September at the maintainer's direction**, which was that
 * the site is too detailed and too close to the documentation, and should be
 * simple enough for a high schooler to follow. Two of the five were teaching a
 * stranger a word — *that list is called a delta*, *the part that applies them
 * is called the Gate* — on the page they meet the mechanism on. The words are
 * the documentation's to teach. What each step *does* is unchanged; what is
 * gone is the naming, and about half the length.
 */
export const JOURNEY: readonly JourneyStep[] = [
  {
    title: "Someone asks for something",
    body: "They ask in their own words, about one page. Nothing has moved yet.",
  },
  {
    title: "The AI writes down what it wants to change",
    body: "The model does not write code. It sends back an exact list: add this, remove that, move the other, change a setting.",
  },
  {
    title: "The change is measured",
    body: "Loom measures how much of the page it moves, what it touches, and whether it can be taken back cleanly.",
  },
  {
    title: "Your rules decide",
    body: "You get one of three answers: do it, hold it for a person to review, or reject it. Loom tells you which of your rules decided.",
  },
  {
    title: "What happened is written down",
    body: "Loom records who asked, what moved, and the change that puts it back. Nothing is overwritten.",
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
export type PlainWord = {
  /** The word itself, which is the whole point: a stranger already knows it. */
  readonly word: string
  /**
   * The one line that makes the word mean something here rather than anywhere.
   *
   * **Each line is the fact the hero's paragraph does not already carry.** That
   * constraint is what took the band from four gray nouns to a band worth its
   * place, and it is easy to lose: the sentence above this band says *ask in
   * your own words · checked against your rules · a record of who asked, what
   * moved and how to put it back*, which is these four words in a row. A gloss
   * restating it would be the same claim printed twice, one screen apart, and
   * every line below was written by asking what a competitor could not say
   * under this word.
   *
   * So *Ask* says who may, *Check* says whose rules, *Record* says what the
   * record is made of, and *Undo* says when the reversal is worked out. None of
   * those four is in the paragraph above.
   */
  readonly line: string
}

/**
 * The four words, each with the line that earns it.
 *
 * They were rendered as a `loom.logo-cloud` until 20 September — four bare
 * nouns in muted gray under a small label, which is the primitive for *the
 * companies who use us* holding a vocabulary instead. It photographed as an
 * empty strip, and a stranger meeting *Ask · Check · Record · Undo* with no
 * object to any of the four verbs has been told nothing.
 *
 * `loom.feature` is the one that was built for this — a title and a sentence,
 * with `surface: "plain"` for exactly the case where the band is not a wall of
 * cards. **`loom.milestone-row` is the tempting one and it is the wrong one**:
 * it numbers its entries and draws a connector between them, which would put a
 * *fourth step* on the first screen one click above a page headed *Five steps,
 * every time, in the same order* — the defect the paragraph above this was
 * written to close, redrawn in a primitive rather than said in a label.
 */
export const PLAIN_WORDS_GLOSSED: readonly PlainWord[] = [
  {
    word: "Ask",
    line: "Anyone can ask: you, a colleague, a visitor, or the page itself reacting to what it sees. You decide in advance how far each of them can go.",
  },
  {
    word: "Check",
    line: "Loom checks the change against rules you wrote down ahead of time. You get the same answer whether or not anyone is watching.",
  },
  {
    word: "Record",
    line: "You get a plain sentence saying what changed and which rule allowed it. Loom writes it down whether the change was accepted or rejected.",
  },
  {
    word: "Undo",
    line: "Loom works out how to undo a change at the same time it makes it, and saves both. It never has to guess the undo later from how the page looks now.",
  },
]

/** The words alone, for the places that need the vocabulary and not the gloss. */
export const PLAIN_WORDS: readonly string[] = PLAIN_WORDS_GLOSSED.map(({ word }) => word)

/** What the front door calls them, counted off the list rather than typed. */
export const PLAIN_WORDS_LABEL = `Every change, in ${spell(PLAIN_WORDS.length)} words`
