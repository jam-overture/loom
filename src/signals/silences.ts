import { everyMemberOf } from "../closed-set.js"

import type { ActionChangeSilence } from "./action-change.js"
import type { ChangeSilence } from "./change.js"
import type { CopyChangeSilence } from "./copy-change.js"
import type { CopySilence } from "./copy.js"
import type { FormComparisonSilence } from "./forms.js"
import type { FunnelChangeSilence } from "./funnel-change.js"
import type { DeploymentChangeSilence } from "./deployment-change.js"
import type { DeploymentSilence } from "./deployment.js"
import type { KindActionSilence } from "./library-action.js"
import type { KindChangeSilence } from "./library-change.js"
import type { KindCopyChangeSilence } from "./library-copy-change.js"
import type { KindReachChangeSilence } from "./library-reach-change.js"
import type { KindReachSilence } from "./library-reach.js"
import type { KindWordReachChangeSilence } from "./library-word-reach-change.js"
import type { KindSilence } from "./library.js"
import type { PaceChangeSilence } from "./pace-change.js"
import type { PaceSilence } from "./pace.js"
import type { ReachSilence } from "./reach.js"

/**
 * What two readings mean when they both say nothing, and whether they mean the
 * same thing.
 *
 * Every reading in this subsystem publishes a closed set of reasons a figure is
 * absent, and there are seventeen of them. Each set's names are right in its own
 * sentence, and across them they overlap in two ways that a surface drawing
 * two readings on one card has to resolve and nothing until now would resolve
 * for it.
 *
 * **Two names for one reason.** A window that held no page views is
 * `nothing-measured` to a before-and-after reading and `unmeasured` to a copy
 * reading. One condition, two spellings, and a card that printed both said the
 * same thing twice in two voices.
 *
 * **One name for two reasons, which is the half nobody had noticed.** A copy
 * reading's `unmeasured` is *the window's counters report no views of this
 * revision*. A reach reading's `unmeasured` is *there is no page-view row at
 * the door for this revision* — and a deployment can be in either one without
 * being in the other, because the two are read off different rows. The node
 * counters can be full of readers while the door row is missing, which is what
 * an upgraded deployment's first reading looks like. A surface that kept its
 * own table of synonyms would have mapped these two together, and it would have
 * been wrong in the direction that hides a fault.
 *
 * ## So the remedy is a mapping and not a renaming
 *
 * Renaming could not have worked, and the reason is the shape of what is
 * published here. A silence has **two** parts: the condition it reports, and
 * the thing that condition is true of. `nothing-measured` and `unmeasured` are
 * the same condition said of different subjects — a comparison names no side,
 * so *one of the two windows was empty* is a fact about the pair, while a copy
 * reading's is a fact about its one page. Two synonyms are not synonyms when
 * one of them is about twice as much, and a screen that collapsed them would
 * report the page in front of somebody as unmeasured when it was the other
 * side that was quiet.
 *
 * So each set keeps its names, nothing is superseded, and what is added is the
 * statement of which condition each name reports and what it is about. Where
 * two silences agree on both, one sentence serves; where they agree on the
 * condition alone, the same thing is true of a page and of one of its parts,
 * which is worth two sentences and never one.
 *
 * ## What the subject turned out to be
 *
 * It is a property of the **reading** and not of the silence: every reason a
 * copy reading gives is about its page, every reason a pace reading gives is
 * about one part, every reason a census of the library gives is about one kind
 * of part, and every reason any of the three comparisons gives is about the
 * pair. That is why the subjects are published as one table over the
 * vocabularies rather than as a field on nine conditions, and it is the
 * strongest form the answer has — a surface that knows which reading it is
 * drawing already knows what its silences are about.
 *
 * **It is not the reading's own scope, which the seventh set is the first to
 * show.** An order over a deployment's pages is silent about one of its
 * members: the order stands and one page is not in it, so every reason it gives
 * is about a page while the reading is of something larger. The claim above
 * holds — the subject is uniform across the set and is a property of the
 * reading — and the thing it was easy to read into it, that a reading's
 * silences are about the reading, was never true of anything but the first six.
 *
 * Pure, and the arithmetic is a comparison of two string pairs. It reaches no
 * store, no clock and no DOM, and it adds nothing to the broadcaster's import
 * graph: the imports here are types only, so nothing in this module survives
 * into a browser bundle at all.
 */

/** What a silence is a fact about. */
export type SilenceSubject =
  /** One revision of one page, and the window of counters read against it. */
  | "page"
  /** One part of one revision. */
  | "part"
  /**
   * The two readings held against each other, naming neither side.
   *
   * The distinction that makes this worth having: *one of the two windows held
   * no page views* does not say which, so a card cannot draw it over the page
   * somebody is looking at. A reading of one page that says the same thing is
   * about the page on the screen.
   */
  | "comparison"
  /**
   * One kind of part, everywhere it stands in the pages read.
   *
   * The fourth subject, and the first that is not a thing a deployment holds. A
   * page, a part and a pair all exist because something was read; a kind comes
   * from the **vocabulary** — a primitive type or a role — so a reading of one
   * can be silent because there is none of it, which no reading whose rows come
   * from the data could ever report.
   */
  | "kind"

export const SILENCE_SUBJECTS: readonly SilenceSubject[] = everyMemberOf<SilenceSubject>()([
  "page",
  "part",
  "comparison",
  "kind",
])

/** One line per subject, for a surface naming what a reason is about. */
export const describeSilenceSubject = (subject: SilenceSubject): string => {
  switch (subject) {
    case "page":
      return "this version of the page, and the window read against it"
    case "part":
      return "one part of the page"
    case "comparison":
      return "the two readings together, neither side named"
    case "kind":
      return "one kind of part, everywhere it stands in the pages read"
  }
}

/**
 * Which reading published a silence.
 *
 * `reach` covers the funnel as well, because a funnel answer reuses
 * `ReachSilence` rather than restating it: the three reasons there is no
 * denominator are states of the deployment and not of the question asked, so
 * there is one vocabulary and not two.
 */
export type SilenceVocabulary =
  | "action-change"
  | "change"
  | "copy"
  | "copy-change"
  | "deployment"
  | "deployment-change"
  | "forms"
  | "funnel-change"
  | "library"
  | "library-action"
  | "library-change"
  | "library-copy-change"
  | "library-reach"
  | "library-reach-change"
  | "library-word-reach-change"
  | "pace"
  | "pace-change"
  | "reach"

export const SILENCE_VOCABULARIES: readonly SilenceVocabulary[] =
  everyMemberOf<SilenceVocabulary>()([
    "action-change",
    "change",
    "copy",
    "copy-change",
    "deployment",
    "deployment-change",
    "forms",
    "funnel-change",
    "library",
    "library-action",
    "library-change",
    "library-copy-change",
    "library-reach",
    "library-reach-change",
    "library-word-reach-change",
    "pace",
    "pace-change",
    "reach",
  ])

/**
 * What each reading's reasons are about.
 *
 * Published as a table over the vocabularies because that is what it is: the
 * subject is a property of the reading, uniform across its whole set, and a
 * caller holding a silence it has not yet mapped can read the subject off this
 * before it reads the condition.
 */
export const SUBJECT_OF_VOCABULARY: Readonly<Record<SilenceVocabulary, SilenceSubject>> =
  Object.freeze({
    "action-change": "comparison",
    change: "comparison",
    copy: "page",
    "copy-change": "comparison",
    deployment: "page",
    "deployment-change": "comparison",
    forms: "comparison",
    "funnel-change": "comparison",
    library: "kind",
    "library-action": "kind",
    "library-change": "kind",
    "library-copy-change": "kind",
    "library-reach": "kind",
    "library-reach-change": "kind",
    "library-word-reach-change": "kind",
    pace: "part",
    "pace-change": "comparison",
    reach: "page",
  })

/**
 * The state of the world a silence reports, named once for the whole subsystem.
 *
 * Fifteen of them against eighty-four members across the seventeen sets, which
 * is the overlap this module exists to state. None of them replaces a set's own name:
 * a reading still reports its own vocabulary, and this is what that vocabulary
 * means.
 *
 * **Neither the sixth set nor the seventh needed a tenth condition**
 * ([0244](../../decisions/0244-a-pace-moved-because-the-words-moved-or-the-readers-did-and-a-counterfactual-says-which.md),
 * [0250](../../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)),
 * which was the evidence that these are the states of the world rather than a
 * list of the names the modules before them happened to use. The seventh was
 * the stronger of the two: it is the first reading whose subject is not a page,
 * a part or a pair, and its reasons still landed on conditions already here.
 *
 * **The eighth needed exactly one, and the reason is the thing worth writing
 * down** ([0251](../../decisions/0251-a-change-to-what-readers-did-is-a-ratio-of-two-shares-and-an-inside-a-change-gave-a-part-is-not-a-reader.md)).
 * `no-action-credited` is the first condition here that is not about a reader
 * being absent, a row being absent or a word being undeclared: it is a window
 * whose counters are present and whose **nought is a filing rule** rather than
 * a measurement (0167, 0242). Nothing before a reading of what readers *did*
 * could be in that state, so the earlier evidence is narrowed and not
 * falsified — these are still the states of the world, and the way a new one
 * arrives is with a reading that can be in one nothing else could.
 *
 * **The ninth needed one as well, and it is the same rule holding rather than a
 * second exception**
 * ([0257](../../decisions/0257-a-kind-of-part-is-read-across-the-places-it-stands-and-the-unit-is-the-placement.md)).
 * A census of the library is the first reading whose rows are keyed by the
 * **vocabulary** and not by what a deployment holds, so it is the first that can
 * report `nothing-of-the-kind`: every earlier set's subject exists by
 * construction wherever its row does. It also brought the fourth subject, which
 * is the first time a set has added one — and the two arrived together for one
 * reason, because a subject that comes from a vocabulary is exactly a subject
 * that can be empty.
 *
 * **The tenth needed neither, and it is the first since the seventh to need
 * nothing at all**
 * ([0256](../../decisions/0256-a-kinds-share-of-the-readers-who-met-it-is-a-weighted-mean-of-sound-shares-at-the-doors-scale.md)).
 * A kind's share of the readers who met it is withheld for the states of the
 * **door**, which were all named the first time a share of readers was taken of
 * anything (0229), and for the two reasons the census of the same kinds already
 * published. That is the shape of a set that adds nothing: it asks an old
 * question of a new subject.
 *
 * **What it did show is that a set cannot always be reused, and the reason is
 * the subject.** A funnel answer reports a reach silence unchanged, because a
 * funnel is asked of a page and so is a reach reading, and the subject here is
 * a property of the **reading**. A kind's share is asked of a kind, so the
 * same three door states are published in two vocabularies at two subjects —
 * which is not a duplication to remove but exactly the pair this module exists
 * to relate: `one-reason`, never `one-state`.
 *
 * **The eleventh needed one, and it is the first condition about the shape of a
 * page** ([0265](../../decisions/0265-what-readers-do-inside-a-kind-of-part-is-a-share-of-the-readers-who-met-it-and-the-door-is-only-a-weight.md)).
 * `nothing-inside` is a kind of part standing only in places with no element
 * part under them, so a reader could not have acted in one: the question does
 * not exist rather than having gone unanswered. Every condition before it is
 * about a window, a row, a vocabulary or a filing rule, and all of those would
 * change if the deployment were read differently or read more — this one would
 * be exactly as true if every reader in the world had read every page. Its one
 * sibling is `says-nothing`, which is the same fact about a page's **words**,
 * and the pair is now the shape of a page in the two things a reader can do
 * with a part: read it and act in it.
 *
 * The same set is also the first to take another's whole type rather than
 * standing beside it. The tenth found that a set cannot be reused across
 * subjects; the eleventh is asked of a kind as well, so its five inherited
 * members are the same states at the same subject and need no second spelling.
 *
 * **The twelfth needed none, and it is where the claim above was most exposed**
 * ([0266](../../decisions/0266-a-change-to-a-kind-of-part-is-read-over-the-places-both-windows-bore.md)).
 * A comparison of two windows of one library is the first comparison whose
 * subject is not the pair: its rows are keyed by the vocabulary, so every reason
 * it gives is about one kind of part across both windows rather than about the
 * two readings together. `unpaired` is `nothing-carried` — the state a
 * comparison of two windows' words reports of words and a comparison of two
 * paces reports of parts, said here of a **place** — and the other two are the
 * census's own. The subject being a property of the reading and not of its scope
 * is what makes that work; a `comparison` subject here would have put *one of
 * the two windows was quiet* over a row about a primitive type.
 *
 * **The thirteenth needed none either, and it is the first set assembled out of
 * three** ([0270](../../decisions/0270-a-change-to-the-words-a-kind-of-part-says-is-read-over-the-words-both-windows-say-and-a-floor-costs-the-signed-figure.md)).
 * A comparison of two windows' words at the scale of a library reports the
 * census's `unplaced`, the places comparison's `unpaired`, and the two states a
 * change to one page's words already reports of that page — `wordless` and
 * `floored` — said of a kind rather than of a page. The last pair is the
 * instructive one: `words-a-floor` arrived with a reading of **one page's**
 * words, and it is reported here at a different subject for the same reason the
 * door's three states are reported at two (`one-reason`, never `one-state`).
 * `floored` is also the only member of any set here that withholds a single
 * figure while every other figure on its row stands, which is what a reading
 * whose denominator is a count of words rather than of readers can do.
 *
 * **The fourteenth needed none either, and it is the first set assembled out of
 * two readings of its own question**
 * ([0279](../../decisions/0279-a-kinds-share-of-the-readers-who-met-it-is-compared-at-each-windows-own-weights-and-a-counterfactual-says-which-side-moved.md)).
 * A reader-weighted comparison of a kind of part reports the census's
 * `unplaced`, the places comparison's `unpaired` and `unread`, and the three
 * states of the **door** said of a kind — which is the tenth set's five members
 * and the twelfth's three, overlapping in two. Nothing is new because nothing
 * can be: a comparison needs its figure withheld for every reason one window's
 * figure is withheld, and for no reason a window could be in on its own.
 *
 * What it does add is a **side**, and the side is deliberately not a condition.
 * One page can be scalable in one window and not in the other, so the reading
 * publishes which window each unscalable page is on — a fact about the page and
 * not about the state, exactly as the pages that cause a tenth-set silence are
 * published with a reach silence on them rather than a fourth spelling of it.
 *
 * **The fifteenth needed none either, and it is the first set assembled out of
 * four**
 * ([0280](../../decisions/0280-the-words-of-a-kind-of-part-the-typical-reader-reached-are-weighted-once-per-page-and-a-floor-withholds-every-difference.md)).
 * A comparison of the words one reader got to reports the census's `unplaced`,
 * the places comparison's `unpaired`, the door's three said of a kind, and the
 * two a comparison of a library's words already reports — `wordless` and
 * `floored`. Eight members, four sources, and no state of the world that was
 * not already here.
 *
 * What it does settle is the reach of `words-a-floor`. That condition arrived
 * with a reading of one page's words, which withholds one figure for it; the
 * thirteenth said it of a kind, withholding one figure again; and this one
 * withholds **five** — every figure a surface would subtract. The condition is
 * the same state of the world in all three and what it costs is not, which is
 * why what a silence withholds was never published here and belongs to the
 * reading that reports it.
 *
 * **The thirteenth condition arrived without a set of its own, which is the
 * first time that has happened**
 * ([0282](../../decisions/0282-a-word-nothing-can-be-said-about-is-in-no-mass-and-a-page-that-reports-no-reach-has-no-mean.md)).
 * Two of the sets already here gained a member — the third and the fourth, the
 * two readings of a page's words — and the state they report is one nothing
 * else could: **the counters are there and not one of them reports being
 * reached.** Every earlier condition about a reader being absent is an absence
 * of rows or of readers, and this one is a window with readers in it whose
 * every reach is a nought that is a missing counter rather than a measurement.
 *
 * So the pattern `no-action-credited` set is now a pair, which is the thing
 * worth having written down. That condition is a nought that is a **filing
 * rule** — a press credited to no ancestor because the sender sent no `within`
 * (0167, 0242). This one is a nought that is a **missing report** — a part that
 * reported something other than coming into view, so no `viewed` ever named it
 * (0212). Two senders half-working in two different ways, and a deployment told
 * the wrong one would go looking in the wrong place.
 *
 * It also narrows what the evidence above was ever evidence of. A new condition
 * does not need a new reading; it needs a reading that can be in a state
 * nothing else could, and a set that has been published for a month can turn
 * out to have been in one all along.
 *
 * **The sixteenth needed none either, and it is the first set whose members
 * withhold half of their reading**
 * ([0288](../../decisions/0288-a-change-to-a-funnel-is-two-shares-that-factor-and-a-difference-of-two-floors-is-a-bracket.md)).
 * A comparison of two windows' funnels reports the state every comparison here
 * reports, the door's three said of a pair, and `nothing-carried` said of a
 * **question** a deployment wrote rather than of a word or of a place.
 *
 * **The seventeenth needed none either, and its subject is the one combination
 * this table had not held**
 * ([0291](../../decisions/0291-a-deployments-change-is-two-orders-at-the-doors-scale-because-a-page-has-no-net-movement.md)).
 * Its reading is of a deployment and every reason it gives is about one
 * **comparison** — the seventh set's observation at one more remove: an order
 * is silent about its members rather than about itself, and here a member is
 * itself a pair of windows. So the subject is not the page the order is over
 * and not the deployment the order is of, and it is still uniform across the
 * set, which is the claim this table rests on.
 *
 * `mispaired` is also the second name for the state a before-and-after reading
 * calls `different-trees`, and the two are deliberately not spelled alike: a
 * comparison handed two pages has nothing to say at all, while an order holding
 * such a comparison has thirty-nine other pages and one row to print a reason
 * against.
 *
 * What it shows is that the cost of a condition belongs to the reading and not
 * to the condition, which 0280 found at one figure and this finds at half a
 * screen. The door's three leave a funnel comparison's rates, its movements and
 * what a change did to its questions standing, and withhold only its shares of
 * the arrivals — because a rate is two counts off one row and needs no count of
 * the readers who arrived. A surface reading any condition as *this row says
 * nothing* would throw away the half that still answers.
 *
 * **The fifteenth condition arrived without a set of its own either, and it is
 * the first that is about what the caller handed in**
 * ([0300](../../decisions/0300-what-audience-a-reading-is-of-is-a-three-way-answer-and-a-window-of-two-forms-is-read-as-neither.md)).
 * The sixteenth set gained a member: a comparison one side of which was read as
 * **neither** of the two forms in its window. Every other condition here is
 * about the deployment, the window or the shape of the page, so every other
 * remedy is a place to go and look; this one's remedy is an instruction —
 * split the window by audience and read each form on its own.
 *
 * It is held apart from `two-audiences` on purpose, and the pair is the whole
 * argument for its existence. That is two sides of two **known** populations,
 * where the arithmetic is right and only the sentence on top of it is wrong.
 * This is one side of no population at all, because two forms of a page share a
 * tree and a revision (0263) and are told apart by a column (0284) — so a
 * reading handed both with neither asked for has nothing to hold against
 * anything. A deployment given either in place of the other goes to the wrong
 * remedy.
 */
export type SilenceCondition =
  /** The two readings are of different trees, so nothing in either is comparable. */
  | "two-pages"
  /**
   * The two readings are of two audiences, so they are of two populations.
   *
   * The sibling of `two-pages`, and the pair is why this is its own condition.
   * Two pages make every figure absurd; two forms of one page compare cleanly
   * and carry a sentence about a readership that was varied rather than held
   * still. Reported only where both readings name an audience and the two
   * differ.
   */
  | "two-audiences"
  /**
   * Nothing reported a view of it.
   *
   * Of a page, the window's counters say no view of this revision happened. Of
   * a part, no view reported that part coming into view, which a window with
   * readers in it can say about any part they did not reach.
   */
  | "no-view-reported"
  /**
   * There is no page-view row at the door for this revision.
   *
   * Not the same state as nothing having been seen, and the pair is the reason
   * this mapping is published. The node counters can hold a window of readers
   * while this row is missing — a deployment whose intake predates the column,
   * one whose rows have expired, or a caller that fetched the rows for
   * something else — and the counters are then still a floor on how many
   * readers there were.
   */
  | "no-arrivals-counted"
  /**
   * The row is there and nothing in it says a page view ever began.
   *
   * Two deployments look like this, and which one it is turns on whether any
   * appearance has been counted: nobody has read this revision, or **the
   * senders are not marking their openings** and every rate on the screen has
   * no denominator while the counters look healthy. The reading publishes both
   * numbers, so the diagnosis is a subtraction a surface can make; the
   * condition is what the two have in common and no more.
   */
  | "no-openings-marked"
  /** Readers arrived and no rollup has folded a window of their reading yet. */
  | "no-window-folded"
  /** It says nothing that could have been read: no words, and nothing undeclared either. */
  | "says-nothing"
  /**
   * Some of its words are a floor, because a type in it declares no `copy`
   * (0122).
   *
   * A count of words survives this and a mean of them does not, which is why
   * the readings that hit it withhold a figure rather than a row.
   */
  | "words-a-floor"
  /**
   * It reports more readers than it has views, which no rollup produces.
   *
   * A reading assembled by hand, or by a sender that is not one. It is the
   * alarm a reading raises where a figure would otherwise stay plausible while
   * being about nothing.
   */
  | "readers-above-views"
  /** The change left no word of the page as it was, so there is no carried text to read. */
  | "nothing-carried"
  /**
   * The window holds actions and credits none of them to a reader.
   *
   * A press is filed against the control and credited to the addressed ancestors
   * the signal carries (0167), so a sender whose delegated signals have no
   * `within` adds occurrences and no reader anywhere. The counters are present
   * and look healthy; what is wrong is that every share built on them is a
   * nought that is a filing rule rather than a measurement (0242).
   *
   * The one condition here about a **nought that is not an absence**, which is
   * why no earlier set could report it. The occurrence counts survive it intact,
   * because they are filed against the part a reader used and need no ancestry.
   */
  | "no-action-credited"
  /**
   * There is none of it in the pages read.
   *
   * Not a measurement that is missing: the thing being asked about is absent
   * from the library, which only a reading keyed by a vocabulary can say. A role
   * no primitive declares and a type nothing places are both this, and the
   * instruction it carries is the opposite of every other condition here —
   * there is nothing to measure rather than nothing measured.
   */
  | "nothing-of-the-kind"
  /**
   * It has nothing inside it, so there is nothing a reader could act in.
   *
   * A press is filed against the control and credited to the addressed
   * ancestors it happened inside (0167), so a part with no element part under it
   * reports a nought for ever — which is the state `says-nothing` is for a
   * page's words, one counter across.
   *
   * **The second condition here about the shape of the page rather than about
   * the window**, and the pair is what makes the claim above still hold: these
   * are states of the world, and the way a new one arrives is with a reading
   * that can be in one nothing before it could. A reading of what readers *did*
   * to a **kind** of part is the first that can report it, because a kind is
   * answered over the places it stands and the question does not exist where
   * none of them has an inside.
   */
  | "nothing-inside"
  /**
   * Its counters are there and not one of them reports being reached.
   *
   * Readers arrived — the window holds page views — and every part of what the
   * figure is about has a row whose reach is nought. A part that reported
   * something other than coming into view is `unknown` and never `skipped`
   * (0212), because a reader who pressed something inside a band no `viewed`
   * ever named plainly had it in front of them, and a mean taken over nought
   * reader-words would print *nobody read any of this* as a measurement.
   *
   * **The sibling of `no-action-credited`, and the pair is the reason this is
   * its own condition rather than a second spelling of `no-view-reported`.**
   * That is a nought which is a filing rule, this is a nought which is a
   * missing report, and `no-view-reported` is a nought which is a reader who
   * was not there. A deployment handed the wrong one of the three looks in the
   * wrong place: at its funnel pairs, at its senders, or at nothing, because
   * quiet traffic is not a fault.
   */
  | "no-reach-reported"
  /**
   * One window holds two forms of the page and the asking named neither.
   *
   * The sibling of `two-audiences` and not a second spelling of it. That is two
   * readings of two **known** populations held against each other, where the
   * arithmetic is right and the sentence on top of it is wrong. This is one
   * window that is of no population at all: two forms of a page share a tree
   * and a revision (0263) and are told apart by a column (0284), so a reading
   * handed both with neither asked for reads neither — the alternatives being
   * to sum two populations or to pick one of them by the order rows arrived in.
   *
   * **The condition about what the caller handed in**, where every other here
   * is about the deployment, the window or the shape of the page. The remedy is
   * therefore the only one in this set that is an instruction to the caller
   * rather than a place to look: split the window by audience and read each
   * form on its own.
   */
  | "two-forms-unsplit"
  /**
   * The two readings are of two revisions of the page.
   *
   * The sibling of `two-pages` and of `two-audiences`, and the third side of
   * what any comparison has to hold still. One page over two revisions with the
   * readership held still is a before-and-after (0224); two forms of one page at
   * one revision with the tree held still is a
   * comparison of two populations; **both at once is neither**, because the
   * movement then carries two causes and nothing in the counters separates them.
   *
   * No reading could report it before one existed whose subject is the
   * readership: every comparison until then varied the revision on purpose, so
   * two revisions was the premise rather than a fault.
   */
  | "two-revisions"
  /**
   * Both readings are of one audience, so there is not a second population.
   *
   * **The only condition here about too few of something**, where every other
   * is about something missing or something doubled. It is `two-audiences`
   * turned over: that refuses a comparison for varying the readership where it
   * had to be held still, and this refuses one for holding it still where it had
   * to be varied. A deployment reading it is holding one form twice, and the
   * question it can ask of that pair is a before-and-after.
   */
  | "one-population"
  /**
   * Nothing recorded which audience the window was of.
   *
   * One population read whole, which is the correct answer for every window
   * written before the column existed (0284) and is no answer at all to a
   * question **about** the population. Held apart from `two-forms-unsplit`
   * because the remedies are opposite: that one is a window to split, this one
   * is a window from before there was anything to split by, and there is nothing
   * a caller can do to it.
   */
  | "no-audience-named"

export const SILENCE_CONDITIONS: readonly SilenceCondition[] = everyMemberOf<SilenceCondition>()([
  "two-pages",
  "two-audiences",
  "no-view-reported",
  "no-arrivals-counted",
  "no-openings-marked",
  "no-window-folded",
  "says-nothing",
  "words-a-floor",
  "readers-above-views",
  "nothing-carried",
  "no-action-credited",
  "nothing-of-the-kind",
  "nothing-inside",
  "no-reach-reported",
  "two-forms-unsplit",
  "two-revisions",
  "one-population",
  "no-audience-named",
])

/**
 * One line per condition, written so that it reads after the subject it is
 * about rather than naming one itself.
 *
 * Each set's own `describe` is the sentence for one reading and stays the right
 * thing to print there. This is the sentence for the state, which is what a
 * surface needs when it is speaking about two readings at once.
 */
export const describeSilenceCondition = (condition: SilenceCondition): string => {
  switch (condition) {
    case "two-pages":
      return "the two readings are of different pages"
    case "two-audiences":
      return "the two readings are of different audiences, and so of different readers"
    case "no-view-reported":
      return "nothing reported a view of it"
    case "no-arrivals-counted":
      return "no page views have been counted at the door for it"
    case "no-openings-marked":
      return "nothing has said a page view began"
    case "no-window-folded":
      return "readers arrived and no window of their reading has been counted yet"
    case "says-nothing":
      return "it says nothing that could be read"
    case "words-a-floor":
      return "some of its words are a floor, because a type in it declares no copy"
    case "readers-above-views":
      return "it reports more readers than views, which no rollup produces"
    case "nothing-carried":
      return "the change left no word of the page as it was"
    case "no-action-credited":
      return "it holds actions and credits none of them to a reader"
    case "nothing-of-the-kind":
      return "there is none of it in the pages that were read"
    case "nothing-inside":
      return "it has nothing inside it, so there is nothing a reader could act in"
    case "no-reach-reported":
      return "its counters are there and not one of them reports being reached"
    case "two-forms-unsplit":
      return "one window holds two forms of the page and says which readers neither"
    case "two-revisions":
      return "the two readings are of two revisions, and so not of one page held still"
    case "one-population":
      return "both readings are of one audience, so there is no second population"
    case "no-audience-named":
      return "nothing recorded which audience it was of"
  }
}

/** What one reading's silence reports, and what it reports it of. */
export type SilenceMeaning = {
  readonly condition: SilenceCondition
  readonly subject: SilenceSubject
  /** The reading that published it, kept so that its own sentence can still be printed. */
  readonly vocabulary: SilenceVocabulary
}

const meaning = (vocabulary: SilenceVocabulary, condition: SilenceCondition): SilenceMeaning => ({
  condition,
  subject: SUBJECT_OF_VOCABULARY[vocabulary],
  vocabulary,
})

/**
 * What a comparison of what readers *did* reports (0251).
 *
 * A comparison, so its subject is the pair and never the page on the screen —
 * and `unwalked` is the one member of any set that does not say which side it is
 * true of while being the one a surface most wants to name. The two readings
 * travel on the comparison, each with its own `unwalked`, which is where that is
 * answered; the condition is what the two sides have in common and no more, as
 * `no-openings-marked` is for a deployment.
 */
export const meaningOfActionChangeSilence = (silence: ActionChangeSilence): SilenceMeaning => {
  switch (silence) {
    case "different-trees":
      return meaning("action-change", "two-pages")
    case "different-audiences":
      return meaning("action-change", "two-audiences")
    case "unwalked":
      return meaning("action-change", "no-action-credited")
    case "nothing-measured":
      return meaning("action-change", "no-view-reported")
    case "dissolved":
      return meaning("action-change", "nothing-carried")
  }
}

/** What a before-and-after reading's silence reports (0224). */
export const meaningOfChangeSilence = (silence: ChangeSilence): SilenceMeaning => {
  switch (silence) {
    case "different-trees":
      return meaning("change", "two-pages")
    case "different-audiences":
      return meaning("change", "two-audiences")
    case "audiences-mixed":
      return meaning("change", "two-forms-unsplit")
    case "nothing-measured":
      return meaning("change", "no-view-reported")
  }
}

/**
 * What a copy reading's silence reports (0235, 0282).
 *
 * `unspoken` is the newer of the two reasons there is no mean, and the one that
 * brought this table its thirteenth condition: a page whose rows report no
 * reach at all is not a page nobody read.
 */
export const meaningOfCopySilence = (silence: CopySilence): SilenceMeaning => {
  switch (silence) {
    case "wordless":
      return meaning("copy", "says-nothing")
    case "unmeasured":
      return meaning("copy", "no-view-reported")
    case "floored":
      return meaning("copy", "words-a-floor")
    case "unspoken":
      return meaning("copy", "no-reach-reported")
    case "inconsistent":
      return meaning("copy", "readers-above-views")
  }
}

/**
 * What a comparison of two windows' words reports (0239, 0282).
 *
 * Six of its seven reasons are states of the pair; `unspoken` is the same state
 * a copy reading reports, said of the carried passages rather than of the page.
 */
export const meaningOfCopyChangeSilence = (silence: CopyChangeSilence): SilenceMeaning => {
  switch (silence) {
    case "different-trees":
      return meaning("copy-change", "two-pages")
    case "different-audiences":
      return meaning("copy-change", "two-audiences")
    case "wordless":
      return meaning("copy-change", "says-nothing")
    case "nothing-measured":
      return meaning("copy-change", "no-view-reported")
    case "inconsistent":
      return meaning("copy-change", "readers-above-views")
    case "dissolved":
      return meaning("copy-change", "nothing-carried")
    case "floored":
      return meaning("copy-change", "words-a-floor")
    case "unspoken":
      return meaning("copy-change", "no-reach-reported")
  }
}

/**
 * What an order over a deployment's pages reports, of one of them (0250).
 *
 * Every reason here is a fact about one revision of one page, so the subject is
 * the page — which is the one case this table did not have, and the only thing
 * about it that is new. A reading of a deployment is silent about its **members**
 * rather than about itself: the order stands, and one page is not in it.
 *
 * `unscaled` is the second name in this subsystem for the state a share-of-readers
 * reading calls `unmeasured`, and the two are deliberately not spelled alike. A
 * reach reading has nothing to say at all without a row at the door; an order has
 * a complete reading of that page and is missing only what would make it
 * comparable with another, which is a different sentence to print even though it
 * is one state of the world.
 */
export const meaningOfDeploymentSilence = (silence: DeploymentSilence): SilenceMeaning => {
  switch (silence) {
    case "unread":
      return meaning("deployment", "no-view-reported")
    case "unsplit":
      return meaning("deployment", "two-forms-unsplit")
    case "unscaled":
      return meaning("deployment", "no-arrivals-counted")
    case "unopened":
      return meaning("deployment", "no-openings-marked")
    case "inconsistent":
      return meaning("deployment", "readers-above-views")
  }
}

/**
 * What an order over what a change did to a deployment reports, of one page's
 * comparison (0291).
 *
 * The seventeenth set. Every reason is a fact about one comparison, so the
 * subject is the pair even though the reading is of a deployment — which is the
 * combination this table did not have, and the only thing about it that is new.
 *
 * `unread` is the condition a before-and-after reading reports as
 * `nothing-measured`, said here of the comparison that is not in the order
 * rather than of the order; `mispaired` is that reading's `different-trees` for
 * the same reason.
 */
export const meaningOfDeploymentChangeSilence = (
  silence: DeploymentChangeSilence
): SilenceMeaning => {
  switch (silence) {
    case "unread":
      return meaning("deployment-change", "no-view-reported")
    case "mispaired":
      return meaning("deployment-change", "two-pages")
    case "unsplit":
      return meaning("deployment-change", "two-forms-unsplit")
    case "unscaled":
      return meaning("deployment-change", "no-arrivals-counted")
    case "unopened":
      return meaning("deployment-change", "no-openings-marked")
    case "inconsistent":
      return meaning("deployment-change", "readers-above-views")
  }
}

/**
 * What a census of the library reports, of one kind of part (0257).
 *
 * Both reasons are about a kind and neither is about a page, so this is the set
 * that put the fourth subject in the table above. `unplaced` is the one member
 * in this subsystem whose condition is not an absence of measurement but an
 * absence of the thing measured, and the distinction is worth a surface's
 * attention: `unread` on a kind says point a reader at it, `unplaced` says
 * nothing in this library is one.
 */
export const meaningOfKindSilence = (silence: KindSilence): SilenceMeaning => {
  switch (silence) {
    case "unread":
      return meaning("library", "no-view-reported")
    case "unplaced":
      return meaning("library", "nothing-of-the-kind")
  }
}

/**
 * What a kind's share of the readers who met it reports, of one kind (0256).
 *
 * The tenth set, and the first since the seventh to bring neither a condition
 * nor a subject — which is the claim below holding rather than a coincidence:
 * three of its five reasons are the states of the door, and the door's states
 * were named the first time a share of readers was taken of anything.
 *
 * **It is also the first set that could not reuse another's outright.** A
 * funnel answer reports a reach silence unchanged, because a funnel is asked of
 * a page and so is a reach reading; this is asked of a **kind**, and a subject
 * is a property of the reading rather than of the condition. So the three
 * door states are said again here at a kind, the page they are true of is
 * published with a reach silence on it, and this table is what says the two are
 * one state at two subjects. The census's own two reasons are reused as values,
 * because those were already a kind's.
 */
export const meaningOfKindReachSilence = (silence: KindReachSilence): SilenceMeaning => {
  switch (silence) {
    case "unread":
      return meaning("library-reach", "no-view-reported")
    case "unplaced":
      return meaning("library-reach", "nothing-of-the-kind")
    case "unscaled":
      return meaning("library-reach", "no-arrivals-counted")
    case "unopened":
      return meaning("library-reach", "no-openings-marked")
    case "uncounted":
      return meaning("library-reach", "no-window-folded")
  }
}

/**
 * What a reader-weighted comparison of a kind of part reports, of one kind
 * (0279).
 *
 * **The fourteenth set, and the first assembled out of two readings of its own
 * question.** Five of its six members are the two it is built from — the
 * census's `unplaced`, the places comparison's `unpaired` and `unread`, and the
 * door's three — and the sixth, `unscaled`, is the door's again. A comparison
 * is withheld for every reason either side's figure is withheld and for nothing
 * else, which is why a set that answers a genuinely new question brings no new
 * state of the world.
 *
 * The subject is the kind and not the pair, for the reason the places comparison
 * has it (0266): the rows are keyed by the vocabulary, so each reason is about
 * one kind of part across both windows. Which **window** a door reason came from
 * is published on the page it is about rather than in this vocabulary — a side
 * is not a state.
 */
export const meaningOfKindReachChangeSilence = (
  silence: KindReachChangeSilence
): SilenceMeaning => {
  switch (silence) {
    case "unplaced":
      return meaning("library-reach-change", "nothing-of-the-kind")
    case "unpaired":
      return meaning("library-reach-change", "nothing-carried")
    case "unread":
      return meaning("library-reach-change", "no-view-reported")
    case "unscaled":
      return meaning("library-reach-change", "no-arrivals-counted")
    case "unopened":
      return meaning("library-reach-change", "no-openings-marked")
    case "uncounted":
      return meaning("library-reach-change", "no-window-folded")
  }
}

/**
 * What a comparison of the words one reader got to reports, of one kind (0280).
 *
 * **The fifteenth set, and the first assembled out of four.** The census's
 * `unplaced`, the places comparison's `unpaired`, the door's three states said
 * of a kind, and the pair a comparison of a library's words already reports of
 * one — `wordless` and `floored`. Nothing is new because nothing can be: a
 * comparison is withheld for every reason one side's figure is withheld and
 * for nothing a window could be in on its own.
 *
 * `floored` is the member worth reading twice. It is the same condition the
 * thirteenth set reports, said at the same subject, and it withholds five
 * figures here where it withholds one there — because every figure this
 * reading would have a surface subtract is a sum of signed terms that floors
 * scale by different factors. One state of the world, two costs, and the cost
 * belongs to the reading.
 */
export const meaningOfKindWordReachChangeSilence = (
  silence: KindWordReachChangeSilence
): SilenceMeaning => {
  switch (silence) {
    case "unplaced":
      return meaning("library-word-reach-change", "nothing-of-the-kind")
    case "unpaired":
      return meaning("library-word-reach-change", "nothing-carried")
    case "wordless":
      return meaning("library-word-reach-change", "says-nothing")
    case "unread":
      return meaning("library-word-reach-change", "no-view-reported")
    case "unscaled":
      return meaning("library-word-reach-change", "no-arrivals-counted")
    case "unopened":
      return meaning("library-word-reach-change", "no-openings-marked")
    case "uncounted":
      return meaning("library-word-reach-change", "no-window-folded")
    case "floored":
      return meaning("library-word-reach-change", "words-a-floor")
  }
}

/**
 * What a kind's share of the readers who acted inside it reports, of one kind
 * (0265).
 *
 * **The eleventh set, and the first built on another's type rather than beside
 * it.** It takes the tenth's five members whole — the census's two and the
 * door's three — because the tenth's own limit was that a set cannot be reused
 * across subjects, and this reading's subject is a kind exactly as that one's
 * is. So the reuse is that limit used in the affirmative: same subject, same
 * states, one word for one state on any surface drawing both.
 *
 * Two members are added and only one of them brings a condition. `unwalked` is
 * `no-action-credited`, which the eighth set brought and which is the state of a
 * window whose nought is a filing rule. `unenterable` is the twelfth condition
 * and is **not about a window at all**: a kind standing only in places with
 * nothing inside them has no question to answer, which would be exactly as true
 * of a deployment every reader in the world had read.
 */
export const meaningOfKindActionSilence = (silence: KindActionSilence): SilenceMeaning => {
  switch (silence) {
    case "unread":
      return meaning("library-action", "no-view-reported")
    case "unplaced":
      return meaning("library-action", "nothing-of-the-kind")
    case "unenterable":
      return meaning("library-action", "nothing-inside")
    case "unwalked":
      return meaning("library-action", "no-action-credited")
    case "unscaled":
      return meaning("library-action", "no-arrivals-counted")
    case "unopened":
      return meaning("library-action", "no-openings-marked")
    case "uncounted":
      return meaning("library-action", "no-window-folded")
  }
}

/**
 * What a comparison of two windows of one library reports, of one kind (0266).
 *
 * **The twelfth set, and the first comparison whose subject is not the pair.**
 * Every other comparison here names neither side — *one of the two windows held
 * no page views* is a fact about the two readings together — and this one does
 * not, because its rows are keyed by the **vocabulary** and each reason is about
 * one kind of part across both windows. So the subject is `kind`, which is 0240's
 * claim holding in the one place it looked most likely to break: the subject is a
 * property of the reading and uniform across its set, and a reading's scope was
 * never what decided it (0250).
 *
 * **It brings no condition and no subject.** `unread` and `unplaced` are the
 * census's own two, reused for the reason the eleventh set reuses them — same
 * subject, same states. `unpaired` is `nothing-carried`, which is the state a
 * comparison of two windows' words reports of words and a comparison of two
 * paces reports of parts: the change left nothing of the thing being compared as
 * it was. Here the thing is a **place**, and the condition's sentence is written
 * for words because words were the first counter it was found in.
 */
export const meaningOfKindChangeSilence = (silence: KindChangeSilence): SilenceMeaning => {
  switch (silence) {
    case "unread":
      return meaning("library-change", "no-view-reported")
    case "unplaced":
      return meaning("library-change", "nothing-of-the-kind")
    case "unpaired":
      return meaning("library-change", "nothing-carried")
  }
}

/**
 * What a comparison of two windows' words at the scale of a library reports
 * (0270).
 *
 * Five members and not one new condition, and the subject is the kind for the
 * reason the comparison of places has it: the rows are keyed by the vocabulary,
 * so every reason is about one kind of part across both windows.
 *
 * `floored` is the one member in this table whose reading withholds a figure
 * rather than a comparison — the signed movement in a mass of words, which a
 * floor can give the wrong sign, where the two shares it is the difference of
 * both stand (0239).
 */
export const meaningOfKindCopyChangeSilence = (
  silence: KindCopyChangeSilence
): SilenceMeaning => {
  switch (silence) {
    case "unplaced":
      return meaning("library-copy-change", "nothing-of-the-kind")
    case "unpaired":
      return meaning("library-copy-change", "nothing-carried")
    case "wordless":
      return meaning("library-copy-change", "says-nothing")
    case "unread":
      return meaning("library-copy-change", "no-view-reported")
    case "floored":
      return meaning("library-copy-change", "words-a-floor")
  }
}

/** What a pace reading's silence reports, of one part (0230). */
export const meaningOfPaceSilence = (silence: PaceSilence): SilenceMeaning => {
  switch (silence) {
    case "unreached":
      return meaning("pace", "no-view-reported")
    case "unreadable":
      return meaning("pace", "words-a-floor")
    case "wordless":
      return meaning("pace", "says-nothing")
  }
}

/**
 * What a comparison of two windows' pace reports (0244).
 *
 * A comparison, so its subject is the pair and never the page on the screen —
 * which is the distinction this module exists for: `nothing-measured` here does
 * not say which of the two windows was empty.
 */
export const meaningOfPaceChangeSilence = (silence: PaceChangeSilence): SilenceMeaning => {
  switch (silence) {
    case "different-trees":
      return meaning("pace-change", "two-pages")
    case "different-audiences":
      return meaning("pace-change", "two-audiences")
    case "wordless":
      return meaning("pace-change", "says-nothing")
    case "nothing-measured":
      return meaning("pace-change", "no-view-reported")
    case "dissolved":
      return meaning("pace-change", "nothing-carried")
  }
}

/**
 * What a share-of-readers silence reports, which is also a funnel's (0229).
 *
 * Its `unmeasured` is the one name in this subsystem that means something other
 * than what the same name means elsewhere, and this is where that is written
 * down: a missing row at the door, not a window without readers.
 */
export const meaningOfReachSilence = (silence: ReachSilence): SilenceMeaning => {
  switch (silence) {
    case "unmeasured":
      return meaning("reach", "no-arrivals-counted")
    case "unopened":
      return meaning("reach", "no-openings-marked")
    case "uncounted":
      return meaning("reach", "no-window-folded")
  }
}

/**
 * What a comparison of two windows' funnels reports (0288).
 *
 * **The sixteenth set, and the first assembled out of the door's three said of
 * a pair.** `different-trees` is the state every comparison here reports;
 * `unscaled`, `unopened` and `uncounted` are the door's three (0229) at the
 * `comparison` subject rather than the `page` subject a funnel answer reports
 * them at; and `unasked` is `nothing-carried` said of a question.
 *
 * Nothing is new because nothing can be: a comparison is withheld for every
 * reason one side's figure is withheld and for nothing a window could be in on
 * its own. What the set does add is written up with the conditions above — the
 * door's three cost this reading half of itself and not all of it.
 */
export const meaningOfFunnelChangeSilence = (silence: FunnelChangeSilence): SilenceMeaning => {
  switch (silence) {
    case "different-trees":
      return meaning("funnel-change", "two-pages")
    case "different-audiences":
      return meaning("funnel-change", "two-audiences")
    case "unscaled":
      return meaning("funnel-change", "no-arrivals-counted")
    case "unopened":
      return meaning("funnel-change", "no-openings-marked")
    case "uncounted":
      return meaning("funnel-change", "no-window-folded")
    case "audiences-mixed":
      return meaning("funnel-change", "two-forms-unsplit")
    case "unasked":
      return meaning("funnel-change", "nothing-carried")
  }
}

/**
 * What a comparison of two forms of one page reports (0302).
 *
 * **The eighteenth set, and the first whose subject is the readership rather
 * than the tree, the window or the vocabulary** — which is why it is also the
 * first to bring three conditions of its own where no set since the eighth
 * brought more than one. Each of the three is a state only a reading that holds
 * the tree still and varies the audience can be in: two revisions, one
 * population, and a side that cannot name its own.
 *
 * The other three are borrowed exactly. `different-pages` is the state every
 * comparison here reports, `unsplit` is the window fault 0300 brought, and
 * `nothing-measured` is the door's quiet window — and it is the only member of
 * this set that withholds half of a reading rather than all of it.
 */
export const meaningOfFormComparisonSilence = (
  silence: FormComparisonSilence
): SilenceMeaning => {
  switch (silence) {
    case "different-pages":
      return meaning("forms", "two-pages")
    case "unsplit":
      return meaning("forms", "two-forms-unsplit")
    case "unattributed":
      return meaning("forms", "no-audience-named")
    case "one-population":
      return meaning("forms", "one-population")
    case "different-revisions":
      return meaning("forms", "two-revisions")
    case "nothing-measured":
      return meaning("forms", "no-view-reported")
  }
}

/** How two readings' reasons for saying nothing stand to each other. */
export type SilenceRelation =
  /**
   * One condition about one subject: the two readings are silent for the same
   * reason about the same thing, and one sentence serves both.
   */
  | "one-state"
  /**
   * One condition about two subjects.
   *
   * The same thing is true of a page and of one of its parts, or of a pair of
   * readings and of one side of it. Worth two sentences and never one: the
   * narrower is not evidence for the wider, and the wider does not say which
   * side it is about.
   */
  | "one-reason"
  /** Two conditions, which a surface has to print separately or choose between. */
  | "unrelated"

export const SILENCE_RELATIONS: readonly SilenceRelation[] = everyMemberOf<SilenceRelation>()([
  "one-state",
  "one-reason",
  "unrelated",
])

/**
 * Hold two readings' reasons against each other.
 *
 * The vocabulary is deliberately not part of the comparison. Two readings that
 * report one state are reporting one state whether or not they spell it the
 * same, which is the whole of what this module is for.
 */
export const relateSilences = (one: SilenceMeaning, other: SilenceMeaning): SilenceRelation => {
  if (one.condition !== other.condition) return "unrelated"

  return one.subject === other.subject ? "one-state" : "one-reason"
}

/**
 * The states a card is actually in, out of the readings on it.
 *
 * Takes the silences as a surface holds them — one per reading, most of them
 * `null` on a healthy deployment — and gives back the distinct states, in the
 * order the readings were handed over. Nulls are dropped rather than refused,
 * because that is the shape of the call: a caller maps its readings' `silence`
 * fields and should not have to narrow them first.
 *
 * Two readings that report one state collapse to one entry, and the entry keeps
 * the **first** reading's vocabulary, so a surface that would rather print that
 * reading's own sentence still can. Two readings that report one condition
 * about different subjects stay as two, for the reason the relation gives.
 */
export const distinctSilences = (
  meanings: readonly (SilenceMeaning | null)[]
): readonly SilenceMeaning[] =>
  meanings.reduce<readonly SilenceMeaning[]>(
    (kept, next) =>
      next === null || kept.some((seen) => relateSilences(seen, next) === "one-state")
        ? kept
        : [...kept, next],
    []
  )
