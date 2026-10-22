import type { AudienceId } from "../audience/audience.js"
import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"

/**
 * Which audience a window of counters is of, and what that makes one reading.
 *
 * [0263](../../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)
 * made a page one base tree plus the deltas an audience earns, composed in the
 * customer's own process per request — so two audiences read **one tree at one
 * revision** and see two forms of it.
 * [0284](../../decisions/0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)
 * put the audience on all five reader tables and said, in its own consequences,
 * what that leaves undone: *the portal gains a dimension it must not silently
 * collapse*, and *no screen reads this yet*.
 *
 * **The stores keep two audiences apart and every reading folded them back
 * together.** `counters.ts` already has `inAudience` so the memory store cannot
 * merge two rows that Postgres holds apart by its primary key. Nothing above
 * the store had been told: a reading is keyed by a tree and a revision, which
 * two audiences share, so the second audience's rows were dropped as *handed in
 * twice* — the one thing 0158 makes permanent, reported as a fault on a
 * deployment doing exactly what 0263 built.
 *
 * ## Two rules, because a duplicate is whatever the key says it is
 *
 * {@link readingKeyOf} is the first and is the whole of this module's original
 * argument. Readings decide, each in its own loop, whether two readings handed
 * in are one page counted twice; what makes them one is a tree, a revision
 * **and** an audience, and several spellings of that which agree today are the
 * shape this subsystem has been bitten by before (`counters.ts`,
 * `funnelPairKey`). It is published once and imported by every reading that
 * refuses to count a page twice.
 *
 * {@link formKeyOf} is the second, and it is the rule a **comparison** pairs
 * on: a page in one of its forms, with no revision in it, because a comparison
 * spans two revisions of one page. The two are deliberately not one, and the
 * difference is written on {@link PageForm}. It was written in the module that
 * first needed it and kept there, while four other comparisons went on spelling
 * the pairing by tree alone with no key to import (0293) — which is the drift
 * both of these exist to stop, arriving through the one gap a published rule
 * leaves: being published to a single caller.
 *
 * ## Splitting is the caller's, and it is a filter rather than a sum
 *
 * The other half is {@link byAudience}, which turns a window a deployment read
 * into one window per audience. A caller that splits first gets every reading
 * in this subsystem correct with no change to any of them, because each is then
 * handed one population's counters. A caller that does not is not quietly given
 * a number over two populations: `pageReadingOf` reads neither and says which
 * audiences it was handed (`audiences-mixed` in `health.ts`).
 *
 * ## Reading neither is a case, and it was a `null` three readings could ignore
 *
 * {@link AudienceScope} is the third rule, and it exists because the paragraph
 * above was true of one reading and unenforceable on the next. *No audience
 * recorded* is two states — a window written before the column (one population,
 * read whole) and a window of two forms with none asked for (no population,
 * read as neither) — and spelling them as one `null` meant a reading that
 * treated them alike compiled and was wrong only on the deployment doing
 * exactly what 0263 built. The region map's buckets were fixed for it
 * (0297) and the door's arrivals after it (0299), and the third, the funnel,
 * was still taking `matching[0]`.
 * {@link audienceScopeOf} returns the three-way answer and
 * {@link audienceScopeRead} reads it back off a reading that recorded it, so
 * the refusal is a branch a new reading has to write rather than a value it can
 * fall past.
 *
 * ## Comparing is a third question, and the answer it needs is narrower
 *
 * {@link crossesAudiences} is for the comparisons rather than the readings. A
 * before-and-after holds the readership still and varies the tree; a pair whose
 * two sides are of two audiences varies the readership by construction, so the
 * movement it reports carries two causes and nothing in the counters separates
 * them. The rule refuses only a pair that **proves** two populations, because
 * the third state above is real on this side too: a window written before the
 * column existed names no audience, and refusing every pair that spans the
 * migration would withhold the comparison a deployment most wants.
 *
 * ## Comparing two **windows** is a fourth question, and it refuses nothing
 *
 * {@link ComparedPopulations} is for the four library comparisons, whose two
 * sides are whole windows of a deployment's library rather than one reading
 * each. A window holds every form the deployment served, so a side naming two
 * audiences is the ordinary case after 0263 and not a fault — and because
 * those comparisons pair their pages by {@link formKeyOf}, every placement
 * held still is one form's against its own. There is nothing to refuse, and
 * what there is instead is a census: {@link audiencesOf} says whose library
 * each side was, and {@link pagesOf} is what lets a form gained be told from a
 * page published (0295).
 *
 * Nothing here is about a reader. An `aud_` is a name the host chose for a
 * predicate Loom never sees, and splitting on it is grouping rows by a column
 * the host wrote — no payload, no browser, no column and no kind (rule 1).
 */

/** A row the store keeps one of per audience (0284). */
export type AudienceScoped = {
  readonly audienceId: AudienceId
}

/**
 * A row that may or may not name its audience.
 *
 * `ReaderTally` is what a rollup produces and it carries no audience — a rollup
 * folds one audience's window, so the column is on the row the store keeps and
 * not on the counter itself (0284). A reading is therefore handed rows that
 * sometimes name an audience and sometimes cannot, and *cannot* is a third
 * state rather than a default: a hand-built window with no audience anywhere in
 * it is one population by construction, and calling it `aud_everyone` would be
 * asserting something no row said.
 */
export type MaybeAudienceScoped = {
  readonly audienceId?: AudienceId
}

/**
 * One side of a comparison, as the population rule below needs to see it.
 *
 * Narrower than a reading on purpose: what a comparison has to decide is about
 * the two populations and not about the two pages, so the rule that decides it
 * can be handed a page reading, a funnel reading or a region map without any of
 * them being made to look like the others.
 */
export type SideOfAudience = {
  /** `null` or absent where nothing recorded which audience the window was of. */
  readonly audienceId?: AudienceId | null
}

/** A reading, or a row, as the key rule below needs to see it. */
export type ReadingOfAudience = SideOfAudience & {
  readonly treeId: TreeId
  readonly revision: number
}

/** Sorted so a split is in the same order whatever order the rows arrived in. */
const sorted = (audiences: Iterable<AudienceId>): readonly AudienceId[] =>
  [...audiences].sort((one, other) => one.localeCompare(other))

/**
 * The audiences a window names, deduplicated and in a stable order.
 *
 * Rows naming none are not an audience and are not counted as one. A window of
 * them answers `[]`, which is *nothing here says* rather than *one audience* —
 * the distinction `MaybeAudienceScoped` exists for.
 */
export const audiencesIn = <R extends MaybeAudienceScoped>(
  rows: readonly R[]
): readonly AudienceId[] => {
  const found = new Set<AudienceId>()

  for (const row of rows) {
    if (row.audienceId !== undefined) found.add(row.audienceId)
  }

  return sorted(found)
}

/**
 * What population a reading is of, as the three answers it can be.
 *
 * The one place that decides it, and the reason it is a type rather than a
 * nullable audience is that **`null` was doing two jobs**. A reading that
 * recorded no audience is either a window of rows written before the column
 * existed (0284) — one population by construction, read whole — or a window
 * holding two forms with none asked for, which is no population at all and
 * must be read as neither (0290). The two states want opposite handling and
 * were spelled as one value, so a reading that forgot to distinguish them did
 * not fail to compile: it fell into the first and read one form's rows as the
 * page's.
 *
 * Three readings here pick a page's rows out of a window, and two of them had
 * already been fixed one at a time — the region map's buckets (0297) and the
 * door's arrivals (0299) — each after publishing a real second form as a count
 * of rows handed in twice. The third was the funnel,
 * where the same `matching[0]` took one form's answer and reported the other's
 * as the same question asked twice. A fourth reading written tomorrow would
 * fall the same way, because nothing in the types asked it the question.
 * {@link AudienceScope} asks it: the `mixed` member is a case to be handled
 * rather than a `null` to be ignored.
 *
 * Every member carries both halves, so a caller that only wants the audience
 * reads `audienceId` without a switch and a caller that must handle the refusal
 * switches on `reading`.
 */
export type AudienceScope =
  /**
   * One population: the audience asked for, or the only one the window named.
   *
   * A window naming one audience needs no caller to say so, and an audience
   * asked for scopes the reading whether or not the window holds others — the
   * rest of it is that page's other form, counted apart and not read (0290).
   */
  | {
      readonly reading: "one"
      readonly audienceId: AudienceId
      /** What the window named, which is not what was asked for. */
      readonly audiences: readonly AudienceId[]
    }
  /**
   * Nothing in the window named an audience, so it is one population by
   * construction and is read whole.
   *
   * Every window written before the column existed (0284), and every window a
   * caller built by hand. Calling it `aud_everyone` would assert what no row
   * said, which is the distinction {@link MaybeAudienceScoped} exists for.
   */
  | { readonly reading: "unlabelled"; readonly audienceId: null; readonly audiences: readonly [] }
  /**
   * Two or more forms, and the asking named none of them.
   *
   * Read as **neither**. The other two answers available are summing two
   * populations and picking one of them by the caller's array order, and the
   * second is the fault this type exists to make unwritable. Summing is a
   * decision per counter rather than a default: arrivals at the door are
   * counted once per page view and therefore add (0297, 0299), and a distinct
   * count filed against a node does not.
   */
  | { readonly reading: "mixed"; readonly audienceId: null; readonly audiences: readonly AudienceId[] }

/**
 * Which of the three a window and an asking come to.
 *
 * The census is deduplicated and sorted here, so a caller may hand in the rows
 * of two windows concatenated — a reading of funnel rows is of the populations
 * its own rows name **and** of the populations the page reading it was taken
 * against named, and either alone can be the ambiguous one.
 *
 * An audience asked for always wins, including over a window that names it
 * nowhere: a caller asking for one population and being handed none is holding
 * an empty reading, which is what it asked for and not an ambiguity.
 */
export const audienceScopeOf = (
  audiences: Iterable<AudienceId>,
  asked?: AudienceId
): AudienceScope => {
  const named = sorted(new Set(audiences))

  if (asked !== undefined) return { reading: "one", audienceId: asked, audiences: named }
  if (named.length === 1 && named[0] !== undefined)
    return { reading: "one", audienceId: named[0], audiences: named }
  if (named.length === 0) return { reading: "unlabelled", audienceId: null, audiences: [] }

  return { reading: "mixed", audienceId: null, audiences: named }
}

/** A reading that has already recorded which population it was of. */
export type ReadOfAudience = {
  readonly audienceId: AudienceId | null
  readonly audiences: readonly AudienceId[]
}

/**
 * The scope a reading already recorded, read back off it.
 *
 * What a **second** reading needs: a comparison holding two sides against each
 * other has to know that a side was read as neither population before it can
 * say what moved between them, and a reading that published only its audience
 * and its census leaves that as a subtraction for every caller to make the same
 * way. One of them making it differently is this module's whole subject.
 */
export const audienceScopeRead = (reading: ReadOfAudience): AudienceScope =>
  audienceScopeOf(reading.audiences, reading.audienceId ?? undefined)

/**
 * The rows of one audience, and nothing else.
 *
 * A row naming no audience is not in any audience's window. A caller holding
 * such rows is holding something no store produced, and silently folding them
 * into whichever audience was asked for would be this module inventing the
 * fact it exists to keep.
 */
export const forAudience = <R extends MaybeAudienceScoped>(
  audience: AudienceId,
  rows: readonly R[]
): readonly R[] => rows.filter((row) => row.audienceId === audience)

/** One audience's window, as {@link byAudience} hands it over. */
export type AudienceWindow<R> = {
  readonly audience: AudienceId
  readonly rows: readonly R[]
}

/**
 * A window a deployment read, split into the populations it actually holds.
 *
 * Exhaustive and lossless: every row is in exactly one window, each window's
 * rows keep the order they arrived in, and the windows themselves are in a
 * stable order so two reads of one store produce the same list. A deployment
 * serving one form of every page gets one window, which is what it has always
 * had.
 */
export const byAudience = <R extends AudienceScoped>(
  rows: readonly R[]
): readonly AudienceWindow<R>[] => {
  const windows = new Map<AudienceId, R[]>()

  for (const row of rows) {
    const held = windows.get(row.audienceId)

    if (held === undefined) windows.set(row.audienceId, [row])
    else held.push(row)
  }

  return sorted(windows.keys()).map((audience) => ({
    audience,
    rows: windows.get(audience) ?? [],
  }))
}

/**
 * What makes two readings one page: the tree, the revision and the audience.
 *
 * The one place that decides what a duplicate is. Five readings refuse to count
 * a page twice — the health of a collection, the order over a deployment's
 * pages, and the three censuses of a library — and before this they refused on
 * a tree and a revision, which two audiences of one page share. So a deployment
 * that began serving a second form had that form's reading dropped as a repeat
 * of the first, and the number it was dropped out of went on looking right
 * (0158: a count that has been added cannot be unadded, and one that was never
 * added cannot be noticed).
 *
 * A reading naming no audience keys as itself, so a window of rows that never
 * carried the column behaves exactly as it did.
 */
export const readingKeyOf = (reading: ReadingOfAudience): string =>
  `${reading.treeId}\u0000${reading.revision}\u0000${reading.audienceId ?? ""}`

/**
 * A page in one of its forms: the tree and the audience, with no revision in
 * it.
 *
 * Deliberately **not** what {@link readingKeyOf} answers, and the difference is
 * the whole of why there are two rules. That one answers *what is one reading*,
 * and a revision is part of what one reading is (0290). This answers *what is
 * one page in one form*, which a comparison spans two revisions of — so the
 * revision is absent here because it is the thing being compared across.
 *
 * `null` is *nothing recorded which audience this was of*, kept as the third
 * state it is: a window of rows that never carried the column is one population
 * by construction, and keying it as `aud_everyone` would assert what no row
 * said.
 */
export type PageForm = {
  readonly treeId: TreeId
  readonly audienceId: AudienceId | null
}

/** The form a reading is of, with an absent audience normalised to the `null` it means. */
export const formOf = (reading: ReadingOfAudience): PageForm => ({
  treeId: reading.treeId,
  audienceId: reading.audienceId ?? null,
})

/**
 * What makes two readings one page in one form, which is what a comparison
 * pairs on.
 *
 * The second of this module's two keys, published for the reason the first is:
 * every comparison in this subsystem decides, in its own loop, whether two
 * readings handed in are one page to be paired or one page handed in twice, and
 * **a tree alone is not that page**. Two forms of it (0263) share a tree, so a
 * comparison keyed by the tree drops the second form as a duplicate where the
 * two sit at one revision and gates **both** out as ambiguous where they do
 * not — which is 0158-permanent in the first case and silent in both.
 */
export const formKeyOf = (form: PageForm): string =>
  `${form.treeId}\u0000${form.audienceId ?? ""}`

/** Sorted so a list of forms reads the same whatever order they arrived in. */
export const inFormOrder = (one: PageForm, other: PageForm): number =>
  formKeyOf(one).localeCompare(formKeyOf(other))

/** The audience each side of a comparison was of, as a comparison carries it. */
export type ComparedAudiences = {
  readonly was: AudienceId | null
  readonly now: AudienceId | null
}

/**
 * The two populations a comparison was handed, published once rather than
 * spelled on each comparison.
 *
 * Carried whether or not the pair was refused, because a `null` on either side
 * is the whole of why a mismatched pair can go unrefused: it is what a surface
 * reads to say *this comparison spans a window that named no audience* rather
 * than being told nothing at all.
 */
export const comparedAudiencesOf = (
  was: SideOfAudience,
  now: SideOfAudience
): ComparedAudiences => ({ was: was.audienceId ?? null, now: now.audienceId ?? null })

/**
 * Whether two sides of a comparison prove they are of two populations.
 *
 * The one place that decides it, for the reason {@link readingKeyOf} is one
 * place: ten comparisons here take their pair from a caller, nine of them
 * refuse a pair of different trees, and a pair of different audiences is the
 * same kind of error with none of the same visibility. Two trees are two pages and every figure comes back absurd; two
 * forms of one page (0263) compare cleanly and the arithmetic is right. What is
 * wrong is the sentence on top of it — *this is what your change did* — when
 * the readership was varied by construction and the tree may not have changed
 * at all.
 *
 * **False where either side names none, and that is not an oversight.** A row
 * written before the column existed (0284) names no audience, so a pair of such
 * a window and an `aud_pro` one is either an honest before-and-after across the
 * migration or a cross-population comparison, and nothing in the counters tells
 * them apart. Refusing both would withhold every comparison spanning the day a
 * deployment upgraded, which is the comparison it most wants; refusing neither
 * would publish a cross-population movement as a change. So the rule refuses
 * what is provable and {@link comparedAudiencesOf} makes the rest visible.
 */
export const crossesAudiences = (was: SideOfAudience, now: SideOfAudience): boolean => {
  const pair = comparedAudiencesOf(was, now)

  return pair.was !== null && pair.now !== null && pair.was !== pair.now
}

/**
 * The audiences a set of forms names, deduplicated and in a stable order.
 *
 * The form-level counterpart of {@link audiencesIn}, which answers the same
 * question over rows. A form whose `audienceId` is `null` is not an audience
 * and is not counted as one, so a window of forms that never carried the
 * column answers `[]` — *nothing here says* rather than *one audience*.
 */
export const audiencesOf = (forms: Iterable<PageForm>): readonly AudienceId[] => {
  const found = new Set<AudienceId>()

  for (const form of forms) {
    if (form.audienceId !== null) found.add(form.audienceId)
  }

  return sorted(found)
}

/**
 * The pages behind a set of forms, which two forms of one page share.
 *
 * A page is one base tree plus the deltas an audience earns (0263), so the
 * tree is the page and the form is the page as one audience meets it. A window
 * of four forms over three trees is three pages, one of them served twice.
 */
export const pagesOf = (forms: Iterable<PageForm>): ReadonlySet<TreeId> => {
  const pages = new Set<TreeId>()

  for (const form of forms) pages.add(form.treeId)

  return pages
}

/**
 * The audiences each side of a **window** comparison was of.
 *
 * Deliberately not {@link ComparedAudiences}, and the difference is the whole
 * reason there are two types. That one is for a comparison whose two sides are
 * one reading each, so each side is of one audience or of none, and a pair
 * naming two is refused ({@link crossesAudiences}). This one is for a
 * comparison whose two sides are whole **windows** of a deployment's library:
 * a window holds every form the deployment served, so after 0263 a side naming
 * two audiences is the ordinary case rather than a fault.
 *
 * Nothing is refused on it. A library comparison pairs its pages by form
 * ({@link formKeyOf}), so every placement held still is one form's measured
 * against its own and no share in such a reading has a denominator spanning two
 * populations. What the two sets are for is the sentence printed over the
 * figures: *this is your library* is a different claim when the window held
 * `aud_skiers` and `aud_riders` than when it held one of them.
 */
export type ComparedPopulations = {
  /** The audiences the earlier window's forms named. `[]` where none did. */
  readonly was: readonly AudienceId[]
  /** The audiences the later window's forms named, by the same rule. */
  readonly now: readonly AudienceId[]
}

/**
 * Why two readings are not two forms of one page.
 *
 * **Published here rather than on the reading that first needed it**, which is
 * the point of this member existing at all. `formComparisonOf` (0302) spelled
 * these five as its own silences, and a second comparison of two forms wants
 * every one of them with no clause changed: they are facts about the **pair**
 * — one page, two provable populations, one revision — and not about the
 * counter being compared. A second spelling of them would be the fault
 * {@link readingKeyOf} and {@link formKeyOf} exist to stop, one level up: a
 * rule written three times is a rule two of its copies agree with.
 *
 * A reading adds its own members for what its own counter cannot say, and
 * {@link FormPairRefusal} is what it adds them to.
 */
export type FormPairRefusal =
  /**
   * The two readings are of different trees.
   *
   * Two pages are two pages, and two audiences do not make them one. Checked
   * first, as every comparison in this subsystem checks it first, because a
   * caller holding two pages wants to be told that before it is told anything
   * about populations.
   */
  | "different-pages"
  /**
   * One of the two windows holds two forms of the page and named neither.
   *
   * The state published as `AudienceScope.mixed` (0290, 0300), and the one
   * refusal here whose remedy is an instruction rather than a fact: **split the
   * window with {@link byAudience} and read each form on its own** — which is
   * exactly what a comparison of two forms then wants as its two sides. A side
   * read as neither form holds no counters at all, so without this every part
   * of the other side would come back as a part only that form has, and the
   * census would read as *the deltas gave this audience the whole page*.
   *
   * Checked before {@link FormPairRefusal.unattributed}, and that order is a
   * real one: one side can be unlabelled while the other is unsplit. The caller
   * is told the one it can do something about.
   */
  | "unsplit"
  /**
   * One of the two windows named no audience at all.
   *
   * Every window written before the column existed (0284), and every window a
   * caller builds by hand. It is one population read whole, which is the right
   * answer to every other question in this subsystem and is no answer at all to
   * this one: the subject of a form comparison **is** the population, so a side
   * that cannot name its own has nothing to contribute to a comparison of two
   * of them.
   *
   * This is the sharpest difference between a form comparison and a
   * before-and-after. There, a pair with an unlabelled side is compared and
   * merely not provably of one readership (0294), because the audience is a
   * confounder and refusing it would withhold every comparison spanning the
   * migration. Here the audience is the question.
   */
  | "unattributed"
  /**
   * Both windows name one audience and it is the same one.
   *
   * There is one population and so there is no second form: what the caller is
   * holding is one reading handed in twice, or two windows of one form, and
   * neither is this question. **The only refusal in this subsystem for too few
   * populations rather than too many** — its sibling `two-audiences` refuses a
   * before-and-after for naming two, and the two sit either side of the one
   * thing each reading needs held still.
   *
   * Two windows of one form over two periods is a real question and it is
   * `changeOf`, which is where that caller is sent.
   */
  | "one-population"
  /**
   * The two readings are of two revisions of the page.
   *
   * The refusal that is a form comparison's whole discipline. Two forms of a
   * page share a tree **and a revision** (0263), so two revisions means the
   * pair varies the tree as well as the readership and every figure would carry
   * both causes with nothing to separate them — which is the one thing a
   * before-and-after is built to avoid and a form comparison would otherwise do
   * silently.
   *
   * Checked after the three population states above, for the reason a form
   * comparison exists: without two provable populations there is no form
   * comparison to refuse on a revision, and a caller told *two revisions* when
   * it is also holding one audience twice would fix the wrong half.
   */
  | "different-revisions"

/** The closed set, in the order {@link formPairOf} reaches them. */
export const FORM_PAIR_REFUSALS: readonly FormPairRefusal[] =
  everyMemberOf<FormPairRefusal>()([
    "different-pages",
    "unsplit",
    "unattributed",
    "one-population",
    "different-revisions",
  ])

/** One line per refusal, for a surface saying why there is no pair. */
export const describeFormPairRefusal = (refusal: FormPairRefusal): string => {
  switch (refusal) {
    case "different-pages":
      return "the two readings are of different pages"
    case "unsplit":
      return "one of the two windows holds two forms of the page and says which readers neither"
    case "unattributed":
      return "one of the two windows names no audience, so it is of no form in particular"
    case "one-population":
      return "both readings are of one audience, so there is no second form to compare"
    case "different-revisions":
      return "the two readings are of two revisions, so they are not two forms of one page"
  }
}

/** What {@link formPairOf} needs of a side: a page, a revision, and a scope. */
export type SideOfForm = ReadOfAudience & {
  readonly treeId: TreeId
  readonly revision: number
}

/**
 * Two readings as a pair of forms, or the reason they are not one.
 *
 * Both members carry the two sides **in the order the pair settled on**, so a
 * refusal is reported about the same two sides a comparison would have been of.
 */
export type FormPair<R> =
  | {
      readonly pairing: "paired"
      /** The side whose audience id sorts lower. */
      readonly one: R
      readonly other: R
      /** The two names, already in the same order as the two sides. */
      readonly audiences: { readonly one: AudienceId; readonly other: AudienceId }
    }
  | {
      readonly pairing: "refused"
      /** The lower-sorting side, or the first argument where no pair of names stands. */
      readonly one: R
      readonly other: R
      readonly refusal: FormPairRefusal
    }

/**
 * Settle two readings into two forms of one page, or say why they are not.
 *
 * **Neither side is earlier, so the order of the arguments does not reach the
 * answer.** `changeOf` takes `was` and `now` and does not check which is older:
 * a caller holding them backwards gets every sign reversed, which is the
 * bargain 0224 struck so that *this week against last week* comes out of the
 * same function. Here that bargain would be a bug rather than a trade, because
 * there is no fact of the matter about which of two populations comes first.
 * Two deployments asking one question would get two answers, and a screen built
 * on one of them would read the direction of every figure backwards without
 * anything saying so.
 *
 * So the two sides are put in the order of their audience ids **before anything
 * is read off either**, and `one` is the lower of the two names rather than the
 * first argument. A pair with a name missing on either side has no order to
 * take and keeps the arguments' own, which is all the two refusals that have no
 * second population need.
 */
export const formPairOf = <R extends SideOfForm>(one: R, other: R): FormPair<R> => {
  const [first, second] =
    one.audienceId !== null &&
    other.audienceId !== null &&
    other.audienceId.localeCompare(one.audienceId) < 0
      ? ([other, one] as const)
      : ([one, other] as const)

  const refusing = (refusal: FormPairRefusal): FormPair<R> => ({
    pairing: "refused",
    one: first,
    other: second,
    refusal,
  })

  if (first.treeId !== second.treeId) return refusing("different-pages")

  const scopes = { one: audienceScopeRead(first), other: audienceScopeRead(second) }

  if (scopes.one.reading === "mixed" || scopes.other.reading === "mixed") return refusing("unsplit")
  if (scopes.one.audienceId === null || scopes.other.audienceId === null)
    return refusing("unattributed")
  if (scopes.one.audienceId === scopes.other.audienceId) return refusing("one-population")
  if (first.revision !== second.revision) return refusing("different-revisions")

  return {
    pairing: "paired",
    one: first,
    other: second,
    audiences: { one: scopes.one.audienceId, other: scopes.other.audienceId },
  }
}
