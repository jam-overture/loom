import { SIGN_IN_LABEL } from "./chrome"
import { PORTAL } from "./site"

/**
 * The questions the front door answers, as data, because two things read them.
 *
 * They were five `loom.faq` elements written inline in `home.ts` until
 * 27 September. The band still renders them and nothing a visitor sees has
 * changed — what changed is that the **structured data** the site hands a
 * search engine and an AI assistant is a `FAQPage` built from this same list.
 *
 * That is the whole reason this file exists. A `FAQPage` whose questions were
 * typed a second time would be a second copy of the site's answers, kept true
 * by whoever remembered — and the failure is worse than the usual one, because
 * the copy nobody proofreads is the copy a machine quotes. An answer reworded
 * on the page and not in the schema is this site telling a person one thing and
 * an assistant another, and nothing on any screen would say so.
 *
 * The same argument `BAND` makes for the eyebrows and `ANCHOR` makes for the
 * fragments, applied to the one text on this site that has a non-human reader.
 */

export type SiteQuestion = {
  /** Asked the way a reader would ask it, which is also the way it is searched. */
  readonly question: string
  /**
   * A whole answer, standing on its own.
   *
   * Every one of these is written to be true when lifted away from the page,
   * because that is what happens to it: a `FAQPage` answer is quoted in a
   * search result and an AI assistant reads it with nothing around it. An
   * answer beginning *it does that too* would be correct on the page and
   * useless anywhere else.
   */
  readonly answer: string
  /** Whether the band shows it already open. The first one only. */
  readonly open?: boolean
}

/**
 * Composed rather than a constant, because the last answer is composed.
 *
 * `PORTAL.door` is the site's one statement of what the portal's door is and
 * `SIGN_IN_LABEL` is the button's own word, so re-wording either cannot leave
 * this answer describing a page that no longer exists. A frozen array could not
 * hold that, and holding it is the point.
 *
 * **This band is the only place that sentence is rendered, as of 30 September.**
 * The front door's band of cards carried it as well, and carrying it there cost
 * the other three cards a third of their height each — see the note on
 * `waysIn`. An answer is where somebody who wants it looks.
 */
export const siteQuestions = (): readonly SiteQuestion[] => [
  {
    question: "Can the AI write code into my page?",
    answer:
      "No. It can only use the components you registered with Loom, and it can only change settings those components already have. The most it can ask for is something your page already knows how to do.",
    open: true,
  },
  {
    question: "What stops a bad change from landing?",
    answer:
      "Your rules do. Loom measures how much of the page a change moves, and whether it can be undone. Then it gives one of three answers: go ahead, hold it for a person to approve, or reject it.",
  },
  {
    question: "Is this a page builder?",
    answer:
      "No. It is the layer a page builder would be built on top of. There is no editor to learn and nothing is hosted with us. You keep your own components.",
  },
  {
    question: "What happens when a change is wrong?",
    answer:
      "You put it back. Every change is stored together with the change that reverses it, and undoing is checked against your rules and written down like anything else. Nothing is erased to make room for it.",
  },
  {
    question: "Do I need an account to use this?",
    answer: `No. Loom runs inside your own application, and the portal comes with it rather than being a service you sign up for. ${PORTAL.door} So the ${SIGN_IN_LABEL} button at the top of this page opens this site's own portal. On a site of yours it would be your portal, and your list.`,
  },
]
