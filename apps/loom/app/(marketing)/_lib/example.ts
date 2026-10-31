import {
  buildElement,
  buildSlot,
  type IdFactory,
  type LoomNode,
} from "@jam-overture/loom"

import { partNameOf } from "./library"
import { heading, prose } from "./nodes"

/**
 * A page that is not this one, built out of the same set, shown inside a
 * browser.
 *
 * ## Why the site needed this
 *
 * `docs/positioning.md` records the maintainer's direction of 24 October and
 * the half this band answers is one clause:
 *
 * > *"The building part and why this build is better than traditional methods
 * > is preferred."*
 *
 * The band above this one prints the name of all 107 parts, which answers
 * *what is in there*. It does not answer the question a junior developer asks
 * straight after it, which is **what do they look like when they are on a
 * page**. Until today the only page on this site built out of the starter set
 * was this site, and a visitor cannot see that: they are standing on it.
 *
 * So the site shows them a different one. It is a small product page for a
 * coffee subscription, it is obviously not Loom, and every piece of it is a
 * part named in the field of chips directly above.
 *
 * ## It is rendered rather than photographed
 *
 * The usual way to do this is a screenshot, and `loom.plate` would take one.
 * A photograph would be wrong here for a reason that is this project's whole
 * argument: a picture of a page is fixed, and the thing being claimed is that
 * a page is data. This example is a tree. It is composed at the same moment
 * the rest of the page is, out of the same library, and it wears **whichever
 * palette the visitor asked for** — so the proof survives the one press that
 * would expose a screenshot as a screenshot.
 *
 * `loom.frame` is what makes it read as a page rather than as more of this
 * one. Its own note says why it exists, and it is worth quoting because the
 * site had never used it: *"A page selling software has to show the software,
 * and a bare screenshot dropped into a section reads as a stray image every
 * time."* This band is the first use of `loom.frame` or `loom.pin` on any
 * surface of this application.
 *
 * ## The example carries no control, and that is deliberate
 *
 * A landing page has a button on it and this one does not. Every honest
 * ending for one was worse than leaving it out:
 *
 * - A button pointing at a fragment lands nowhere, and `anchors.test.ts`
 *   exists because a link that lands nowhere is the defect this site checks
 *   for hardest.
 * - A button pointing anywhere real is a lie about the fictional product, and
 *   a reader who presses *Start a box* and arrives in the documentation has
 *   been tricked by the one site that sells not being tricked.
 *
 * So the frame shows the shape of a page rather than a working one. `Action`
 * is in the field of chips above and a reader who wants to press something has
 * the band below, where every control goes somewhere.
 *
 * ## The copy is a fictional product's and the names are not written here
 *
 * The words in the example are invented, which is what an example is. Nothing
 * in it says anything about Loom, so nothing in it can be a claim this lane is
 * not allowed to make — `docs/routines.md` keeps positioning with the
 * maintainer and an example page is the one place on this site where the copy
 * is not about the product at all.
 *
 * The **pin labels are not invented**. Each one is `partNameOf` over the type
 * the pin is pointing at, so a pin reads with exactly the string the chips
 * band prints for the same part, and the two cannot drift. A part renamed in
 * `src/primitives/` renames both. `example.test.ts` holds every mark to a type
 * that is really in the tree below it, because a pin naming a part that is not
 * on the screen is the one failure this band could have that a reader would
 * notice and no other check would.
 */

/** The fictional product, which is a coffee subscription and is not Loom. */
const ADDRESS = "fernhill.coffee"

/** One tile of the example's grid. */
type Offer = {
  readonly title: string
  readonly body: string
}

/**
 * One arrangement of the example page.
 *
 * It was a pair of loose constants until the comparison band needed a second
 * arrangement, and two arrangements spelled as two sets of loose constants is
 * how the two drift into being two different pages. A type with one shape is
 * what makes *the same page, arranged differently* checkable rather than
 * asserted: `example.test.ts` holds the pair to the same number of tiles and
 * to a line neither of them changes.
 */
type Arrangement = {
  readonly heading: string
  /**
   * The line under the heading, and **it is the same string in both
   * arrangements.**
   *
   * A comparison in which everything differs is two pages side by side, and
   * the claim this band is making is about one page. The sentence that does
   * not move is what a reader uses to work out that it did not move.
   */
  readonly line: string
  readonly offers: readonly Offer[]
}

/** The line neither arrangement touches. See `Arrangement.line`. */
const STEADY_LINE = "Posted the morning it is ground."

/**
 * The page as its author built it, which is the arrangement the band above
 * this one has shown since 28 October.
 */
const AS_BUILT: Arrangement = {
  heading: "Fresh coffee every Friday",
  line: STEADY_LINE,
  offers: [
    { title: "Choose your roast", body: "Light, medium or dark." },
    { title: "Pause any week", body: "No phone call." },
    { title: "No contract", body: "Stop whenever you like." },
  ],
}

/**
 * The same page for a reader who arrived looking for a gift.
 *
 * **Three tiles in both arrangements, on purpose.** `loom.before-after` takes
 * its height from the after region and stretches the before region to match,
 * so a fourth tile on one side would crop the other rather than reporting
 * anything. `example.test.ts` holds the count rather than leaving it to
 * whoever edits this next.
 *
 * What differs is a tile that was not there, two that moved along to make room
 * for it, one that came off, and a heading. Those are the things this site
 * says a page can do, and an example of adaptation that showed something the
 * product cannot do would be the worst sentence on the site.
 */
const FOR_A_GIFT: Arrangement = {
  heading: "Send fresh coffee every Friday",
  line: STEADY_LINE,
  offers: [
    { title: "Send it as a gift", body: "With a note you write." },
    { title: "Choose your roast", body: "Light, medium or dark." },
    { title: "Pause any week", body: "No phone call." },
  ],
}

/** Both arrangements, for the checks that read them as a pair. */
export const ARRANGEMENTS = { asBuilt: AS_BUILT, forAGift: FOR_A_GIFT } as const

/**
 * The corner chips, which say **who** each arrangement is for rather than
 * which came first.
 *
 * *Before* and *After* would be the ordinary labels and they answer the wrong
 * question. The headline this band is earning is *a web page that rearranges
 * itself around the people using it*, so the thing a reader has to come away
 * with is that the right-hand page belongs to a person, not to a later
 * timestamp.
 */
export const ARRANGEMENT_LABEL = {
  asBuilt: "As you built it",
  forAGift: "For a visitor buying a gift",
} as const

/**
 * A mark over the example, named by the part it is pointing at.
 *
 * `x` and `y` are percentages of the surface, which is the only way a point
 * over a thing whose height nobody here knows can be expressed. `side` is the
 * direction the label flies out in and is ignored where the frame is narrow —
 * `loom.pin` turns the marks into a legend under the screen on a phone, which
 * is the behaviour that lets this band have marks at all at 390.
 */
type Mark = {
  /** The part this mark points at. It must be in the tree below. */
  readonly type: string
  readonly x: number
  readonly y: number
  readonly side: "start" | "end" | "above" | "below"
}

/**
 * Two marks rather than five.
 *
 * The temptation is to name every part on the screen, and a frame carrying a
 * mark on each of six things is a diagram rather than a page — the reader
 * stops looking at the page and starts reading the labels. Two is enough to
 * make the point that the things on the screen have names in the list above,
 * and the reader finds the rest themselves, which is the whole behaviour this
 * band is trying to start.
 */
export const MARKS: readonly Mark[] = [
  { type: "loom.hero", x: 12, y: 18, side: "end" },
  /**
   * **Just above the tiles rather than on one of them**, and the two
   * placements this one replaces are worth keeping because a percentage over
   * a thing whose height nobody here knows is exactly the kind of number that
   * is guessed twice before it is measured.
   *
   * Measured on a production build at 1280: the screen inside the frame is
   * 447px tall and the row of tiles is 58px of it, at **79.6% to 92.6%**. A
   * tile that holds a heading and one line has no empty band inside it, so a
   * mark at 90 sat on the words and a mark at 76 sat on the tile's top edge.
   * The hero above has 180px of its own air under the last line, and that is
   * where a mark can stand without covering anything.
   *
   * The label flies left into the same air. It opens *start* rather than
   * *end* for no reason except that the dot is at the middle of the screen
   * and either direction is empty.
   */
  { type: "loom.feature-grid", x: 50, y: 72, side: "start" },
]

const opening = (ids: IdFactory, arrangement: Arrangement, level: number): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: { align: "center", stature: "standard" },
    /**
     * The heading and the line repeat the hero's `align`, which looks like
     * saying it twice and is what `alignment.test.ts` asks for: a hero's words
     * carry their own alignment, so a band set one way with words set the
     * other is the defect that file was written about.
     */
    children: [
      buildSlot(ids, "heading", [
        heading(ids, level, arrangement.heading, { balance: true, align: "center" }),
      ]),
      prose(ids, arrangement.line, { size: "lead", align: "center", measured: true }),
    ],
  })

const offers = (ids: IdFactory, arrangement: Arrangement): LoomNode =>
  buildElement(ids, {
    type: "loom.feature-grid",
    props: { columns: "three", density: "loose" },
    children: arrangement.offers.map((offer) =>
      buildElement(ids, {
        type: "loom.feature",
        props: { title: offer.title, body: offer.body, surface: "card" },
      })
    ),
  })

/** The screen itself, without the chrome: what goes in a surface or a region. */
const screen = (
  ids: IdFactory,
  arrangement: Arrangement,
  level: number
): readonly LoomNode[] => [opening(ids, arrangement, level), offers(ids, arrangement)]

const mark = (ids: IdFactory, { type, x, y, side }: Mark, index: number): LoomNode =>
  buildElement(ids, {
    type: "loom.pin",
    props: { x, y, side, marker: `${index + 1}`, label: partNameOf(type) },
  })

/**
 * The example, inside the chrome that says it is a page of its own.
 *
 * The heading inside it is a level three, because this is a page within a page
 * and `pages.test.ts` holds every route of this site to exactly one `h1`. A
 * reader sees type at the size `loom.hero` sets; a screen reader and an
 * outline see a thing under the band that introduces it, which is what it is.
 */
export const examplePage = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.frame",
    props: { chrome: "browser", label: ADDRESS },
    children: [
      buildSlot(ids, "surface", screen(ids, AS_BUILT, 3)),
      ...MARKS.map((entry, index) => mark(ids, entry, index)),
    ],
  })

/**
 * The same page, built twice, for two different readers.
 *
 * ## What it is for
 *
 * The headline of this site is the maintainer's of 24 October — *a web page
 * that rearranges itself around the people using it* — and until today
 * **nothing a visitor could look at showed one doing it.** The band above
 * shows a page built out of the starter set and that page is fixed. The
 * demonstration on `/how-it-works` is Loom rearranging Loom, which is the
 * strongest thing this project has and is also the one page a stranger has no
 * way to recognise as having changed, because they have never seen it before.
 *
 * So this is a page they have just been shown, a reader it was not built for,
 * and the arrangement that reader gets. It costs no model call, it is the same
 * composed tree as everything else on this site, and it wears whichever
 * palette the visitor asked for.
 *
 * ## It was a wipe for an hour, and the photograph is why it is not
 *
 * The first build of this band was one frame holding a `loom.before-after`,
 * on the primitive's own stated case — *"the redesign over the old page"* —
 * and every test written for it passed. The picture is in the report and it
 * is unreadable.
 *
 * A wipe clips one layer over another, and **the two layers are laid out
 * independently.** Two centred headings of different lengths do not share a
 * centre line, so the seam fell mid-word and the band read
 * `Fresesh coffee every Friday`. The tiles were worse: the arrangement is a
 * reorder, so the same tile appeared on both sides of the seam at once and
 * read as a rendering fault rather than as a comparison.
 *
 * **A wipe compares two states that occupy the same pixels.** That is two
 * photographs of one scene, and it is not two arrangements of a page, because
 * the whole content of the claim is that the second one is laid out
 * differently. Filed for `Loom primitives` with the picture, because the
 * primitive invites non-photographic regions and garbles them in silence.
 *
 * ## So they stand side by side
 *
 * `loom.split` gives each arrangement its own frame at its own size, and
 * stacks them on a phone with the order kept. Each frame keeps the same
 * address in its chrome, which is the claim — one page, two readers — and a
 * caption over each says which reader it is.
 */
export const rearrangedExample = (ids: IdFactory): LoomNode => {
  const side = (arrangement: Arrangement, label: string): readonly LoomNode[] => [
    /**
     * The caption is the band's, not the fictional product's, so it sits
     * **over** the frame rather than inside it. A line of this site's own
     * voice printed inside a browser chrome belonging to a coffee company is
     * the one thing that would make a reader doubt the whole example.
     */
    prose(ids, label, { tone: "muted", align: "center" }),
    buildElement(ids, {
      type: "loom.frame",
      props: { chrome: "browser", label: ADDRESS },
      children: [buildSlot(ids, "surface", screen(ids, arrangement, 3))],
    }),
  ]

  return buildElement(ids, {
    type: "loom.split",
    /**
     * `align: "stretch"`, so the two frames are the same height whatever the
     * copy inside them does. Left to themselves they take their own heights
     * and the band reads as two unrelated screenshots rather than as one page
     * twice.
     */
    props: { ratio: "even", align: "stretch" },
    children: [
      buildSlot(ids, "start", side(AS_BUILT, ARRANGEMENT_LABEL.asBuilt)),
      buildSlot(ids, "end", side(FOR_A_GIFT, ARRANGEMENT_LABEL.forAGift)),
    ],
  })
}
