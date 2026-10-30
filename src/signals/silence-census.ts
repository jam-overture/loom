import { formKeyOf, inFormOrder, type PageForm } from "./audiences.js"
import type {
  SilenceCondition,
  SilenceMeaning,
  SilenceSubject,
  SilenceVocabulary,
} from "./silences.js"

/**
 * What a window could not answer, and what each reason cost it.
 *
 * [`silences.ts`](silences.ts) settled what a reading means when it says
 * nothing: a hundred and fourteen names across twenty sets, each mapped to the
 * condition it reports and the subject that condition is true of, so that two
 * readings reporting one state report it once
 * ([0240](../../decisions/0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)).
 * It publishes `relateSilences`, which holds two reasons against each other,
 * and `distinctSilences`, which collapses the readings of one card to the states
 * they are actually in.
 *
 * **Nothing has ever called either of them.** Twenty sets, one relation and a
 * dedup, and the only file in the repository that imports them is their own
 * test — because the call they are shaped for is *one card*, and the thing an
 * operator holds is a window of forty pages with nine readings over each. The
 * vocabulary is finished and the question over it was unaskable, which is the
 * one condition this lane treats as a counter that is not done.
 *
 * This is that question: hand over the silences as a surface holds them, one per
 * reading, and get back the states the window is in, with **what each one
 * cost**. It is one more thing taken out of what the subsystem already knows
 * rather than collected: no payload, no browser change, no counter that does
 * not exist, no column and no byte on any wire.
 *
 * ## A state is one condition about one subject, and that rule is not restated
 *
 * Two readings are in one state when `relateSilences` says `one-state`, which
 * is the same condition about the same subject. Two that agree on the condition
 * alone stay two, because *the window held no page views* said of a page and
 * said of a comparison are not one sentence and the narrower is not evidence for
 * the wider (0240).
 *
 * So the grouping key is that pair, which is the relation's own definition
 * written as a string rather than a second opinion about it. A rule spelled
 * twice is the thing this subsystem has been bitten by — two hand-written
 * copies of the door's scaling rule, and two upsert keys that agreed until they
 * did not — and the key cannot call `relateSilences` without turning a grouping
 * into a scan per entry. So the two are **held together by a test** instead, as
 * a DDL default and the constant it spells are: no two states of a census may
 * be ones the relation would call `one-state`, over a window built to produce
 * both of the ways that could go wrong.
 *
 * ## What a reason cost is readings and pages, and a page is counted once
 *
 * A state carries two counts and they answer different questions.
 * {@link SilenceStanding.readings} is how many readings it took, which is the
 * figure *how much of this window is dark* is asked of.
 * {@link SilenceStanding.forms} names the pages, **each once however many of
 * their readings report it** — the rule a fault in a deployment's collection
 * already follows, where a page is counted once however many faults it has
 * ([0271](../../decisions/0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md)).
 *
 * The two are not each other. One page whose nine readings are all `unmeasured`
 * is nine readings and one page; nine pages with one such reading each is nine
 * and nine; and the remedies differ — the first is one door row and the second
 * is a deployment.
 *
 * The page is a **form** and not a revision
 * ([0263](../../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md),
 * [0290](../../decisions/0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md)),
 * keyed by the published rule rather than by a tree id: two forms of one page
 * are two readerships and a tree alone is not one page, which every comparison
 * in this subsystem keys on and none of them spells out twice
 * ([0293](../../decisions/0293-a-comparison-pairs-pages-by-form-and-the-pairing-rule-is-published-beside-the-reading-rule.md)).
 *
 * ## The other grouping is the same entries read the other way
 *
 * The states say *which reasons this window has*. A form row says *what this
 * page answered*, which is the question after it and is the same entries
 * transposed — the shape a region map took when it was asked which pages a
 * place's readers read, and free for the same reason: nothing is collected, the
 * rows are grouped the other way.
 *
 * It is the grouping that carries the sentence worth putting at the top of a
 * screen, because it is the one with a denominator. *Nine of this page's nine
 * readings are silent, for one reason* is a page to fix; one silence out of nine
 * is a page that is working.
 *
 * ## What is deliberately not published
 *
 * **No ranking of the states.** They are not comparable in what they cost: a
 * page's `no-view-reported` takes every reading of that page, and a library's
 * `nothing-of-the-kind` takes one row of one census and means *you do not use
 * this kind of part*, which is not a fault at all. The counts are published and
 * the order is the order the readings were handed over, so a surface that means
 * *most readings* or *most pages* sorts by the figure it means. That is the
 * shape this lane settled for a verdict it could not take honestly: publish the
 * figure and let the operator read it.
 *
 * **No total of pages across the states**, for
 * [0158](../../decisions/0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)'s
 * reason one level up: one page is in as many states as it has reasons, so a
 * sum over {@link SilenceStanding.forms} counts it once per reason. What is
 * published instead partitions — every reading handed in is in exactly one
 * state or in none, so {@link SilenceCensus.silent} is the sum of the states'
 * readings, and that identity is published rather than described.
 *
 * **No sentence of its own.** A state is a condition and a subject, both of
 * which `silences.ts` already prints a line for, and the only thing a third
 * sentence would add is the counts — which is pluralisation, and belongs to
 * whoever is drawing the screen in whatever language it is in.
 *
 * Pure, and linear in the readings handed over. It reaches no store, no clock
 * and no DOM, and the arithmetic is addition — nothing here survives into a
 * browser bundle.
 */

/** One reading's silence, with the page it was a reading of. */
export type ReadingSilence = {
  /**
   * What the reading reported, as the matching `meaningOf…Silence` gives it, or
   * `null` where it answered.
   *
   * Nullable rather than the whole entry being nullable, which is the one way
   * this differs from `distinctSilences`' argument and the reason the form
   * grouping has a denominator at all: a reading that answered is still a
   * reading of that page, and dropping it before the call would make *nine of
   * nine* and *one of one* the same row.
   */
  readonly meaning: SilenceMeaning | null
  /**
   * The page in the form this reading was of, or absent where the reading is of
   * no one page.
   *
   * A library census and an order over a deployment's pages are of something
   * larger than a page, and their silences are about a kind and about a page
   * respectively — a reading's subject is not its scope (0240). Those are
   * counted in {@link SilenceCensus.wide} rather than attributed to a form that
   * would be a guess.
   */
  readonly form?: PageForm | null
}

/** One state the window is in, and what it cost. */
export type SilenceStanding = {
  readonly condition: SilenceCondition
  readonly subject: SilenceSubject
  /**
   * The vocabulary of the **first** reading that reported it, kept so that a
   * surface can still print that reading's own sentence.
   *
   * `distinctSilences`' rule, unchanged: the names are right in their own set
   * and collapsing a state does not make one of them wrong.
   */
  readonly vocabulary: SilenceVocabulary
  /** Every vocabulary that reported it, each once, in the order they arrived. */
  readonly vocabularies: readonly SilenceVocabulary[]
  /** How many readings reported it. */
  readonly readings: number
  /** The pages it cost, each once however many of their readings reported it. */
  readonly forms: readonly PageForm[]
  /** How many of the readings that reported it were of no one page. */
  readonly wide: number
}

/** What one group of readings answered. */
export type SilenceGroup = {
  /** Every reading handed over in this group, silent or not. */
  readonly readings: number
  /** How many of them were silent. */
  readonly silent: number
  /**
   * The distinct states they are in, in the order they arrived, each keeping the
   * first reading's vocabulary.
   */
  readonly states: readonly SilenceMeaning[]
}

/** What one page in one form answered. */
export type FormSilences = SilenceGroup & {
  readonly form: PageForm
}

/** The states a window is in, and what each of them cost. */
export type SilenceCensus = {
  /**
   * Every reading handed over, silent or not, which is the denominator the
   * caller chose by choosing what to hand in.
   */
  readonly readings: number
  /** How many of them were silent. `readings = silent + answered`. */
  readonly silent: number
  readonly answered: number
  /**
   * The distinct states, in the order the readings were handed over.
   *
   * Their `readings` sum to {@link silent}, because every silent reading is in
   * exactly one state. Their `forms` do **not** sum to anything.
   */
  readonly states: readonly SilenceStanding[]
  /** The same readings by page, in form order rather than arrival order. */
  readonly byForm: readonly FormSilences[]
  /** The readings of no one page, which no form row holds. */
  readonly wide: SilenceGroup
}

/** What one state is, which is `relateSilences`' `one-state` written as a key. */
const stateKeyOf = (meaning: SilenceMeaning): string =>
  `${meaning.condition}\u0000${meaning.subject}`

type Standing = {
  readonly condition: SilenceCondition
  readonly subject: SilenceSubject
  readonly vocabulary: SilenceVocabulary
  readonly vocabularies: SilenceVocabulary[]
  readings: number
  readonly forms: Map<string, PageForm>
  wide: number
}

const standing = (meaning: SilenceMeaning): Standing => ({
  condition: meaning.condition,
  subject: meaning.subject,
  vocabulary: meaning.vocabulary,
  vocabularies: [],
  readings: 0,
  forms: new Map(),
  wide: 0,
})

type Grouping = {
  readings: number
  silent: number
  readonly states: Map<string, SilenceMeaning>
}

const grouping = (): Grouping => ({ readings: 0, silent: 0, states: new Map() })

const addTo = (into: Grouping, meaning: SilenceMeaning | null): void => {
  into.readings += 1

  if (meaning === null) return

  into.silent += 1

  const key = stateKeyOf(meaning)

  if (!into.states.has(key)) into.states.set(key, meaning)
}

const groupOf = (of: Grouping): SilenceGroup => ({
  readings: of.readings,
  silent: of.silent,
  states: [...of.states.values()],
})

/**
 * The states a window is in, out of the silences its readings published.
 *
 * Takes one entry per reading rather than one per silence, so that a page's
 * readings have a denominator, and groups them twice: by the state, which is a
 * condition and a subject, and by the page.
 *
 * Linear in the entries. A page's forty readings and a deployment's forty pages
 * are sixteen hundred entries, and each one touches two maps.
 */
export const silenceCensusOf = (readings: readonly ReadingSilence[]): SilenceCensus => {
  const states = new Map<string, Standing>()
  const forms = new Map<string, Grouping & { readonly form: PageForm }>()
  const wide = grouping()

  for (const reading of readings) {
    const form = reading.form ?? null

    if (form === null) {
      addTo(wide, reading.meaning)
    } else {
      const key = formKeyOf(form)
      const held = forms.get(key) ?? { ...grouping(), form }

      addTo(held, reading.meaning)
      forms.set(key, held)
    }

    if (reading.meaning === null) continue

    const key = stateKeyOf(reading.meaning)
    const held = states.get(key) ?? standing(reading.meaning)

    held.readings += 1

    if (!held.vocabularies.includes(reading.meaning.vocabulary)) {
      held.vocabularies.push(reading.meaning.vocabulary)
    }

    if (form === null) held.wide += 1
    else held.forms.set(formKeyOf(form), form)

    states.set(key, held)
  }

  const silent = [...states.values()].reduce((total, held) => total + held.readings, 0)

  return {
    readings: readings.length,
    silent,
    answered: readings.length - silent,
    states: [...states.values()].map((held) => ({
      condition: held.condition,
      subject: held.subject,
      vocabulary: held.vocabulary,
      vocabularies: [...held.vocabularies],
      readings: held.readings,
      forms: [...held.forms.values()].sort(inFormOrder),
      wide: held.wide,
    })),
    byForm: [...forms.values()]
      .sort((one, other) => inFormOrder(one.form, other.form))
      .map((held) => ({ form: held.form, ...groupOf(held) })),
    wide: groupOf(wide),
  }
}
