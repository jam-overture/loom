import { buildElement, sequentialIdFactory, type IdFactory, type LoomNode } from "@jam-overture/loom"
import { PAGE_SEQUENCE, STARTER_COMPOSITIONS } from "@jam-overture/loom/primitives"

import { READY_MADE_ANCHOR } from "./bands"
import { prose, section } from "./nodes"

/**
 * The half of *what you can build* this site had never mentioned: the parts
 * arrive **already built into whole sections**.
 *
 * ## What was missing, measured rather than felt
 *
 * `theParts` one band above prints the name of every part in the starter set
 * and says *all 107 come with the install*. It is true and it answers the
 * question a junior developer asks second. The question they ask first is
 * *how much of a page do I have to put together myself*, and until today
 * every word on this site answered it with **all of it**: a search of this
 * route group on 9 November found no page, no band and no sentence that
 * mentioned a composition, and
 * [0120](../../../../../decisions/0120-a-starting-composition-is-a-subtree-a-catalogue-hands-to-the-ordinary-seam.md)
 * settled what one is on 9 September.
 *
 * That is the largest gap `docs/positioning.md` leaves open. The direction
 * recorded there is *"the building part and why this build is better than
 * traditional methods is preferred"*, for *"the casual web developer… junior
 * level"*, and the reason anybody looks at all is *"how to get people
 * interested"* rather than a problem they arrived with. A reader shown 107
 * parts and told nothing else reasonably concludes that a landing page is 107
 * decisions. It is twenty-two.
 *
 * ## Every figure here is read off the library
 *
 * Three of them, on the same terms as `FACTS` in `copy.ts` — *a number nobody
 * expects to move is the one nobody re-checks* — and the hazard is worse here,
 * because all three move when **another lane** publishes a section and no run
 * in this lane would have any reason to look.
 *
 * | what the page says | where it comes from |
 * | --- | --- |
 * | sections that come already built | `STARTER_COMPOSITIONS.length` |
 * | how many make a landing page | `PAGE_SEQUENCE.length` |
 * | parts that page is made of | every element the sequence's builders mint |
 *
 * `ready.test.ts` holds each of the three to being an expression over the
 * library rather than a digit, read off this file's own source. That is the
 * shape `facts.test.ts` arrived at after the primitive count had been bumped
 * by hand in two consecutive primitives runs: a test that compares the number
 * against the library is green the moment somebody pastes today's value in.
 *
 * ## Why no section is named, which was not the plan
 *
 * The band this run set out to build was a table: every section a landing page
 * has, in the library's own order, with the designs that ship for each. The
 * order is the information a junior developer does not have, and the library's
 * own note says so about its own list — *"the order is the whole of the extra
 * information this carries, and it is the part somebody who has not assembled
 * a landing page before does not know."*
 *
 * **It cannot be printed, and the reason is one word.** One of the
 * twenty-two is labelled *Pricing*, and `voice.test.ts` holds this site to the
 * maintainer's instruction of 27 September: *no reference to pricing should
 * remain, we haven't figured that out yet.* The table went red on that rule on
 * the run that wrote it.
 *
 * Three ways out were available and two of them are wrong. **Exempting the
 * rule** is this lane deciding that a word he took off the site is allowed
 * back in a table — `docs/routines.md` keeps pricing with him and the rule is
 * not weakened to let a band land. **Dropping that one row** leaves a hole in
 * a list whose whole value is being complete, and makes the column stop adding
 * up to the figure above it. So the band states the facts and names no
 * section, and the table is a thing to come back to on the day there is an
 * answer about pricing. It is filed.
 *
 * ## Why nothing is rendered either
 *
 * The obvious band is a browser frame with a ready-made section inside it,
 * composed at the same moment as the rest of the page, the way `example.ts`
 * renders the coffee page. **Two things in the library make that impossible
 * today and both are filed for `Loom primitives`.**
 *
 * - **Every section that carries a control ships a live same-origin `href`**:
 *   a sign-up page, a price list, a contact page, each spelled as a path on
 *   whatever host drops the section in. That is the right default for a host
 *   that then edits it and a dead button on a host that has not.
 *   `routes.test.ts`' *sends nobody to an address this application does not
 *   serve* is red on the first one, and `example.ts` already records why a
 *   control that lands nowhere is the defect this site checks for hardest.
 * - **The placeholder copy is a developer tool's**, in the same register as
 *   this site's own: *"Plan the work, review the change, and see what
 *   shipped"*, *"Every change is a diff you can read"*. On anybody else's page
 *   that is a neutral placeholder. On this one a visitor cannot tell whose
 *   claims they are reading, and two of the sections assert customers and
 *   uptime figures.
 *
 * So what is here is three figures and two sentences. It is weaker than a
 * rendering and it is the strongest honest form available today — and the fact
 * is worth more than its presentation, because nothing on this site had said
 * it at all.
 */

/**
 * Sections of a page the starter library ships ready built, counted off the
 * library.
 *
 * **Every design and not one per section.** Five ways to open a features band
 * is exactly the sort of thing the reader of this band wants to know, and
 * counting one per section would under-report what comes with the install by
 * two thirds.
 */
export const SECTIONS_ALREADY_BUILT = STARTER_COMPOSITIONS.length

/** How many of them a landing page is, in the library's own order. */
export const SECTIONS_OF_A_PAGE = PAGE_SEQUENCE.length

const elementsIn = (node: LoomNode): number =>
  (node.kind === "element" ? 1 : 0) +
  (node.kind === "text" ? 0 : node.children.reduce((total, child) => total + elementsIn(child), 0))

/**
 * How many parts that page is, counted by building it.
 *
 * **Built rather than reasoned about.** A ready-made section is a pure
 * function from an `IdFactory` to a subtree, so the only honest way to say how
 * big the page it assembles is, is to assemble it — and what this prints is
 * what a host's own tree would carry.
 *
 * Slots are not counted. A slot is a region of its parent rather than a thing
 * on the page, so a reader comparing this figure with the badges one band
 * above is comparing parts with parts.
 *
 * It costs twenty-two subtree builds at module load, which is why it is a
 * constant here rather than a call in the page builder.
 */
export const PARTS_ON_THAT_PAGE = PAGE_SEQUENCE.reduce(
  (total, composition) => total + elementsIn(composition.build(sequentialIdFactory("count"))),
  0
)

const figure = (ids: IdFactory, value: number, label: string, caption: string): LoomNode =>
  buildElement(ids, {
    type: "loom.stat",
    props: { value: String(value), label, caption },
  })

/**
 * The band.
 *
 * Placed directly after `theParts` and before `whatYouWrite`, which keeps the
 * four-band run on this page reading as one argument: here is every part that
 * comes with it, here is how much of a page comes already built out of them,
 * here is what adding one of your own costs, and here is a page made of them.
 *
 * The shape is `facts`' on the front door and deliberately so — a claim about
 * quantity, three figures counted from the thing they describe, a line saying
 * so. Its own note carries the two layout facts this band inherits: the prose
 * is ranged left because `loom.section` renders its eyebrow left and has no
 * `align` of its own, and the figures keep `align: "center"` because a stat
 * centred in its column is a mark in a row rather than a line of running text.
 */
export const readyMadeBand = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "Ready made", anchor: READY_MADE_ANCHOR },
    "The sections come built as well as the parts",
    [
      prose(
        ids,
        "You do not place every part of a page one at a time. Whole sections come built out of the parts above, and a landing page is a short list of them.",
        { tone: "muted", measured: true }
      ),
      buildElement(ids, {
        type: "loom.stat-grid",
        props: { columns: "three", align: "center" },
        children: [
          figure(
            ids,
            SECTIONS_ALREADY_BUILT,
            "sections that come already built",
            "An opening, a grid of features, a set of questions, a footer. Each one arrives as a single change."
          ),
          figure(
            ids,
            SECTIONS_OF_A_PAGE,
            "of them make a landing page",
            "In the order a page uses them, from the bar at the top down to the footer."
          ),
          figure(
            ids,
            PARTS_ON_THAT_PAGE,
            "parts that page is made of",
            "Placed by those changes rather than by you, one at a time."
          ),
        ],
      }),
    ]
  )
